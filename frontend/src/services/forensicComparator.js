/**
 * SERVICIO DE COMPARACIÓN FORENSE DIFERENCIAL Y PLANOS DE BITS (B/N)
 * 
 * Permite:
 * 1. Comparación pixel-a-pixel entre Imagen Original y Portadora con Payload.
 * 2. Generación de Máscara Binaria en Blanco y Negro Puro:
 *    - Negro (#000000) = Píxeles idénticos intactos.
 *    - Blanco (#ffffff) = Píxeles alterados por inyección de bits.
 * 3. Cálculo de métricas de distorsión perceptiva y fidelidad: MSE, PSNR (dB), % alteración.
 * 4. Extracción de Planos de Bits (Bit-Plane 0 LSB) en Blanco y Negro.
 */

export class ForensicComparator {
  /**
   * Obtiene el ImageData de una imagen, canvas o blob.
   * @param {HTMLImageElement|HTMLCanvasElement} source 
   * @returns {{ ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, imageData: ImageData, width: number, height: number }}
   */
  static getSourceImageData(source) {
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height);
    return { canvas, ctx, imageData, width, height };
  }

  /**
   * Compara dos imágenes (Original vs. Stego) y genera la máscara diferencial en Blanco y Negro puro.
   * @param {HTMLImageElement|HTMLCanvasElement} originalSource 
   * @param {HTMLImageElement|HTMLCanvasElement} stegoSource 
   * @param {object} options
   * @returns {object} Métricas y Canvas con la máscara en B/N
   */
  static compareImages(originalSource, stegoSource, options = {}) {
    const orig = this.getSourceImageData(originalSource);
    const stego = this.getSourceImageData(stegoSource);

    if (orig.width !== stego.width || orig.height !== stego.height) {
      throw new Error(
        `Las dimensiones no coinciden: Original (${orig.width}x${orig.height}) vs. Sospechosa (${stego.width}x${stego.height}).`
      );
    }

    const width = orig.width;
    const height = orig.height;
    const totalPixels = width * height;
    const totalChannels = totalPixels * 3;

    const data1 = orig.imageData.data;
    const data2 = stego.imageData.data;

    // Canvas para la Máscara de Diferencias en Blanco y Negro Puro
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext('2d');
    const diffImageData = diffCtx.createImageData(width, height);
    const diffData = diffImageData.data;

    // Canvas para la Diferencia Amplificada (Heatmap térmico / Delta visible)
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = width;
    heatCanvas.height = height;
    const heatCtx = heatCanvas.getContext('2d');
    const heatImageData = heatCtx.createImageData(width, height);
    const heatData = heatImageData.data;

    let modifiedPixels = 0;
    let modifiedBytes = 0;
    let sumSquaredError = 0;
    let maxDelta = 0;

    let firstModifiedPixelIndex = -1;
    let lastModifiedPixelIndex = -1;

    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;

      const r1 = data1[idx];
      const g1 = data1[idx + 1];
      const b1 = data1[idx + 2];

      const r2 = data2[idx];
      const g2 = data2[idx + 1];
      const b2 = data2[idx + 2];

      const diffR = Math.abs(r1 - r2);
      const diffG = Math.abs(g1 - g2);
      const diffB = Math.abs(b1 - b2);

      const hasChange = diffR > 0 || diffG > 0 || diffB > 0;

      if (hasChange) {
        modifiedPixels++;
        if (diffR > 0) modifiedBytes++;
        if (diffG > 0) modifiedBytes++;
        if (diffB > 0) modifiedBytes++;

        if (firstModifiedPixelIndex === -1) firstModifiedPixelIndex = p;
        lastModifiedPixelIndex = p;

        const localMax = Math.max(diffR, diffG, diffB);
        if (localMax > maxDelta) maxDelta = localMax;

        // Máscara B/N Puro: Modificado = Blanco Puro (255, 255, 255)
        diffData[idx] = 255;
        diffData[idx + 1] = 255;
        diffData[idx + 2] = 255;
        diffData[idx + 3] = 255;

        // Mapa térmico coloreado (Rojo neón brillante para visualización forense de alta visibilidad)
        heatData[idx] = 255;
        heatData[idx + 1] = 30;
        heatData[idx + 2] = 80;
        heatData[idx + 3] = 255;
      } else {
        // Máscara B/N Puro: Intacto = Negro Puro (0, 0, 0)
        diffData[idx] = 0;
        diffData[idx + 1] = 0;
        diffData[idx + 2] = 0;
        diffData[idx + 3] = 255;

        heatData[idx] = 10;
        heatData[idx + 1] = 16;
        heatData[idx + 2] = 28;
        heatData[idx + 3] = 255;
      }

      sumSquaredError += (diffR * diffR) + (diffG * diffG) + (diffB * diffB);
    }

    diffCtx.putImageData(diffImageData, 0, 0);
    heatCtx.putImageData(heatImageData, 0, 0);

    const mse = sumSquaredError / totalChannels;
    let psnr = 0;
    if (mse === 0) {
      psnr = Infinity;
    } else {
      psnr = 10 * Math.log10((255 * 255) / mse);
    }

    const modifiedPixelPct = (modifiedPixels / totalPixels) * 100;
    const modifiedBytePct = (modifiedBytes / totalChannels) * 100;

    return {
      dimensions: { width, height, totalPixels, totalChannels },
      stats: {
        modifiedPixels,
        totalPixels,
        modifiedPixelPct: Number(modifiedPixelPct.toFixed(3)),
        modifiedBytes,
        totalChannels,
        modifiedBytePct: Number(modifiedBytePct.toFixed(3)),
        mse: Number(mse.toFixed(6)),
        psnr: psnr === Infinity ? 'Infinito (Sin Cambios)' : `${psnr.toFixed(2)} dB`,
        psnrNumeric: psnr,
        maxDelta,
        firstModifiedPixel: firstModifiedPixelIndex,
        lastModifiedPixel: lastModifiedPixelIndex,
        spanPixels: lastModifiedPixelIndex >= 0 ? (lastModifiedPixelIndex - firstModifiedPixelIndex + 1) : 0
      },
      diffCanvas,
      heatCanvas
    };
  }

  /**
   * Extrae y renderiza el plano de bits con soporte para:
   * 1. Microscopio Digital (Zoom 16x): Muestra cada bit individual como bloque o figura ampliada.
   * 2. Resaltador Forense: Destaca la región inyectada con resplandor y atenúa el resto.
   * 3. Múltiples paletas cromáticas (B/N, Neón, Matrix, Ámbar, Heatmap).
   * 4. Marcadores de figuras (Puntos con glow, Cruces periciales, Cajas delimitadoras).
   */
  static extractBitPlane(source, options = {}) {
    const bitIndex = options.bitIndex !== undefined ? parseInt(options.bitIndex, 10) : 0;
    const bitMask = 1 << bitIndex;
    const channel = options.channel || 'all';
    const colorTheme = options.colorTheme || 'neon';
    const shapeMode = options.shapeMode || 'dots';
    const viewMode = options.viewMode || 'microscope'; // 'microscope', 'highlight', 'full'

    const { imageData, width, height } = this.getSourceImageData(source);
    const data = imageData.data;
    const totalPixels = width * height;
    const totalChannels = totalPixels * 3;
    const maxCapacityBytes = Math.floor(totalChannels / 8) - 4;

    // Paletas de Color
    const palettes = {
      bw: {
        one: [255, 255, 255],     // Blanco puro
        zero: [0, 0, 0],          // Negro absoluto
        accent: '#ffffff',
        dim: 'rgba(255, 255, 255, 0.12)'
      },
      neon: {
        one: [0, 240, 255],       // Cian Neón brillante
        zero: [15, 8, 32],        // Púrpura noche
        accent: '#00f0ff',
        dim: 'rgba(0, 240, 255, 0.15)'
      },
      matrix: {
        one: [0, 255, 102],       // Verde Matrix fosforescente
        zero: [2, 20, 8],         // Verde terminal oscuro
        accent: '#00ff66',
        dim: 'rgba(0, 255, 102, 0.15)'
      },
      amber: {
        one: [255, 176, 0],       // Ámbar radar brillante
        zero: [28, 14, 0],        // Marrón oscuro
        accent: '#ffb000',
        dim: 'rgba(255, 176, 0, 0.15)'
      },
      heatmap: {
        one: [255, 45, 85],       // Rojo-Magenta ardiente
        zero: [10, 22, 50],       // Azul frío
        accent: '#ff2d55',
        dim: 'rgba(255, 45, 85, 0.15)'
      }
    };

    const palette = palettes[colorTheme] || palettes.neon;

    // 1. Estadísticas completas del plano de bits en toda la imagen
    let totalPlaneBits = 0;
    let totalOnesInPlane = 0;
    let totalZerosInPlane = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (channel === 'all' || channel === 'red') {
        totalPlaneBits++;
        if ((data[i] & bitMask) !== 0) totalOnesInPlane++; else totalZerosInPlane++;
      }
      if (channel === 'all' || channel === 'green') {
        totalPlaneBits++;
        if ((data[i + 1] & bitMask) !== 0) totalOnesInPlane++; else totalZerosInPlane++;
      }
      if (channel === 'all' || channel === 'blue') {
        totalPlaneBits++;
        if ((data[i + 2] & bitMask) !== 0) totalOnesInPlane++; else totalZerosInPlane++;
      }
    }

    // 2. Detección Pericial de Cabecera Big-Endian de 32 bits
    let headerBytes = new Uint8Array(8);
    let headerByteIndex = 0;
    let currentByte = 0;
    let bitOffset = 7;

    for (let i = 0; i < data.length && headerByteIndex < 8; i += 4) {
      for (let c = 0; c < 3 && headerByteIndex < 8; c++) {
        const bit = data[i + c] & 1;
        currentByte = (currentByte << 1) | bit;
        bitOffset--;
        if (bitOffset < 0) {
          headerBytes[headerByteIndex] = currentByte;
          headerByteIndex++;
          currentByte = 0;
          bitOffset = 7;
        }
      }
    }

    const rawLen32 = (
      (headerBytes[0] << 24) |
      (headerBytes[1] << 16) |
      (headerBytes[2] << 8) |
      headerBytes[3]
    ) >>> 0;

    let hasValidHeader = false;
    let payloadBytes = 0;
    let totalInjectedBits = 0;
    let totalInjectedBytes = 0;
    let endInjectedPixel = -1;
    let isBitAttack = false;
    let attackedBitsCount = 0;
    let isTruncated = false;
    let declaredPayloadBytes = 0;

    // Verificar si se pasó el reporte del backend
    const rep = options.forensicReport;
    if (rep && rep.payloadDetection) {
      if (rep.payloadDetection.detectedHeaderType && rep.payloadDetection.detectedPayloadLength > 0) {
        hasValidHeader = true;
        isTruncated = !!rep.payloadDetection.isTruncated;
        declaredPayloadBytes = rep.payloadDetection.declaredPayloadLength || rep.payloadDetection.detectedPayloadLength;
        payloadBytes = rep.payloadDetection.detectedPayloadLength;
        totalInjectedBytes = 4 + payloadBytes;
        totalInjectedBits = isTruncated ? totalChannels : totalInjectedBytes * 8;
        endInjectedPixel = isTruncated ? (totalPixels - 1) : Math.min(totalPixels - 1, Math.ceil(totalInjectedBits / 3) - 1);
      } else if (rep.payloadDetection.isBitAttackDetected) {
        isBitAttack = true;
        attackedBitsCount = rep.payloadDetection.totalAlteredBits || 
          ((rep.payloadDetection.msbGlitchSpikes || 0) + (rep.payloadDetection.isolatedBitflipSpikes || 0));
      }
    }

    // Verificación de respaldo local de cabecera si no se pasó reporte o si es esteganografía estándar
    if (!hasValidHeader && !isBitAttack && bitIndex === 0) {
      const isSTG1 = (headerBytes[4] === 0x53 && headerBytes[5] === 0x54 && headerBytes[6] === 0x47 && headerBytes[7] === 0x31) ||
                     (headerBytes[0] === 0x53 && headerBytes[1] === 0x54 && headerBytes[2] === 0x47 && headerBytes[3] === 0x31);
      const isReasonableLength = rawLen32 > 0 && rawLen32 <= maxCapacityBytes;

      let isAesCipherHeader = false;
      if (rawLen32 >= 44 && rawLen32 < 100000000) {
        // Chequear entropía de los primeros 44 bytes tras cabecera (Salt, IV, Tag)
        let ones = 0;
        let cByte = 0;
        let bOff = 7;
        let byteCount = 0;
        for (let i = 0; i < data.length && byteCount < 48; i += 4) {
          for (let c = 0; c < 3 && byteCount < 48; c++) {
            const bit = data[i + c] & 1;
            cByte = (cByte << 1) | bit;
            bOff--;
            if (bOff < 0) {
              if (byteCount >= 4) {
                for (let k = 0; k < 8; k++) {
                  if ((cByte >> k) & 1) ones++;
                }
              }
              byteCount++;
              cByte = 0;
              bOff = 7;
            }
          }
        }
        const ratio = byteCount >= 48 ? (ones / (44 * 8)) : 0;
        if (ratio >= 0.35 && ratio <= 0.65) {
          isAesCipherHeader = true;
        }
      }

      if (isSTG1 || isReasonableLength || isAesCipherHeader) {
        hasValidHeader = true;
        isTruncated = rawLen32 > maxCapacityBytes;
        declaredPayloadBytes = rawLen32;
        payloadBytes = isTruncated ? maxCapacityBytes : rawLen32;
        totalInjectedBytes = 4 + payloadBytes;
        totalInjectedBits = isTruncated ? totalChannels : totalInjectedBytes * 8;
        endInjectedPixel = isTruncated ? (totalPixels - 1) : Math.min(totalPixels - 1, Math.ceil(totalInjectedBits / 3) - 1);
      }
    }

    // Muestra para el Microscopio Digital (Capped a 1200 celdas por rendimiento visual de Canvas)
    const maxMicroscopeCells = 1200;
    const microscopeSampleLimit = (hasValidHeader && bitIndex === 0) 
      ? Math.min(totalInjectedBits, maxMicroscopeCells) 
      : Math.min(totalChannels, maxMicroscopeCells);

    const injectedBitsSequence = [];
    let sample1Count = 0;
    let sample0Count = 0;

    let bCounter = 0;
    for (let i = 0; i < data.length && bCounter < microscopeSampleLimit; i += 4) {
      for (let c = 0; c < 3 && bCounter < microscopeSampleLimit; c++) {
        if (channel === 'red' && c !== 0) continue;
        if (channel === 'green' && c !== 1) continue;
        if (channel === 'blue' && c !== 2) continue;

        const bit = (data[i + c] & bitMask) !== 0 ? 1 : 0;
        injectedBitsSequence.push(bit);
        if (bit === 1) sample1Count++; else sample0Count++;
        bCounter++;
      }
    }

    // 2. RENDERIZADO SEGÚN EL MODO DE VISTA (viewMode)
    const canvas = document.createElement('canvas');

    if (viewMode === 'microscope') {
      // -------------------------------------------------------------
      // VISTA MICROSCOPIO DIGITAL: ZOOM ALTO (18X) EN CADA BIT
      // Permite ver con total claridad cada bit como un bloque o figura
      // -------------------------------------------------------------
      const cellSize = 18;
      const cols = Math.min(32, Math.max(16, Math.floor(640 / cellSize)));
      const rows = Math.ceil(injectedBitsSequence.length / cols);

      canvas.width = cols * cellSize;
      canvas.height = rows * cellSize;
      const ctx = canvas.getContext('2d');

      // Fondo base de alta tecnología pericial
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Rejilla de fondo
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let col = 0; col <= cols; col++) {
        ctx.beginPath();
        ctx.moveTo(col * cellSize, 0);
        ctx.lineTo(col * cellSize, canvas.height);
        ctx.stroke();
      }
      for (let row = 0; row <= rows; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * cellSize);
        ctx.lineTo(canvas.width, row * cellSize);
        ctx.stroke();
      }

      // Dibujar cada celda según el shapeMode
      for (let idx = 0; idx < injectedBitsSequence.length; idx++) {
        const bit = injectedBitsSequence[idx];
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = col * cellSize;
        const y = row * cellSize;

        if (shapeMode === 'dots') {
          if (bit === 1) {
            // Punto Neón con Resplandor (Bit 1)
            ctx.fillStyle = palette.accent;
            ctx.shadowColor = palette.accent;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            // Anillo tenue (Bit 0)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, 3, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (shapeMode === 'crosses') {
          if (bit === 1) {
            // Cruz Pericial Luminosa (+) (Bit 1)
            ctx.strokeStyle = palette.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 3, y + cellSize / 2);
            ctx.lineTo(x + cellSize - 3, y + cellSize / 2);
            ctx.moveTo(x + cellSize / 2, y + 3);
            ctx.lineTo(x + cellSize / 2, y + cellSize - 3);
            ctx.stroke();
          } else {
            // Guión atenuado (-) (Bit 0)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + 5, y + cellSize / 2);
            ctx.lineTo(x + cellSize - 5, y + cellSize / 2);
            ctx.stroke();
          }
        } else if (shapeMode === 'bounding-box') {
          // Texto '1' o '0' nítido dentro de cada celda
          ctx.fillStyle = bit === 1 ? '#000000' : 'rgba(255, 255, 255, 0.85)';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(bit), x + cellSize / 2, y + cellSize / 2);
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

    } else if (viewMode === 'highlight') {
      // -------------------------------------------------------------
      // VISTA RESALTADOR GLOBAL: SOPORTE PARA TODOS LOS PLANOS DE BITS (0 A 7)
      // Muestra dónde están activos los bits del plano seleccionado o la zona inyectada
      // -------------------------------------------------------------
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(width, height);
      const px = imgData.data;

      const isSequentialStego = hasValidHeader && bitIndex === 0;
      const limitPixel = isSequentialStego ? endInjectedPixel : totalPixels;

      for (let p = 0; p < totalPixels; p++) {
        const i = p * 4;

        let bitVal = 0;
        if (channel === 'red') bitVal = (data[i] & bitMask) !== 0 ? 1 : 0;
        else if (channel === 'green') bitVal = (data[i + 1] & bitMask) !== 0 ? 1 : 0;
        else if (channel === 'blue') bitVal = (data[i + 2] & bitMask) !== 0 ? 1 : 0;
        else bitVal = ((data[i] & bitMask) || (data[i + 1] & bitMask) || (data[i + 2] & bitMask)) ? 1 : 0;

        if (isSequentialStego) {
          const isModified = p <= limitPixel;
          if (isModified) {
            const col = bitVal ? palette.one : palette.zero;
            px[i] = col[0];
            px[i + 1] = col[1];
            px[i + 2] = col[2];
            px[i + 3] = 255;
          } else {
            // Zona intacta atenuada para contextualizar
            px[i] = Math.floor(data[i] * 0.15);
            px[i + 1] = Math.floor(data[i + 1] * 0.15);
            px[i + 2] = Math.floor(data[i + 2] * 0.15);
            px[i + 3] = 255;
          }
        } else {
          // Resaltado pericial del plano de bits seleccionado (ej. Bit 7 Glitches o Bit 0 a 6):
          // Enciende los bits activos (1) con el color de la paleta neón, y atenúa los (0)
          if (bitVal === 1) {
            px[i] = palette.one[0];
            px[i + 1] = palette.one[1];
            px[i + 2] = palette.one[2];
            px[i + 3] = 255;
          } else {
            px[i] = Math.floor(data[i] * 0.16);
            px[i + 1] = Math.floor(data[i + 1] * 0.16);
            px[i + 2] = Math.floor(data[i + 2] * 0.16);
            px[i + 3] = 255;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Bounding Box o banner superior explicativo pericial
      if (isSequentialStego) {
        const endY = Math.max(16, Math.floor(limitPixel / width) + 4);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = 8;
        ctx.strokeRect(2, 2, width - 4, endY);
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(10, 15, 25, 0.9)';
        ctx.fillRect(8, 8, 300, 24);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, 300, 24);

        ctx.fillStyle = palette.accent;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`🚩 ZONA ESTEGANOGRÁFICA: ${targetBitsCount.toLocaleString()} BITS`, 14, 24);
      } else {
        ctx.fillStyle = 'rgba(10, 15, 25, 0.9)';
        ctx.fillRect(8, 8, 360, 24);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, 360, 24);

        ctx.fillStyle = palette.accent;
        ctx.font = 'bold 11px monospace';
        const bitName = bitIndex === 0 ? 'BIT 0 (LSB - ESTEGANOGRAFÍA)' : (bitIndex === 7 ? 'BIT 7 (MSB - GLITCHES)' : `BIT ${bitIndex}`);
        ctx.fillText(`🔬 RESALTADOR FORENSE: PLANO ${bitName}`, 14, 24);
      }

    } else {
      // -------------------------------------------------------------
      // VISTA PLANO LSB COMPLETO (Full matrix con la paleta seleccionada)
      // -------------------------------------------------------------
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(width, height);
      const px = imgData.data;

      const mask = 1 << bitIndex;
      for (let p = 0; p < totalPixels; p++) {
        const i = p * 4;
        let bitVal = 0;
        if (channel === 'red') bitVal = (data[i] & mask) !== 0 ? 1 : 0;
        else if (channel === 'green') bitVal = (data[i + 1] & mask) !== 0 ? 1 : 0;
        else if (channel === 'blue') bitVal = (data[i + 2] & mask) !== 0 ? 1 : 0;
        else bitVal = ((data[i] & mask) || (data[i + 1] & mask) || (data[i + 2] & mask)) ? 1 : 0;

        const col = bitVal === 1 ? palette.one : palette.zero;
        px[i] = col[0];
        px[i + 1] = col[1];
        px[i + 2] = col[2];
        px[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const sampleTotal = sample1Count + sample0Count;

    return {
      canvas,
      stats: {
        bitIndex,
        channel,
        colorTheme,
        shapeMode,
        viewMode,
        dimensions: { width, height, totalPixels, totalChannels },
        hasValidHeader,
        isTruncated: !!isTruncated,
        declaredPayloadBytes: declaredPayloadBytes || payloadBytes,
        isBitAttack,
        attackedBitsCount,
        payloadBytes: hasValidHeader ? payloadBytes : 0,
        totalInjectedBits: hasValidHeader ? totalInjectedBits : (isBitAttack ? attackedBitsCount : 0),
        totalInjectedBytes: hasValidHeader ? totalInjectedBytes : (isBitAttack ? Math.ceil(attackedBitsCount / 8) : 0),
        capacityUsedPct: hasValidHeader ? Number(((totalInjectedBytes / maxCapacityBytes) * 100).toFixed(3)) : 0,
        startPixel: 0,
        endPixel: endInjectedPixel >= 0 ? endInjectedPixel : 0,
        startRow: 0,
        endRow: endInjectedPixel >= 0 ? Math.floor(endInjectedPixel / width) : 0,
        microscopeSampleCount: injectedBitsSequence.length,
        totalPlaneBits,
        totalOnesInPlane,
        totalZerosInPlane,
        planeRatio1: totalPlaneBits > 0 ? Number(((totalOnesInPlane / totalPlaneBits) * 100).toFixed(2)) : 50.0,
        planeRatio0: totalPlaneBits > 0 ? Number(((totalZerosInPlane / totalPlaneBits) * 100).toFixed(2)) : 50.0,
        sampleRatio1: sampleTotal > 0 ? Number(((sample1Count / sampleTotal) * 100).toFixed(2)) : 50.0,
        sampleRatio0: sampleTotal > 0 ? Number(((sample0Count / sampleTotal) * 100).toFixed(2)) : 50.0
      }
    };
  }
}


