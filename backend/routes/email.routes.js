import { Router } from 'express';
import { EmailService } from '../services/email.service.js';
import { createRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Rate limiter específico para envío de correos (10 envíos por minuto por cliente)
const emailLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Límite de envíos alcanzado. Por favor espera un momento antes de despachar otro correo.',
  endpointName: 'envío de correo'
});

router.post('/send', emailLimiter, async (req, res) => {
  try {
    const { to, subject, message, attachmentBase64, filename, mimeType } = req.body;

    if (!to || typeof to !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'El campo "to" es obligatorio y debe ser una dirección de correo válida.'
      });
    }

    if (!attachmentBase64) {
      return res.status(400).json({
        success: false,
        error: 'El campo "attachmentBase64" es obligatorio.'
      });
    }

    const result = await EmailService.sendSecureFile({
      to: to.trim(),
      subject,
      message,
      attachmentBase64,
      filename: filename || 'archivo_seguro.png',
      mimeType: mimeType || 'image/png'
    });

    res.status(200).json({
      success: true,
      message: 'Correo despachado exitosamente.',
      data: result
    });
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al despachar el correo electrónico.'
    });
  }
});

export default router;
