import express from 'express';
import cors from 'cors';
import cryptoRoutes from './routes/crypto.routes.js';
import analyzeRoutes from './routes/analyze.routes.js';
import { getForensicsPool, closeForensicsPool } from './services/forensics/pool.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// El cuerpo JSON solo transporta texto y claves PEM; las imagenes llegan por
// multipart con su propio limite de 25 MB.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Registro de auditoria.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} `
      + `- ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

app.use('/api/crypto', cryptoRoutes);
app.use('/api/analyze', analyzeRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'Laboratorio Web de Criptografía y Esteganografía',
    mode: 'MODO DIFÍCIL - HIGH SECURITY',
    standards: {
      symmetric: 'AES-256-GCM (NIST SP 800-38D)',
      kdf: 'PBKDF2-HMAC-SHA512 (600,000 iter)',
      asymmetric: 'RSA-OAEP 4096-bit (MGF1-SHA256)',
      stego: 'LSB Bitwise (Canvas API)',
      forensics: 'Chi-cuadrado progresivo de PoVs + RS Analysis + Sample Pair Analysis'
    },
    concurrency: {
      // El event loop nunca ejecuta trabajo intensivo: el KDF y RSA van a la
      // threadpool de libuv, y el analisis forense a un pool de worker_threads.
      forensicsWorkers: getForensicsPool().stats()
    },
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);

  // Errores de limite de tamano de multer.
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'La imagen excede el limite de 25 MB.' });
  }

  res.status(500).json({ success: false, error: err.message || 'Error interno del servidor.' });
});

const server = app.listen(PORT, () => {
  const pool = getForensicsPool().stats();
  console.log('\n=============================================================');
  console.log('BACKEND CRIPTOGRAFICO & ESTEGOANALISIS OPERATIVO');
  console.log(`URL: http://localhost:${PORT}`);
  console.log('AES-256-GCM / PBKDF2-SHA512 (600.000 iteraciones)');
  console.log(`Workers de analisis forense: ${pool.size}`);
  console.log('=============================================================\n');
});

/** Apagado ordenado: deja de aceptar conexiones y termina los workers. */
async function shutdown(signal) {
  console.log(`\n[${signal}] Apagando...`);
  server.close();
  await closeForensicsPool();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
