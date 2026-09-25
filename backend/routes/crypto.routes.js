import { Router } from 'express';
import {
  encryptAESGCM,
  decryptAESGCM,
  generateRSAKeyPair,
  hybridEncrypt,
  hybridDecrypt,
  benchmarkPBKDF2
} from '../services/crypto.service.js';
import { cryptoRateLimiter, rsaKeygenRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

/**
 * POST /api/crypto/encrypt
 * Cifra un texto o payload binario con AES-256-GCM y deriva la clave con PBKDF2-SHA512.
 */
router.post('/encrypt', cryptoRateLimiter, async (req, res) => {
  try {
    const { plaintext, plaintextBase64, password } = req.body;

    let dataToEncrypt;
    if (plaintextBase64) {
      dataToEncrypt = Buffer.from(plaintextBase64, 'base64');
    } else if (plaintext !== undefined && plaintext !== null) {
      dataToEncrypt = Buffer.from(plaintext, 'utf-8');
    } else {
      return res.status(400).json({ error: 'El campo "plaintext" o "plaintextBase64" es requerido.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'El campo "password" es requerido.' });
    }

    const result = await encryptAESGCM(dataToEncrypt, password);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crypto/decrypt
 * Desempaqueta y descifra un flujo binario [Salt|IV|Tag|Ciphertext] verificando la autenticación GCM.
 */
router.post('/decrypt', cryptoRateLimiter, async (req, res) => {
  try {
    const { packedData, password } = req.body;

    if (!packedData) {
      return res.status(400).json({ error: 'El campo "packedData" (Base64 o Hex) es requerido.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'El campo "password" es requerido.' });
    }

    const result = await decryptAESGCM(packedData, password);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crypto/rsa/keygen
 * Genera un par de claves RSA de 4096 bits.
 */
router.get('/rsa/keygen', rsaKeygenRateLimiter, async (req, res) => {
  try {
    const keyPair = await generateRSAKeyPair();
    res.status(200).json({
      success: true,
      data: keyPair
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crypto/rsa/hybrid-encrypt
 * Cifrado híbrido con RSA-OAEP 4096 y AES-256-GCM.
 */
router.post('/rsa/hybrid-encrypt', cryptoRateLimiter, (req, res) => {
  try {
    const { plaintext, publicKeyPem } = req.body;
    if (!plaintext || !publicKeyPem) {
      return res.status(400).json({ error: 'Se requieren "plaintext" y "publicKeyPem".' });
    }

    const result = hybridEncrypt(plaintext, publicKeyPem);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crypto/rsa/hybrid-decrypt
 * Descifrado híbrido con RSA-OAEP 4096 y AES-256-GCM.
 */
router.post('/rsa/hybrid-decrypt', cryptoRateLimiter, (req, res) => {
  try {
    const { encryptedKeyBase64, ivHex, tagHex, ciphertextBase64, privateKeyPem } = req.body;
    if (!encryptedKeyBase64 || !ivHex || !tagHex || !ciphertextBase64 || !privateKeyPem) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos para el descifrado híbrido.' });
    }

    const plaintext = hybridDecrypt(encryptedKeyBase64, ivHex, tagHex, ciphertextBase64, privateKeyPem);
    res.status(200).json({
      success: true,
      data: { plaintext }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/crypto/benchmark-pbkdf2
 * Ejecuta un benchmark forense de derivación PBKDF2 midiendo latencia y resistencia a fuerza bruta.
 */
router.post('/benchmark-pbkdf2', cryptoRateLimiter, (req, res) => {
  try {
    const { iterations, password } = req.body;
    const result = benchmarkPBKDF2(iterations, password);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
