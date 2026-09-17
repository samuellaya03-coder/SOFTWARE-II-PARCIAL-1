/**
 * Endurecimiento HTTP: cabeceras de seguridad, CORS restringido y limitacion de
 * peticiones.
 */

import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

/**
 * Cabeceras de seguridad.
 *
 * La CSP se define explicitamente en lugar de aceptar la de helmet por defecto,
 * porque esta API no sirve HTML: cualquier recurso que un navegador intente
 * cargar desde una respuesta suya es, por definicion, algo que no deberia ocurrir.
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"]
      }
    },
    // La API se consume por fetch desde otro origen; aislarla por COEP/CORP
    // rompería esas peticiones sin aportar nada a un servicio que no sirve HTML.
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' }
  });
}

/**
 * CORS restringido a los origenes declarados.
 *
 * El comodin anterior permitia que cualquier pagina web del mundo usara esta API
 * como si fuera propia. Se admite "*" solo fuera de produccion, y config.js lo
 * rechaza explicitamente si NODE_ENV=production.
 */
export function corsPolicy() {
  const allowAll = config.corsOrigins.includes('*');

  return cors({
    origin(origin, callback) {
      // Sin cabecera Origin: peticiones del mismo origen, curl o herramientas.
      if (!origin || allowAll || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origen no permitido por la politica CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400
  });
}

/** Mensaje uniforme cuando se agota el cupo. */
function limitHandler(req, res) {
  res.status(429).json({
    success: false,
    error: 'Demasiadas peticiones. Espera antes de volver a intentarlo.'
  });
}

/** Limitador general para toda la API. */
export function generalRateLimit() {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: limitHandler
  });
}

/**
 * Limitador estricto para los endpoints costosos.
 *
 * El KDF de 600.000 iteraciones, la generacion de RSA-4096 y el analisis forense
 * consumen CPU real. Sin un cupo aparte, un cliente puede saturar la threadpool y
 * el pool de workers aunque respete el limite general: seria una denegacion de
 * servicio gratuita, precisamente contra las rutas mas caras.
 */
export function heavyRateLimit() {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.heavyMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: limitHandler
  });
}
