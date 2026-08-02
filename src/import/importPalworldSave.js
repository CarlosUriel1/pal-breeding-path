import palsRaw from '../data/pals.json';
import passiveNames from '../data/passive_names.json';
import { buildSaveParser } from './gvasParser.js';
import { decompressPalworldSave } from './saveDecompress.js';

const pals = Object.values(palsRaw);
const palsByCode = new Map(pals.map((pal) => [pal.key.toLocaleLowerCase('en-US'), pal]));
const knownNonPalCodes = new Set(['hunter_bat']);
const parser = buildSaveParser({
  PALS: Object.fromEntries(pals.map((pal) => [pal.key, { elements: pal.elements }])),
  NAME_MAP: Object.fromEntries(pals.map((pal) => [pal.key, pal.name])),
  PASSIVE_INTERNAL: passiveNames,
  MOVE_MAP: {},
});

const splitList = (value) => (value ? value.split(';').filter(Boolean) : []);

const normalizeGender = (gender) => {
  const value = String(gender || '').toLocaleLowerCase('en-US');
  if (value === 'male' || value === 'm') return 'M';
  if (value === 'female' || value === 'f') return 'F';
  return '';
};

const normalizeLocation = (location) => {
  if (location === 'Palbox') return 'palbox';
  if (location === 'Party') return 'party';
  if (location === 'Dimensional') return 'dimensional';
  if (location === 'Base/Other') return 'base-or-other';
  return 'unknown';
};

const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeUid = (value) => {
  const uid = String(value || '').toLocaleLowerCase('en-US');
  return /^[0-9a-f]{32}$/.test(uid) && !/^0+$/.test(uid) ? uid : null;
};

const ticksToLocalIso = (ticks) => {
  const value = Number(ticks);
  if (!Number.isFinite(value) || value <= 0) return null;
  // FDateTime has no timezone. Keep the save's wall-clock components so a
  // browser in the player's locale does not shift the displayed save time.
  return new Date(value / 10_000 - 62_135_596_800_000).toISOString().replace(/Z$/, '');
};

function collectionFromRows(parsed, decompressed, source = {}, allowEmpty = false) {
  const unmatchedCodes = new Map();

  const instances = parsed.rows.flatMap((row, index) => {
    const pal = palsByCode.get(String(row.code || '').toLocaleLowerCase('en-US'));
    if (!pal) {
      const normalizedCode = String(row.code || '').toLocaleLowerCase('en-US');
      if (!knownNonPalCodes.has(normalizedCode)) {
        unmatchedCodes.set(row.code, (unmatchedCodes.get(row.code) || 0) + 1);
      }
      return [];
    }

    const containerId = row.container_id || null;
    const slotIndex = finiteNumber(row.slot);
    return [{
      instanceId: row.instance_id || `${containerId || row.location || 'unknown'}:${slotIndex ?? 'x'}:${index}`,
      palId: pal.id,
      speciesCode: pal.key,
      name: pal.name,
      nickname: row.nickname || null,
      gender: normalizeGender(row.gender),
      level: finiteNumber(row.level),
      passiveIds: splitList(row.passive_ids),
      passives: splitList(row.passives),
      location: normalizeLocation(row.location),
      containerId,
      slotIndex,
      ownerPlayerUid: normalizeUid(row.owner_player_uid),
      groupId: normalizeUid(row.group_id),
      favorite: Boolean(row.favorite),
      alphaOrBoss: Boolean(row.alpha_or_boss),
      ivs: {
        hp: finiteNumber(row.hp_iv),
        attack: finiteNumber(row.atk_iv),
        defense: finiteNumber(row.def_iv),
      },
    }];
  });

  if (!instances.length && !allowEmpty) {
    throw new Error('El archivo se leyó, pero no contiene Pals reconocidos por esta versión de la app.');
  }

  const speciesIds = [...new Set(instances.map((pal) => pal.palId))];
  return {
    schemaVersion: 1,
    importedAt: Date.now(),
    format: decompressed.format,
    source: {
      name: source.name || 'Level.sav',
      relativePath: source.relativePath || source.name || 'Level.sav',
      size: source.size || decompressed.bytes.byteLength,
      lastModified: source.lastModified || null,
    },
    instances,
    speciesIds,
    warnings: {
      skippedEmpty: parsed.warnings?.skippedEmpty || 0,
      skippedParse: parsed.warnings?.skippedParse || 0,
      unmatchedCodes: Object.fromEntries(unmatchedCodes),
      unmatchedTotal: [...unmatchedCodes.values()].reduce((sum, count) => sum + count, 0),
    },
  };
}

