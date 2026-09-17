import crypto from 'crypto';
import { promisify } from 'node:util';

/**
 * SERVICIO CRIPTOGRAFICO
 *
 * - Cifrado simetrico autenticado: AES-256-GCM (NIST SP 800-38D).
 * - Derivacion de clave: PBKDF2-HMAC-SHA512, 600.000 iteraciones (OWASP).
 * - Aleatoriedad: crypto.randomBytes (CSPRNG).
 * - Asimetrico e hibrido: RSA-OAEP 4096 bits con SHA-256 y MGF1-SHA256.
 *
 * Paquete binario: [ Salt (16B) | IV (12B) | AuthTag (16B) | Ciphertext (NB) ]
 * Tamano minimo = 44 bytes.
 *
 * TODAS las operaciones costosas son ASINCRONAS a proposito. `pbkdf2Sync` y
 * `generateKeyPairSync` bloquean el event loop, y con ello el servidor entero:
 * medido con 12 peticiones concurrentes a /encrypt, un simple health check
 * pasaba de microsegundos a 2559 ms. Las variantes async de Node delegan el
 * trabajo a la threadpool de libuv, donde OpenSSL opera fuera del hilo
 * principal.
 */

const pbkdf2 = promisify(crypto.pbkdf2);
const generateKeyPair = promisify(crypto.generateKeyPair);

export const CRYPTO_CONFIG = {
  KDF: {
    ALGORITHM: 'sha512',
    ITERATIONS: 600000,
    KEY_LENGTH: 32,  // 256 bits para AES-256
    SALT_LENGTH: 16  // 128 bits
  },
  CIPHER: {
    ALGORITHM: 'aes-256-gcm',
    IV_LENGTH: 12,   // 96 bits, recomendado por NIST para GCM
    TAG_LENGTH: 16   // 128 bits
  },
  RSA: {
    MODULUS_LENGTH: 4096,
    PADDING: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    OAEP_HASH: 'sha256'
  }
};

const HEADER_SIZE =
  CRYPTO_CONFIG.KDF.SALT_LENGTH
  + CRYPTO_CONFIG.CIPHER.IV_LENGTH
  + CRYPTO_CONFIG.CIPHER.TAG_LENGTH;

/**
 * Deriva una clave de 256 bits con PBKDF2-SHA512.
 * @param {string} password
 * @param {Buffer} salt - Exactamente SALT_LENGTH bytes.
 * @returns {Promise<Buffer>} Clave de 32 bytes.
 */
export async function deriveKey(password, salt) {
  if (!password || typeof password !== 'string') {
    throw new Error('La contrasena debe ser una cadena no vacia.');
  }
  if (!Buffer.isBuffer(salt) || salt.length !== CRYPTO_CONFIG.KDF.SALT_LENGTH) {
    throw new Error(`El salt debe ser un Buffer de exactamente ${CRYPTO_CONFIG.KDF.SALT_LENGTH} bytes.`);
  }

  return pbkdf2(
    password,
    salt,
    CRYPTO_CONFIG.KDF.ITERATIONS,
    CRYPTO_CONFIG.KDF.KEY_LENGTH,
    CRYPTO_CONFIG.KDF.ALGORITHM
  );
}

/**
 * Cifra con AES-256-GCM y empaqueta en formato binario.
 * @param {Buffer|string} plaintext
 * @param {string} password
 */
