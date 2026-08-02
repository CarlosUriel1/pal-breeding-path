const HEADER_SIZE = 12;
const MAX_UNCOMPRESSED_SIZE = 1024 * 1024 * 1024;

let oozModulePromise = null;

const magicAt = (bytes, offset, length) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

async function getOozModule() {
  if (!oozModulePromise) {
    oozModulePromise = import('../vendor/ooz.js').then(({ default: createOozModule }) => createOozModule());
  }
  return oozModulePromise;
}

function oozDecompress(instance, data, rawSize) {
  const compressedPointer = instance._malloc(data.byteLength);
  const outputPointer = instance._malloc(rawSize + 128);
  if (!compressedPointer || !outputPointer) {
    if (compressedPointer) instance._free(compressedPointer);
    if (outputPointer) instance._free(outputPointer);
    throw new Error('No hay memoria suficiente para descomprimir este guardado.');
  }

  try {
    instance.HEAPU8.set(data, compressedPointer);
    const result = instance._Kraken_Decompress(
      compressedPointer,
      data.byteLength,
      outputPointer,
      rawSize
    );
    if (result < 0) throw new Error('No se pudo descomprimir el guardado Oodle/Kraken.');
    return instance.HEAPU8.slice(outputPointer, outputPointer + rawSize);
  } finally {
    instance._free(compressedPointer);
    instance._free(outputPointer);
  }
}

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador no puede descomprimir guardados PlZ. Usa Chrome o Edge reciente.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function decompressPalworldSave(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < 4) throw new Error('El archivo está vacío o incompleto.');

  if (magicAt(bytes, 0, 4) === 'GVAS') {
    return { bytes, format: 'GVAS' };
  }

  if (bytes.byteLength < HEADER_SIZE) {
    throw new Error('El archivo no contiene un encabezado de guardado válido.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rawSize = view.getUint32(0, true);
  const magic = magicAt(bytes, 8, 3);
  const saveType = bytes[11];

  if (!rawSize || rawSize > MAX_UNCOMPRESSED_SIZE) {
    throw new Error('El tamaño descomprimido declarado no es seguro o no es válido.');
  }

  if (magic === 'PlM') {
    const instance = await getOozModule();
    return {
      bytes: oozDecompress(instance, bytes.subarray(HEADER_SIZE), rawSize),
      format: `PlM${String.fromCharCode(saveType)}`,
    };
  }

  if (magic === 'PlZ') {
    let output = await inflate(bytes.subarray(HEADER_SIZE));
    if (saveType === 0x32) output = await inflate(output);
    return { bytes: output, format: `PlZ${String.fromCharCode(saveType)}` };
  }

  if (magic === 'CNK') {
    throw new Error('Los guardados Xbox en formato CNK todavía no son compatibles.');
  }

  throw new Error(`Formato de guardado no reconocido (${JSON.stringify(magic)}).`);
}

