/**
 * Extraccion de flujos de muestras desde un búfer RGBA.
 *
 * Cada estimador necesita un orden distinto: RS y SPA explotan correlacion
 * espacial y requieren los planos en orden de barrido; el X2 progresivo requiere
 * el orden de inyeccion del motor LSB (R,G,B intercalados) para poder localizar
 * el borde del payload.
 *
 * El canal alfa se excluye siempre: el motor lo deja intacto en 255 y una
 * constante no aporta informacion estadistica.
 */

/**
 * Separa el búfer RGBA en los tres planos cromaticos, en orden de barrido.
 * @param {Buffer|Uint8Array} rgba
 * @returns {{ red: Uint8Array, green: Uint8Array, blue: Uint8Array }}
 */
export function extractChannelPlanes(rgba) {
  const pixelCount = Math.floor(rgba.length / 4);
  const red = new Uint8Array(pixelCount);
  const green = new Uint8Array(pixelCount);
  const blue = new Uint8Array(pixelCount);

  for (let p = 0, i = 0; p < pixelCount; p++, i += 4) {
    red[p] = rgba[i];
    green[p] = rgba[i + 1];
    blue[p] = rgba[i + 2];
  }

  return { red, green, blue };
}

/**
 * Reconstruye el flujo en el orden de inyeccion del motor LSB: R,G,B del pixel 0,
 * luego R,G,B del pixel 1, etc.
 * @param {Buffer|Uint8Array} rgba
 * @returns {Uint8Array} Flujo de longitud 3 * totalPixeles.
 */
export function extractInterleavedRgbStream(rgba) {
  const pixelCount = Math.floor(rgba.length / 4);
  const stream = new Uint8Array(pixelCount * 3);

  for (let p = 0, i = 0, s = 0; p < pixelCount; p++, i += 4, s += 3) {
    stream[s] = rgba[i];
    stream[s + 1] = rgba[i + 1];
    stream[s + 2] = rgba[i + 2];
  }

  return stream;
}

/**
 * Histograma de 256 niveles de un flujo de muestras de 8 bits.
 * @param {Uint8Array} samples
 * @returns {Int32Array}
 */
export function buildHistogram(samples) {
  const histogram = new Int32Array(256);
  for (let i = 0; i < samples.length; i++) {
    histogram[samples[i]]++;
  }
  return histogram;
}
