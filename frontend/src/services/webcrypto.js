/**
 * Criptografia en el navegador con WebCrypto.
 *
 * Produce EXACTAMENTE el mismo paquete binario que el backend
 * ([Salt 16B | IV 12B | Tag 16B | Ciphertext]), asi que ambos lados son
 * interoperables: lo cifrado aqui se descifra alli y al contrario.
 *
 * La razon de existir de este modulo es que la contrasena maestra no tiene por
 * que salir del cliente. En la version anterior el texto claro y la contrasena
 * viajaban al servidor en el cuerpo de un POST, lo que convertia al backend en
 * un punto de compromiso innecesario: el laboratorio puede hacer todo el trabajo
 * criptografico localmente.
 *
 * Detalle de formato: WebCrypto devuelve el tag de GCM CONCATENADO al final del
 * texto cifrado, mientras el formato del laboratorio lo coloca antes. De ahi el
 * troceado explicito en ambas direcciones.
 */

const KDF_ITERATIONS = 600000;
const KDF_HASH = 'SHA-512';
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BITS = 256;

export const PACKET_HEADER_BYTES = SALT_BYTES + IV_BYTES + TAG_BYTES;

export const CRYPTO_PARAMS = {
  kdf: `PBKDF2-HMAC-${KDF_HASH}`,
  iterations: KDF_ITERATIONS,
  cipher: 'AES-256-GCM',
  saltBytes: SALT_BYTES,
  ivBytes: IV_BYTES,
  tagBytes: TAG_BYTES
};

function assertSubtleAvailable() {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'WebCrypto no esta disponible. Requiere un contexto seguro (https o localhost).'
    );
  }
}

/** Deriva la clave AES-256 con PBKDF2-SHA512. */
async function deriveAesKey(password, salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: KDF_ITERATIONS, hash: KDF_HASH },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra con AES-256-GCM y devuelve el paquete empaquetado.
 * @param {Uint8Array|string} data
 * @param {string} password
 * @returns {Promise<{ packed: Uint8Array, salt: Uint8Array, iv: Uint8Array, tag: Uint8Array, ciphertext: Uint8Array }>}
 */
export async function encryptPacket(data, password) {
  assertSubtleAvailable();
  if (!password) throw new Error('La contrasena no puede estar vacia.');

  const plaintext = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(password, salt);

  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: TAG_BYTES * 8 }, key, plaintext)
  );

  // WebCrypto entrega ciphertext||tag; el formato del laboratorio separa ambos.
  const ciphertext = sealed.subarray(0, sealed.length - TAG_BYTES);
  const tag = sealed.subarray(sealed.length - TAG_BYTES);

  const packed = new Uint8Array(PACKET_HEADER_BYTES + ciphertext.length);
  packed.set(salt, 0);
  packed.set(iv, SALT_BYTES);
  packed.set(tag, SALT_BYTES + IV_BYTES);
  packed.set(ciphertext, PACKET_HEADER_BYTES);

  return { packed, salt, iv, tag, ciphertext };
}

/**
 * Desempaqueta y descifra verificando el tag GCM.
 * @param {Uint8Array} packed
 * @param {string} password
 * @returns {Promise<Uint8Array>} Texto claro.
 */
export async function decryptPacket(packed, password) {
  assertSubtleAvailable();
  if (!password) throw new Error('La contrasena no puede estar vacia.');

  if (packed.length < PACKET_HEADER_BYTES) {
    throw new Error(
      `El paquete mide ${packed.length} bytes y la cabecera requiere ${PACKET_HEADER_BYTES}.`
    );
  }

  const salt = packed.subarray(0, SALT_BYTES);
  const iv = packed.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const tag = packed.subarray(SALT_BYTES + IV_BYTES, PACKET_HEADER_BYTES);
  const ciphertext = packed.subarray(PACKET_HEADER_BYTES);

  // WebCrypto espera ciphertext||tag.
  const sealed = new Uint8Array(ciphertext.length + TAG_BYTES);
  sealed.set(ciphertext, 0);
  sealed.set(tag, ciphertext.length);

  const key = await deriveAesKey(password, salt);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: TAG_BYTES * 8 },
      key,
      sealed
    );
    return new Uint8Array(plaintext);
  } catch {
    // GCM no distingue contrasena incorrecta de manipulacion: en ambos casos el
    // tag no cuadra, y no revelar cual de los dos es deliberado.
    throw new Error(
      'FALLO DE INTEGRIDAD / AUTENTICACION: la contrasena es incorrecta o el paquete fue manipulado.'
    );
  }
}

/**
 * Deriva la semilla de 16 bytes del recorrido disperso a partir de la contrasena.
 *
 * Se usa SHA-256 sobre la contrasena y una etiqueta de contexto, no PBKDF2: esta
 * semilla no protege confidencialidad, solo determina el ORDEN de colocacion de
 * los bits, y debe poder recalcularse en la extraccion sin almacenar nada en la
 * imagen. La confidencialidad la aporta integramente la capa AES-GCM, que si usa
 * PBKDF2 con salt aleatorio.
 *
 * Consecuencia asumida: la misma contrasena produce siempre la misma permutacion.
 * Es una capa que encarece el estegoanalisis clasico (destruye el prefijo
 * contiguo que localiza el ataque chi-cuadrado), no un sustituto del cifrado.
 *
 * @param {string} password
 * @returns {Promise<Uint8Array>} 16 bytes.
 */
export async function deriveWalkSeed(password) {
  assertSubtleAvailable();
  if (!password) throw new Error('La contrasena no puede estar vacia.');

  const material = new TextEncoder().encode(`lsb-walk-v1:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return new Uint8Array(digest).subarray(0, 16);
}

/** Lee un File o Blob completo como Uint8Array. */
export async function readFileBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

/** Representacion hexadecimal de un búfer, para los visualizadores. */
export function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Codifica bytes en Base64 sin desbordar la pila con payloads grandes. */
export function toBase64(bytes) {
  const CHUNK = 0x8000;
  let result = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    result += String.fromCharCode.apply(null, bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(result);
}

/** Decodifica Base64 a bytes. */
export function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
