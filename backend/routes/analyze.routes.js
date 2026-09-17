import { Router } from 'express';
import multer from 'multer';
import { PNG } from 'pngjs';
import { runForensicAnalysis } from '../services/forensics/index.js';

const router = Router();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

/** Decodifica un PNG a RGBA crudo. */
function parsePng(imageBuffer) {
  return new Promise((resolve, reject) => {
    new PNG().parse(imageBuffer, (error, parsed) => {
      if (error) {
        reject(new Error(
          `No se pudo decodificar la imagen como PNG: ${error.message}. El analisis exige un `
          + 'formato sin perdida, porque la cuantizacion DCT de JPEG destruye los LSB.'
        ));
        return;
      }
      resolve({ width: parsed.width, height: parsed.height, data: parsed.data });
    });
  });
}

/**
 * POST /api/analyze/image
 *
 * Acepta un PNG por multipart ("image") o por JSON en Base64 ("imageBase64") y
 * devuelve el informe forense completo: veredicto por fusion de evidencia, los
 * tres estimadores con sus metricas internas, entropia LSB e histogramas.
 */
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    let imageBuffer;

    if (req.file) {
      imageBuffer = req.file.buffer;
    } else if (req.body?.imageBase64) {
      const cleanBase64 = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(cleanBase64, 'base64');
    } else {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar un PNG mediante multipart "image" o JSON "imageBase64".'
      });
    }

    if (imageBuffer.length === 0) {
      return res.status(400).json({ success: false, error: 'La imagen recibida esta vacia.' });
    }

    const { width, height, data } = await parsePng(imageBuffer);
    const report = runForensicAnalysis(data, width, height);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    // Un PNG invalido es un error del cliente, no del servidor.
    const isDecodeError = error.message.includes('decodificar');
    res.status(isDecodeError ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
