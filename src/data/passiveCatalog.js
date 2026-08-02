import catalogRaw from './passives_i18n.json';
import legacyNames from './passive_names.json';

export const passiveCatalog = catalogRaw.passives;
export const passiveCatalogMeta = {
  schemaVersion: catalogRaw.schemaVersion,
  source: catalogRaw.source,
  sourceVersion: catalogRaw.sourceVersion,
};

const builtInById = new Map(passiveCatalog.map((passive) => [passive.id, passive]));

export const normalizeText = (value) =>
  String(value || '')
    .toLocaleLowerCase('en-US')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function normalizeCustomPassiveCatalog(payload) {
  const source = Array.isArray(payload) ? payload : payload?.passives || payload;
  const rows = Array.isArray(source)
    ? source
    : source && typeof source === 'object'
      ? Object.entries(source).map(([id, value]) => (
          typeof value === 'string' ? { id, en: value, es: value } : { id, ...value }
        ))
      : [];

  const seen = new Set();
  return rows.flatMap((row) => {
    const id = String(row?.id || row?.internalName || '').trim();
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const builtIn = builtInById.get(id);
    const fallback = legacyNames[id] && legacyNames[id] !== id ? legacyNames[id] : id;
    const parsedRank = Number(row.rank);
    return [{
      id,
      en: String(row.en || row.nameEn || row.name || builtIn?.en || fallback),
      es: String(row.es || row.esMX || row.nameEs || row.name || builtIn?.es || builtIn?.esMX || fallback),
      esMX: String(row.esMX || row.es || row.nameEs || row.name || builtIn?.esMX || builtIn?.es || fallback),
      descriptionEn: String(row.descriptionEn || row.description || builtIn?.descriptionEn || ''),
      descriptionEs: String(row.descriptionEs || row.descriptionEsMX || builtIn?.descriptionEs || builtIn?.descriptionEsMX || ''),
      descriptionEsMX: String(row.descriptionEsMX || row.descriptionEs || builtIn?.descriptionEsMX || builtIn?.descriptionEs || ''),
      rank: Number.isFinite(parsedRank) ? parsedRank : builtIn?.rank || 0,
      custom: true,
    }];
  });
}

export function createPassiveLookup(customPassives = []) {
  const lookup = new Map(builtInById);
  for (const passive of customPassives) lookup.set(passive.id, passive);
  return lookup;
}

export function getPassiveMeta(id, customPassives = [], lookup = null) {
  const passive = (lookup || createPassiveLookup(customPassives)).get(id);
  if (passive) return passive;
  const legacy = legacyNames[id];
  const name = legacy && legacy !== id ? legacy : id;
  return { id, en: name, es: name, esMX: name, rank: 0, unknown: true };
}

export function passiveName(passive, language = 'es') {
  if (!passive) return '';
  return language === 'en'
    ? passive.en || passive.esMX || passive.es || passive.id
    : passive.esMX || passive.es || passive.en || passive.id;
}

export function alternatePassiveName(passive, language = 'es') {
  if (!passive) return '';
  return language === 'en'
    ? passive.esMX || passive.es || passive.en || passive.id
    : passive.en || passive.esMX || passive.es || passive.id;
}

export function passiveDescription(passive, language = 'es') {
  if (!passive) return '';
  return language === 'en'
    ? passive.descriptionEn || passive.descriptionEsMX || passive.descriptionEs || ''
    : passive.descriptionEsMX || passive.descriptionEs || passive.descriptionEn || '';
}

export function rankTone(rank) {
  if (rank >= 4) return 'rainbow';
  if (rank >= 3) return 'gold';
  if (rank >= 1) return 'positive';
  if (rank <= -3) return 'negative-strong';
  if (rank < 0) return 'negative';
  return 'neutral';
}

export function availablePassivesFromCollection(collection, customPassives = []) {
  const lookup = createPassiveLookup(customPassives);
  const ids = new Set((collection?.instances || []).flatMap((pal) => pal.passiveIds || []));
  return [...ids]
    .map((id) => getPassiveMeta(id, customPassives, lookup))
    .sort((a, b) => b.rank - a.rank || a.en.localeCompare(b.en));
}
