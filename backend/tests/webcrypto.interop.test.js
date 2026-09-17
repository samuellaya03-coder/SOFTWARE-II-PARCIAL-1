/**
 * Interoperabilidad entre la criptografia del navegador y la del backend.
 *
 * Ambos lados implementan el mismo formato [Salt 16B | IV 12B | Tag 16B | CT] con
 * PBKDF2-SHA512 de 600.000 iteraciones y AES-256-GCM, pero con APIs distintas:
 * WebCrypto en el cliente, el modulo crypto de Node en el servidor. Si los
 * formatos divergieran, un mensaje cifrado en el navegador dejaria de poder
 * descifrarse en el servidor, y el fallo solo aparecerian en produccion.
 *
 * Node expone WebCrypto de forma global, asi que el modulo del frontend se carga
 * aqui sin adaptaciones y se contrasta directamente contra el servicio del
 * backend, en las dos direcciones.
 */

import crypto from 'crypto';
import {
  PACKET_HEADER_BYTES,
  CRYPTO_PARAMS,
  encryptPacket,
  decryptPacket,
  deriveWalkSeed,
  toBase64,
  fromBase64,
  toHex
} from '../../frontend/src/services/webcrypto.js';
import {
  CRYPTO_CONFIG,
  encryptAESGCM,
  decryptAESGCM
} from '../services/crypto.service.js';
import { assertClose, assertEquals, assertRejects, assertTrue, runSuite, section } from './harness.js';

const tests = [];

const PASSWORD = 'ClaveMaestra#2026!';
const MESSAGE = 'Mensaje que cruza la frontera cliente-servidor con acentos: aeiou';

section(tests, 'Los parametros coinciden en ambos lados');

tests.push(['Mismas longitudes de salt, IV y tag', () => {
  assertClose(CRYPTO_PARAMS.saltBytes, CRYPTO_CONFIG.KDF.SALT_LENGTH, 0);
  assertClose(CRYPTO_PARAMS.ivBytes, CRYPTO_CONFIG.CIPHER.IV_LENGTH, 0);
  assertClose(CRYPTO_PARAMS.tagBytes, CRYPTO_CONFIG.CIPHER.TAG_LENGTH, 0);
  assertClose(PACKET_HEADER_BYTES, 44, 0);
}]);

tests.push(['Mismo coste de KDF y mismo cifrador', () => {
  assertClose(CRYPTO_PARAMS.iterations, CRYPTO_CONFIG.KDF.ITERATIONS, 0);
  assertEquals(CRYPTO_PARAMS.kdf, 'PBKDF2-HMAC-SHA-512', 'KDF del cliente');
  assertEquals(CRYPTO_CONFIG.KDF.ALGORITHM, 'sha512', 'KDF del servidor');
  assertEquals(CRYPTO_PARAMS.cipher, 'AES-256-GCM', 'cifrador del cliente');
  assertEquals(CRYPTO_CONFIG.CIPHER.ALGORITHM, 'aes-256-gcm', 'cifrador del servidor');
}]);

section(tests, 'Cliente -> servidor');

tests.push(['Lo cifrado con WebCrypto se descifra en el backend', async () => {
  const { packed } = await encryptPacket(MESSAGE, PASSWORD);
  const opened = await decryptAESGCM(Buffer.from(packed), PASSWORD);

  assertEquals(opened.plaintextUtf8, MESSAGE, 'mensaje');
}]);

tests.push(['El troceado del paquete coincide byte a byte', async () => {
  const { packed, salt, iv, tag, ciphertext } = await encryptPacket(MESSAGE, PASSWORD);
  const buffer = Buffer.from(packed);

  // El backend reporta los tramos en hexadecimal al descifrar.
  const opened = await decryptAESGCM(buffer, PASSWORD);

  assertEquals(opened.saltHex, toHex(salt), 'salt');
  assertEquals(opened.ivHex, toHex(iv), 'iv');
  assertEquals(opened.tagHex, toHex(tag), 'tag');
  assertEquals(buffer.subarray(44).toString('hex'), toHex(ciphertext), 'ciphertext');
}]);

tests.push(['Payload binario voluminoso cruza intacto', async () => {
  const payload = new Uint8Array(crypto.randomBytes(64 * 1024));
  const { packed } = await encryptPacket(payload, PASSWORD);
  const opened = await decryptAESGCM(Buffer.from(packed), PASSWORD);

  assertEquals(
    opened.plaintextBuffer.toString('hex'),
    Buffer.from(payload).toString('hex'),
    'payload'
  );
}]);

section(tests, 'Servidor -> cliente');

