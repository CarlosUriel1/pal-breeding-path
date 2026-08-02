// Minimal GVAS -> palbox parser (browser + Node), ported from palworld-save-tools.
// Adapted from JohnnyDalvi/Palworld_Smart_Breeder (GPL-3.0), commit cbf272a.
// Reads the Palworld GVAS fields required by the local save/world importer.
// Large Level.sav properties outside CharacterSaveParameterMap are skipped by size.
export function buildSaveParser(maps) {
  const PALS = maps.PALS || {}, NAME_MAP = maps.NAME_MAP || {},
        PASV = maps.PASSIVE_INTERNAL || {}, MOVE = maps.MOVE_MAP || {};

  class R {
    constructor(buf) { this.b = buf; this.dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); this.o = 0; }
    u8() { return this.b[this.o++]; }
    i16() { const v = this.dv.getInt16(this.o, true); this.o += 2; return v; }
    u16() { const v = this.dv.getUint16(this.o, true); this.o += 2; return v; }
    i32() { const v = this.dv.getInt32(this.o, true); this.o += 4; return v; }
    u32() { const v = this.dv.getUint32(this.o, true); this.o += 4; return v; }
    i64() { const v = this.dv.getBigInt64(this.o, true); this.o += 8; return Number(v); }
    u64() { const v = this.dv.getBigUint64(this.o, true); this.o += 8; return Number(v); }
    f32() { const v = this.dv.getFloat32(this.o, true); this.o += 4; return v; }
    f64() { const v = this.dv.getFloat64(this.o, true); this.o += 8; return v; }
    skip(n) { this.o += n; }
    bytes(n) { const s = this.b.subarray(this.o, this.o + n); this.o += n; return s; }
    bool() { return this.u8() > 0; }
    guidHex() { let h = ''; for (let i = 0; i < 16; i++) h += this.b[this.o + i].toString(16).padStart(2, '0'); this.o += 16; return h; }
    optGuid() { if (this.u8() !== 0) this.skip(16); }
    fstr() {
      const n = this.i32();
      if (n === 0) return '';
      if (n < 0) { const len = -n; const raw = this.bytes(len * 2); let s = ''; for (let i = 0; i < (len - 1) * 2; i += 2) s += String.fromCharCode(raw[i] | (raw[i + 1] << 8)); return s; }
      const raw = this.bytes(n); let s = ''; for (let i = 0; i < n - 1; i++) s += String.fromCharCode(raw[i]); return s;
    }
  }

  function structValue(r, st) {
    if (st === 'Guid') return r.guidHex();
    if (st === 'DateTime') return r.u64();
    if (st === 'Vector') return { x: r.f64(), y: r.f64(), z: r.f64() };
    if (st === 'Quat') return { x: r.f64(), y: r.f64(), z: r.f64(), w: r.f64() };
    if (st === 'LinearColor') return { r: r.f32(), g: r.f32(), b: r.f32(), a: r.f32() };
    return props(r);
  }

  function arrayProperty(r, at, size) {
    const count = r.u32();
    if (at === 'StructProperty') {
      r.fstr(); r.fstr(); r.u64(); const tn = r.fstr(); r.skip(16); r.skip(1);
      const vals = []; for (let i = 0; i < count; i++) vals.push(structValue(r, tn));
      return { values: vals };
    }
    if (at === 'ByteProperty') { return { values: r.bytes(count) }; }
    const vals = [];
    if (at === 'Guid') { for (let i = 0; i < count; i++) vals.push(r.guidHex()); }
    else { for (let i = 0; i < count; i++) vals.push(r.fstr()); }  // Enum / Name
    return { values: vals };
  }

  function property(r, type, size) {
    if (type === 'StructProperty') { const st = r.fstr(); r.skip(16); r.optGuid(); return { struct_type: st, value: structValue(r, st), type }; }
    if (type === 'IntProperty' || type === 'FixedPoint64Property') { r.optGuid(); return { value: r.i32(), type }; }
    if (type === 'UInt16Property') { r.optGuid(); return { value: r.u16(), type }; }
    if (type === 'UInt32Property') { r.optGuid(); return { value: r.u32(), type }; }
    if (type === 'Int64Property') { r.optGuid(); return { value: r.i64(), type }; }
    if (type === 'UInt64Property') { r.optGuid(); return { value: r.u64(), type }; }
    if (type === 'FloatProperty') { r.optGuid(); return { value: r.f32(), type }; }
    if (type === 'DoubleProperty') { r.optGuid(); return { value: r.f64(), type }; }
    if (type === 'StrProperty' || type === 'NameProperty') { r.optGuid(); return { value: r.fstr(), type }; }
    if (type === 'EnumProperty') { const et = r.fstr(); r.optGuid(); const ev = r.fstr(); return { value: { type: et, value: ev }, type }; }
    if (type === 'BoolProperty') { const v = r.bool(); r.optGuid(); return { value: v, type }; }
    if (type === 'ByteProperty') { const et = r.fstr(); r.optGuid(); const v = et === 'None' ? r.u8() : r.fstr(); return { value: { type: et, value: v }, type }; }
    if (type === 'ArrayProperty') { const at = r.fstr(); r.optGuid(); return { array_type: at, value: arrayProperty(r, at, size - 4), type }; }
    if (type === 'MapProperty') {
      const kt = r.fstr(), vt = r.fstr(); r.optGuid(); r.u32(); const count = r.u32();
      const ks = kt === 'StructProperty' ? 'Guid' : null, vs = vt === 'StructProperty' ? 'StructProperty' : null;
      const entries = [];
      for (let i = 0; i < count; i++) { const k = propValue(r, kt, ks); const v = propValue(r, vt, vs); entries.push({ key: k, value: v }); }
      return { value: entries, type };
    }
    throw new Error('Unknown type: ' + type);
  }

  function propValue(r, t, st) {
    if (t === 'StructProperty') return structValue(r, st);
    if (t === 'EnumProperty' || t === 'NameProperty') return r.fstr();
    if (t === 'IntProperty') return r.i32();
    if (t === 'BoolProperty') return r.bool();
    throw new Error('Unknown prop_value type: ' + t);
  }

  function props(r) {
    const out = {};
    for (;;) {
      const name = r.fstr();
      if (name === 'None') break;
      const type = r.fstr();
      const size = r.u64();
      out[name] = property(r, type, size);
    }
    return out;
  }

  function skipProperty(r, type, size) {
    switch (type) {
      case 'StructProperty': r.fstr(); r.skip(16); r.optGuid(); r.skip(size); break;
      case 'BoolProperty': r.bool(); r.optGuid(); break;
      case 'EnumProperty': r.fstr(); r.optGuid(); r.skip(size); break;
      case 'ByteProperty': r.fstr(); r.optGuid(); r.skip(size); break;
      case 'ArrayProperty': r.fstr(); r.optGuid(); r.skip(size); break;
      case 'MapProperty': r.fstr(); r.fstr(); r.optGuid(); r.skip(size); break;
      default: r.optGuid(); r.skip(size); break;
    }
  }

  function readHeader(r) {
    if (r.i32() !== 0x53415647) throw new Error('not a GVAS file');
    r.i32(); r.i32(); r.i32();
    r.u16(); r.u16(); r.u16(); r.u32();
    r.fstr();
    r.i32();
    const cvc = r.u32(); for (let i = 0; i < cvc; i++) { r.skip(16); r.i32(); }
    r.fstr();
  }

  function parseCSP(r) {
    r.fstr(); r.fstr(); r.optGuid(); r.u32(); const count = r.u32();
    const records = [];
    let skippedEmpty = 0, skippedParse = 0;
    for (let i = 0; i < count; i++) {
      const key = props(r);
      const val = props(r);
      const rd = val.RawData && val.RawData.value && val.RawData.value.values;
      if (!rd || !rd.length) { skippedEmpty++; continue; }
      const sub = new R(rd);
      let obj;
      try { obj = props(sub); } catch (e) { skippedParse++; continue; }
      const sp = obj.SaveParameter && obj.SaveParameter.value;
      if (sp) {
        let groupId = null;
        if (sub.o + 20 <= rd.length) {
          sub.skip(4);
          groupId = sub.guidHex();
        }
        records.push({ key, saveParameter: sp, groupId });
      }
    }
    return { records, warnings: { skippedEmpty, skippedParse } };
  }

  function iv(x) { if (x == null) return ''; const v = x.value; return (v && typeof v === 'object') ? v.value : v; }

  function guidValue(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value.value === 'string') return value.value;
    if (value.value && typeof value.value.value === 'string') return value.value.value;
    if (value.ID) return guidValue(value.ID);
    if (value.PlayerUId) return guidValue(value.PlayerUId);
    return null;
  }

  function readCharacterRecords(gvasBytes) {
    const r = new R(gvasBytes);
    readHeader(r);
    for (;;) {
      const name = r.fstr();
      if (name === 'None' || name === '') break;
      const type = r.fstr();
      const size = r.u64();
      if (name === 'worldSaveData') {
        r.fstr(); r.skip(16); r.optGuid();
        for (;;) {
          const nestedName = r.fstr();
          if (nestedName === 'None') break;
          const nestedType = r.fstr();
          const nestedSize = r.u64();
          if (nestedName === 'CharacterSaveParameterMap') return parseCSP(r);
          skipProperty(r, nestedType, nestedSize);
        }
        break;
      }
      skipProperty(r, type, size);
    }
    throw new Error('CharacterSaveParameterMap not found');
  }

  function normalizeCharacter(record, forcedLocation = null) {
    const sp = record.saveParameter;
    if ('IsPlayer' in sp) return null;
    const rawId = sp.CharacterID && sp.CharacterID.value;
    if (!rawId || rawId === 'None') return null;
    let code = rawId, alpha = false;
    for (const pre of ['BOSS_', 'GYM_', 'RAID_', 'PREDATOR_']) {
      if (code.toUpperCase().startsWith(pre)) {
        alpha = pre === 'BOSS_' || pre === 'PREDATOR_';
        code = code.slice(pre.length);
        break;
      }
    }
    const passiveIds = ((sp.PassiveSkillList && sp.PassiveSkillList.value.values) || []);
    const passives = passiveIds.map((passive) => PASV[passive] || passive);
    const moves = ((sp.EquipWaza && sp.EquipWaza.value.values) || [])
      .map((move) => MOVE[move] || String(move).replace('EPalWazaID::', ''));
    const elements = ((PALS[code] && PALS[code].elements) || []);
    let containerId = null, slot = null;
    try {
      containerId = sp.SlotId.value.ContainerId.value.ID.value;
      slot = iv(sp.SlotId.value.SlotIndex);
    } catch {}
    const gender = sp.Gender ? String(sp.Gender.value.value).replace('EPalGenderType::', '') : '';
    const favoriteIndex = 'FavoriteIndex' in sp ? iv(sp.FavoriteIndex) : '';
    const key = record.key || {};
    const keyInstance = guidValue(key.InstanceId);
    const ownerPlayerUid = guidValue(sp.OwnerPlayerUId);
    return {
      name: NAME_MAP[code] || code,
      base_codename: code,
      code,
      passives: passives.join(';'),
      passive_ids: passiveIds.join(';'),
      moves: moves.join(';'),
      elements: elements.join(';'),
      gender,
      level: iv(sp.Level),
      rank: iv(sp.Rank),
      hp_iv: iv(sp.Talent_HP),
      atk_iv: iv(sp.Talent_Shot),
      def_iv: iv(sp.Talent_Defense),
      soul_hp: iv(sp.Rank_HP),
      soul_atk: iv(sp.Rank_Attack),
      soul_def: iv(sp.Rank_Defence),
      soul_craft: iv(sp.Rank_CraftSpeed),
      favorite_index: favoriteIndex,
      favorite: favoriteIndex !== '' && favoriteIndex >= 1,
      alpha_or_boss: alpha,
      nickname: sp.NickName ? sp.NickName.value : '',
      container_id: containerId,
      slot,
      instance_id: keyInstance,
      owner_player_uid: ownerPlayerUid,
      group_id: record.groupId,
      location: forcedLocation,
    };
  }

  function parsePalbox(gvasBytes) {
    const parsed = readCharacterRecords(gvasBytes);
    const cspWarnings = parsed.warnings;

    const rows = [];
    const contCount = {};
    const unknownCodes = {};
    for (const record of parsed.records) {
      const row = normalizeCharacter(record);
      if (!row) continue;
      if (!NAME_MAP[row.code]) unknownCodes[row.code] = (unknownCodes[row.code] || 0) + 1;
      if (row.container_id) contCount[row.container_id] = (contCount[row.container_id] || 0) + 1;
      rows.push(row);
    }
    let palboxId = null, mx = -1;
    for (const k in contCount) if (contCount[k] > mx) { mx = contCount[k]; palboxId = k; }
    let partyId = null;
    for (const k in contCount) if (k !== palboxId && contCount[k] === 5) { partyId = k; break; }
    for (const row of rows) {
      row.location = row.container_id === palboxId ? 'Palbox' : row.container_id === partyId ? 'Party' : 'Base/Other';
    }
    const warnings = {
      skippedEmpty: (cspWarnings && cspWarnings.skippedEmpty) || 0,
      skippedParse: (cspWarnings && cspWarnings.skippedParse) || 0,
      unknownCodes,
      unknownCodeTotal: Object.values(unknownCodes).reduce((a, b) => a + b, 0),
    };
    return { rows, warnings };
  }

  function parseWorldPlayers(gvasBytes) {
    const parsed = readCharacterRecords(gvasBytes);
    const players = parsed.records.flatMap((record) => {
      const sp = record.saveParameter;
      if (!('IsPlayer' in sp)) return [];
      const uid = guidValue(record.key?.PlayerUId) || guidValue(sp.LastNickNameModifierPlayerUid);
      return [{
        playerUid: uid,
        instanceId: guidValue(record.key?.InstanceId),
        name: sp.NickName?.value || sp.FilteredNickName?.value || '',
        level: iv(sp.Level),
        groupId: record.groupId,
      }];
    });
    return { players, warnings: parsed.warnings };
  }

  function parseRoot(gvasBytes) {
    const r = new R(gvasBytes);
    readHeader(r);
    return props(r);
  }

  function parseLevelMeta(gvasBytes) {
    const root = parseRoot(gvasBytes);
    const data = root.SaveData?.value || {};
    return {
      worldName: iv(data.WorldName) || '',
      hostPlayerName: iv(data.HostPlayerName) || '',
      hostPlayerLevel: iv(data.HostPlayerLevel) || null,
      inGameDay: iv(data.InGameDay) || 1,
      timestampTicks: iv(root.Timestamp) || null,
    };
  }

  function parseWorldOptions(gvasBytes) {
    const root = parseRoot(gvasBytes);
    const settings = root.OptionWorldData?.value?.Settings?.value || {};
    return { multiplayer: Boolean(iv(settings.bIsMultiplay)) };
  }

  function parsePlayerSave(gvasBytes) {
    const root = parseRoot(gvasBytes);
    const data = root.SaveData?.value || {};
    return {
      playerUid: guidValue(data.PlayerUId),
      instanceId: guidValue(data.IndividualId?.value?.InstanceId),
      partyContainerId: guidValue(data.OtomoCharacterContainerId?.value?.ID),
      palboxContainerId: guidValue(data.PalStorageContainerId?.value?.ID),
      lastOnlineTicks: iv(data.LastOnlineDateTime) || null,
      platform: iv(data.PlayerPlatform) || null,
    };
  }

  function parseDimensionalPalbox(gvasBytes) {
    const root = parseRoot(gvasBytes);
    const values = root.SaveParameterArray?.value?.values || [];
    const rows = values.flatMap((entry) => {
      const saveParameter = entry.SaveParameter?.value;
      if (!saveParameter) return [];
      const key = entry.InstanceId?.value || {};
      const row = normalizeCharacter({ key, saveParameter, groupId: null }, 'Dimensional');
      return row ? [row] : [];
    });
    return { rows, slotCount: values.length };
  }

  return {
    parsePalbox,
    parseWorldPlayers,
    parseLevelMeta,
    parseWorldOptions,
    parsePlayerSave,
    parseDimensionalPalbox,
  };
}
