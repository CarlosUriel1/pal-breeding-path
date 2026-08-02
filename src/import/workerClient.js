export const MAX_SAVE_FILE_SIZE = 512 * 1024 * 1024;
const PARSE_TIMEOUT_MS = 120_000;

const sourceFor = (file, relativePath = null) => ({
  name: file.name,
  relativePath: relativePath || file.webkitRelativePath || file.name,
  size: file.size,
  lastModified: file.lastModified,
});

const abortError = () => new DOMException('La importación se canceló.', 'AbortError');

const runWorker = (message, transfers, onProgress, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    reject(abortError());
    return;
  }
  const worker = new Worker(new URL('./save.worker.js', import.meta.url), { type: 'module' });
  const cleanup = () => {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
    worker.terminate();
  };
  const timeout = window.setTimeout(() => {
    cleanup();
    reject(new Error('El análisis tardó más de 120 segundos y se detuvo.'));
  }, PARSE_TIMEOUT_MS);
  const onAbort = () => {
    cleanup();
    reject(abortError());
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  const finish = (callback, value) => {
    cleanup();
    callback(value);
  };
  worker.onmessage = ({ data }) => {
    if (data?.type === 'progress') onProgress(data.stage);
    if (data?.type === 'success') finish(resolve, data.result);
    if (data?.type === 'error') finish(reject, new Error(data.message));
  };
  worker.onerror = () => finish(reject, new Error('El lector local del guardado se detuvo inesperadamente.'));
  worker.postMessage(message, transfers);
});

async function fileDescriptor(entry) {
  const file = entry?.file || entry;
  if (!file) return null;
  if (file.size > MAX_SAVE_FILE_SIZE) throw new Error('El guardado supera el límite local de 512 MiB.');
  const buffer = await file.arrayBuffer();
  return { buffer, source: sourceFor(file, entry?.relativePath) };
}

async function worldBundle(candidate) {
  if (!candidate?.levelFile && !candidate?.file) throw new Error('No se recibió ningún Level.sav.');
  const levelEntry = candidate.levelFile || candidate.file;
  const [level, meta, option, players, dimensional] = await Promise.all([
    fileDescriptor({ file: levelEntry, relativePath: candidate.relativePath }),
    fileDescriptor(candidate.metaFile),
    fileDescriptor(candidate.optionFile),
    Promise.all((candidate.playerFiles || []).map(fileDescriptor)),
    Promise.all((candidate.dimensionalFiles || []).map(fileDescriptor)),
  ]);
  return {
    worldId: candidate.worldId,
    worldName: candidate.worldName,
    level,
    meta,
    option,
    players: players.filter(Boolean),
    dimensional: dimensional.filter(Boolean),
  };
}

const transferBuffers = (bundle) => [
  bundle.level, bundle.meta, bundle.option, ...(bundle.players || []), ...(bundle.dimensional || []),
].filter(Boolean).map((descriptor) => descriptor.buffer);

export async function parsePalworldSave(file, onProgress = () => {}, signal) {
  if (!file) throw new Error('No se recibió ningún archivo.');
  if (file.size > MAX_SAVE_FILE_SIZE) {
    throw new Error('El guardado supera el límite local de 512 MiB.');
  }

  onProgress('Leyendo el archivo…');
  const buffer = await file.arrayBuffer();

  return runWorker({
      type: 'parse',
      buffer,
      source: sourceFor(file),
    }, [buffer], onProgress, signal);
}

export async function inspectPalworldWorld(candidate, onProgress = () => {}, signal) {
  onProgress('Leyendo los archivos del mundo…');
  const bundle = await worldBundle(candidate);
  return runWorker({ type: 'inspect-world', bundle }, transferBuffers(bundle), onProgress, signal);
}

export async function parsePalworldWorld(candidate, selectedPlayerIds = [], onProgress = () => {}, signal) {
  onProgress('Leyendo los archivos del mundo…');
  const bundle = await worldBundle(candidate);
  return runWorker(
    { type: 'parse-world', bundle, selectedPlayerIds },
    transferBuffers(bundle),
    onProgress,
    signal
  );
}
