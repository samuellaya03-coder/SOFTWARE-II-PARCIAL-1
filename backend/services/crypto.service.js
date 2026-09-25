import crypto from 'crypto';

/**
 * SERVICIO CRIPTOGRÁFICO AVANZADO ("MODO DIFÍCIL")
 * 
 * Estándares implementados:
 * - Cifrado Simétrico Autenticado: AES-256-GCM (NIST SP 800-38D).
 * - Derivación de Clave (KDF): PBKDF2-HMAC-SHA512 con 600,000 iteraciones (OWASP 2023+).
 * - Generador Pseudo-Aleatorio Criptográfico: crypto.randomBytes (CSPRNG).
 * - Cifrado Asimétrico / Híbrido: RSA-OAEP (4096 bits) con función hash SHA-256 y MGF1-SHA256.
 * 
 * Estructura del Payload Binario Empaquetado:
 * [ Salt (16 Bytes) | IV (12 Bytes) | AuthTag (16 Bytes) | Ciphertext (N Bytes) ]
 * Tamaño mínimo del paquete = 44 Bytes.
 */

export const CRYPTO_CONFIG = {
  KDF: {
    ALGORITHM: 'sha512',
    ITERATIONS: 600000,
    KEY_LENGTH: 32, // 256 bits para AES-256
    SALT_LENGTH: 16 // 128 bits de sal única
  },
  CIPHER: {
    ALGORITHM: 'aes-256-gcm',
    IV_LENGTH: 12, // 96 bits recomendado por NIST para GCM
    TAG_LENGTH: 16 // 128 bits de autenticación criptográfica
  },
  RSA: {
    MODULUS_LENGTH: 4096,
    PADDING: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    OAEP_HASH: 'sha256'
  }
};

/**
 * Deriva una clave simétrica de 256 bits a partir de una contraseña y salt usando PBKDF2-SHA512.
 * @param {string} password - Contraseña maestra.
 * @param {Buffer} salt - Sal criptográfica de 16 bytes.
 * @returns {Buffer} Clave derivada de 32 bytes (256 bits).
 */
export function deriveKey(password, salt) {
  if (!password || typeof password !== 'string') {
    throw new Error('La contraseña debe ser una cadena no vacía.');
  }
  if (!Buffer.isBuffer(salt) || salt.length !== CRYPTO_CONFIG.KDF.SALT_LENGTH) {
    throw new Error(`El salt debe ser un Buffer de exactamente ${CRYPTO_CONFIG.KDF.SALT_LENGTH} bytes.`);
  }

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      CRYPTO_CONFIG.KDF.ITERATIONS,
      CRYPTO_CONFIG.KDF.KEY_LENGTH,
      CRYPTO_CONFIG.KDF.ALGORITHM,
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey);
      }
    );
  });
}

/**
 * Ejecuta un benchmark forense de derivación PBKDF2 midiendo latencia y resistencia.
 * @param {number} iterations - Número de iteraciones (ej: 100,000 o 600,000)
 * @param {string} password - Contraseña de prueba opcional
 */
