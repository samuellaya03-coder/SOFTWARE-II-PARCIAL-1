/**
 * MIDDLEWARE DE RATE LIMITING (CONTROL DE TASA DE PETICIONES)
 * Mitiga ataques de Denegación de Servicio (DoS) y saturación de CPU por PBKDF2 / RSA-4096.
 * Compatible con Cloudflare Tunnel (soporta 'cf-connecting-ip') y proxies inversos.
 */

export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 20,
  message = 'Has superado el límite de peticiones de alta carga para proteger el servidor contra ataques DoS.',
  endpointName = 'recurso protegido'
} = {}) {
  const clients = new Map();

  // Limpieza periódica de IPs expiradas
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of clients.entries()) {
      if (now >= data.resetTime) {
        clients.delete(ip);
      }
    }
  }, Math.max(windowMs, 30000));

  if (cleanup.unref) {
    cleanup.unref();
  }

  return (req, res, next) => {
    // Detección precisa de la IP real (soporta Cloudflare Tunnel)
    const clientIp =
      req.headers['cf-connecting-ip'] ||
      (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    let record = clients.get(clientIp);

    if (!record || now >= record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      clients.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

    // Cabeceras estándar de control de tasa
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (record.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({
        success: false,
        error: `[DEFENSA DoS ACTIVADA] ${message}`,
        details: {
          endpoint: endpointName,
          limit: max,
          windowSeconds: Math.ceil(windowMs / 1000),
          retryAfterSeconds: resetSeconds
        }
      });
    }

    next();
  };
}

// 1. Limiter para operaciones criptográficas pesadas (PBKDF2-SHA512 600k iteraciones)
export const cryptoRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Límite alcanzado para operaciones PBKDF2/AES-GCM (máximo 20 peticiones/min por usuario).',
  endpointName: 'Criptografía Simétrica / PBKDF2'
});

// 2. Limiter estricto para generación de números primos RSA-4096 (extremadamente costoso en CPU)
export const rsaKeygenRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 6,
  message: 'Límite alcanzado para generación de pares de claves RSA-4096 (máximo 6 pares/min por usuario).',
  endpointName: 'Generación de Claves RSA-4096'
});

// 3. Limiter para Estegoanálisis Forense (procesamiento de imágenes de hasta 25MB)
export const analyzeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Límite alcanzado para estegoanálisis de imágenes (máximo 15 análisis/min por usuario).',
  endpointName: 'Estegoanálisis Forense'
});

// 4. Limiter para consultas de IA (asistente CyberTutor)
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Límite de consultas al asistente alcanzado (máximo 20 preguntas/min por usuario).',
  endpointName: 'CyberTutor IA'
});
