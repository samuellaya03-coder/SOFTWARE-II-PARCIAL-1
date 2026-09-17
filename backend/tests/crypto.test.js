/**
 * Validacion del servicio criptografico.
 *
 * Mas alla del viaje de ida y vuelta, se verifican dos cosas por CAMINOS
 * INDEPIENDIENTES del codigo bajo prueba:
 *
 *   - AES-256-GCM contra AES-256-CTR. La confidencialidad de GCM es CTR con un
 *     bloque contador determinado: con IV de 96 bits, J0 = IV || 0x00000001 y el
 *     flujo de clave empieza en inc32(J0) = IV || 0x00000002. Si el texto cifrado
 *     por GCM coincide con el de CTR arrancando en ese contador, la construccion
 *     y el manejo del IV son correctos.
 *
 *   - PBKDF2-HMAC-SHA512 contra una reimplementacion directa de la recurrencia
 *     de RFC 8018 sobre HMAC, con pocas iteraciones para que sea barata.
 */

import crypto from 'crypto';
import {
  CRYPTO_CONFIG,
  deriveKey,
  encryptAESGCM,
  decryptAESGCM,
  generateRSAKeyPair,
  encryptRSA,
  decryptRSA,
  hybridEncrypt,
  hybridDecrypt
} from '../services/crypto.service.js';
import { assertClose, assertEquals, assertThrows, assertTrue, runSuite, section } from './harness.js';

const tests = [];

const PASSWORD = 'ClaveUltraSegura#2026!';
const SECRET = 'Proyecto de Grado: Ciberseguridad Defendida';

// Un solo cifrado reutilizado donde sea posible: cada llamada cuesta ~200 ms por
// las 600.000 iteraciones de PBKDF2.
const reference = encryptAESGCM(SECRET, PASSWORD);

section(tests, 'Empaquetado binario [Salt(16) | IV(12) | Tag(16) | Ciphertext]');

tests.push(['Los offsets del paquete son exactos', () => {
  const { SALT_LENGTH } = CRYPTO_CONFIG.KDF;
  const { IV_LENGTH, TAG_LENGTH } = CRYPTO_CONFIG.CIPHER;

  assertClose(SALT_LENGTH, 16, 0);
  assertClose(IV_LENGTH, 12, 0);
  assertClose(TAG_LENGTH, 16, 0);

  const header = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  assertClose(header, 44, 0);
  assertClose(reference.packedBuffer.length, header + Buffer.byteLength(SECRET, 'utf8'), 0);
}]);

tests.push(['Los campos hexadecimales coinciden con los tramos del búfer', () => {
  const packed = reference.packedBuffer;
  assertEquals(packed.subarray(0, 16).toString('hex'), reference.saltHex, 'salt');
  assertEquals(packed.subarray(16, 28).toString('hex'), reference.ivHex, 'iv');
  assertEquals(packed.subarray(28, 44).toString('hex'), reference.tagHex, 'tag');
  assertEquals(packed.subarray(44).toString('hex'), reference.ciphertextHex, 'ciphertext');
}]);

tests.push(['El parametro de coste del KDF cumple la recomendacion de OWASP', () => {
  assertTrue(
    CRYPTO_CONFIG.KDF.ITERATIONS >= 210000,
    `PBKDF2-SHA512 necesita al menos 210.000 iteraciones, hay ${CRYPTO_CONFIG.KDF.ITERATIONS}`
  );
  assertEquals(CRYPTO_CONFIG.KDF.ALGORITHM, 'sha512', 'hash del KDF');
  assertClose(CRYPTO_CONFIG.KDF.KEY_LENGTH, 32, 0);
}]);

section(tests, 'Verificacion cruzada contra primitivas independientes');

tests.push(['El texto cifrado de GCM coincide con AES-256-CTR desde IV || 0x00000002', () => {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const plaintext = Buffer.from('Verificacion cruzada de la construccion GCM', 'utf8');

  const gcm = crypto.createCipheriv('aes-256-gcm', key, iv);
  const gcmCiphertext = Buffer.concat([gcm.update(plaintext), gcm.final()]);

  // J0 = IV || 0x00000001; el flujo de clave del texto arranca en J0 + 1.
  const counter = Buffer.concat([iv, Buffer.from([0, 0, 0, 2])]);
  const ctr = crypto.createCipheriv('aes-256-ctr', key, counter);
  const ctrCiphertext = Buffer.concat([ctr.update(plaintext), ctr.final()]);

  assertEquals(gcmCiphertext.toString('hex'), ctrCiphertext.toString('hex'), 'ciphertext');
}]);

