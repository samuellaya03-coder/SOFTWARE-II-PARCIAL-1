/**
 * CLIENTE DE COMUNICACIÓN CON LA API DEL BACKEND CRIPTOGRÁFICO
 */

const API_BASE_URL = '/api';

/**
 * Validador seguro de respuestas HTTP y JSON.
 * Evita el error 'Unexpected token <, <!DOCTYPE...' cuando Cloudflare o el proxy devuelven páginas HTML de error (502, 504, 413).
 */
async function parseJsonResponse(res, defaultErrorMsg = 'Error en el servidor') {
  const contentType = res.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (res.status === 502 || res.status === 504 || text.includes('<!DOCTYPE') || text.includes('Bad Gateway') || text.includes('Gateway Timeout')) {
      throw new Error(`El túnel o servidor tardó demasiado o rechazó la solicitud (HTTP ${res.status}). Verifica que el backend esté activo.`);
    }
    if (res.status === 413) {
      throw new Error('La imagen o archivo es demasiado grande para procesar (límite superado).');
    }
    throw new Error(`Respuesta no esperada del servidor (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }

  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error(`Error analizando JSON del servidor: ${parseErr.message}`);
  }

  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.error || defaultErrorMsg);
  }

  return data;
}

export class ApiService {
  /**
   * Verifica el estado del backend y los estándares de seguridad activos.
   */
  static async getHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    const data = await parseJsonResponse(res, 'El backend criptográfico no responde.');
    return data;
  }

  /**
   * Cifra un mensaje de texto o buffer binario con AES-256-GCM y PBKDF2-SHA512.
   * @param {string|Uint8Array|ArrayBuffer} plaintextOrBinary
   * @param {string} password
   */
  static async encryptAESGCM(plaintextOrBinary, password) {
    let body = { password };
    if (plaintextOrBinary instanceof Uint8Array || plaintextOrBinary instanceof ArrayBuffer) {
      const bytes = plaintextOrBinary instanceof Uint8Array ? plaintextOrBinary : new Uint8Array(plaintextOrBinary);
      let binary = '';
      const len = bytes.length;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      body.plaintextBase64 = btoa(binary);
    } else {
      body.plaintext = String(plaintextOrBinary);
    }

    const res = await fetch(`${API_BASE_URL}/crypto/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await parseJsonResponse(res, 'Error en cifrado AES-256-GCM.');
    return data.data;
  }

  /**
   * Desempaqueta y descifra con AES-256-GCM verificando el AuthTag.
   */
  static async decryptAESGCM(packedData, password) {
    const res = await fetch(`${API_BASE_URL}/crypto/decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packedData, password })
    });
    const data = await parseJsonResponse(res, 'Error en descifrado.');
    return data.data;
  }

  /**
   * Ejecuta prueba de estrés forense PBKDF2 midiendo costo computacional y resistencia a fuerza bruta.
   * @param {number} iterations - Número de iteraciones (ej: 100,000 o 600,000)
   * @param {string} password - Contraseña de prueba opcional
   */
  static async benchmarkPBKDF2(iterations = 100000, password = 'ClaveDePruebaSegura2026!') {
    const res = await fetch(`${API_BASE_URL}/crypto/benchmark-pbkdf2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iterations, password })
    });
    const data = await parseJsonResponse(res, 'Error ejecutando benchmark PBKDF2.');
    return data.data;
  }

  /**
   * Genera un par de claves RSA de 4096 bits.
   */
  static async generateRSAKeys() {
    const res = await fetch(`${API_BASE_URL}/crypto/rsa/keygen`);
    const data = await parseJsonResponse(res, 'Error generando par RSA-4096.');
    return data.data;
  }

  /**
   * Cifrado Híbrido: RSA-OAEP + AES-256-GCM
   */
  static async hybridEncrypt(plaintext, publicKeyPem) {
    const res = await fetch(`${API_BASE_URL}/crypto/rsa/hybrid-encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plaintext, publicKeyPem })
    });
    const data = await parseJsonResponse(res, 'Error en cifrado híbrido.');
    return data.data;
  }

  /**
   * Descifrado Híbrido: RSA-OAEP + AES-256-GCM
   */
  static async hybridDecrypt(payload, privateKeyPem) {
    const res = await fetch(`${API_BASE_URL}/crypto/rsa/hybrid-decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, privateKeyPem })
    });
    const data = await parseJsonResponse(res, 'Error en descifrado híbrido.');
    return data.data;
  }

  /**
   * Envía una imagen al backend para estegoanálisis y extracción de métricas estadísticas.
   * @param {Blob|File} imageBlob 
   */
  static async analyzeImage(imageBlob) {
    const formData = new FormData();
    formData.append('image', imageBlob, 'sample.png');

    const res = await fetch(`${API_BASE_URL}/analyze/image`, {
      method: 'POST',
      body: formData
    });
    const data = await parseJsonResponse(res, 'Error en el servicio de estegoanálisis.');
    return data.data;
  }

  /**
   * Consulta al Asistente Inteligente (CyberTutor IA).
   * La API key se gestiona exclusivamente en el backend (.env).
   * @param {string} prompt 
   * @param {string} activeTab 
   */
  static async askAi(prompt, activeTab = 'general') {
    const res = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, activeTab })
    });
    const data = await parseJsonResponse(res, 'Error comunicando con CyberTutor IA.');
    return data.data;
  }

  /**
   * Despacha un archivo confidencial o imagen esteganográfica por correo electrónico.
   * @param {Object} payload
   * @param {string} payload.to - Correo destinatario
   * @param {string} [payload.subject] - Asunto
   * @param {string} [payload.message] - Mensaje
   * @param {string} payload.attachmentBase64 - Archivo adjunto en Base64
   * @param {string} [payload.filename] - Nombre de archivo
   * @param {string} [payload.mimeType] - Tipo MIME
   */
  static async sendEmail({ to, subject, message, attachmentBase64, filename, mimeType }) {
    const res = await fetch(`${API_BASE_URL}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, message, attachmentBase64, filename, mimeType })
    });
    const data = await parseJsonResponse(res, 'Error al despachar el correo.');
    return data.data;
  }
}
