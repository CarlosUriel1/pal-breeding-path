import {
  importPalworldSaveBuffer,
  importPalworldWorldBuffers,
  inspectPalworldWorldBuffers,
} from './importPalworldSave.js';

self.onmessage = async ({ data }) => {
  try {
    const progress = (stage) => self.postMessage({ type: 'progress', stage });
    let result;
    if (data?.type === 'parse') {
      result = await importPalworldSaveBuffer(data.buffer, data.source, progress);
    } else if (data?.type === 'inspect-world') {
      result = await inspectPalworldWorldBuffers(data.bundle, progress);
    } else if (data?.type === 'parse-world') {
      result = await importPalworldWorldBuffers(data.bundle, data.selectedPlayerIds, progress);
    } else {
      return;
    }
    self.postMessage({ type: 'success', result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'No se pudo leer el guardado.',
    });
  }
};
