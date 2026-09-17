import { Router } from 'express';
import multer from 'multer';
import { getForensicsPool } from '../services/forensics/pool.js';

const router = Router();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

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
router.post('/image', upload.single('image'), async (req, res) => {
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

  if (imageBuffer.length === 0) {
    return res.status(400).json({ success: false, error: 'La imagen recibida esta vacia.' });
  }

  try {
    const report = await getForensicsPool().analyze(imageBuffer);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    // Un PNG invalido es un error del cliente; un worker caido, del servidor.
    res.status(error.isDecodeError ? 400 : 500).json({
      success: false,
      error: error.isDecodeError
        ? `${error.message}. El analisis exige un formato sin perdida, porque la cuantizacion DCT `
          + 'de JPEG destruye los LSB.'
        : error.message
    });
  }
});

export default router;
