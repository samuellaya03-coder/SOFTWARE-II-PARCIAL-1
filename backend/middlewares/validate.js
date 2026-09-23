/**
 * Validacion declarativa del cuerpo de las peticiones con Zod.
 *
 * Centralizarla evita el patron de comprobar campos a mano en cada ruta, que es
 * donde se cuelan los huecos: un campo que se valida en un endpoint y no en el
 * de al lado.
 */

import { z } from 'zod';

/** Cadena no vacia con longitud maxima, para no aceptar payloads absurdos. */
const nonEmptyString = (maxLength) => z.string().min(1).max(maxLength);

/** Clave PEM: se comprueba la envoltura antes de pasarla a OpenSSL. */
const pemKey = (label) => z.string()
  .min(1)
  .max(16384)
  .refine(
    (value) => value.includes(`BEGIN ${label}`) && value.includes(`END ${label}`),
    { message: `No parece una clave ${label} en formato PEM.` }
  );

/** Base64 valido. */
const base64 = z.string().min(1).max(64 * 1024 * 1024)
  .refine((value) => /^[A-Za-z0-9+/]+={0,2}$/.test(value), { message: 'No es Base64 valido.' });

/** Hexadecimal de longitud exacta en bytes. */
const hexOfBytes = (bytes) => z.string()
  .length(bytes * 2)
  .refine((value) => /^[0-9a-fA-F]+$/.test(value), { message: 'No es hexadecimal valido.' });

export const schemas = {
  encrypt: z.object({
    // 8 MiB de texto claro es holgado para un laboratorio y acota el coste.
    plaintext: nonEmptyString(8 * 1024 * 1024),
    password: nonEmptyString(1024)
  }),

  decrypt: z.object({
    packedData: nonEmptyString(64 * 1024 * 1024),
    password: nonEmptyString(1024)
  }),

  hybridEncrypt: z.object({
    plaintext: nonEmptyString(8 * 1024 * 1024),
    publicKeyPem: pemKey('PUBLIC KEY')
  }),

  hybridDecrypt: z.object({
    encryptedKeyBase64: base64,
    ivHex: hexOfBytes(12),
    tagHex: hexOfBytes(16),
    ciphertextBase64: base64,
    privateKeyPem: pemKey('PRIVATE KEY')
  }),

  analyzeBase64: z.object({
    imageBase64: nonEmptyString(64 * 1024 * 1024)
  })
};

/**
 * Middleware que valida `req.body` contra un esquema y sustituye el cuerpo por
 * el resultado ya tipado.
 *
 * @param {import('zod').ZodTypeAny} schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Cuerpo de la peticion invalido.',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.') || '(raiz)',
          message: issue.message
        }))
      });
    }

    req.body = result.data;
    next();
  };
}