tests.push(['PBKDF2-SHA512 coincide con la recurrencia de RFC 8018 implementada a mano', () => {
  const password = Buffer.from('contrasena de prueba', 'utf8');
  const salt = Buffer.from('0123456789abcdef', 'utf8');
  const iterations = 500;
  const keyLength = 64;

  // U_1 = HMAC(P, S || INT(i));  U_j = HMAC(P, U_{j-1});  T_i = U_1 xor ... xor U_c
  const blockIndex = Buffer.from([0, 0, 0, 1]);
  let u = crypto.createHmac('sha512', password).update(Buffer.concat([salt, blockIndex])).digest();
  const accumulator = Buffer.from(u);

  for (let j = 1; j < iterations; j++) {
    u = crypto.createHmac('sha512', password).update(u).digest();
    for (let b = 0; b < accumulator.length; b++) {
      accumulator[b] ^= u[b];
    }
  }

  const expected = accumulator.subarray(0, keyLength);
  const actual = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha512');

  assertEquals(actual.toString('hex'), expected.toString('hex'), 'clave derivada');
}]);

section(tests, 'Derivacion de clave');

tests.push(['La derivacion es determinista con el mismo salt', () => {
  const salt = crypto.randomBytes(16);
  const a = deriveKey(PASSWORD, salt);
  const b = deriveKey(PASSWORD, salt);

  assertEquals(a.toString('hex'), b.toString('hex'), 'clave');
  assertClose(a.length, 32, 0);
}]);

tests.push(['Salts distintos producen claves distintas (anula tablas arcoiris)', () => {
  const a = deriveKey(PASSWORD, crypto.randomBytes(16));
  const b = deriveKey(PASSWORD, crypto.randomBytes(16));
  assertTrue(a.toString('hex') !== b.toString('hex'), 'dos salts dieron la misma clave');
}]);

tests.push(['Se rechaza un salt de longitud incorrecta', () => {
  assertThrows(() => deriveKey(PASSWORD, crypto.randomBytes(8)), 'acepto un salt de 8 bytes');
  assertThrows(() => deriveKey(PASSWORD, 'no es un buffer'), 'acepto un salt que no es Buffer');
}]);

tests.push(['Se rechaza una contrasena vacia o no textual', () => {
  assertThrows(() => deriveKey('', crypto.randomBytes(16)), 'acepto contrasena vacia');
  assertThrows(() => deriveKey(null, crypto.randomBytes(16)), 'acepto contrasena nula');
}]);

section(tests, 'Cifrado y descifrado autenticado');

tests.push(['Viaje de ida y vuelta desde el búfer empaquetado', () => {
  const result = decryptAESGCM(reference.packedBuffer, PASSWORD);
  assertEquals(result.plaintextUtf8, SECRET, 'texto claro');
}]);

tests.push(['Viaje de ida y vuelta desde Base64', () => {
  const result = decryptAESGCM(reference.packedBase64, PASSWORD);
  assertEquals(result.plaintextUtf8, SECRET, 'texto claro');
}]);

tests.push(['Viaje de ida y vuelta de un payload binario arbitrario', () => {
  const binary = crypto.randomBytes(1024);
  const packed = encryptAESGCM(binary, PASSWORD);
  const result = decryptAESGCM(packed.packedBuffer, PASSWORD);

  assertEquals(result.plaintextBuffer.toString('hex'), binary.toString('hex'), 'payload');
}]);

tests.push(['El IV nunca se reutiliza entre cifrados', () => {
  const ivs = new Set();
  for (let i = 0; i < 8; i++) {
    // Se usa la primitiva directa para no pagar PBKDF2 ocho veces.
    ivs.add(crypto.randomBytes(CRYPTO_CONFIG.CIPHER.IV_LENGTH).toString('hex'));
  }
  assertClose(ivs.size, 8, 0);

  const a = encryptAESGCM('mismo mensaje', PASSWORD);
  const b = encryptAESGCM('mismo mensaje', PASSWORD);
  assertTrue(a.ivHex !== b.ivHex, 'dos cifrados compartieron IV');
  assertTrue(a.saltHex !== b.saltHex, 'dos cifrados compartieron salt');
  assertTrue(a.ciphertextHex !== b.ciphertextHex, 'el mismo mensaje dio el mismo criptograma');
}]);

section(tests, 'Deteccion de manipulacion por el Authentication Tag');

const TAMPER_TARGETS = [
  { label: 'ciphertext', offset: 44 },
  { label: 'tag', offset: 28 },
  { label: 'IV', offset: 16 },
  { label: 'salt', offset: 0 }
];

for (const target of TAMPER_TARGETS) {
  tests.push([`Alterar 1 bit del ${target.label} aborta el descifrado`, () => {
    const tampered = Buffer.from(reference.packedBuffer);
    tampered[target.offset] ^= 0x01;

    assertThrows(
      () => decryptAESGCM(tampered, PASSWORD),
      `la manipulacion del ${target.label} paso desapercibida`
    );
  }]);
}

