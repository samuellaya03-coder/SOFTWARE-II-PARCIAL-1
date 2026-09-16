/**
 * MOTOR DE ESTEGANOGRAFÍA LSB EN CANVAS HTML5
 * 
 * Protocolo Binario:
 * - Cabecera (Header): 32 bits (4 bytes, Big-Endian) que especifican la longitud L (en bytes) del payload.
 * - Cuerpo (Payload): L * 8 bits del mensaje o flujo binario cifrado.
 * - Portador: Canales R, G y B del ImageData.
 * - Conservación: Canal Alfa (A) intacto (255) para evitar distorsiones de opacidad.
 * - Operación a nivel de bits: (byte & 0xFE) | bit
 */

export class StegoEngine {
  /**
   * Calcula la capacidad máxima en bytes soportada por una imagen de dimensiones width x height.
   * @param {number} width 
   * @param {number} height 
   * @returns {{ totalPixels: number, availableBits: number, maxBytes: number }}
   */
  static calculateCapacity(width, height) {
    const totalPixels = width * height;
    const availableBits = totalPixels * 3; // R, G, B (1 bit LSB por canal)
    const totalBytes = Math.floor(availableBits / 8);
    const maxPayloadBytes = Math.max(0, totalBytes - 4); // Menos 4 bytes del header de 32 bits

    return {
      totalPixels,
      availableBits,
      maxBytes: maxPayloadBytes
    };
  }