tests.push(['Lo cifrado en el backend se descifra con WebCrypto', async () => {
  const sealed = await encryptAESGCM(MESSAGE, PASSWORD);
  const opened = await decryptPacket(new Uint8Array(sealed.packedBuffer), PASSWORD);

  assertEquals(new TextDecoder().decode(opened), MESSAGE, 'mensaje');
}]);

tests.push(['Payload binario del backend se abre en el cliente', async () => {
  const payload = crypto.randomBytes(32 * 1024);
  const sealed = await encryptAESGCM(payload, PASSWORD);
  const opened = await decryptPacket(new Uint8Array(sealed.packedBuffer), PASSWORD);

  assertEquals(
    Buffer.from(opened).toString('hex'),
    payload.toString('hex'),
    'payload'
  );
}]);

section(tests, 'Autenticacion en el lado cliente');

tests.push(['Una contrasena incorrecta falla por integridad', async () => {
  const { packed } = await encryptPacket(MESSAGE, PASSWORD);
  const error = await assertRejects(
    () => decryptPacket(packed, 'contrasena equivocada'),
    'una contrasena equivocada consiguio descifrar'
  );
  assertTrue(
    error.message.includes('INTEGRIDAD'),
    `esperaba error de integridad, obtuve: ${error.message}`
  );
}]);

for (const target of [
  { label: 'ciphertext', offset: 44 },
  { label: 'tag', offset: 28 },
  { label: 'IV', offset: 16 },
  { label: 'salt', offset: 0 }
]) {
  tests.push([`Alterar 1 bit del ${target.label} aborta el descifrado`, async () => {
    const { packed } = await encryptPacket(MESSAGE, PASSWORD);
    packed[target.offset] ^= 0x01;

    await assertRejects(
      () => decryptPacket(packed, PASSWORD),
      `la manipulacion del ${target.label} paso desapercibida`
    );
  }]);
}

tests.push(['Un paquete mas corto que la cabecera se rechaza', async () => {
  await assertRejects(
    () => decryptPacket(new Uint8Array(43), PASSWORD),
    'acepto un paquete de 43 bytes'
  );
}]);

tests.push(['Se rechaza una contrasena vacia', async () => {
  await assertRejects(() => encryptPacket('x', ''), 'acepto contrasena vacia al cifrar');
  await assertRejects(() => decryptPacket(new Uint8Array(60), ''), 'acepto contrasena vacia al descifrar');
}]);

section(tests, 'Semilla del recorrido disperso');

tests.push(['La semilla es determinista y mide 16 bytes', async () => {
  const [a, b] = await Promise.all([deriveWalkSeed(PASSWORD), deriveWalkSeed(PASSWORD)]);

  assertClose(a.length, 16, 0);
  assertEquals(toHex(a), toHex(b), 'semilla');
}]);

tests.push(['Contrasenas distintas dan semillas distintas', async () => {
  const a = await deriveWalkSeed('clave A');
  const b = await deriveWalkSeed('clave B');
  assertTrue(toHex(a) !== toHex(b), 'dos contrasenas dieron la misma semilla');
}]);

tests.push(['La semilla no revela la clave AES: son derivaciones independientes', async () => {
  // La semilla del recorrido sale de SHA-256 con etiqueta de contexto; la clave
  // AES sale de PBKDF2 con salt aleatorio. Ni siquiera comparten longitud.
  const seed = await deriveWalkSeed(PASSWORD);
  const sealed = await encryptPacket(MESSAGE, PASSWORD);

  assertTrue(
    !toHex(sealed.packed).includes(toHex(seed)),
    'la semilla del recorrido aparece dentro del paquete cifrado'
  );
}]);

section(tests, 'Utilidades de codificacion');

tests.push(['Base64 de ida y vuelta con payloads grandes', () => {
  // La implementacion trocea en bloques de 32 KiB para no desbordar la pila con
  // String.fromCharCode sobre arrays largos.
  const payload = new Uint8Array(crypto.randomBytes(300 * 1024));
  const restored = fromBase64(toBase64(payload));

  assertClose(restored.length, payload.length, 0);
  assertEquals(
    Buffer.from(restored).toString('hex'),
    Buffer.from(payload).toString('hex'),
    'payload'
  );
}]);

tests.push(['El hexadecimal conserva los ceros a la izquierda', () => {
  assertEquals(toHex(Uint8Array.from([0x00, 0x0f, 0xff, 0x01])), '000fff01', 'hex');
}]);

await runSuite('INTEROPERABILIDAD WEBCRYPTO (frontend/src/services/webcrypto.js)', tests);
