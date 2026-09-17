import { Router } from 'express';
import {
  encryptAESGCM,
  decryptAESGCM,
  generateRSAKeyPair,
  hybridEncrypt,
  hybridDecrypt
} from '../services/crypto.service.js';

const router = Router();

/** Comprueba que los campos indicados esten presentes y sean cadenas no vacias. */
function missingFields(body, fields) {
  return fields.filter((field) => {
    const value = body?.[field];
    return typeof value !== 'string' || value.length === 0;
  });
}

/**
 * POST /api/crypto/encrypt
 * Cifra con AES-256-GCM derivando la clave con PBKDF2-SHA512.
 */
router.post('/encrypt', async (req, res, next) => {
  const missing = missingFields(req.body, ['plaintext', 'password']);
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Campos requeridos ausentes o vacios: ${missing.join(', ')}.`
    });
  }

  try {
    const result = await encryptAESGCM(req.body.plaintext, req.body.password);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crypto/decrypt
 * Desempaqueta y descifra [Salt|IV|Tag|Ciphertext] verificando el tag GCM.
 */
router.post('/decrypt', async (req, res) => {
  const missing = missingFields(req.body, ['packedData', 'password']);
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Campos requeridos ausentes o vacios: ${missing.join(', ')}.`
    });
  }

  try {
    const result = await decryptAESGCM(req.body.packedData, req.body.password);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    // Un fallo de autenticacion es un error del cliente, no del servidor.
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/crypto/rsa/keygen
 * Genera un par RSA de 4096 bits.
 */
router.get('/rsa/keygen', async (req, res, next) => {
  try {
    const keyPair = await generateRSAKeyPair();
    res.status(200).json({ success: true, data: keyPair });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/crypto/rsa/hybrid-encrypt
 * Cifrado hibrido RSA-OAEP 4096 + AES-256-GCM.
 */
router.post('/rsa/hybrid-encrypt', (req, res) => {
  const missing = missingFields(req.body, ['plaintext', 'publicKeyPem']);
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Campos requeridos ausentes o vacios: ${missing.join(', ')}.`
    });
  }

  try {
    const result = hybridEncrypt(req.body.plaintext, req.body.publicKeyPem);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    // Una clave PEM malformada es entrada invalida del cliente.
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/crypto/rsa/hybrid-decrypt
 * Descifrado hibrido RSA-OAEP 4096 + AES-256-GCM.
 */
router.post('/rsa/hybrid-decrypt', (req, res) => {
  const missing = missingFields(req.body, [
    'encryptedKeyBase64', 'ivHex', 'tagHex', 'ciphertextBase64', 'privateKeyPem'
  ]);
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Campos requeridos ausentes o vacios: ${missing.join(', ')}.`
    });
  }

  try {
    const plaintext = hybridDecrypt(
      req.body.encryptedKeyBase64,
      req.body.ivHex,
      req.body.tagHex,
      req.body.ciphertextBase64,
      req.body.privateKeyPem
    );
    res.status(200).json({ success: true, data: { plaintext } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
