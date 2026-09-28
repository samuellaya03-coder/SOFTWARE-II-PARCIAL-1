import { Router } from 'express';
import {
  encryptAESGCM,
  decryptAESGCM,
  generateRSAKeyPair,
  hybridEncrypt,
  hybridDecrypt,
  benchmarkPBKDF2,
  auditInspectTarget,
  auditFactorizeWeakChallenge,
  auditFactorizeReal4096,
  auditInjectFakeKey,
  auditBruteforceGCM,
  auditBitFlippingTamper,
  auditTimingAttack,
  auditShorQuantum,
  auditShannonEntropy,
  auditBleichenbacher,
  auditFermatFactorization,
  auditWienerAttack,
  auditHastadBroadcast,
  auditCommonModulus,
  auditBatchGCD,
  auditDictionaryRockYou,
  auditPollardP1,
  auditECM,
  auditCoppersmith,
  auditFranklinReiter,
  auditBellcoreFaultInjection,
  auditPowerAnalysisDPA,
  auditGCMNonceReuse,
  auditPaddingOracleVaudenay,
  auditReplayAttack,
  auditMITM,
  auditUniversalDynamicAttack
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

/**
 * POST /api/crypto/terminal-attack
 * Ejecuta comandos forenses reales de criptoanálisis interactivo para la terminal.
 */
router.post('/terminal-attack', cryptoRateLimiter, (req, res) => {
  try {
    const { action, envelope, publicKeyPem, attempts, timeLimitMs } = req.body;

    let result;
    switch (action) {
      case 'inspect':
      case 'target':
        result = auditInspectTarget(envelope, publicKeyPem);
        break;
      case 'challenge-weak':
      case 'factorize-weak':
        result = auditFactorizeWeakChallenge();
        break;
      case 'factorize':
      case 'factorize-real':
        result = auditFactorizeReal4096(timeLimitMs || 1200);
        break;
      case 'inject-fake-key':
        result = auditInjectFakeKey(envelope?.encryptedKeyBase64);
        break;
      case 'bruteforce-gcm':
        result = auditBruteforceGCM(envelope?.tagHex, envelope?.ivHex, envelope?.ciphertextBase64, attempts || 2000);
        break;
      case 'bit-flipping':
      case 'tamper':
        result = auditBitFlippingTamper(envelope?.tagHex, envelope?.ivHex, envelope?.ciphertextBase64);
        break;
      case 'timing-attack':
      case 'timing':
        result = auditTimingAttack();
        break;
      case 'shor':
      case 'quantum':
        result = auditShorQuantum();
        break;
      case 'entropy':
      case 'shannon':
        result = auditShannonEntropy(envelope?.ivHex, envelope?.tagHex, envelope?.encryptedKeyBase64);
        break;
      case 'bleichenbacher':
      case 'oracle':
        result = auditBleichenbacher();
        break;
      case 'fermat':
        result = auditFermatFactorization(req.body.customN);
        break;
      case 'wiener':
        result = auditWienerAttack();
        break;
      case 'hastad':
      case 'broadcast':
        result = auditHastadBroadcast();
        break;
      case 'common-modulus':
        result = auditCommonModulus();
        break;
      case 'batch-gcd':
      case 'shared-primes':
        result = auditBatchGCD();
        break;
      case 'dictionary':
      case 'rockyou':
        result = auditDictionaryRockYou();
        break;
      case 'pollard-p1':
      case 'p-1':
        result = auditPollardP1(req.body.customN, req.body.boundB);
        break;
      case 'ecm':
      case 'lenstra':
        result = auditECM(req.body.customN);
        break;
      case 'coppersmith':
      case 'boneh-durfee':
      case 'lattice':
        result = auditCoppersmith();
        break;
      case 'franklin-reiter':
        result = auditFranklinReiter();
        break;
      case 'bellcore':
      case 'fault-attack':
        result = auditBellcoreFaultInjection();
        break;
      case 'power-analysis':
      case 'dpa':
      case 'spa':
        result = auditPowerAnalysisDPA();
        break;
      case 'nonce-reuse':
      case 'forbidden-attack':
        result = auditGCMNonceReuse();
        break;
      case 'padding-oracle':
      case 'vaudenay':
        result = auditPaddingOracleVaudenay();
        break;
      case 'replay':
      case 'replay-attack':
        result = auditReplayAttack();
        break;
      case 'mitm':
        result = auditMITM();
        break;
      default:
        // Motor universal de auditoría dinámica: evalúa CUALQUIER comando o ataque arbitrario
        result = auditUniversalDynamicAttack(action, envelope);
        break;
    }

    res.status(200).json({
      success: true,
      action,
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
