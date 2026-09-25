import { encryptAESGCM, decryptAESGCM, generateRSAKeyPair, hybridEncrypt, hybridDecrypt } from './services/crypto.service.js';
import { analyzeImagePixels } from './services/stegoanalysis.service.js';

console.log('--- TEST 1: AES-256-GCM + PBKDF2 ---');
const secret = 'Proyecto de Grado: Ciberseguridad Defendida';
const pass = 'ClaveUltraSegura#2026!';
const enc = await encryptAESGCM(secret, pass);
console.log('Packed Base64 size:', enc.packedBuffer.length, 'bytes');
console.log('Salt Hex:', enc.saltHex);
console.log('IV Hex:', enc.ivHex);
console.log('Tag Hex:', enc.tagHex);

const dec = await decryptAESGCM(enc.packedBase64, pass);
console.log('Decrypted text:', dec.plaintextUtf8);
if (dec.plaintextUtf8 !== secret) throw new Error('Decryption mismatch!');
console.log('✅ Cifrado simétrico y verificación de Tag GCM superados exitosamente.');

console.log('\n--- TEST 2: Tamper Detection (Integrity test) ---');
try {
  // Tamper with one byte of ciphertext
  const tampered = Buffer.from(enc.packedBuffer);
  tampered[tampered.length - 1] ^= 0xFF;
  await decryptAESGCM(tampered, pass);
  console.error('❌ ERROR: Debería haber fallado el tag de autenticación.');
} catch (e) {
  console.log('✅ Detección de manipulación exitosa:', e.message);
}

console.log('\n--- TEST 3: Estegoanálisis Sintético ---');
// Create a fake 100x100 RGBA buffer
const width = 100, height = 100;
const fakeData = Buffer.alloc(width * height * 4);
for (let i = 0; i < fakeData.length; i += 4) {
  fakeData[i] = 120 + (i % 20);
  fakeData[i + 1] = 80 + (i % 15);
  fakeData[i + 2] = 200 - (i % 30);
  fakeData[i + 3] = 255;
}
const report = analyzeImagePixels(fakeData, width, height);
console.log('Entropía LSB Global:', report.shannonEntropy.globalLSB);
console.log('Veredicto:', report.verdict);
console.log('✅ Análisis matemático completado.');
