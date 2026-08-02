// Refresca src/data/pals.json y public/pals/*.png desde palbreed.com.
// Uso: node tools/refresh-data.mjs
// Encuentra el chunk de datos del build actual (los nombres cambian por build),
// lo aísla de Vue con stubs y vuelca el diccionario de pals a JSON.
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = path.join(ROOT, 'tools', '.chunks');
const BASE = 'https://palbreed.com';
await mkdir(TMP, { recursive: true });

// 1) Localiza los chunks del build actual desde el HTML de la página
const html = await (await fetch(`${BASE}/breeding-path`)).text();
const entryChunks = [...html.matchAll(/\/_nuxt\/([\w$-]+\.js)/g)].map((m) => m[1]);
if (!entryChunks.length) throw new Error('no se encontraron chunks en el HTML');

// 2) Descarga recursiva (imports estáticos y dinámicos relativos)
const downloaded = new Map();
async function download(name) {
  if (downloaded.has(name)) return;
  const res = await fetch(`${BASE}/_nuxt/${name}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${name}`);
  const text = await res.text();
  downloaded.set(name, text);
  await writeFile(path.join(TMP, name), text);
  const deps = [...text.matchAll(/from\s*["']\.\/([^"']+\.js)["']|import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g)]
    .map((m) => m[1] || m[2]);
  for (const d of deps) await download(d);
}
for (const c of [...new Set(entryChunks)]) await download(c);

// 3) El chunk de datos es el que más veces menciona combiRank
let dataChunk = null;
let maxHits = 0;
for (const [name, text] of downloaded) {
  const hits = (text.match(/combiRank/g) || []).length;
  if (hits > maxHits) {
    maxHits = hits;
    dataChunk = name;
  }
}
if (!dataChunk || maxHits < 50) throw new Error('no se encontró el chunk de datos');
console.log('chunk de datos:', dataChunk, `(${maxHits} pals)`);

// 4) Aísla el chunk: reemplaza imports por stubs Proxy (la data son literales puros)
let src = downloaded.get(dataChunk);
const stubHeader = `const __mk=()=>new Proxy(function(){}, {
  get:(t,k)=> k===Symbol.toPrimitive? (()=> '') : __mk(),
  apply:()=>__mk(),
  construct:()=>__mk(),
});\n`;
src = src.replace(/import\s*(?:([\w$]+)\s*,\s*)?(?:\{([^}]*)\}\s*)?(?:([\w$]+)\s*)?from\s*["'][^"']+["'];?/g, (m, defA, named, defB) => {
  const names = [];
  if (defA) names.push(defA);
  if (defB) names.push(defB);
  if (named) {
    for (const part of named.split(',')) {
      const p = part.trim();
      if (!p) continue;
      const asMatch = p.match(/^[\w$]+\s+as\s+([\w$]+)$/);
      names.push(asMatch ? asMatch[1] : p);
    }
  }
  if (!names.length) return '';
  return 'const ' + names.map((n) => `${n}=__mk()`).join(',') + ';';
});
src = src.replace(/import\s*["'][^"']+["'];?/g, '');
const isolated = path.join(TMP, 'data-only.mjs');
await writeFile(isolated, stubHeader + src);

// 5) Importa el chunk en un subproceso aislado con el modelo de permisos de Node:
// --permission (estable desde Node 22.13/23.5; en Node 20-21 es --experimental-permission)
// deniega fs, child_process y workers por defecto; solo se concede lectura del
// directorio del chunk para poder importarlo. Así el código descargado no puede
// tocar el disco ni lanzar procesos aunque palbreed.com esté comprometido.
// Riesgo residual: --permission NO bloquea la red, así que un chunk comprometido
// aún podría exfiltrar datos del entorno del proceso (no del disco) vía fetch.
const finderScript = `
const mod = await import(${JSON.stringify(pathToFileURL(isolated).href)});
let pals = null;
for (const key of Object.keys(mod)) {
  const v = mod[key];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const vals = Object.values(v);
    if (vals.length > 200 && vals[0] && typeof vals[0].combiRank === 'number') {
      pals = v;
      break;
    }
  }
}
if (!pals) {
  console.error('no se encontró el export con los pals');
  process.exit(1);
}
process.stdout.write(JSON.stringify(pals));
`;
const stdout = execFileSync(
  process.execPath,
  ['--permission', `--allow-fs-read=${TMP}${path.sep}*`, '--input-type=module', '-e', finderScript],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);
const pals = JSON.parse(stdout);

// Conserva solo los campos que consume src/ (motor de crianza e importador de
// guardados); el resto del chunk (stats, drops, descripciones…) no se usa.
const KEEP_FIELDS = ['id', 'key', 'name', 'index', 'suffix', 'combiRank', 'combiPriority', 'ignoreCombi', 'isBoss', 'elements', 'icon', 'combos'];
const slim = Object.fromEntries(
  Object.entries(pals).map(([id, pal]) => [
    id,
    Object.fromEntries(KEEP_FIELDS.filter((field) => field in pal).map((field) => [field, pal[field]])),
  ])
);
await writeFile(path.join(ROOT, 'src', 'data', 'pals.json'), JSON.stringify(slim));
console.log('src/data/pals.json actualizado con', Object.keys(slim).length, 'pals');

// 6) Iconos que falten
const DEST = path.join(ROOT, 'public', 'pals');
await mkdir(DEST, { recursive: true });
const icons = [...new Set(Object.values(pals).map((p) => p.icon).filter(Boolean))];
let ok = 0;
const fail = [];
const queue = [...icons];
async function worker() {
  while (queue.length) {
    const icon = queue.shift();
    const file = path.join(DEST, icon + '.png');
    if (existsSync(file)) {
      ok++;
      continue;
    }
    try {
      const res = await fetch(`${BASE}/images/full_palicon/${icon}.png`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      ok++;
    } catch (e) {
      fail.push(icon + ': ' + e.message);
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log('iconos:', ok, '/', icons.length, fail.length ? 'fallos: ' + fail.join(', ') : '');

await rm(TMP, { recursive: true, force: true });
console.log('listo');
