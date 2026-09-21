/**
 * CLIENTE DE COMUNICACIÓN CON LA API DEL BACKEND CRIPTOGRÁFICO
 */

const API_BASE_URL = '/api';

export class ApiService {
  /**
   * Verifica el estado del backend y los estándares de seguridad activos.
   */
  static async getHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('El backend criptográfico no responde.');
    return await res.json();
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
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error en cifrado AES-256-GCM.');
    }
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
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error en descifrado.');
    }
    return data.data;
  }

  /**
   * Genera un par de claves RSA de 4096 bits.
   */
  static async generateRSAKeys() {
    const res = await fetch(`${API_BASE_URL}/crypto/rsa/keygen`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error generando par RSA-4096.');
    }
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
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error en cifrado híbrido.');
    }
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
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error en descifrado híbrido.');
    }
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
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error en el servicio de estegoanálisis.');
    }
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
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error comunicando con CyberTutor IA.');
    }
    return data.data;
  }
}
