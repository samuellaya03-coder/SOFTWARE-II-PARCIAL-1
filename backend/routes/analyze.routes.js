import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { getForensicsPool } from '../services/forensics/pool.js';
import { heavyRateLimit } from '../middleware/security.js';

const router = Router();

/** Firma de 8 bytes de todo fichero PNG (RFC 2083). */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 }
});

/**
 * Comprueba la firma PNG antes de ocupar un worker.
 *
 * Rechazar aqui lo que evidentemente no es un PNG evita gastar un hilo del pool
 * en un trabajo condenado a fallar, que es justo lo que buscaria alguien
 * intentando agotar el pool con basura.
 */
function looksLikePng(buffer) {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

/**
 * POST /api/analyze/image
 *
 * Acepta un PNG por multipart ("image") o por JSON en Base64 ("imageBase64") y
 * devuelve el informe forense completo: veredicto por fusion de evidencia, los
 * tres estimadores con sus metricas internas, entropia LSB e histogramas.
 *
 * La decodificacion y el analisis se delegan a un worker: son JavaScript puro e
 * intensivos en CPU, y ejecutarlos en el hilo principal congelaria el servidor.
 */
router.post('/image', heavyRateLimit(), upload.single('image'), async (req, res) => {
  let imageBuffer;

  if (req.file) {
    imageBuffer = req.file.buffer;
  } else if (typeof req.body?.imageBase64 === 'string' && req.body.imageBase64.length > 0) {
    const cleanBase64 = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(cleanBase64, 'base64');
  } else {
    return res.status(400).json({
      success: false,
      error: 'Debe proporcionar un PNG mediante multipart "image" o JSON "imageBase64".'
    });
  }

  if (!looksLikePng(imageBuffer)) {
    return res.status(400).json({
      success: false,
      error:
        'El archivo no es un PNG: falta la firma de 8 bytes. El analisis exige un formato sin '
        + 'perdida, porque la cuantizacion DCT de JPEG destruye los LSB.'
    });
  }

  try {
    const report = await getForensicsPool().analyze(imageBuffer);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    // Un PNG corrupto es un error del cliente; un worker caido, del servidor.
    res.status(error.isDecodeError ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