export async function importPalworldSaveBuffer(buffer, source = {}, onProgress = () => {}) {
  onProgress('Descomprimiendo el guardado…');
  const decompressed = await decompressPalworldSave(buffer);

  onProgress('Leyendo tus Pals…');
  const parsed = parser.parsePalbox(decompressed.bytes);
  return collectionFromRows(parsed, decompressed, source);
}

async function decompressDescriptor(descriptor) {
  if (!descriptor?.buffer) return null;
  const decompressed = await decompressPalworldSave(descriptor.buffer);
  return { ...descriptor, decompressed };
}

async function readWorldBundle(bundle, onProgress = () => {}) {
  if (!bundle?.level?.buffer) throw new Error('No se recibió el Level.sav del mundo.');
  onProgress('Descomprimiendo el mundo…');
  const level = await decompressDescriptor(bundle.level);

  onProgress('Leyendo los datos del mundo…');
  const levelParsed = parser.parsePalbox(level.decompressed.bytes);
  const levelPlayers = parser.parseWorldPlayers(level.decompressed.bytes).players;

  // Los archivos auxiliares corruptos o vacíos se descartan con un warning;
  // solo Level.sav es imprescindible para importar el mundo.
  const failedFiles = [];
  const descriptorPath = (descriptor) =>
    descriptor?.source?.relativePath || descriptor?.source?.name || 'archivo desconocido';

  const savedPlayers = [];
  for (const playerDescriptor of bundle.players || []) {
    try {
      const descriptor = await decompressDescriptor(playerDescriptor);
      savedPlayers.push({
        ...parser.parsePlayerSave(descriptor.decompressed.bytes),
        source: descriptor.source,
      });
    } catch {
      failedFiles.push(descriptorPath(playerDescriptor));
    }
  }

  let metadata = {};
  if (bundle.meta?.buffer) {
    try {
      const descriptor = await decompressDescriptor(bundle.meta);
      metadata = parser.parseLevelMeta(descriptor.decompressed.bytes);
    } catch {
      failedFiles.push(descriptorPath(bundle.meta));
    }
  }
  let options = {};
  if (bundle.option?.buffer) {
    try {
      const descriptor = await decompressDescriptor(bundle.option);
      options = parser.parseWorldOptions(descriptor.decompressed.bytes);
    } catch {
      failedFiles.push(descriptorPath(bundle.option));
    }
  }

  const dimensionalRows = [];
  for (const dimensionalDescriptor of bundle.dimensional || []) {
    try {
      const descriptor = await decompressDescriptor(dimensionalDescriptor);
      dimensionalRows.push(...parser.parseDimensionalPalbox(descriptor.decompressed.bytes).rows);
    } catch {
      failedFiles.push(descriptorPath(dimensionalDescriptor));
    }
  }
  const parsed = {
    rows: [...levelParsed.rows, ...dimensionalRows],
    warnings: levelParsed.warnings,
  };
  const collection = collectionFromRows(parsed, level.decompressed, level.source, true);
  collection.warnings.failedFiles = failedFiles;

  const playersByUid = new Map();
  for (const saved of savedPlayers) {
    const playerUid = normalizeUid(saved.playerUid);
    if (playerUid) playersByUid.set(playerUid, { id: playerUid, ...saved });
  }
  for (const levelPlayer of levelPlayers) {
    const playerUid = normalizeUid(levelPlayer.playerUid);
    if (!playerUid) continue;
    playersByUid.set(playerUid, { ...(playersByUid.get(playerUid) || { id: playerUid }), ...levelPlayer, id: playerUid });
  }

  const containers = new Map();
  for (const player of playersByUid.values()) {
    if (player.palboxContainerId) containers.set(player.palboxContainerId, { owner: player.id, location: 'palbox' });
    if (player.partyContainerId) containers.set(player.partyContainerId, { owner: player.id, location: 'party' });
  }
  for (const instance of collection.instances) {
    const container = containers.get(instance.containerId);
    if (container) {
      instance.location = container.location;
      instance.ownerPlayerUid ||= container.owner;
    } else if (instance.location !== 'dimensional') {
      instance.location = 'base-or-other';
    }
  }

  // PalBreed-style imports use the selected players' owned Pals. World/base workers
  // without an OwnerPlayerUId are not part of a player's selectable collection.
  // The separate dimensional storage is shared and remains eligible automatically.
  collection.instances = collection.instances.filter(
    (pal) => pal.ownerPlayerUid || pal.location === 'dimensional'
  );
  collection.speciesIds = [...new Set(collection.instances.map((pal) => pal.palId))];
  const sharedPalCount = collection.instances.filter(
    (pal) => pal.location === 'dimensional' && !pal.ownerPlayerUid
  ).length;
  const players = [...playersByUid.values()].map((player) => ({
    id: player.id,
    name: player.name || (player.id === normalizeUid(savedPlayers[0]?.playerUid) ? metadata.hostPlayerName : '') || 'Player',
    level: finiteNumber(player.level) ?? (player.name === metadata.hostPlayerName ? finiteNumber(metadata.hostPlayerLevel) : null),
    palCount: collection.instances.filter((pal) => pal.ownerPlayerUid === player.id).length,
    palboxContainerId: player.palboxContainerId || null,
    partyContainerId: player.partyContainerId || null,
    lastOnlineTicks: player.lastOnlineTicks || null,
    platform: player.platform || null,
    groupId: player.groupId || null,
    isHost: player.name === metadata.hostPlayerName || player.id === normalizeUid(savedPlayers[0]?.playerUid),
  })).sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.name.localeCompare(b.name));

  if (!players.length && metadata.hostPlayerName) {
    players.push({
      id: 'host', name: metadata.hostPlayerName, level: finiteNumber(metadata.hostPlayerLevel),
      palCount: collection.instances.length - sharedPalCount, isHost: true,
    });
  }

  const world = {
    id: bundle.worldId || 'selected-world',
    name: metadata.worldName || bundle.worldName || bundle.worldId || 'Palworld world',
    timestampTicks: metadata.timestampTicks || null,
    timestamp: ticksToLocalIso(metadata.timestampTicks),
    day: finiteNumber(metadata.inGameDay) || 1,
    hostPlayerName: metadata.hostPlayerName || players.find((player) => player.isHost)?.name || '',
    hostPlayerLevel: finiteNumber(metadata.hostPlayerLevel),
    multiplayer: Boolean(options.multiplayer),
    format: level.decompressed.format,
    relativePath: level.source?.relativePath || 'Level.sav',
    lastModified: level.source?.lastModified || null,
  };
  collection.world = world;
  collection.players = players;
  collection.sharedPalCount = sharedPalCount;
  return { world, players, sharedPalCount, collection };
}

export async function inspectPalworldWorldBuffers(bundle, onProgress = () => {}) {
  const parsed = await readWorldBundle(bundle, onProgress);
  return {
    world: parsed.world,
    players: parsed.players,
    totalPals: parsed.collection.instances.length,
    sharedPalCount: parsed.sharedPalCount,
  };
}

export async function importPalworldWorldBuffers(bundle, selectedPlayerIds = [], onProgress = () => {}) {
  const parsed = await readWorldBundle(bundle, onProgress);
  const selected = new Set((selectedPlayerIds || []).map(normalizeUid).filter(Boolean));
  if (selected.size) {
    parsed.collection.instances = parsed.collection.instances.filter(
      (pal) => (pal.location === 'dimensional' && !pal.ownerPlayerUid) || selected.has(pal.ownerPlayerUid)
    );
    parsed.collection.speciesIds = [...new Set(parsed.collection.instances.map((pal) => pal.palId))];
  }
  parsed.collection.selectedPlayerIds = selected.size ? [...selected] : parsed.players.map((player) => player.id);
  parsed.collection.players = parsed.players.filter((player) => !selected.size || selected.has(player.id));
  return parsed.collection;
}
