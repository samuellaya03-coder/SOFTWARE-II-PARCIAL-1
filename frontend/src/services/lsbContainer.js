/**
 * Contenedor LSB: formato binario y colocacion de bits.
 *
 * Modulo PURO, sin dependencias del navegador ni de Node, para que la misma
 * implementacion que usa el motor de Canvas sea la que validan las pruebas del
 * backend. Una sola fuente de verdad para el formato.
 *
 * FORMATO (cabecera de 16 bytes, big-endian):
 *
 *   offset  tam  campo
 *   0       4    magic "STG1"
 *   4       1    version
 *   5       1    flags
 *   6       4    longitud del payload
 *   10      2    longitud de los metadatos
 *   12      4    CRC-32 de (metadatos || payload)
 *   16      ml   metadatos, JSON UTF-8
 *   16+ml   pl   payload
 *
 * El magic y el CRC resuelven una ambiguedad que la version anterior no podia
 * resolver: distinguir "aqui no hay nada" de "hay algo y esta corrupto" de "hay
 * algo y la contrasena es incorrecta". Antes se adivinaba comprobando si la
 * longitud leida cabia en la imagen, lo que aceptaba basura como mensaje valido.
 */

export const MAGIC = Uint8Array.from([0x53, 0x54, 0x47, 0x31]); // "STG1"
export const VERSION = 1;
export const HEADER_SIZE = 16;

export const FLAGS = {
  /** El payload es un paquete AES-256-GCM [salt|iv|tag|ciphertext]. */
  ENCRYPTED: 0x01,
  /** El payload es un archivo; los metadatos llevan nombre y tipo MIME. */
  FILE: 0x02,
  /** Colocacion dispersa mediante permutacion sembrada por contrasena. */
  SCATTERED: 0x04
};

// ---------------------------------------------------------------------------
// CRC-32 (IEEE 802.3: polinomio reflejado 0xEDB88320)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * CRC-32 de una secuencia de bytes.
 * @param {Uint8Array} bytes
 * @returns {number} Entero sin signo de 32 bits.
 */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Construccion y lectura del contenedor
// ---------------------------------------------------------------------------

function writeUint32BE(target, offset, value) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function readUint32BE(source, offset) {
  return (
    ((source[offset] << 24)
      | (source[offset + 1] << 16)
      | (source[offset + 2] << 8)
      | source[offset + 3]) >>> 0
  );
}

/**
 * Ensambla el contenedor completo.
 *
 * @param {object} input
 * @param {Uint8Array} input.payload
 * @param {object|null} [input.meta] - Metadatos serializables (nombre, tipo MIME).
 * @param {boolean} [input.encrypted]
 * @param {boolean} [input.scattered]
 * @returns {Uint8Array}
 */
export function encodeContainer({ payload, meta = null, encrypted = false, scattered = false }) {
  if (!(payload instanceof Uint8Array)) {
    throw new Error('El payload debe ser un Uint8Array.');
  }

  const metaBytes = meta ? new TextEncoder().encode(JSON.stringify(meta)) : new Uint8Array(0);
  if (metaBytes.length > 0xffff) {
    throw new Error(`Los metadatos ocupan ${metaBytes.length} bytes y el maximo es 65535.`);
  }

  let flags = 0;
  if (encrypted) flags |= FLAGS.ENCRYPTED;
  if (meta) flags |= FLAGS.FILE;
  if (scattered) flags |= FLAGS.SCATTERED;

  const container = new Uint8Array(HEADER_SIZE + metaBytes.length + payload.length);

  container.set(MAGIC, 0);
  container[4] = VERSION;
  container[5] = flags;
  writeUint32BE(container, 6, payload.length);
  container[10] = (metaBytes.length >>> 8) & 0xff;
  container[11] = metaBytes.length & 0xff;

  container.set(metaBytes, HEADER_SIZE);
  container.set(payload, HEADER_SIZE + metaBytes.length);

  // El CRC cubre metadatos y payload: si se altera cualquiera, la extraccion lo
  // detecta sin necesidad de la contrasena.
  writeUint32BE(container, 12, crc32(container.subarray(HEADER_SIZE)));

  return container;
}

/**
 * Interpreta la cabecera de 16 bytes.
 * @param {Uint8Array} header
 * @returns {{ version: number, flags: number, payloadLength: number, metaLength: number, crc: number }}
 */
export function decodeHeader(header) {
  if (header.length < HEADER_SIZE) {
    throw new Error(`La cabecera necesita ${HEADER_SIZE} bytes y se leyeron ${header.length}.`);
  }

  for (let i = 0; i < MAGIC.length; i++) {
    if (header[i] !== MAGIC[i]) {
      throw new Error('NO_CONTAINER: la imagen no contiene un contenedor LSB de este laboratorio.');
    }
  }

  const version = header[4];
  if (version !== VERSION) {
    throw new Error(`Version de contenedor no soportada: ${version} (esperada ${VERSION}).`);
  }

  return {
    version,
    flags: header[5],
    payloadLength: readUint32BE(header, 6),
    metaLength: (header[10] << 8) | header[11],
    crc: readUint32BE(header, 12)
  };
}

