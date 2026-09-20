/**
 * MOTOR DE ATAQUES A IMÁGENES ESTEGANOGRÁFICAS Y FORENSES EN TIEMPO REAL
 * 
 * Permite someter imágenes digitales a degradaciones controladas:
 * - Bit-Flipping / Inyección de ruido en bits específicos (LSB bit 0, intermedios o MSB bit 7)
 * - LSB Wiping / Anulación de bits menos significativos
 * - Compresión con pérdida (JPEG Quality Degradation)
 * - Desenfoque / Convolución espacial (Blur)
 * - Manipulación pericial localizada (Tamper Box)
 * 
 * Además calcula:
 * - PSNR (Peak Signal-to-Noise Ratio en dB) y MSE
 * - Mapa de Calor Forense de Daño (Difference Heatmap)
 * - Tasa de Error de Bits (BER - Bit Error Rate) del Payload
 */

export class ImageAttackEngine {
  /**
   * Clona un objeto ImageData para manipulación no destructiva.
   * @param {ImageData} srcImageData 
   * @returns {ImageData}
   */
  static cloneImageData(srcImageData) {
    const copy = new ImageData(
      new Uint8ClampedArray(srcImageData.data),
      srcImageData.width,
      srcImageData.height
    );
    return copy;
  }

  /**
   * Ataque de Corrupción de Bits (Bit-Flip):
   * Invierte el bit especificado (por defecto bit 0, LSB) en un porcentaje de píxeles.
   * 
   * @param {ImageData} imageData 
   * @param {number} percentage (0 a 100)
   * @param {number} targetBit (0 a 7, default 0 = LSB)
   * @param {string} channel ('all', 'r', 'g', 'b')
   * @returns {{ modifiedCount: number, attackedImageData: ImageData }}
   */
  static applyBitFlip(imageData, percentage, targetBit = 0, channel = 'all') {
    const copy = this.cloneImageData(imageData);
    const data = copy.data;
    const totalPixels = copy.width * copy.height;
    const mask = 1 << targetBit;

    if (percentage <= 0) {
      return { modifiedCount: 0, attackedImageData: copy };
    }

    const ratio = Math.min(100, Math.max(0, percentage)) / 100;
    const targetPixelCount = Math.round(totalPixels * ratio);

    let modifiedCount = 0;
    const step = totalPixels / (targetPixelCount || 1);

    for (let p = 0; p < targetPixelCount; p++) {
      const pixelIndex = Math.min(totalPixels - 1, Math.floor(p * step));
      const byteIdx = pixelIndex * 4;

      if (channel === 'all' || channel === 'r') {
        data[byteIdx] ^= mask;
        modifiedCount++;
      }
      if (channel === 'all' || channel === 'g') {
        data[byteIdx + 1] ^= mask;
        modifiedCount++;
      }
      if (channel === 'all' || channel === 'b') {
        data[byteIdx + 2] ^= mask;
        modifiedCount++;
      }
    }

    return { modifiedCount, attackedImageData: copy };
  }

  /**
   * Ataque de Anulación de LSB (LSB Wiping / Overwrite):
   * Pone a 0 o fuerza un valor constante en el bit menos significativo.
   * Este es el ataque más sigiloso: destruye el mensaje oculto sin cambiar perceptiblemente la imagen.
   * 
   * @param {ImageData} imageData 
   * @param {string} mode ('zero' | 'random' | 'one')
   * @param {Array<'r'|'g'|'b'>} channels 
   * @returns {{ modifiedCount: number, attackedImageData: ImageData }}
   */
  static applyLSBWiping(imageData, mode = 'zero', channels = ['r', 'g', 'b']) {
    const copy = this.cloneImageData(imageData);
    const data = copy.data;
    let modifiedCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (channels.includes('r')) {
        const orig = data[i];
        let val;
        if (mode === 'zero') val = orig & 0xFE;
        else if (mode === 'one') val = orig | 0x01;
        else val = (orig & 0xFE) | (Math.random() > 0.5 ? 1 : 0);

        if (val !== orig) modifiedCount++;
        data[i] = val;
      }

      if (channels.includes('g')) {
        const orig = data[i + 1];
        let val;
        if (mode === 'zero') val = orig & 0xFE;
        else if (mode === 'one') val = orig | 0x01;
        else val = (orig & 0xFE) | (Math.random() > 0.5 ? 1 : 0);

        if (val !== orig) modifiedCount++;
        data[i + 1] = val;
      }

      if (channels.includes('b')) {
        const orig = data[i + 2];
        let val;
        if (mode === 'zero') val = orig & 0xFE;
        else if (mode === 'one') val = orig | 0x01;
        else val = (orig & 0xFE) | (Math.random() > 0.5 ? 1 : 0);

        if (val !== orig) modifiedCount++;
        data[i + 2] = val;
      }
    }