export async function encryptAESGCM(plaintext, password) {
  const dataBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf-8');

  const salt = crypto.randomBytes(CRYPTO_CONFIG.KDF.SALT_LENGTH);
  const iv = crypto.randomBytes(CRYPTO_CONFIG.CIPHER.IV_LENGTH);
  const key = await deriveKey(password, salt);

  const cipher = crypto.createCipheriv(CRYPTO_CONFIG.CIPHER.ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const packedBuffer = Buffer.concat([salt, iv, authTag, ciphertext]);

  return {
    packedBuffer,
    packedBase64: packedBuffer.toString('base64'),
    saltHex: salt.toString('hex'),
    ivHex: iv.toString('hex'),
    tagHex: authTag.toString('hex'),
    ciphertextHex: ciphertext.toString('hex'),
    metrics: {
      plaintextSize: dataBuffer.length,
      ciphertextSize: ciphertext.length,
      totalPackedSize: packedBuffer.length,
      kdfIterations: CRYPTO_CONFIG.KDF.ITERATIONS,
      algorithm: 'AES-256-GCM'
    }
  };
}

/**
 * Desempaqueta y descifra un flujo [Salt|IV|Tag|Ciphertext].
 * @param {Buffer|string} packedData - Buffer, o cadena Base64 o Hex.
 * @param {string} password
 */
export async function decryptAESGCM(packedData, password) {
  let buffer;
  if (Buffer.isBuffer(packedData)) {
    buffer = packedData;
  } else if (typeof packedData === 'string') {
    const isHex = /^[0-9a-fA-F]+$/.test(packedData) && packedData.length % 2 === 0;
    buffer = Buffer.from(packedData, isHex ? 'hex' : 'base64');
  } else {
    throw new Error('Datos cifrados invalidos: se esperaba Buffer o String codificado.');
  }

  if (buffer.length < HEADER_SIZE) {
    throw new Error(
      `El paquete es demasiado corto (${buffer.length} bytes). Se requieren al menos `
      + `${HEADER_SIZE} bytes de cabecera.`
    );
  }

  let offset = 0;
  const salt = buffer.subarray(offset, offset += CRYPTO_CONFIG.KDF.SALT_LENGTH);
  const iv = buffer.subarray(offset, offset += CRYPTO_CONFIG.CIPHER.IV_LENGTH);
  const authTag = buffer.subarray(offset, offset += CRYPTO_CONFIG.CIPHER.TAG_LENGTH);
  const ciphertext = buffer.subarray(offset);

  const key = await deriveKey(password, salt);

  const decipher = crypto.createDecipheriv(CRYPTO_CONFIG.CIPHER.ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return {
      plaintextBuffer: decrypted,
      plaintextUtf8: decrypted.toString('utf-8'),
      saltHex: salt.toString('hex'),
      ivHex: iv.toString('hex'),
      tagHex: authTag.toString('hex')
    };
  } catch {
    // GCM no distingue entre contrasena incorrecta y manipulacion: en ambos
    // casos el tag no cuadra. Eso es deseable, porque un mensaje de error mas
    // especifico seria un oraculo para el atacante.
    throw new Error(
      'FALLO DE INTEGRIDAD / AUTENTICACION: el texto cifrado ha sido manipulado, la contrasena '
      + 'es incorrecta o el tag GCM no coincide.'
    );
  }
}

/**
 * Genera un par RSA de 4096 bits en PEM.
 *
 * La busqueda de primos es probabilista y su duracion no tiene techo garantizado,
 * asi que ejecutarla de forma sincrona es el peor caso posible para el event loop.
 */
export async function generateRSAKeyPair() {
  const { publicKey, privateKey } = await generateKeyPair('rsa', {
    modulusLength: CRYPTO_CONFIG.RSA.MODULUS_LENGTH,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  return { publicKey, privateKey };
}

/**
 * Cifrado RSA-OAEP con SHA-256.
 *
 * Node no ofrece variante asincrona de publicEncrypt, pero una operacion con
 * exponente publico 65537 sobre 4096 bits cuesta decenas de microsegundos: es
 * acotada y no compromete el event loop, al contrario que la generacion de claves.
 */
export function encryptRSA(data, publicKeyPem) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  return crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: CRYPTO_CONFIG.RSA.PADDING,
      oaepHash: CRYPTO_CONFIG.RSA.OAEP_HASH
    },
    buffer
  );
}

/**
 * Descifrado RSA-OAEP con SHA-256.
 *
 * La operacion privada es mas costosa que la publica (unos pocos milisegundos
 * sobre 4096 bits), pero sigue siendo acotada.
 */
export function decryptRSA(encryptedBuffer, privateKeyPem) {
  return crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: CRYPTO_CONFIG.RSA.PADDING,
      oaepHash: CRYPTO_CONFIG.RSA.OAEP_HASH
    },
    encryptedBuffer
  );
}

/**
 * Cifrado hibrido: AES-256-GCM protege los datos con una clave de sesion
 * efimera, y RSA-OAEP protege unicamente esa clave. Asi el volumen de datos deja
 * de estar limitado por el modulo RSA.
 */
export function hybridEncrypt(plaintext, recipientPublicKeyPem) {
  const ephemeralKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(CRYPTO_CONFIG.CIPHER.IV_LENGTH);
  const dataBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf-8');

  const cipher = crypto.createCipheriv(CRYPTO_CONFIG.CIPHER.ALGORITHM, ephemeralKey, iv);
  const ciphertext = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedKey = encryptRSA(ephemeralKey, recipientPublicKeyPem);

  return {
    encryptedKeyBase64: encryptedKey.toString('base64'),
    ivHex: iv.toString('hex'),
    tagHex: authTag.toString('hex'),
    ciphertextBase64: ciphertext.toString('base64')
  };
}

/** Descifrado hibrido: abre la clave de sesion con RSA y verifica el tag GCM. */
export function hybridDecrypt(encryptedKeyBase64, ivHex, tagHex, ciphertextBase64, recipientPrivateKeyPem) {
  const ephemeralKey = decryptRSA(Buffer.from(encryptedKeyBase64, 'base64'), recipientPrivateKeyPem);

  const decipher = crypto.createDecipheriv(
    CRYPTO_CONFIG.CIPHER.ALGORITHM,
    ephemeralKey,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64')),
    decipher.final()
  ]);
  return plaintext.toString('utf-8');
}