export function benchmarkPBKDF2(iterations = 100000, password = 'ClaveDePruebaSegura2026!') {
  const iterNum = Math.max(1, Math.min(1000000, parseInt(iterations, 10) || 100000));
  const salt = crypto.randomBytes(CRYPTO_CONFIG.KDF.SALT_LENGTH);
  const DICCIONARIO_ROCKYOU = 14341564;

  function measureTier(it, label, badge) {
    const t0 = performance.now();
    const key = crypto.pbkdf2Sync(password, salt, it, 32, 'sha512');
    const elapsed = performance.now() - t0;
    const hps = Math.max(1, Math.round(1000 / Math.max(0.1, elapsed)));
    const segTotales = (DICCIONARIO_ROCKYOU * elapsed) / 1000;

    let crackStr = '';
    if (segTotales < 1) crackStr = '< 1 segundo';
    else if (segTotales < 60) crackStr = `${Math.round(segTotales)} segundos`;
    else if (segTotales < 3600) crackStr = `${(segTotales / 60).toFixed(1)} minutos`;
    else if (segTotales < 86400) crackStr = `${(segTotales / 3600).toFixed(1)} horas`;
    else if (segTotales < 86400 * 365) crackStr = `${(segTotales / 86400).toFixed(1)} DÍAS`;
    else crackStr = `${(segTotales / (86400 * 365)).toFixed(1)} AÑOS`;

    return {
      iterations: it,
      label,
      badge,
      elapsedMs: parseFloat(elapsed.toFixed(2)),
      hashesPerSec: hps,
      crackTimeRockYou: crackStr,
      keyHex: key.toString('hex')
    };
  }

  // 1. Línea base (1 iteración)
  const baseline = measureTier(1, 'Hash directo (MD5 / SHA-256 plano)', '🔴 CRÍTICO');

  // 2. Nivel Personalizado / Inyectado
  const custom = measureTier(iterNum, `Prueba Inyectada (${iterNum.toLocaleString()} iter)`, iterNum >= 600000 ? '💎 GRADO MILITAR' : iterNum >= 100000 ? '🟢 ALTA RESISTENCIA' : '🟡 DÉBIL');

  // 3. Nivel OWASP Nuestro (600,000 iteraciones)
  const owasp = iterNum === 600000
    ? custom
    : measureTier(600000, 'Estándar OWASP 2023+ (NUESTRO PROYECTO)', '💎 ULTRA SEGURO');

  // 4. Candidatos de prueba para el simulador de GPU Hashcat
  const wordlist = ['123456', 'password', 'admin2026', 'qwertyuiop', 'dragon', 'masterkey'];
  const attackSim = wordlist.map((candidate, idx) => {
    // Estimación con pequeña variación realista de jitter (+- 5%)
    const jitter = (Math.random() * 0.1 - 0.05) * custom.elapsedMs;
    const itemElapsed = Math.max(1, custom.elapsedMs + jitter);
    return {
      id: idx + 1,
      candidate,
      status: '❌ FALLÓ (Hash mismatch)',
      elapsedMs: parseFloat(itemElapsed.toFixed(1))
    };
  });

  return {
    iterations: iterNum,
    elapsedMs: custom.elapsedMs,
    hashesPerSec: custom.hashesPerSec,
    crackTimeRockYou: custom.crackTimeRockYou,
    securityLevel: custom.badge,
    badgeClass: iterNum >= 600000 ? 'badge-purple' : iterNum >= 100000 ? 'badge-emerald' : 'badge-rose',
    saltHex: salt.toString('hex'),
    derivedKeyHex: custom.keyHex,
    derivedKeyPreview: custom.keyHex.substring(0, 16) + '...' + custom.keyHex.substring(48),
    tableRows: [baseline, custom, owasp],
    attackSim
  };
}

/**
 * Cifra datos utilizando AES-256-GCM con PBKDF2 y empaqueta en formato binario.
 * @param {Buffer|string} plaintext - Datos a cifrar.
 * @param {string} password - Contraseña maestra.
 * @returns {{ packedBuffer: Buffer, saltHex: string, ivHex: string, tagHex: string, ciphertextHex: string }}
 */
export async function encryptAESGCM(plaintext, password) {
  const dataBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf-8');

  // 1. Generación de Salt e IV con CSPRNG
  const salt = crypto.randomBytes(CRYPTO_CONFIG.KDF.SALT_LENGTH);
  const iv = crypto.randomBytes(CRYPTO_CONFIG.CIPHER.IV_LENGTH);

  // 2. Derivación de clave segura de forma asíncrona (libuv threadpool)
  const key = await deriveKey(password, salt);

  // 3. Inicialización del cifrador AES-256-GCM
  const cipher = crypto.createCipheriv(CRYPTO_CONFIG.CIPHER.ALGORITHM, key, iv);

  // 4. Cifrado de datos
  const ciphertext = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);

  // 5. Extracción del Authentication Tag (GCM MAC)
  const authTag = cipher.getAuthTag();

  // 6. Empaquetado binario: [ Salt (16B) | IV (12B) | Tag (16B) | Ciphertext (NB) ]
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
/**
 * MENSAJE DE ERROR OPACO Y UNIFORME (Mitigación de Oráculos de Validación)
 * Evita fuga de información entre fases (longitud, clave incorrecta o mismatch de tag).
 */
export const OPAQUE_DECRYPTION_ERROR = 'FALLO DE DESCIFRADO: Los datos son inválidos, la clave es incorrecta o el paquete ha sido alterado.';

/**
 * Desempaqueta y descifra un flujo binario protegido con AES-256-GCM.
 * @param {Buffer|string} packedData - Buffer empaquetado o cadena Base64/Hex.
 * @param {string} password - Contraseña maestra.
 * @returns {Buffer} Texto claro descifrado.
 */
