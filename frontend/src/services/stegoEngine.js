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
        img.onerror = () => reject(new Error('No se pudo cargar la imagen: formato no soportado.'));
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convierte cualquier imagen (JPEG, JPG, WebP, BMP, GIF, etc.) automáticamente a PNG sin pérdida.
   * Si excede maxDimension (ej. 1920px en fotos de cámara de smartphone de 12-24MP),
   * redimensiona proporcionalmente para evitar blobs masivos de 30-50MB que causan timeout en túneles (HTTP 524).
   * Si ya es PNG, la devuelve tal cual para preservar los planos LSB intactos.
   * @param {File|Blob} fileOrBlob 
   * @param {number} maxDimension - Dimensión máxima en píxeles (default 1920). 0 para sin límite.
   * @returns {Promise<{ pngBlob: Blob, wasConverted: boolean, originalType: string, width: number, height: number, imageElement: HTMLImageElement }>}
   */
  static async convertToPng(fileOrBlob, maxDimension = 1920) {
    const originalType = fileOrBlob.type || 'image/unknown';
    const isAlreadyPng = originalType === 'image/png';

    const img = await this.loadImage(fileOrBlob);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (isAlreadyPng) {
      return {
        pngBlob: fileOrBlob,
        wasConverted: false,
        originalType,
        width,
        height,
        imageElement: img
      };
    }

    // Calcular dimensiones proporcionales si excede maxDimension (evita sobrecargas de 30-50MB con fotos móviles)
    let targetWidth = width;
    let targetHeight = height;
    if (maxDimension > 0 && (width > maxDimension || height > maxDimension)) {
      if (width > height) {
        targetWidth = maxDimension;
        targetHeight = Math.round((height * maxDimension) / width);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((width * maxDimension) / height);
      }
    }

    // Convertir de forma transparente mediante Canvas HTML5 a PNG sin pérdida
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const pngBlob = await this.exportToPngBlob(canvas);
    const convertedImg = await this.loadImage(pngBlob);

    return {
      pngBlob,
      wasConverted: true,
      originalType,
      width: targetWidth,
      height: targetHeight,
      imageElement: convertedImg
    };
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
    const data = imageData.data;
    const originalData = new Uint8ClampedArray(data);

    // 3. Crear el buffer con la Cabecera de 32 bits (Big Endian) + Payload
    const totalBuffer = new Uint8Array(4 + payloadLength);
    // Header de 4 bytes (longitud del payload)
    totalBuffer[0] = (payloadLength >>> 24) & 0xFF;
    totalBuffer[1] = (payloadLength >>> 16) & 0xFF;
    totalBuffer[2] = (payloadLength >>> 8) & 0xFF;
    totalBuffer[3] = payloadLength & 0xFF;
    // Copiar payload
    totalBuffer.set(payloadBytes, 4);

    const totalInjectedBits = totalBuffer.length * 8;
    const endPixel = Math.min(width * height - 1, Math.ceil(totalInjectedBits / 3) - 1);
    const endRow = Math.floor(endPixel / width);

    // Estructuras para el Microscopio de Píxeles Bit a Bit
    const channelNames = ['R', 'G', 'B'];
    const inspectionSamples = {
      header: [],
      payloadStart: [],
      boundary: []
    };

    let currentSampleByte = null;

    // 4. Inyección bit a bit en los LSB de los canales R, G, B
    let bufferByteIndex = 0;
    let bitOffset = 7; // Desde MSB (bit 7) a LSB (bit 0) de cada byte del payload
    let modifiedChannels = 0;
    let flippedBitsCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const pIdx = Math.floor(i / 4);

      // Canales R (i), G (i+1), B (i+2). El canal Alfa (i+3) se mantiene intacto.
      for (let channelOffset = 0; channelOffset < 3; channelOffset++) {
        if (bufferByteIndex >= totalBuffer.length) {
          break; // Todo el flujo ha sido incrustado
        }

        const currentByte = totalBuffer[bufferByteIndex];
        const bit = (currentByte >>> bitOffset) & 1;

        // Recolección de muestras para el Microscopio
        const isHeaderByte = bufferByteIndex < 4;
        const isPayloadStartByte = bufferByteIndex >= 4 && bufferByteIndex < 10;
        const isBoundaryByte = bufferByteIndex >= (totalBuffer.length - 2);

        if (bitOffset === 7) {
          let charRep = `0x${currentByte.toString(16).padStart(2, '0').toUpperCase()}`;
          if (bufferByteIndex >= 4 && currentByte >= 32 && currentByte <= 126) {
            charRep = `'${String.fromCharCode(currentByte)}' (${charRep})`;
          }
          currentSampleByte = {
            byteIndex: bufferByteIndex,
            byteVal: currentByte,
            byteChar: charRep,
            binary: currentByte.toString(2).padStart(8, '0'),
            category: isHeaderByte ? 'header' : (isBoundaryByte ? 'boundary' : 'payloadStart'),
            bits: []
          };

          if (isHeaderByte) inspectionSamples.header.push(currentSampleByte);
          else if (isPayloadStartByte) inspectionSamples.payloadStart.push(currentSampleByte);
          else if (isBoundaryByte) inspectionSamples.boundary.push(currentSampleByte);
        }

        const pixelIndex = i + channelOffset;
        const origByte = originalData[pixelIndex];
        const newByte = (origByte & 0xFE) | bit;

        data[pixelIndex] = newByte;
        modifiedChannels++;
        if (origByte !== newByte) {
          flippedBitsCount++;
        }

        if (currentSampleByte && (isHeaderByte || isPayloadStartByte || isBoundaryByte)) {
          currentSampleByte.bits.push({
            bitIndex: bitOffset,
            injectedBit: bit,
            channel: channelNames[channelOffset],
            pixelIndex: pIdx,
            x: pIdx % width,
            y: Math.floor(pIdx / width),
            origByte,
            newByte,
            delta: newByte - origByte,
            origBin: origByte.toString(2).padStart(8, '0'),
            newBin: newByte.toString(2).padStart(8, '0'),
            origColor: `rgb(${originalData[i]}, ${originalData[i+1]}, ${originalData[i+2]})`,
            newColor: `rgb(${data[i]}, ${data[i+1]}, ${data[i+2]})`
          });
        }

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

    // 6. Cálculo Pericial de PSNR y MSE
    let sumSqErr = 0;
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - originalData[i];
      const dg = data[i+1] - originalData[i+1];
      const db = data[i+2] - originalData[i+2];
      sumSqErr += (dr * dr) + (dg * dg) + (db * db);
    }
    const mse = sumSqErr / (width * height * 3);
    const psnr = mse > 0 ? Number((10 * Math.log10((255 * 255) / mse)).toFixed(2)) : 99.9;

    const originalImageData = new ImageData(new Uint8ClampedArray(originalData), width, height);

    return {
      canvas,
      originalImageData,
      stegoImageData: imageData,
      stats: {
        width,
        height,
        payloadBytes: payloadLength,
        headerBytes: 4,
        totalInjectedBytes: totalBuffer.length,
        totalInjectedBits,
        endPixel,
        endRow,
        modifiedChannels,
        flippedBitsCount,
        capacityMaxBytes: capacity.maxBytes,
        capacityUsedPercentage: Number(((payloadLength / capacity.maxBytes) * 100).toFixed(2)),
        psnr,
        mse: Number(mse.toFixed(6)),
        samples: inspectionSamples
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
    if (payloadLength === 0) {
      throw new Error('No se detectó ningún mensaje oculto en la imagen (longitud 0).');
    }
    if (payloadLength > capacity.maxBytes) {
      throw new Error(
        `Payload truncado: La cabecera indica un archivo de ${payloadLength.toLocaleString()} bytes (~${(payloadLength / 1024).toFixed(1)} KB), pero la imagen actual solo tiene capacidad para ${capacity.maxBytes.toLocaleString()} bytes (~${(capacity.maxBytes / 1024).toFixed(1)} KB). La imagen fue recortada o redimensionada al ser transferida, perdiendo parte de sus píxeles.`
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

    // 3. Determinar si es texto UTF-8 o datos binarios y desempaquetar si contiene formato STG1
    const unpacked = this.unpackPayload(payloadBuffer);

    return {
      rawBytes: payloadBuffer,
      text: unpacked.type === 'text' ? unpacked.text : null,
      isBinary: unpacked.type === 'file',
      unpacked,
      length: payloadLength
    };
  }

  /**
   * Empaqueta texto o un archivo binario en el contenedor estructurado STG1.
   * @param {{ type: 'text'|'file', text?: string, fileBytes?: Uint8Array, filename?: string, mimeType?: string }} options
   * @returns {Uint8Array}
   */
  static packPayload(options) {
    const MAGIC = [0x53, 0x54, 0x47, 0x31]; // 'STG1'
    const encoder = new TextEncoder();

    if (options.type === 'file' && options.fileBytes) {
      const filename = options.filename || 'archivo_secreto.bin';
      const mimeType = options.mimeType || 'application/octet-stream';
      const nameBytes = encoder.encode(filename);
      const mimeBytes = encoder.encode(mimeType);
      const fileBytes = options.fileBytes instanceof Uint8Array ? options.fileBytes : new Uint8Array(options.fileBytes);

      // Header: Magic(4) + Type(1) + nameLen(2) + nameBytes + mimeLen(2) + mimeBytes + fileBytes
      const totalLen = 4 + 1 + 2 + nameBytes.length + 2 + mimeBytes.length + fileBytes.length;
      const buffer = new Uint8Array(totalLen);
      let offset = 0;

      buffer.set(MAGIC, offset); offset += 4;
      buffer[offset++] = 0x02; // Type 0x02 = FILE
      buffer[offset++] = (nameBytes.length >> 8) & 0xFF;
      buffer[offset++] = nameBytes.length & 0xFF;
      buffer.set(nameBytes, offset); offset += nameBytes.length;
      buffer[offset++] = (mimeBytes.length >> 8) & 0xFF;
      buffer[offset++] = mimeBytes.length & 0xFF;
      buffer.set(mimeBytes, offset); offset += mimeBytes.length;
      buffer.set(fileBytes, offset);

      return buffer;
    } else {
      // TEXT
      const text = options.text || '';
      const textBytes = encoder.encode(text);
      const buffer = new Uint8Array(4 + 1 + textBytes.length);
      buffer.set(MAGIC, 0);
      buffer[4] = 0x01; // Type 0x01 = TEXT
      buffer.set(textBytes, 5);
      return buffer;
    }
  }

  /**
   * Desempaqueta un buffer identificando si tiene cabecera STG1 o es texto/binario clásico.
   * @param {Uint8Array} buffer
   * @returns {{ isContainer: boolean, type: 'text'|'file', text?: string, filename?: string, mimeType?: string, fileBytes?: Uint8Array, blob?: Blob, size: number }}
   */
  static unpackPayload(buffer) {
    if (!buffer || buffer.length === 0) {
      return { isContainer: false, type: 'text', text: '', size: 0 };
    }

    const isStg1 = buffer.length >= 5 &&
      buffer[0] === 0x53 &&
      buffer[1] === 0x54 &&
      buffer[2] === 0x47 &&
      buffer[3] === 0x31;

    if (isStg1) {
      const type = buffer[4];
      if (type === 0x01) {
        // Texto
        const textBytes = buffer.subarray(5);
        const text = new TextDecoder('utf-8').decode(textBytes);
        return {
          isContainer: true,
          type: 'text',
          text,
          size: textBytes.length
        };
      } else if (type === 0x02 && buffer.length >= 9) {
        // Archivo
        let offset = 5;
        const nameLen = (buffer[offset] << 8) | buffer[offset + 1];
        offset += 2;
        if (offset + nameLen <= buffer.length) {
          const nameBytes = buffer.subarray(offset, offset + nameLen);
          const filename = new TextDecoder('utf-8').decode(nameBytes);
          offset += nameLen;

          if (offset + 2 <= buffer.length) {
            const mimeLen = (buffer[offset] << 8) | buffer[offset + 1];
            offset += 2;
            if (offset + mimeLen <= buffer.length) {
              const mimeBytes = buffer.subarray(offset, offset + mimeLen);
              const mimeType = new TextDecoder('utf-8').decode(mimeBytes);
              offset += mimeLen;

              const fileBytes = buffer.subarray(offset);
              const blob = new Blob([fileBytes], { type: mimeType });
              return {
                isContainer: true,
                type: 'file',
                filename,
                mimeType,
                fileBytes,
                blob,
                size: fileBytes.length
              };
            }
          }
        }
      }
    }

    // Fallback para payloads que no usan el contenedor STG1
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const text = decoder.decode(buffer);
      return {
        isContainer: false,
        type: 'text',
        text,
        size: buffer.length
      };
    } catch {
      return {
        isContainer: false,
        type: 'file',
        filename: 'datos_extraidos.bin',
        mimeType: 'application/octet-stream',
        fileBytes: buffer,
        blob: new Blob([buffer], { type: 'application/octet-stream' }),
        size: buffer.length
      };
    }
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
