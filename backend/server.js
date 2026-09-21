import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno desde .env sin dependencias externas
try {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {}

import cryptoRoutes from './routes/crypto.routes.js';
import analyzeRoutes from './routes/analyze.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Habilitar confianza en proxies inversos (Cloudflare Tunnel) para detección real de IPs
app.set('trust proxy', 1);

// Orígenes autorizados por defecto para desarrollo local
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

// Orígenes adicionales definidos en el archivo .env (separados por coma)
const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = [...defaultAllowedOrigins, ...envAllowedOrigins];

// Configuración de Middlewares con restricción de CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin cabecera origin (Postman, curl, peticiones internas)
    if (!origin) return callback(null, true);

    // 1. Origen explícitamente autorizado en la lista blanca
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 2. Soporte dinámico para túneles de Cloudflare (*.trycloudflare.com)
    if (/^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/.test(origin)) {
      return callback(null, true);
    }

    const corsError = new Error(`Acceso bloqueado por política CORS: El origen "${origin}" no está autorizado.`);
    return callback(corsError);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
  credentials: true
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
app.use('/api/ai', aiRoutes);

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
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: err.message
    });
  }
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
