/**
 * Fabrica de imagenes sinteticas con verdad de terreno conocida, para medir la
 * exactitud de los estimadores contra tasas de inyeccion exactas.
 *
 * Todo es determinista a partir de una semilla: un fallo es reproducible.
 */

/** PRNG mulberry32. No criptografico; solo para fixtures reproducibles. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal estandar por Box-Muller. */
function standardNormal(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp8(value) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

/**
 * Portadora que imita la estadistica de una fotografia: estructura de baja
 * frecuencia, una banda de textura y ruido de sensor gaussiano.
 *
 * El ruido es el ingrediente decisivo: deja los LSB practicamente aleatorios
 * (entropia ~1.0) mientras la correlacion espacial de los bits altos permanece.
 * Esa asimetria es la que explotan RS y SPA, y la que hace inutil cualquier
 * umbral sobre la entropia de los LSB.
 *
 * @returns {{ data: Buffer, width: number, height: number }} Búfer RGBA.
 */
export function createNaturalImage(options = {}) {
  const {
    width = 320,
    height = 240,
    seed = 20260917,
    noiseSigma = 2
  } = options;

  const rand = mulberry32(seed);
  const data = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;

      const structure =
        118
        + 46 * Math.sin(nx * 5.1 + 0.4) * Math.cos(ny * 3.7)
        + 22 * Math.sin((nx + ny) * 9.3)
        - 30 * ny;

      // Banda de textura en el tercio central: una foto real nunca es
      // uniformemente suave.
      const texture = ny > 0.35 && ny < 0.65
        ? 14 * Math.sin(x * 1.9) * Math.sin(y * 2.3)
        : 0;

      const base = structure + texture;

      data[i] = clamp8(base + 16 + standardNormal(rand) * noiseSigma);
      data[i + 1] = clamp8(base + 2 + standardNormal(rand) * noiseSigma);
      data[i + 2] = clamp8(base - 19 + standardNormal(rand) * noiseSigma);
      data[i + 3] = 255;
    }
  }

  return { data, width, height };
}

/**
 * Portadora tras un pipeline de camara: correccion gamma seguida de cuantizacion.
 *
 * Esa cadena produce la ESTRUCTURA DE PEINE del histograma (picos y huecos
 * alternados) que se observa en cualquier foto salida de una camara o un codec.
 * Es la unica clase de portadora sobre la que el ataque X2 de PoVs es
 * concluyente: X2/df ~944 limpia frente a ~1.0 inyectada, contra 1.67 vs 1.91 en
 * una portadora de histograma liso.
 */
export function createCameraPipelineImage(options = {}) {
  const {
    width = 320,
    height = 240,
    seed = 20260917,
    noiseSigma = 2,
    gamma = 2.2,
    quantizationStep = 3
  } = options;

  const { data } = createNaturalImage({ width, height, seed, noiseSigma });

  for (let i = 0; i < data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const position = i + channel;
      const corrected = Math.pow(data[position] / 255, 1 / gamma) * 255;
      data[position] = clamp8(Math.round(corrected / quantizationStep) * quantizationStep);
    }
  }

  return { data, width, height };
}

/**
 * Portadora sin ruido de sensor: gradientes puros. Sus LSB estan correlacionados
 * con la estructura, asi que su entropia LSB es baja. Es el unico tipo de imagen
 * donde un umbral de entropia parece funcionar, y por eso no existe en la
 * naturaleza.
 */
export function createSyntheticSmoothImage(options = {}) {
  const { width = 320, height = 240 } = options;
  const data = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const base = 96 + Math.floor((x / width) * 48) + Math.floor((y / height) * 24);
      data[i] = clamp8(base + 12);
      data[i + 1] = clamp8(base);
      data[i + 2] = clamp8(base - 14);
      data[i + 3] = 255;
    }
  }

  return { data, width, height };
}

