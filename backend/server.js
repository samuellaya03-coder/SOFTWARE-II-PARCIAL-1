import express from 'express';
import cors from 'cors';
import cryptoRoutes from './routes/crypto.routes.js';
import analyzeRoutes from './routes/analyze.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging básico para auditoría
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rutas de API
app.use('/api/crypto', cryptoRoutes);
app.use('/api/analyze', analyzeRoutes);

// Health check y metadatos de seguridad
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'Laboratorio Web de Criptografía y Esteganografía',
    mode: 'MODO DIFÍCIL - HIGH SECURITY',
    standards: {
      symmetric: 'AES-256-GCM (NIST SP 800-38D)',
      kdf: 'PBKDF2-HMAC-SHA512 (600,000 iter)',
      asymmetric: 'RSA-OAEP 4096-bit (MGF1-SHA256)',
      stego: 'LSB Bitwise (Canvas API) + Chi-Square PoVs + Shannon Entropy'
    },
    timestamp: new Date().toISOString()
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor.'
  });
});

app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`🔐 BACKEND CRIPTOGRÁFICO & ESTEGOANÁLISIS OPERATIVO`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🛡️  Modo de Seguridad Estricto: AES-256-GCM / PBKDF2-SHA512`);
  console.log(`=============================================================\n`);
});
