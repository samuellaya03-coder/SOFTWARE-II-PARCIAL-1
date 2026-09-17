import { Router } from 'express';
import {
  encryptAESGCM,
  decryptAESGCM,
  generateRSAKeyPair,
  hybridEncrypt,
  hybridDecrypt
} from '../services/crypto.service.js';
import { schemas, validateBody } from '../middleware/validate.js';
import { heavyRateLimit } from '../middleware/security.js';

const router = Router();

// El KDF de 600.000 iteraciones y la generacion de RSA-4096 consumen CPU real,
// asi que estas rutas llevan un cupo aparte del general.
const heavy = heavyRateLimit();

/**
 * POST /api/crypto/encrypt
 * Cifra con AES-256-GCM derivando la clave con PBKDF2-SHA512.
 */
router.post('/encrypt', heavy, validateBody(schemas.encrypt), async (req, res, next) => {
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
router.post('/decrypt', heavy, validateBody(schemas.decrypt), async (req, res) => {
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
router.get('/rsa/keygen', heavy, async (req, res, next) => {
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
router.post('/rsa/hybrid-encrypt', validateBody(schemas.hybridEncrypt), (req, res) => {
  try {
    const result = hybridEncrypt(req.body.plaintext, req.body.publicKeyPem);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    // Una clave PEM sintacticamente correcta pero invalida la rechaza OpenSSL.
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/crypto/rsa/hybrid-decrypt
 * Descifrado hibrido RSA-OAEP 4096 + AES-256-GCM.
 */
router.post('/rsa/hybrid-decrypt', validateBody(schemas.hybridDecrypt), (req, res) => {
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