  /**
   * Carga un archivo de imagen en un elemento HTMLImageElement.
   * @param {File|Blob} file 
   * @returns {Promise<HTMLImageElement>}
   */
  static loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error('No se pudo cargar la imagen: formato no soportado.'));
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Oculta un payload (Uint8Array o string) dentro de los píxeles de una imagen usando LSB.
   * @param {HTMLImageElement} imageElement 
   * @param {Uint8Array|string} payload 
   * @returns {{ canvas: HTMLCanvasElement, stats: object }}
   */
  static hideData(imageElement, payload) {
    // 1. Convertir payload a Uint8Array si es string
    let payloadBytes;
    if (typeof payload === 'string') {
      payloadBytes = new TextEncoder().encode(payload);
    } else if (payload instanceof Uint8Array) {
      payloadBytes = payload;
    } else {
      throw new Error('El payload debe ser una cadena o un Uint8Array.');
    }

    const payloadLength = payloadBytes.length;
    const width = imageElement.naturalWidth || imageElement.width;
    const height = imageElement.naturalHeight || imageElement.height;

    const capacity = this.calculateCapacity(width, height);
    if (payloadLength > capacity.maxBytes) {
      throw new Error(
        `El payload (${payloadLength} bytes) excede la capacidad máxima de la imagen (${capacity.maxBytes} bytes).`
      );
    }

    // 2. Preparar el Canvas y extraer ImageData
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imageElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data; // Uint8ClampedArray: [R, G, B, A, R, G, B, A, ...]

    // 3. Crear el buffer con la Cabecera de 32 bits (Big Endian) + Payload
    const totalBuffer = new Uint8Array(4 + payloadLength);
    // Header de 4 bytes (longitud del payload)
    totalBuffer[0] = (payloadLength >>> 24) & 0xFF;
    totalBuffer[1] = (payloadLength >>> 16) & 0xFF;
    totalBuffer[2] = (payloadLength >>> 8) & 0xFF;
    totalBuffer[3] = payloadLength & 0xFF;
    // Copiar payload
    totalBuffer.set(payloadBytes, 4);

    // 4. Inyección bit a bit en los LSB de los canales R, G, B
    let bufferByteIndex = 0;
    let bitOffset = 7; // Desde MSB (bit 7) a LSB (bit 0) de cada byte del payload
    let modifiedChannels = 0;

    for (let i = 0; i < data.length; i += 4) {
      // Canales R (i), G (i+1), B (i+2). El canal Alfa (i+3) se mantiene intacto.
      for (let channelOffset = 0; channelOffset < 3; channelOffset++) {
        if (bufferByteIndex >= totalBuffer.length) {
          break; // Todo el flujo ha sido incrustado
        }

        const currentByte = totalBuffer[bufferByteIndex];
        const bit = (currentByte >>> bitOffset) & 1;

        const pixelIndex = i + channelOffset;
        // Aplicar máscara: poner a 0 el bit menos significativo y colocar el bit del payload
        data[pixelIndex] = (data[pixelIndex] & 0xFE) | bit;
        modifiedChannels++;

        bitOffset--;
        if (bitOffset < 0) {
          bitOffset = 7;
          bufferByteIndex++;
        }
      }

      if (bufferByteIndex >= totalBuffer.length) {
        break;
      }
    }

    // 5. Volcar los píxeles modificados de vuelta al canvas
    ctx.putImageData(imageData, 0, 0);

    return {
      canvas,
      stats: {
        width,
        height,
        payloadBytes: payloadLength,
        headerBytes: 4,
        totalInjectedBytes: totalBuffer.length,
        modifiedChannels,
        capacityMaxBytes: capacity.maxBytes,
        capacityUsedPercentage: Number(((payloadLength / capacity.maxBytes) * 100).toFixed(2))
      }
    };
  }

  /**
   * Extrae los datos ocultos dentro de una imagen esteganográfica.
   * @param {HTMLImageElement|HTMLCanvasElement} source 
   * @returns {{ rawBytes: Uint8Array, text: string|null, isBinary: boolean, length: number }}
   */
  static extractData(source) {
    let canvas;
    let width, height;

    if (source instanceof HTMLCanvasElement) {
      canvas = source;
      width = canvas.width;
      height = canvas.height;
    } else {
      width = source.naturalWidth || source.width;
      height = source.naturalHeight || source.height;
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0);
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const capacity = this.calculateCapacity(width, height);

    // 1. Extraer los primeros 32 bits para obtener la longitud del payload
    let currentByte = 0;
    let bitOffset = 7;
    let headerBytes = new Uint8Array(4);
    let headerByteIndex = 0;
    let streamIndex = 0;

    for (let i = 0; i < data.length; i += 4) {
      for (let channelOffset = 0; channelOffset < 3; channelOffset++) {
        if (headerByteIndex >= 4) break;

        const pixelIndex = i + channelOffset;
        const bit = data[pixelIndex] & 1;

        currentByte = (currentByte << 1) | bit;
        bitOffset--;

        if (bitOffset < 0) {
          headerBytes[headerByteIndex] = currentByte;
          headerByteIndex++;
          currentByte = 0;
          bitOffset = 7;
        }
        streamIndex++;
      }
      if (headerByteIndex >= 4) break;
    }

    // Reconstruir entero de 32 bits (Big Endian)
    const payloadLength = (
      (headerBytes[0] << 24) |
      (headerBytes[1] << 16) |
      (headerBytes[2] << 8) |
      headerBytes[3]
    ) >>> 0;

    // Validación de coherencia
    if (payloadLength === 0 || payloadLength > capacity.maxBytes) {
      throw new Error(
        `Cabecera LSB no válida o imagen sin mensaje oculto. Longitud leída: ${payloadLength} bytes (Capacidad máx: ${capacity.maxBytes} bytes).`
      );
    }

    // 2. Extraer los payloadLength bytes subsiguientes
    const payloadBuffer = new Uint8Array(payloadLength);
    let payloadByteIndex = 0;
    currentByte = 0;
    bitOffset = 7;

    let currentBitInStream = 0;
    const targetBitOffset = 32; // Ya leímos 32 bits del header

    for (let i = 0; i < data.length; i += 4) {
      for (let channelOffset = 0; channelOffset < 3; channelOffset++) {
        if (currentBitInStream < targetBitOffset) {
          currentBitInStream++;
          continue; // Saltar bits del header
        }

        if (payloadByteIndex >= payloadLength) break;

        const pixelIndex = i + channelOffset;
        const bit = data[pixelIndex] & 1;

        currentByte = (currentByte << 1) | bit;
        bitOffset--;

        if (bitOffset < 0) {
          payloadBuffer[payloadByteIndex] = currentByte;
          payloadByteIndex++;
          currentByte = 0;
          bitOffset = 7;
        }
      }
      if (payloadByteIndex >= payloadLength) break;
    }

    // 3. Determinar si es texto UTF-8 o datos binarios
    let text = null;
    let isBinary = false;
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      text = decoder.decode(payloadBuffer);
    } catch {
      isBinary = true;
    }

    return {
      rawBytes: payloadBuffer,
      text,
      isBinary,
      length: payloadLength
    };
  }

  /**
   * Exporta un elemento canvas como Blob PNG sin pérdida.
   * @param {HTMLCanvasElement} canvas 
   * @returns {Promise<Blob>}
   */
  static exportToPngBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }
}