/**
 * Separa metadatos y payload de un cuerpo ya extraido, verificando el CRC.
 * @param {{ payloadLength: number, metaLength: number, crc: number, flags: number }} header
 * @param {Uint8Array} body - metadatos seguidos del payload.
 */
export function decodeBody(header, body) {
  const expected = header.metaLength + header.payloadLength;
  if (body.length !== expected) {
    throw new Error(`El cuerpo mide ${body.length} bytes y la cabecera declara ${expected}.`);
  }

  if (crc32(body) !== header.crc) {
    throw new Error(
      'CRC_MISMATCH: se encontro un contenedor valido pero su contenido esta corrupto. '
      + 'La imagen pudo recomprimirse con perdida o alterarse tras la inyeccion.'
    );
  }

  const metaBytes = body.subarray(0, header.metaLength);
  const payload = body.subarray(header.metaLength);

  let meta = null;
  if (header.metaLength > 0) {
    try {
      meta = JSON.parse(new TextDecoder().decode(metaBytes));
    } catch {
      throw new Error('Los metadatos del contenedor no son JSON valido.');
    }
  }

  return {
    meta,
    payload,
    encrypted: (header.flags & FLAGS.ENCRYPTED) !== 0,
    isFile: (header.flags & FLAGS.FILE) !== 0,
    scattered: (header.flags & FLAGS.SCATTERED) !== 0
  };
}

// ---------------------------------------------------------------------------
// Recorrido de muestras
// ---------------------------------------------------------------------------

/**
 * PRNG sfc32: 128 bits de estado, rapido y de buena distribucion.
 * No es criptografico y no lo necesita: la confidencialidad la aporta AES-GCM.
 * Aqui solo se exige que la permutacion sea reproducible e impredecible sin la
 * contrasena.
 */
function sfc32(a, b, c, d) {
  return function next() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Convierte 16 bytes de semilla en el estado inicial del PRNG.
 * @param {Uint8Array} seedBytes - Al menos 16 bytes.
 */
function prngFromSeed(seedBytes) {
  if (seedBytes.length < 16) {
    throw new Error(`La semilla necesita al menos 16 bytes y tiene ${seedBytes.length}.`);
  }
  const view = new DataView(seedBytes.buffer, seedBytes.byteOffset, 16);
  const prng = sfc32(
    view.getUint32(0, false),
    view.getUint32(4, false),
    view.getUint32(8, false),
    view.getUint32(12, false)
  );
  // El estado inicial de sfc32 necesita mezclarse antes de ser util.
  for (let i = 0; i < 12; i++) prng();
  return prng;
}

/**
 * Secuencia de indices de muestra en la que se escriben los bits.
 *
 * Sin semilla el recorrido es SECUENCIAL: 0, 1, 2, ... Es el modo legible, que
 * permite detectar un contenedor sin conocer la contrasena, pero deja el payload
 * en un prefijo contiguo y por tanto localizable por el ataque chi-cuadrado
 * progresivo.
 *
 * Con semilla el recorrido es una PERMUTACION parcial sembrada por la
 * contrasena, generada con un Fisher-Yates perezoso: se selecciona el indice
 * i-esimo de una permutacion uniforme usando memoria O(k) en lugar de O(N),
 * donde k son los bits que realmente se necesitan. Eso importa: una imagen de
 * 12 MP tiene 36 millones de muestras, y materializar la permutacion completa
 * costaria 144 MB.
 *
 * Al dispersar el payload por toda la imagen desaparece el prefijo contiguo, y
 * con el la capacidad del chi-cuadrado de localizar el borde. La inyeccion sigue
 * siendo detectable por RS Analysis y SPA, que no asumen localizacion alguna.
 *
 * @param {number} totalSamples
 * @param {Uint8Array|null} seedBytes
 */
export function createWalk(totalSamples, seedBytes = null) {
  if (!seedBytes) {
    let cursor = 0;
    return {
      scattered: false,
      next() {
        if (cursor >= totalSamples) {
          throw new Error('Se agotaron las muestras disponibles en la imagen.');
        }
        return cursor++;
      }
    };
  }

  const prng = prngFromSeed(seedBytes);
  const swapped = new Map();
  let index = 0;

  return {
    scattered: true,
    next() {
      if (index >= totalSamples) {
        throw new Error('Se agotaron las muestras disponibles en la imagen.');
      }

      // Fisher-Yates perezoso: intercambia la posicion `index` con una posicion
      // aleatoria de la cola y devuelve lo que quede en `index`.
      const target = index + Math.floor(prng() * (totalSamples - index));
      const atIndex = swapped.get(index) ?? index;
      const atTarget = swapped.get(target) ?? target;

      swapped.set(target, atIndex);
      swapped.delete(index);
      index++;

      return atTarget;
    }
  };
}

// ---------------------------------------------------------------------------
// Lectura y escritura sobre el búfer RGBA
// ---------------------------------------------------------------------------

/**
 * Traduce un indice de muestra al offset del byte correspondiente en un búfer
 * RGBA. Se recorren R, G y B de cada pixel y se salta el canal alfa, que el
 * motor deja intacto para no introducir aberraciones de transparencia.
 */
function sampleOffset(sampleIndex) {
  return Math.floor(sampleIndex / 3) * 4 + (sampleIndex % 3);
}

/** Muestras RGB utiles de un búfer RGBA. */
export function countSamples(rgbaLength) {
  return Math.floor(rgbaLength / 4) * 3;
}

/** Bytes de contenedor que caben en una imagen, cabecera incluida. */
export function capacityBytes(rgbaLength) {
  return Math.floor(countSamples(rgbaLength) / 8);
}

/**
 * Capacidad util para el payload, descontando cabecera y metadatos.
 * @param {number} rgbaLength
 * @param {number} [metaLength=0]
 */
export function payloadCapacityBytes(rgbaLength, metaLength = 0) {
  return Math.max(0, capacityBytes(rgbaLength) - HEADER_SIZE - metaLength);
}

/**
 * Escribe los bytes de un contenedor en los LSB, siguiendo el recorrido dado.
 *
 * Mascara aplicada por muestra: canal' = (canal & 0xFE) | bit, es decir una
 * alteracion fotometrica maxima de +-1 sobre 255 niveles.
 *
 * @param {Uint8Array|Uint8ClampedArray} rgba - Se modifica en el sitio.
 * @param {Uint8Array} container
 * @param {{ next: () => number }} walk
 * @returns {{ samplesUsed: number }}
 */
export function writeContainer(rgba, container, walk) {
  const available = countSamples(rgba.length);
  const needed = container.length * 8;

  if (needed > available) {
    throw new Error(
      `El contenedor necesita ${needed} muestras y la imagen ofrece ${available}. `
      + `Capacidad maxima: ${capacityBytes(rgba.length)} bytes.`
    );
  }

  let samplesUsed = 0;
  for (let byteIndex = 0; byteIndex < container.length; byteIndex++) {
    const byte = container[byteIndex];
    for (let bit = 7; bit >= 0; bit--) {
      const offset = sampleOffset(walk.next());
      rgba[offset] = (rgba[offset] & 0xfe) | ((byte >>> bit) & 1);
      samplesUsed++;
    }
  }

  return { samplesUsed };
}

/**
 * Lee `byteCount` bytes desde los LSB siguiendo el recorrido dado.
 * @param {Uint8Array|Uint8ClampedArray} rgba
 * @param {number} byteCount
 * @param {{ next: () => number }} walk
 * @returns {Uint8Array}
 */
export function readBytes(rgba, byteCount, walk) {
  const available = countSamples(rgba.length);
  if (byteCount * 8 > available) {
    throw new Error(
      `Se piden ${byteCount} bytes (${byteCount * 8} muestras) y la imagen solo ofrece ${available}.`
    );
  }

  const output = new Uint8Array(byteCount);
  for (let byteIndex = 0; byteIndex < byteCount; byteIndex++) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit++) {
      byte = (byte << 1) | (rgba[sampleOffset(walk.next())] & 1);
    }
    output[byteIndex] = byte;
  }

  return output;
}