/** Cabecera de 4 bytes big-endian del protocolo LSB del laboratorio. */
function buildLengthHeader(payloadLength) {
  return Uint8Array.from([
    (payloadLength >>> 24) & 0xff,
    (payloadLength >>> 16) & 0xff,
    (payloadLength >>> 8) & 0xff,
    payloadLength & 0xff
  ]);
}

/**
 * Payload de bytes uniformemente aleatorios: el modelo estadistico correcto de
 * un texto cifrado con AES-GCM.
 */
export function createRandomPayload(byteLength, seed = 777) {
  const rand = mulberry32(seed);
  const payload = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    payload[i] = Math.floor(rand() * 256);
  }
  return payload;
}

/**
 * Inyeccion LSB secuencial, replicando el protocolo exacto del motor de Canvas:
 * cabecera de 4 bytes big-endian, recorrido intercalado R,G,B, y cada byte de
 * MSB a LSB.
 *
 * @param {Buffer} rgba - Portadora (no se modifica).
 */
export function embedLsbSequential(rgba, payload) {
  const data = Buffer.from(rgba);
  const totalSamples = Math.floor(data.length / 4) * 3;

  const header = buildLengthHeader(payload.length);
  const stream = new Uint8Array(header.length + payload.length);
  stream.set(header, 0);
  stream.set(payload, header.length);

  const requiredSamples = stream.length * 8;
  if (requiredSamples > totalSamples) {
    throw new Error(
      `El payload requiere ${requiredSamples} muestras y la portadora solo ofrece ${totalSamples}.`
    );
  }

  let byteIndex = 0;
  let bitOffset = 7;
  let embeddedSamples = 0;

  outer:
  for (let i = 0; i < data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      if (byteIndex >= stream.length) break outer;

      const bit = (stream[byteIndex] >>> bitOffset) & 1;
      const position = i + channel;
      data[position] = (data[position] & 0xfe) | bit;
      embeddedSamples++;

      bitOffset--;
      if (bitOffset < 0) {
        bitOffset = 7;
        byteIndex++;
      }
    }
  }

  return {
    data,
    embeddedSamples,
    totalSamples,
    embeddedFraction: embeddedSamples / totalSamples
  };
}

/**
 * Inyeccion LSB dispersa: se elige una fraccion `rate` de muestras al azar y se
 * sobrescribe su LSB con un bit aleatorio. Es el modelo que asumen RS y SPA.
 *
 * Sobrescribir con un bit aleatorio solo cambia la muestra la mitad de las veces:
 * la tasa p es la fraccion de muestras USADAS, no de muestras alteradas.
 *
 * @param {Buffer} rgba - Portadora (no se modifica).
 */
export function embedLsbRandomSpread(rgba, rate, seed = 1234) {
  if (rate < 0 || rate > 1) {
    throw new Error(`La tasa de inyeccion debe estar en [0, 1], recibida ${rate}.`);
  }

  const data = Buffer.from(rgba);
  const pixelCount = Math.floor(data.length / 4);
  const totalSamples = pixelCount * 3;
  const rand = mulberry32(seed);

  // Posiciones RGB (sin alfa) mezcladas con Fisher-Yates para elegir un
  // subconjunto uniforme sin repeticion.
  const positions = new Int32Array(totalSamples);
  for (let p = 0, s = 0; p < pixelCount; p++) {
    const base = p * 4;
    positions[s++] = base;
    positions[s++] = base + 1;
    positions[s++] = base + 2;
  }
  for (let i = totalSamples - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = positions[i];
    positions[i] = positions[j];
    positions[j] = tmp;
  }

  const usedSamples = Math.round(rate * totalSamples);
  let changedSamples = 0;

  for (let k = 0; k < usedSamples; k++) {
    const position = positions[k];
    const bit = rand() < 0.5 ? 0 : 1;
    const original = data[position];
    const modified = (original & 0xfe) | bit;
    if (modified !== original) changedSamples++;
    data[position] = modified;
  }

  return {
    data,
    usedSamples,
    changedSamples,
    totalSamples,
    rate: usedSamples / totalSamples
  };
}