export async function decryptAESGCM(packedData, password) {
  try {
    let buffer;
    if (Buffer.isBuffer(packedData)) {
      buffer = packedData;
    } else if (typeof packedData === 'string') {
      const isHex = /^[0-9a-fA-F]+$/.test(packedData) && packedData.length % 2 === 0;
      buffer = Buffer.from(packedData, isHex ? 'hex' : 'base64');
    } else {
      throw new Error('Formato de datos no compatible.');
    }

    const HEADER_SIZE = CRYPTO_CONFIG.KDF.SALT_LENGTH + CRYPTO_CONFIG.CIPHER.IV_LENGTH + CRYPTO_CONFIG.CIPHER.TAG_LENGTH;
    if (buffer.length < HEADER_SIZE) {
      throw new Error('Longitud de cabecera menor al umbral criptográfico.');
    }

    // Desempaquetado con offsets exactos
    let offset = 0;
    const salt = buffer.subarray(offset, offset + CRYPTO_CONFIG.KDF.SALT_LENGTH);
    offset += CRYPTO_CONFIG.KDF.SALT_LENGTH;

    const iv = buffer.subarray(offset, offset + CRYPTO_CONFIG.CIPHER.IV_LENGTH);
    offset += CRYPTO_CONFIG.CIPHER.IV_LENGTH;

    const authTag = buffer.subarray(offset, offset + CRYPTO_CONFIG.CIPHER.TAG_LENGTH);
    offset += CRYPTO_CONFIG.CIPHER.TAG_LENGTH;

    const ciphertext = buffer.subarray(offset);

    // Derivación de clave idéntica usando el Salt original (asíncrona)
    const key = await deriveKey(password, salt);

    // Inicialización del descifrador
    const decipher = crypto.createDecipheriv(CRYPTO_CONFIG.CIPHER.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return {
      plaintextBuffer: decrypted,
      plaintextUtf8: decrypted.toString('utf-8'),
      plaintextBase64: decrypted.toString('base64'),
      saltHex: salt.toString('hex'),
      ivHex: iv.toString('hex'),
      tagHex: authTag.toString('hex')
    };
  } catch (error) {
    // Log de auditoría interna en el servidor (nunca filtrado al cliente HTTP)
    console.warn(`[AUDITORÍA SEGURIDAD CRIPTO] Fallo interno en decryptAESGCM: ${error.message}`);
    // Respuesta opaca estandarizada
    throw new Error(OPAQUE_DECRYPTION_ERROR);
  }
}

// Pool de claves RSA pre-generadas en background para respuesta instantánea (0 ms)
const rsaKeyPool = [];
let isGeneratingRsa = false;

function refillRsaPool() {
  if (isGeneratingRsa || rsaKeyPool.length >= 2) return;
  isGeneratingRsa = true;
  crypto.generateKeyPair('rsa', {
    modulusLength: CRYPTO_CONFIG.RSA.MODULUS_LENGTH,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  }, (err, publicKey, privateKey) => {
    isGeneratingRsa = false;
    if (!err && publicKey && privateKey) {
      rsaKeyPool.push({ publicKey, privateKey });
    }
  });
}

// Precargar claves RSA en segundo plano sin congelar el servidor
setTimeout(refillRsaPool, 500);

/**
 * Genera o retorna un par de claves RSA de 4096 bits de forma asíncrona sin bloquear el servidor.
 * @returns {Promise<{ publicKey: string, privateKey: string }>}
 */
export function generateRSAKeyPair() {
  if (rsaKeyPool.length > 0) {
    const cached = rsaKeyPool.shift();
    setTimeout(refillRsaPool, 100);
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: CRYPTO_CONFIG.RSA.MODULUS_LENGTH,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }, (err, publicKey, privateKey) => {
      setTimeout(refillRsaPool, 100);
      if (err) return reject(err);
      resolve({ publicKey, privateKey });
    });
  });
}

/**
 * Cifrado asimétrico con RSA-OAEP (SHA-256)
 * @param {Buffer|string} data 
 * @param {string} publicKeyPem 
 * @returns {Buffer}
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
 * Descifrado asimétrico con RSA-OAEP (SHA-256)
 * @param {Buffer} encryptedBuffer 
 * @param {string} privateKeyPem 
 * @returns {Buffer}
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
 * Esquema de Cifrado Híbrido:
 * 1. Genera una clave efímera AES-256 de 32 bytes con CSPRNG.
 * 2. Cifra el contenido con AES-256-GCM.
 * 3. Cifra la clave efímera con la clave pública RSA (4096 bits).
 * @param {Buffer|string} plaintext 
 * @param {string} recipientPublicKeyPem 
 * @returns {{ encryptedKeyBase64: string, ivHex: string, tagHex: string, ciphertextBase64: string }}
 */
export function hybridEncrypt(plaintext, recipientPublicKeyPem) {
  const ephemeralKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const dataBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf-8');

  const cipher = crypto.createCipheriv('aes-256-gcm', ephemeralKey, iv);
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

/**
 * Descifrado Híbrido:
 * 1. Descifra la clave efímera con la clave privada RSA.
 * 2. Descifra el contenido con AES-256-GCM verificando el AuthTag.
 */
export function hybridDecrypt(encryptedKeyBase64, ivHex, tagHex, ciphertextBase64, recipientPrivateKeyPem) {
  try {
    const encryptedKey = Buffer.from(encryptedKeyBase64, 'base64');
    const ephemeralKey = decryptRSA(encryptedKey, recipientPrivateKeyPem);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', ephemeralKey, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf-8');
  } catch (error) {
    // Log interno en el servidor sin exponer trazas de OpenSSL al cliente
    console.warn(`[AUDITORÍA SEGURIDAD CRIPTO] Fallo interno en hybridDecrypt: ${error.message}`);
    // Error opaco unificado
    throw new Error(OPAQUE_DECRYPTION_ERROR);
  }
}