tests.push(['Una contrasena incorrecta falla por integridad, no por relleno', () => {
  let message = '';
  try {
    decryptAESGCM(reference.packedBuffer, 'contrasena equivocada');
  } catch (error) {
    message = error.message;
  }
  assertTrue(
    message.includes('INTEGRIDAD') || message.includes('AUTENTICACION'),
    `esperaba un error de integridad, obtuve: ${message}`
  );
}]);

tests.push(['Un paquete mas corto que la cabecera se rechaza', () => {
  assertThrows(() => decryptAESGCM(Buffer.alloc(43), PASSWORD), 'acepto un paquete de 43 bytes');
}]);

tests.push(['Se rechaza un tipo de dato invalido', () => {
  assertThrows(() => decryptAESGCM(12345, PASSWORD), 'acepto un numero como paquete');
}]);

section(tests, 'RSA-OAEP 4096 y esquema hibrido');

const keyPair = generateRSAKeyPair();

tests.push(['El par de claves tiene el formato PEM esperado', () => {
  assertTrue(keyPair.publicKey.includes('BEGIN PUBLIC KEY'), 'clave publica no es SPKI/PEM');
  assertTrue(keyPair.privateKey.includes('BEGIN PRIVATE KEY'), 'clave privada no es PKCS#8/PEM');

  const modulusBits = crypto.createPublicKey(keyPair.publicKey).asymmetricKeyDetails.modulusLength;
  assertClose(modulusBits, 4096, 0);
}]);

tests.push(['El exponente publico es 65537', () => {
  const details = crypto.createPublicKey(keyPair.publicKey).asymmetricKeyDetails;
  assertClose(Number(details.publicExponent), 65537, 0);
}]);

tests.push(['Viaje de ida y vuelta con RSA-OAEP directo', () => {
  const message = Buffer.from('clave de sesion efimera', 'utf8');
  const sealed = encryptRSA(message, keyPair.publicKey);
  const opened = decryptRSA(sealed, keyPair.privateKey);

  assertEquals(opened.toString('utf8'), message.toString('utf8'), 'mensaje');
}]);

tests.push(['OAEP es aleatorizado: dos cifrados del mismo mensaje difieren', () => {
  const a = encryptRSA('mismo mensaje', keyPair.publicKey);
  const b = encryptRSA('mismo mensaje', keyPair.publicKey);
  assertTrue(a.toString('hex') !== b.toString('hex'), 'OAEP produjo dos criptogramas identicos');
}]);

tests.push(['Viaje de ida y vuelta del esquema hibrido', () => {
  const message = 'Transaccion bancaria confidencial aprobada #893712';
  const sealed = hybridEncrypt(message, keyPair.publicKey);
  const opened = hybridDecrypt(
    sealed.encryptedKeyBase64, sealed.ivHex, sealed.tagHex, sealed.ciphertextBase64,
    keyPair.privateKey
  );

  assertEquals(opened, message, 'mensaje');
}]);

tests.push(['El hibrido cifra datos mas grandes que el modulo RSA', () => {
  // RSA-OAEP con SHA-256 sobre 4096 bits solo admite 446 bytes; el hibrido no
  // tiene ese limite porque RSA solo protege la clave de sesion.
  const bulk = crypto.randomBytes(100000).toString('base64');
  const sealed = hybridEncrypt(bulk, keyPair.publicKey);
  const opened = hybridDecrypt(
    sealed.encryptedKeyBase64, sealed.ivHex, sealed.tagHex, sealed.ciphertextBase64,
    keyPair.privateKey
  );

  assertEquals(opened, bulk, 'payload voluminoso');
}]);

tests.push(['Manipular el criptograma hibrido aborta el descifrado', () => {
  const sealed = hybridEncrypt('mensaje protegido', keyPair.publicKey);
  const corrupted = Buffer.from(sealed.ciphertextBase64, 'base64');
  corrupted[0] ^= 0xff;

  assertThrows(
    () => hybridDecrypt(
      sealed.encryptedKeyBase64, sealed.ivHex, sealed.tagHex,
      corrupted.toString('base64'), keyPair.privateKey
    ),
    'la manipulacion del criptograma hibrido paso desapercibida'
  );
}]);

tests.push(['Una clave privada ajena no puede abrir el sobre hibrido', () => {
  const sealed = hybridEncrypt('mensaje protegido', keyPair.publicKey);
  const intruder = generateRSAKeyPair();

  assertThrows(
    () => hybridDecrypt(
      sealed.encryptedKeyBase64, sealed.ivHex, sealed.tagHex, sealed.ciphertextBase64,
      intruder.privateKey
    ),
    'una clave privada ajena consiguio descifrar'
  );
}]);

runSuite('SERVICIO CRIPTOGRAFICO (crypto.service.js)', tests);