    return { modifiedCount, attackedImageData: copy };
  }

  /**
   * Ataque de Compresión JPEG con Pérdida:
   * Convierte el Canvas a JPEG a la calidad especificada (0.05 a 0.95),
   * cuantizando las frecuencias espaciales y destruyendo los LSB.
   * 
   * @param {HTMLCanvasElement} canvas 
   * @param {number} quality (0.01 a 1.0)
   * @returns {Promise<{ attackedCanvas: HTMLCanvasElement, attackedImageData: ImageData }>}
   */
  static applyJpegCompression(canvas, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const width = canvas.width;
      const height = canvas.height;
      const dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.01, Math.min(1.0, quality)));

      const img = new Image();
      img.onload = () => {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = width;
        newCanvas.height = height;
        const ctx = newCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const attackedImageData = ctx.getImageData(0, 0, width, height);
        resolve({ attackedCanvas: newCanvas, attackedImageData });
      };
      img.onerror = () => reject(new Error('Fallo al aplicar compresión JPEG'));
      img.src = dataUrl;
    });
  }

  /**
   * Ataque de Desenfoque Espacial (Box Blur):
   * Promedia los píxeles adyacentes suavizando micro-patrones.
   * 
   * @param {ImageData} imageData 
   * @param {number} radius (1 a 5)
   * @returns {{ attackedImageData: ImageData }}
   */
  static applyBlur(imageData, radius = 1) {
    const copy = this.cloneImageData(imageData);
    const src = imageData.data;
    const dst = copy.data;
    const w = imageData.width;
    const h = imageData.height;
    const r = Math.max(1, Math.min(5, Math.round(radius)));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        for (let ky = -r; ky <= r; ky++) {
          const py = Math.min(h - 1, Math.max(0, y + ky));
          for (let kx = -r; kx <= r; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx));
            const idx = (py * w + px) * 4;
            rSum += src[idx];
            gSum += src[idx + 1];
            bSum += src[idx + 2];
            count++;
          }
        }

        const outIdx = (y * w + x) * 4;
        dst[outIdx] = Math.round(rSum / count);
        dst[outIdx + 1] = Math.round(gSum / count);
        dst[outIdx + 2] = Math.round(bSum / count);
        dst[outIdx + 3] = src[outIdx + 3];
      }
    }

    return { attackedImageData: copy };
  }

  /**
   * Ataque de Manipulación Local (Tamper Box):
   * Altera una región rectangular de la imagen simulando un corte, parche o censura.
   * 
   * @param {ImageData} imageData 
   * @param {number} xPct (0 a 100)
   * @param {number} yPct (0 a 100)
   * @param {number} sizePct (5 a 50)
   * @param {string} tamperType ('noise' | 'black' | 'invert')
   * @returns {{ attackedImageData: ImageData }}
   */
  static applyTamperBox(imageData, xPct = 25, yPct = 25, sizePct = 20, tamperType = 'noise') {
    const copy = this.cloneImageData(imageData);
    const data = copy.data;
    const w = imageData.width;
    const h = imageData.height;

    const boxW = Math.round((w * sizePct) / 100);
    const boxH = Math.round((h * sizePct) / 100);
    const startX = Math.round((w * xPct) / 100);
    const startY = Math.round((h * yPct) / 100);

    const endX = Math.min(w, startX + boxW);
    const endY = Math.min(h, startY + boxH);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * w + x) * 4;
        if (tamperType === 'black') {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
        } else if (tamperType === 'invert') {
          data[idx] = 255 - data[idx];
          data[idx + 1] = 255 - data[idx + 1];
          data[idx + 2] = 255 - data[idx + 2];
        } else {
          data[idx] = Math.floor(Math.random() * 256);
          data[idx + 1] = Math.floor(Math.random() * 256);
          data[idx + 2] = Math.floor(Math.random() * 256);
        }
      }
    }

    return { attackedImageData: copy };
  }

  /**
   * Calcula métricas forenses cuantitativas entre la imagen original y la atacada:
   * MSE, PSNR (dB), píxeles modificados y porcentaje de alteración.
   * 
   * @param {ImageData} origImageData 
   * @param {ImageData} attackedImageData 
   * @returns {{ mse: number, psnr: number, modifiedPixels: number, totalPixels: number, modifiedPct: number }}
   */
  static computeMetrics(origImageData, attackedImageData) {
    const orig = origImageData.data;
    const att = attackedImageData.data;
    const totalPixels = origImageData.width * origImageData.height;

    let sumSquaredErrors = 0;
    let modifiedPixels = 0;

    for (let i = 0; i < orig.length; i += 4) {
      const dr = orig[i] - att[i];
      const dg = orig[i + 1] - att[i + 1];
      const db = orig[i + 2] - att[i + 2];

      const se = dr * dr + dg * dg + db * db;
      sumSquaredErrors += se;

      if (dr !== 0 || dg !== 0 || db !== 0) {
        modifiedPixels++;
      }
    }

    const mse = sumSquaredErrors / (totalPixels * 3);
    let psnr = Infinity;
    if (mse > 0.000001) {
      psnr = 10 * Math.log10((255 * 255) / mse);
    }

    const modifiedPct = totalPixels > 0 ? (modifiedPixels / totalPixels) * 100 : 0;

    return {
      mse: Number(mse.toFixed(4)),
      psnr: psnr === Infinity ? 99.99 : Number(psnr.toFixed(2)),
      modifiedPixels,
      totalPixels,
      modifiedPct: Number(modifiedPct.toFixed(3))
    };
  }

  /**
   * Renderiza un Mapa de Calor de Daño Forense (Difference Heatmap) en un Canvas:
   * Resalta en color fosforescente (rojo/cian neón) exactamente los píxeles y bits mutados.
   * 
   * @param {ImageData} origImageData 
   * @param {ImageData} attackedImageData 
   * @param {HTMLCanvasElement} heatmapCanvas 
  /**
   * Renderiza el Plano de Bits Ocultos (Bit-Plane):
   * Extrae el bit especificado (por defecto Bit 0, LSB) de los canales R, G, B y los proyecta a luminancia visible.
   * 
   * @param {ImageData} imageData 
   * @param {HTMLCanvasElement} lsbCanvas 
   * @param {'bw'|'rgb'|'cyan'} format
   * @param {number} bitNumber (0 a 7, default 0 = LSB)
   */
  static renderLSBPlane(imageData, lsbCanvas, format = 'bw', bitNumber = 0) {
    lsbCanvas.width = imageData.width;
    lsbCanvas.height = imageData.height;
    const ctx = lsbCanvas.getContext('2d');
    const outImg = ctx.createImageData(imageData.width, imageData.height);
    const out = outImg.data;
    const data = imageData.data;
    const shift = Math.max(0, Math.min(7, bitNumber));

    for (let i = 0; i < data.length; i += 4) {
      const bitR = (data[i] >> shift) & 1;
      const bitG = (data[i + 1] >> shift) & 1;
      const bitB = (data[i + 2] >> shift) & 1;

      if (format === 'bw') {
        const bitVal = ((bitR + bitG + bitB) >= 2 ? 1 : 0) * 255;
        out[i] = bitVal;
        out[i + 1] = bitVal;
        out[i + 2] = bitVal;
        out[i + 3] = 255;
      } else if (format === 'cyan') {
        const bitVal = ((bitR + bitG + bitB) >= 2 ? 1 : 0);
        out[i] = bitVal ? 0 : 5;
        out[i + 1] = bitVal ? 240 : 10;
        out[i + 2] = bitVal ? 255 : 20;
        out[i + 3] = 255;
      } else {
        out[i] = bitR * 255;
        out[i + 1] = bitG * 255;
        out[i + 2] = bitB * 255;
        out[i + 3] = 255;
      }
    }

    ctx.putImageData(outImg, 0, 0);
  }

  /**
   * Renderiza un Mapa de Calor de Daño Forense (Difference Heatmap) en un Canvas:
   * Por defecto con tema 'pure-red': Todo fondo negro puro (#000000) y bits/píxeles mutados en ROJO BRILLANTE (#FF0028).
   * 
   * @param {ImageData} origImageData 
   * @param {ImageData} attackedImageData 
   * @param {HTMLCanvasElement} heatmapCanvas 
   * @param {'pure-red'|'neon-red'|'matrix'|'cyan-glow'} colorTheme 
   */
  static renderDifferenceHeatmap(origImageData, attackedImageData, heatmapCanvas, colorTheme = 'pure-red') {
    heatmapCanvas.width = origImageData.width;
    heatmapCanvas.height = origImageData.height;
    const ctx = heatmapCanvas.getContext('2d');

    if (colorTheme === 'photo-attacked') {
      ctx.putImageData(attackedImageData, 0, 0);
      return;
    }

    const outImg = ctx.createImageData(origImageData.width, origImageData.height);
    const out = outImg.data;
    const orig = origImageData.data;
    const att = attackedImageData.data;

    for (let i = 0; i < orig.length; i += 4) {
      const diffR = Math.abs(orig[i] - att[i]);
      const diffG = Math.abs(orig[i + 1] - att[i + 1]);
      const diffB = Math.abs(orig[i + 2] - att[i + 2]);
      const hasDiff = (diffR > 0 || diffG > 0 || diffB > 0);

      if (hasDiff) {
        if (colorTheme === 'pure-red' || colorTheme === 'red-black') {
          // ROJO INTENSO FOSFORESCENTE
          out[i] = 255;
          out[i + 1] = 0;
          out[i + 2] = 40;
          out[i + 3] = 255;
        } else if (colorTheme === 'neon-red') {
          out[i] = 255;
          out[i + 1] = Math.min(255, diffG * 4);
          out[i + 2] = 85;
          out[i + 3] = 255;
        } else if (colorTheme === 'matrix') {
          out[i] = 10;
          out[i + 1] = 255;
          out[i + 2] = 50;
          out[i + 3] = 255;
        } else {
          out[i] = 0;
          out[i + 1] = 240;
          out[i + 2] = 255;
          out[i + 3] = 255;
        }
      } else {
        if (colorTheme === 'pure-red' || colorTheme === 'red-black') {
          // TODO NEGRO PURO ABSOLUTO
          out[i] = 0;
          out[i + 1] = 0;
          out[i + 2] = 0;
          out[i + 3] = 255;
        } else {
          const gray = Math.round((orig[i] * 0.299 + orig[i + 1] * 0.587 + orig[i + 2] * 0.114) * 0.12);
          out[i] = gray;
          out[i + 1] = gray + 2;
          out[i + 2] = gray + 5;
          out[i + 3] = 255;
        }
      }
    }

    ctx.putImageData(outImg, 0, 0);
  }

  /**
   * Intenta extraer el payload LSB desde la imagen atacada
   * para evaluar el impacto en la integridad del mensaje.
   * 
   * @param {ImageData} imageData 
   * @param {number} maxExpectedBytes 
   * @returns {{ success: boolean, headerRead: number, rawPayload: Uint8Array|null, error: string|null }}
   */
  static extractLSBPayloadSafe(imageData, maxExpectedBytes = 1000000) {
    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;
    const maxCapacityBytes = Math.floor((totalPixels * 3) / 8) - 4;

    let currentByte = 0;
    let bitOffset = 7;
    const headerBytes = new Uint8Array(4);
    let headerByteIdx = 0;

    for (let i = 0; i < data.length; i += 4) {
      for (let ch = 0; ch < 3; ch++) {
        if (headerByteIdx >= 4) break;
        const bit = data[i + ch] & 1;
        currentByte = (currentByte << 1) | bit;
        bitOffset--;

        if (bitOffset < 0) {
          headerBytes[headerByteIdx++] = currentByte;
          currentByte = 0;
          bitOffset = 7;
        }
      }
      if (headerByteIdx >= 4) break;
    }

    const payloadLength = (
      (headerBytes[0] << 24) |
      (headerBytes[1] << 16) |
      (headerBytes[2] << 8) |
      headerBytes[3]
    ) >>> 0;

    if (payloadLength === 0 || payloadLength > maxCapacityBytes || payloadLength > Math.max(10000, maxExpectedBytes * 5)) {
      return {
        success: false,
        headerRead: payloadLength,
        rawPayload: null,
        error: `Cabecera STG1 destruida por el ataque (Valor leído: ${payloadLength.toLocaleString()} bytes, Capacidad máx: ${maxCapacityBytes.toLocaleString()} bytes).`
      };
    }

    const payloadBuffer = new Uint8Array(payloadLength);
    let payloadByteIdx = 0;
    currentByte = 0;
    bitOffset = 7;
    let bitCounter = 0;

    for (let i = 0; i < data.length; i += 4) {
      for (let ch = 0; ch < 3; ch++) {
        if (bitCounter < 32) {
          bitCounter++;
          continue;
        }
        if (payloadByteIdx >= payloadLength) break;

        const bit = data[i + ch] & 1;
        currentByte = (currentByte << 1) | bit;
        bitOffset--;

        if (bitOffset < 0) {
          payloadBuffer[payloadByteIdx++] = currentByte;
          currentByte = 0;
          bitOffset = 7;
        }
      }
      if (payloadByteIdx >= payloadLength) break;
    }

    return {
      success: true,
      headerRead: payloadLength,
      rawPayload: payloadBuffer,
      error: null
    };
  }

  /**
   * Calcula el Bit Error Rate (BER) entre dos secuencias de bytes.
   * 
   * @param {Uint8Array} originalBytes 
   * @param {Uint8Array} attackedBytes 
   * @returns {{ berPct: number, totalBits: number, errorBits: number }}
   */
  static computeBER(originalBytes, attackedBytes) {
    if (!originalBytes || originalBytes.length === 0) {
      return { berPct: 0, totalBits: 0, errorBits: 0 };
    }

    const totalBits = originalBytes.length * 8;
    let errorBits = 0;

    if (!attackedBytes) {
      return { berPct: 100, totalBits, errorBits: totalBits };
    }

    const minLen = Math.min(originalBytes.length, attackedBytes.length);
    for (let i = 0; i < minLen; i++) {
      let xor = originalBytes[i] ^ attackedBytes[i];
      while (xor > 0) {
        if (xor & 1) errorBits++;
        xor >>= 1;
      }
    }

    if (attackedBytes.length < originalBytes.length) {
      errorBits += (originalBytes.length - attackedBytes.length) * 8;
    }

    const berPct = Number(((errorBits / totalBits) * 100).toFixed(2));
    return {
      berPct: Math.min(100, berPct),
      totalBits,
      errorBits
    };
  }
}
