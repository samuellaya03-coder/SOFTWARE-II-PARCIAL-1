/**
 * Motor de esteganografia LSB sobre la API de Canvas de HTML5.
 *
 * Esta capa se limita a la entrada/salida: cargar la imagen, proyectarla en un
 * canvas, obtener el búfer de pixeles y volcarlo. Todo el formato binario y la
 * colocacion de bits vive en lsbContainer.js, que es puro y por tanto verificable
 * fuera del navegador. Las pruebas del backend validan ese modulo directamente.
 *
 * El proceso completo ocurre en el cliente: los pixeles nunca salen del navegador.
 */

import {
  injectContainer,
  extractContainer,
  capacityBytes,
  payloadCapacityBytes,
  countSamples,
  HEADER_SIZE
} from './lsbContainer.js';

export { HEADER_SIZE, capacityBytes, payloadCapacityBytes };

/**
 * Carga un archivo de imagen en un HTMLImageElement.
 * @param {File|Blob} file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen: formato no soportado o archivo corrupto.'));
    };

    image.src = url;
  });
}

/** Dimensiones reales de un elemento de imagen o canvas. */
function dimensionsOf(source) {
  return {
    width: source.naturalWidth || source.width,
    height: source.naturalHeight || source.height
  };
}

/**
 * Proyecta una imagen en un canvas y devuelve su ImageData.
 *
 * `willReadFrequently` evita que el navegador mantenga el búfer en memoria de
 * GPU, donde cada getImageData obligaria a una transferencia costosa.
 */
function toImageData(source) {
  const { width, height } = dimensionsOf(source);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(source, 0, 0);

  return { canvas, context, imageData: context.getImageData(0, 0, width, height) };
}

/**
 * Capacidad de una imagen, en bytes.
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {number} [metaLength=0]
 */
export function describeCapacity(source, metaLength = 0) {
  const { width, height } = dimensionsOf(source);
  const rgbaLength = width * height * 4;

  return {
    width,
    height,
    totalPixels: width * height,
    totalSamples: countSamples(rgbaLength),
    containerCapacityBytes: capacityBytes(rgbaLength),
    payloadCapacityBytes: payloadCapacityBytes(rgbaLength, metaLength)
  };
}

/**
 * Inyecta un payload en los LSB de una imagen.
 *
 * @param {object} input
 * @param {HTMLImageElement|HTMLCanvasElement} input.image
 * @param {Uint8Array} input.payload
 * @param {object|null} [input.meta] - Nombre y tipo MIME si el payload es un archivo.
 * @param {boolean} [input.encrypted] - Marca el payload como paquete AES-GCM.
 * @param {Uint8Array|null} [input.seedBytes] - Semilla del recorrido disperso.
 * @returns {{ canvas: HTMLCanvasElement, stats: object }}
 */
export function hide({ image, payload, meta = null, encrypted = false, seedBytes = null }) {
  const { canvas, context, imageData } = toImageData(image);

  const stats = injectContainer(imageData.data, { payload, meta, encrypted, seedBytes });
  context.putImageData(imageData, 0, 0);

  const { width, height } = dimensionsOf(image);

  return {
    canvas,
    stats: {
      ...stats,
      width,
      height,
      containerCapacityBytes: capacityBytes(width * height * 4),
      capacityUsedPercentage: Number((stats.capacityUsedRatio * 100).toFixed(2))
    }
  };
}

/**
 * Extrae el contenedor oculto en una imagen.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {Uint8Array|null} [seedBytes] - Semilla del recorrido, o null para secuencial.
 * @returns {{ meta: object|null, payload: Uint8Array, encrypted: boolean, isFile: boolean, scattered: boolean, header: object }}
 */
export function reveal(source, seedBytes = null) {
  const { imageData } = toImageData(source);
  return extractContainer(imageData.data, seedBytes);
}

/**
 * Intenta extraer en modo secuencial y, si se aporta semilla, tambien en disperso.
 *
 * El orden importa: el modo secuencial no necesita contrasena, asi que se prueba
 * primero para poder informar de la presencia de un contenedor aunque el usuario
 * no haya escrito nada.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {Uint8Array|null} seedBytes
 * @returns {{ found: boolean, mode: 'secuencial'|'disperso'|null, result: object|null, errors: string[] }}
 */
export function revealAuto(source, seedBytes = null) {
  const { imageData } = toImageData(source);
  const errors = [];

  for (const attempt of [
    { mode: 'secuencial', seed: null },
    ...(seedBytes ? [{ mode: 'disperso', seed: seedBytes }] : [])
  ]) {
    try {
      return { found: true, mode: attempt.mode, result: extractContainer(imageData.data, attempt.seed), errors };
    } catch (error) {
      errors.push(`${attempt.mode}: ${error.message}`);
    }
  }

  return { found: false, mode: null, result: null, errors };
}

/**
 * Exporta un canvas como PNG sin perdida.
 *
 * PNG es obligatorio: la cuantizacion DCT de JPEG destruiria los LSB y con ellos
 * el payload completo.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
export function exportToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('El navegador no pudo exportar el canvas como PNG.'));
    }, 'image/png');
  });
}

/** Descarga un Blob con el nombre indicado. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // La revocacion inmediata puede cancelar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
