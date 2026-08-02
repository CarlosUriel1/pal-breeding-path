import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const source = process.argv[2];
if (!source) {
  console.error('Uso: node tools/build-passive-catalog.mjs <PalCalc.Model/db.json>');
  process.exit(1);
}

const database = JSON.parse(fs.readFileSync(path.resolve(source), 'utf8'));
const passives = database.PassiveSkills
  .filter((passive) => passive.IsStandardPassiveSkill && passive.InternalName)
  .map((passive) => ({
    id: passive.InternalName,
    en: passive.LocalizedNames?.en || passive.Name || passive.InternalName,
    es: passive.LocalizedNames?.es || passive.LocalizedNames?.['es-MX'] || passive.Name || passive.InternalName,
    esMX: passive.LocalizedNames?.['es-MX'] || passive.LocalizedNames?.es || passive.Name || passive.InternalName,
    descriptionEn: passive.LocalizedDescriptions?.en || passive.Description || '',
    descriptionEs: passive.LocalizedDescriptions?.es || passive.LocalizedDescriptions?.['es-MX'] || '',
    descriptionEsMX: passive.LocalizedDescriptions?.['es-MX'] || passive.LocalizedDescriptions?.es || '',
    rank: Number(passive.Rank) || 0,
    randomInheritanceAllowed: Boolean(passive.RandomInheritanceAllowed),
  }))
  .sort((a, b) => a.en.localeCompare(b.en));

const output = {
  schemaVersion: 1,
  source: 'tylercamp/palcalc',
  sourceVersion: database.Version,
  passives,
};

const destination = path.resolve('src/data/passives_i18n.json');
fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Escritas ${passives.length} pasivas en ${destination}`);
