import express from 'express';
import { config } from './config.js';
import { securityHeaders, corsPolicy, generalRateLimit } from './middleware/security.js';
import cryptoRoutes from './routes/crypto.routes.js';
import analyzeRoutes from './routes/analyze.routes.js';
import { getForensicsPool, closeForensicsPool } from './services/forensics/pool.js';

const app = express();

// Sin esto, Express reporta la IP del proxy y el limitador de peticiones contaria
// todo el trafico como si viniera de un solo cliente.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(securityHeaders());
app.use(corsPolicy());
app.use(generalRateLimit());

// El cuerpo JSON solo transporta texto y claves PEM; las imagenes llegan por
// multipart con su propio limite.
app.use(express.json({ limit: config.maxJsonBytes }));
app.use(express.urlencoded({ extended: true, limit: config.maxJsonBytes }));

// Registro de auditoria.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} `
      + `- ${res.statusCode} (${durationMs.toFixed(1)}ms)`
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
    environment: config.env,
    standards: {
      symmetric: 'AES-256-GCM (NIST SP 800-38D)',
      kdf: 'PBKDF2-HMAC-SHA512 (600,000 iter)',
      asymmetric: 'RSA-OAEP 4096-bit (MGF1-SHA256)',
      stego: 'Contenedor LSB STG1 con CRC-32 (Canvas API)',
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
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

app.use((err, req, res, next) => {
  // Un origen rechazado por CORS es una peticion invalida, no un fallo interno.
  if (err.message?.startsWith('Origen no permitido')) {
    return res.status(403).json({ success: false, error: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: `La imagen excede el limite de ${config.maxUploadBytes / (1024 * 1024)} MB.`
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: `El cuerpo excede el limite de ${config.maxJsonBytes / (1024 * 1024)} MB.`
    });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: 'El cuerpo no es JSON valido.' });
  }

  console.error('[SERVER ERROR]', err);

  // En produccion no se filtra el mensaje interno al cliente.
  res.status(500).json({
    success: false,
    error: config.isProduction ? 'Error interno del servidor.' : (err.message || 'Error interno.')
  });
});

const server = app.listen(config.port, () => {
  const pool = getForensicsPool().stats();
  console.log('\n=============================================================');
  console.log('BACKEND CRIPTOGRAFICO & ESTEGOANALISIS OPERATIVO');
  console.log(`URL:      http://localhost:${config.port}`);
  console.log(`Entorno:  ${config.env}`);
  console.log(`CORS:     ${config.corsOrigins.join(', ')}`);
  console.log(`Workers:  ${pool.size}`);
  console.log(`Cupo:     ${config.rateLimit.max}/ventana general, ${config.rateLimit.heavyMax} en rutas costosas`);
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
