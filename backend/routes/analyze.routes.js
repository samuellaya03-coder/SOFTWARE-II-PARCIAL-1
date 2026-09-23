import { Router } from 'express';
import multer from 'multer';
import { parsePng, analyzeImagePixels } from '../services/stegoanalysis.service.js';
import { analyzeRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  // Sin filtro, cualquier binario se cargaba entero en memoria antes de que el
  // decodificador PNG lo rechazara. Se corta antes, en la puerta.
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(Object.assign(new Error('Solo se aceptan imagenes.'), { code: 'TIPO_NO_PERMITIDO' }));
  }
});

/**
 * POST /api/analyze/image
 * Recibe una imagen PNG ya sea como multipart/form-data o como payload JSON en Base64.
 * Retorna análisis forense: Chi-cuadrado, entropía LSB, histogramas y veredicto.
 */
router.post('/image', analyzeRateLimiter, upload.single('image'), async (req, res) => {
  try {
    let imageBuffer;

    if (req.file) {
      imageBuffer = req.file.buffer;
    } else if (req.body.imageBase64) {
      const cleanBase64 = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(cleanBase64, 'base64');
    } else {
      return res.status(400).json({
        error: 'Debe proporcionar una imagen PNG válida mediante multipart "image" o JSON "imageBase64".'
      });
    }

    // Decodificar PNG a matriz RGBA
    const { width, height, data } = await parsePng(imageBuffer);

    // Ejecutar análisis matemático
    const analysisReport = analyzeImagePixels(data, width, height);

    res.status(200).json({
      success: true,
      data: analysisReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error durante el estegoanálisis: ${error.message}`
    });
  }
});

export default router;
