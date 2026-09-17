/**
 * Configuracion por entorno, validada al arrancar.
 *
 * Un valor mal escrito en una variable de entorno debe romper el arranque con un
 * mensaje claro, no producir comportamiento silenciosamente incorrecto a las tres
 * de la manana. De ahi que todo se valide aqui y no en el punto de uso.
 */

import { z } from 'zod';

/** Entero positivo a partir de una cadena, con valor por defecto. */
const positiveInt = (fallback) => z.coerce.number().int().positive().default(fallback);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: positiveInt(3001),

  /**
   * Origenes permitidos, separados por comas. El comodin "*" sigue siendo
   * aceptable en desarrollo, pero en produccion obliga a declararlos.
   */
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),

  /** Tamano maximo de imagen, en megabytes. */
  MAX_UPLOAD_MB: positiveInt(25),

  /** Limite del cuerpo JSON. Solo transporta texto y claves PEM. */
  MAX_JSON_MB: positiveInt(2),

  /** Ventana y cupo del limitador de peticiones. */
  RATE_LIMIT_WINDOW_MS: positiveInt(60000),
  RATE_LIMIT_MAX: positiveInt(120),
  /** Cupo aparte para los endpoints costosos (KDF, keygen, analisis). */
  RATE_LIMIT_HEAVY_MAX: positiveInt(20),

  /** Workers del pool forense. Por defecto, nucleos disponibles menos uno. */
  FORENSICS_WORKERS: z.coerce.number().int().positive().optional(),
  FORENSICS_JOB_TIMEOUT_MS: positiveInt(60000)
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('\n');
  console.error(`Configuracion invalida en las variables de entorno:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;

const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const isProduction = env.NODE_ENV === 'production';

// Un comodin en produccion deja la API abierta a cualquier origen, lo que
// convierte cualquier XSS ajeno en un cliente legitimo de este servidor.
if (isProduction && corsOrigins.includes('*')) {
  console.error('CORS_ORIGINS no puede contener "*" con NODE_ENV=production.');
  process.exit(1);
}

export const config = {
  env: env.NODE_ENV,
  isProduction,
  port: env.PORT,
  corsOrigins,
  maxUploadBytes: env.MAX_UPLOAD_MB * 1024 * 1024,
  maxJsonBytes: env.MAX_JSON_MB * 1024 * 1024,
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    heavyMax: env.RATE_LIMIT_HEAVY_MAX
  },
  forensics: {
    workers: env.FORENSICS_WORKERS,
    jobTimeoutMs: env.FORENSICS_JOB_TIMEOUT_MS
  }
};
