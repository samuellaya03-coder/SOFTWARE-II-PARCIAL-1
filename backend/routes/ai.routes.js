import express from 'express';
import { AiService } from '../services/ai.service.js';

const router = express.Router();

/**
 * POST /api/ai/ask
 * Consulta al Asistente Inteligente (CyberTutor IA)
 */
router.post('/ask', async (req, res, next) => {
  try {
    const { prompt, activeTab, apiKey } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El campo prompt es requerido y debe ser una cadena de texto no vacía.'
      });
    }

    const result = await AiService.ask({
      prompt: prompt.trim(),
      activeTab: activeTab || 'general',
      customApiKey: apiKey ? apiKey.trim() : null
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