/**
 * Extrae e interpreta el contenedor completo de un búfer RGBA.
 *
 * @param {Uint8Array|Uint8ClampedArray} rgba
 * @param {Uint8Array|null} seedBytes - Semilla del recorrido disperso, o null para secuencial.
 */
export function extractContainer(rgba, seedBytes = null) {
  const totalSamples = countSamples(rgba.length);
  const walk = createWalk(totalSamples, seedBytes);

  const header = decodeHeader(readBytes(rgba, HEADER_SIZE, walk));

  const bodyLength = header.metaLength + header.payloadLength;
  const maxBody = capacityBytes(rgba.length) - HEADER_SIZE;
  if (bodyLength > maxBody) {
    throw new Error(
      `La cabecera declara un cuerpo de ${bodyLength} bytes y la imagen solo admite ${maxBody}.`
    );
  }

  const body = readBytes(rgba, bodyLength, walk);
  return { header, ...decodeBody(header, body) };
}

/**
 * Inyecta un contenedor en un búfer RGBA.
 *
 * @param {Uint8Array|Uint8ClampedArray} rgba - Se modifica en el sitio.
 * @param {object} input - Igual que encodeContainer, mas `seedBytes`.
 * @param {Uint8Array|null} [input.seedBytes]
 */
export function injectContainer(rgba, { payload, meta = null, encrypted = false, seedBytes = null }) {
  const container = encodeContainer({
    payload,
    meta,
    encrypted,
    scattered: seedBytes !== null
  });

  const walk = createWalk(countSamples(rgba.length), seedBytes);
  const { samplesUsed } = writeContainer(rgba, container, walk);

  return {
    containerBytes: container.length,
    headerBytes: HEADER_SIZE,
    metaBytes: container.length - HEADER_SIZE - payload.length,
    payloadBytes: payload.length,
    samplesUsed,
    totalSamples: countSamples(rgba.length),
    scattered: seedBytes !== null,
    capacityUsedRatio: samplesUsed / countSamples(rgba.length)
  };
}
