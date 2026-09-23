import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import emailRoutes from './routes/email.routes.js';

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

// Cabeceras de seguridad. Esta API no sirve HTML: cualquier recurso que un
// navegador intentase cargar desde una respuesta suya seria, por definicion,
// algo que no deberia ocurrir. De ahi una CSP al minimo.
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' }
}));

// Configuración de Middlewares con restricción de CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin cabecera origin (Postman, curl, peticiones internas)
    if (!origin) return callback(null, true);

    // 1. Origen explícitamente autorizado en la lista blanca
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 2. Túneles de desarrollo: solo si se habilitan explícitamente. Un comodín
    //    sobre un servicio público de túneles significa que cualquiera puede
    //    abrir uno gratis y quedar autorizado a usar esta API.
    if (process.env.ALLOW_DEV_TUNNELS === 'true'
        && /^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/.test(origin)) {
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

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
app.use('/api/email', emailRoutes);

// Health check y metadatos de seguridad
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    environment: process.env.NODE_ENV || 'development',
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
// Ruta desconocida: se responde JSON como el resto de la API, no el HTML por
// defecto de Express.
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada.' });
});

app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: err.message
    });
  }
  // Errores atribuibles al cliente: se responden con su código real en lugar de
  // un 500 genérico, que confunde un fallo del servidor con una petición mal
  // formada.
  if (err.code === 'TIPO_NO_PERMITIDO') {
    return res.status(415).json({ success: false, error: 'Solo se aceptan imágenes.' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'La imagen supera el tamaño máximo permitido.' });
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ success: false, error: 'El cuerpo de la petición supera el tamaño máximo permitido.' });
  }
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).json({ success: false, error: 'El cuerpo de la petición no es JSON válido.' });
  }

  // A partir de aquí sí es un fallo del servidor. El detalle queda en el log de
  // auditoría; al cliente solo le llega un mensaje genérico.
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor.'
  });
});

app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`🔐 BACKEND CRIPTOGRÁFICO & ESTEGOANÁLISIS OPERATIVO`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🛡️  Modo de Seguridad Estricto: AES-256-GCM / PBKDF2-SHA512`);
  console.log(`=============================================================\n`);
});
