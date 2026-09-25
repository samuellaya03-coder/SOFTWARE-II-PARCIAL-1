import { PNG } from 'pngjs';

/**
 * SERVICIO DE ESTEGOANÁLISIS Y FORENSE DIGITAL MULTIMEDIA
 * 
 * Implementa:
 * 1. Histogramas de frecuencia de 8 bits por canal cromático (R, G, B).
 * 2. Entropía de la Información de Shannon sobre los planos LSB (R, G, B y global).
 *    H(X) = - sum(P(x) * log2(P(x)))
 * 3. Ataque Estadístico de Chi-cuadrado (χ²) sobre Pares de Valores (PoVs - Westfeld & Pfitzmann).
 */

/**
 * Calcula la función gamma aproximada usando la fórmula de Lanczos.
 */
function gammaLn(z) {
  const g = 7;
  const C = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109585652681,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
  }

  z -= 1;
  let base = C[0];
  for (let i = 1; i < g + 2; i++) {
    base += C[i] / (z + i);
  }

  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(base);
}

/**
 * Función gamma incompleta inferior regularizada P(s, x) mediante serie de potencias.
 */
function gammp(s, x) {
  if (x < 0 || s <= 0) return 0;
  if (x === 0) return 0;

  if (x < s + 1) {
    let sum = 1 / s;
    let del = sum;
    let n = s;
    for (let i = 1; i <= 100; i++) {
      n += 1;
      del *= x / n;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-7) {
        return sum * Math.exp(-x + s * Math.log(x) - gammaLn(s));
      }
    }
    return sum * Math.exp(-x + s * Math.log(x) - gammaLn(s));
  } else {
    // Fracción continua para Q(s, x) = 1 - P(s, x)
    let b = x + 1 - s;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 100; i++) {
      const an = -i * (i - s);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-7) break;
    }
    const q = Math.exp(-x + s * Math.log(x) - gammaLn(s)) * h;
    return 1 - q;
  }
}

/**
 * Función de supervivencia (P-value) de la distribución Chi-cuadrado.
 * Q(k/2, x/2) = 1 - P(k/2, x/2)
 */
function chiSquarePValue(chiSq, df) {
  if (df <= 0 || chiSq <= 0) return 1;
  // Si chiSq es muy alto respecto a df, p-value tiende asintóticamente a 0
  if (chiSq > df * 5) return 0;
  const p = 1 - gammp(df / 2, chiSq / 2);
  return Math.max(0, Math.min(1, p));
}

/**
 * Decodifica una imagen en formato PNG a raw RGBA Uint8Array usando pngjs.
 * @param {Buffer} imageBuffer 
 * @returns {Promise<{ width: number, height: number, data: Buffer }>}
 */
export function parsePng(imageBuffer) {
  return new Promise((resolve, reject) => {
    const png = new PNG();
    png.parse(imageBuffer, (err, parsed) => {
      if (err) return reject(new Error(`Error decodificando PNG: ${err.message}`));
      resolve({
        width: parsed.width,
        height: parsed.height,
        data: parsed.data
      });
    });
  });
}

/**
 * Ejecuta análisis forense exhaustivo sobre los píxeles de una imagen.
 * @param {Buffer} data - Buffer RGBA crudo de la imagen
 * @param {number} width 
 * @param {number} height 
 */
export function analyzeImagePixels(data, width, height) {
  const totalPixels = width * height;

  // 1. Inicialización de histogramas para R, G, B
  const histR = new Array(256).fill(0);
  const histG = new Array(256).fill(0);
  const histB = new Array(256).fill(0);

  // Contadores para el cálculo de entropía LSB
  let lsb0R = 0, lsb1R = 0;
  let lsb0G = 0, lsb1G = 0;
  let lsb0B = 0, lsb1B = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // data[i + 3] es Alpha

    histR[r]++;
    histG[g]++;
    histB[b]++;

    if ((r & 1) === 0) lsb0R++; else lsb1R++;
    if ((g & 1) === 0) lsb0G++; else lsb1G++;
    if ((b & 1) === 0) lsb0B++; else lsb1B++;
  }

  // 2. Cálculo de Entropía de Shannon en los LSBs
  // H(X) = - [ p0*log2(p0) + p1*log2(p1) ]
  function computeShannonEntropy(count0, count1) {
    const total = count0 + count1;
    if (total === 0) return 0;
    const p0 = count0 / total;
    const p1 = count1 / total;
    let entropy = 0;
    if (p0 > 0) entropy -= p0 * Math.log2(p0);
    if (p1 > 0) entropy -= p1 * Math.log2(p1);
    return entropy;
  }

  const entropyR = computeShannonEntropy(lsb0R, lsb1R);
  const entropyG = computeShannonEntropy(lsb0G, lsb1G);
  const entropyB = computeShannonEntropy(lsb0B, lsb1B);
  const totalLSB0 = lsb0R + lsb0G + lsb0B;
  const totalLSB1 = lsb1R + lsb1G + lsb1B;
  const entropyGlobal = computeShannonEntropy(totalLSB0, totalLSB1);

  // 3. Ataque de Chi-cuadrado sobre Pares de Valores (PoVs: 2k y 2k+1 - Westfeld & Pfitzmann)
  function computeChiSquarePoVs(hist) {
    let chiSq = 0;
    let pairsCount = 0;
    let sumDiff = 0;
    let sumTotal = 0;
    const povDifferences = [];

    for (let k = 0; k < 128; k++) {
      const v2k = hist[2 * k];
      const v2k1 = hist[2 * k + 1];
      const expected = (v2k + v2k1) / 2;

      if (expected > 0) {
        const diff = v2k - expected;
        chiSq += (diff * diff) / expected;
        pairsCount++;
        const absDiff = Math.abs(v2k - v2k1);
        sumDiff += absDiff;
        sumTotal += (v2k + v2k1);
        povDifferences.push({ pair: [2 * k, 2 * k + 1], v2k, v2k1, expected, diff: absDiff });
      }
    }

    const df = Math.max(1, pairsCount - 1);
    // En el test de pares de Westfeld:
    // Si los pares están artificialmente igualados (esteganografía LSB), chiSq es muy bajo y pValue -> 1.0.
    // Si la imagen es natural (limpia), chiSq es alto debido a la varianza natural y pValue -> 0.0.
    const pValue = chiSquarePValue(chiSq, df);
    const asymmetry = sumTotal > 0 ? (sumDiff / sumTotal) : 0;

    return {
      chiSquare: Number(chiSq.toFixed(4)),
      degreesOfFreedom: df,
      pValue: Number(pValue.toFixed(6)),
      pairsAnalyzed: pairsCount,
      asymmetryPct: Number((asymmetry * 100).toFixed(2))
    };
  }

  const chiR = computeChiSquarePoVs(histR);
  const chiG = computeChiSquarePoVs(histG);
  const chiB = computeChiSquarePoVs(histB);

  // 4. Curva Dinámica Acumulativa de Chi-cuadrado (Ataque Westfeld & Pfitzmann)
  // En Westfeld & Pfitzmann: pVal mide la probabilidad de que los pares estén igualados.
  // En la región con esteganografía pVal se mantiene cercano a 1.0; al terminar el mensaje cae hacia 0.0.
  const numIntervals = 60;
  const totalChannels = totalPixels * 3;
  const stepBytes = Math.max(64, Math.floor(totalChannels / numIntervals));
  const westfeldCurve = [];

  const cumulativeHist = new Array(256).fill(0);
  let channelCounter = 0;
  let nextCheckpoint = stepBytes;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const val = data[i + c];
      cumulativeHist[val]++;
      channelCounter++;

      if (channelCounter >= nextCheckpoint || channelCounter === totalChannels) {
        let curChiSq = 0;
        let curPairs = 0;
        for (let k = 0; k < 128; k++) {
          const v2k = cumulativeHist[2 * k];
          const v2k1 = cumulativeHist[2 * k + 1];
          const expected = (v2k + v2k1) / 2;
          if (expected > 0) {
            const diff = v2k - expected;
            curChiSq += (diff * diff) / expected;
            curPairs++;
          }
        }
        const curDf = Math.max(1, curPairs - 1);
        const pVal = chiSquarePValue(curChiSq, curDf);
        // Correcto según Westfeld: stegoProb = pVal (cercano a 1 en zona inyectada, 0 en zona limpia)
        const stegoProb = Math.max(0, Math.min(1, pVal));
        const progressPct = Number(((channelCounter / totalChannels) * 100).toFixed(1));

        westfeldCurve.push({
          percent: progressPct,
          channelSample: channelCounter,
          stegoProbability: Number(stegoProb.toFixed(4)),
          pValue: Number(pVal.toFixed(6)),
          chiSquare: Number(curChiSq.toFixed(2))
        });

        nextCheckpoint += stepBytes;
      }
    }
  }

  // 5. Estimación de longitud de Payload según la caída de la curva de Westfeld
  // Un plateau real de Westfeld debe sostenerse por al menos 2 intervalos consecutivos,
  // evitando falsos positivos por muestras pequeñas en el intervalo inicial (ruido de contorno).
  let estimatedPayloadBytes = 0;
  let estimatedOccupancyPct = 0;
  let plateauLength = 0;

  for (let i = 0; i < westfeldCurve.length; i++) {
    if (westfeldCurve[i].stegoProbability > 0.65) {
      plateauLength++;
    } else {
      break;
    }
  }

  const hasSustainedPlateau = plateauLength >= 2;
  if (hasSustainedPlateau) {
    const endSample = westfeldCurve[plateauLength - 1].channelSample;
    estimatedPayloadBytes = Math.max(0, Math.floor(endSample / 8) - 4);
    estimatedOccupancyPct = Number(((endSample / totalChannels) * 100).toFixed(2));
  }

  // 6. Análisis de Dispersión Espacial de LSBs en Zonas Homogéneas (Flat-Area Flips)
  // En fotos limpias (incluso WhatsApp o capturas de juegos), las zonas planas tienen LSBs correlacionados (<32% mismatch).
  // La inyección LSB pseudoaleatoria (AES) rompe la correlación espacial forzando un ~50% de mismatch.
  let flatPairs = 0;
  let mismatchedLsb = 0;
  for (let i = 0; i < data.length - 8; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v1 = data[i + c];
      const v2 = data[i + 4 + c];
      if ((v1 >> 1) === (v2 >> 1)) {
        flatPairs++;
        if ((v1 & 1) !== (v2 & 1)) mismatchedLsb++;
      }
    }
  }
  const flatMismatchRate = flatPairs > 100 ? (mismatchedLsb / flatPairs) : 0.25;

  // 7. Detección Determinística de Cabecera LSB (Soporte STG1, AES-256-GCM y Texto)
  let detectedHeaderType = null;
  let detectedPayloadLength = 0;
  const sampleBytes = new Uint8Array(64);
  let bitIdx = 0;
  for (let b = 0; b < 64; b++) {
    let byteVal = 0;
    for (let bit = 7; bit >= 0; bit--) {
      const channelIdx = bitIdx + Math.floor(bitIdx / 3);
      if (channelIdx < data.length) {
        byteVal |= ((data[channelIdx] & 1) << bit);
      }
      bitIdx++;
    }
    sampleBytes[b] = byteVal;
  }

  // Longitud de 32 bits en Big-Endian al inicio de la inyección LSB
  const len32 = ((sampleBytes[0] << 24) | (sampleBytes[1] << 16) | (sampleBytes[2] << 8) | sampleBytes[3]) >>> 0;
  const maxCapacity = Math.floor((totalPixels * 3) / 8) - 4;

  // A) Contenedor STG1 en bytes 4..7 (Estándar StegoEngine para Texto y Archivo)
  let isTruncated = false;
  let declaredPayloadLength = 0;

  if (sampleBytes[4] === 0x53 && sampleBytes[5] === 0x54 && sampleBytes[6] === 0x47 && sampleBytes[7] === 0x31) {
    if (len32 > 0 && len32 <= maxCapacity) {
      detectedHeaderType = 'STG1_CONTAINER';
      detectedPayloadLength = len32;
    } else if (len32 > maxCapacity && len32 < 100000000) {
      detectedHeaderType = 'STG1_CONTAINER_TRUNCATED';
      detectedPayloadLength = maxCapacity;
      isTruncated = true;
      declaredPayloadLength = len32;
    }
  }
  // B) Contenedor STG1 directo en bytes 0..3
  else if (sampleBytes[0] === 0x53 && sampleBytes[1] === 0x54 && sampleBytes[2] === 0x47 && sampleBytes[3] === 0x31) {
    detectedHeaderType = 'STG1_CONTAINER';
    detectedPayloadLength = len32 > 0 && len32 <= maxCapacity ? len32 : maxCapacity;
  }
  // C) Paquete Criptográfico AES-256-GCM: [ Salt(16B) | IV(12B) | Tag(16B) | Ciphertext ]
  // C) Paquete de Criptografía Autenticada AES-256-GCM
  // En este modo len32 >= 44 bytes y los primeros 44 bytes son pseudoaleatorios CSPRNG
  // Para evitar falsos positivos con ruido natural en imágenes limpias, requerimos soporte estadístico
  // (Chi-cuadrado con plateau sostenido o descorrelación espacial de LSBs flatMismatchRate > 0.42)
  else if (len32 >= 44 && len32 < 100000000) {
    const checkBytes = 44;
    let onesCount = 0;
    const totalBits = checkBytes * 8;
    for (let b = 4; b < 4 + checkBytes; b++) {
      const val = sampleBytes[b];
      for (let bit = 0; bit < 8; bit++) {
        if ((val >> bit) & 1) onesCount++;
      }
    }
    const onesRatio = onesCount / totalBits;
    // La entropía y balance de bits de Salt, IV y Tag es uniforme (alrededor de 50%)
    const hasStatisticalSupport = hasSustainedPlateau || flatMismatchRate > 0.42 || westfeldCurve.slice(0, 5).some(item => item.pValue > 0.80);
    if (onesRatio >= 0.35 && onesRatio <= 0.65 && hasStatisticalSupport) {
      if (len32 <= maxCapacity) {
        detectedHeaderType = 'AES_GCM_PACKAGE';
        detectedPayloadLength = len32;
      } else if (hasSustainedPlateau || flatMismatchRate > 0.44) {
        detectedHeaderType = 'AES_GCM_PACKAGE_TRUNCATED';
        detectedPayloadLength = maxCapacity;
        isTruncated = true;
        declaredPayloadLength = len32;
      }
    }
  }
  // D) Texto plano clásico (len32 válido seguido de caracteres ASCII imprimibles)
  else if (len32 > 0 && len32 <= maxCapacity) {
    let printableCount = 0;
    for (let i = 4; i < Math.min(16, 4 + len32); i++) {
      if ((sampleBytes[i] >= 32 && sampleBytes[i] <= 126) || sampleBytes[i] === 10 || sampleBytes[i] === 13) {
        printableCount++;
      }
    }
    if (printableCount >= 6 && (hasSustainedPlateau || flatMismatchRate > 0.40)) {
      detectedHeaderType = 'PLAINTEXT_LSB';
      detectedPayloadLength = len32;
    }
  }

  // 7.1 Detección Forense de Ataques de Mutación de Bits y Glitches Adversarios (Módulo 4 / Bit-Flips)
  let msbGlitchSpikes = 0;
  let isolatedBitflipSpikes = 0;
  let totalCheckedNeighbors = 0;

  for (let i = 4; i < data.length - 8; i += 4) {
    for (let c = 0; c < 3; c++) {
      const vPrev = data[i - 4 + c];
      const vCur = data[i + c];
      const vNext = data[i + 4 + c];

      totalCheckedNeighbors++;

      // Detección de Glitch MSB (Bit 7): Salto abrupto de ±128 aislado respecto a ambos vecinos
      const dPrev = vCur - vPrev;
      const dNext = vCur - vNext;
      if (Math.abs(dPrev) >= 100 && Math.abs(dNext) >= 100 && Math.sign(dPrev) === Math.sign(dNext)) {
        msbGlitchSpikes++;
      }

      // Detección de Bit-Flip individual: (vCur ^ vPrev) es exactamente potencia de 2 y rompe continuidad
      const xorPrev = vCur ^ vPrev;
      const isSingleBitJump = xorPrev > 0 && (xorPrev & (xorPrev - 1)) === 0;
      if (isSingleBitJump && Math.abs(vCur - vNext) >= 28) {
        isolatedBitflipSpikes++;
      }
    }
  }

  const msbSpikeRatio = totalCheckedNeighbors > 0 ? (msbGlitchSpikes / totalCheckedNeighbors) : 0;
  const bitflipSpikeRatio = totalCheckedNeighbors > 0 ? (isolatedBitflipSpikes / totalCheckedNeighbors) : 0;
  // Calibración pericial robusta: Capturas de videojuegos con HUD, texto, bordes contrastados y gráficos
  // vectoriales pueden producir ratios de picos de contraste de hasta 0.005 (0.5%).
  // Un ataque real adversario de mutación (Módulo 4) inyecta saltos a una escala perceptible (>= 1.2% o 2.5%).
  const isBitAttackDetected = msbSpikeRatio > 0.012 || bitflipSpikeRatio > 0.025;

  // 8. Calibración del Veredicto Forense Multicriterio (Sin Falsos Positivos)
  let finalConfidence = 0;
  let verdictStatus = 'IMAGEN_LIMPIA';
  let verdictSummary = '';

  if (detectedHeaderType === 'AES_GCM_PACKAGE_TRUNCATED' || detectedHeaderType === 'STG1_CONTAINER_TRUNCATED') {
    finalConfidence = 99.9;
    verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
    verdictSummary = `⚠️ ALERTA FORENSE CRÍTICA: Se detectó una cabecera esteganográfica válida ${detectedHeaderType.includes('AES') ? 'cifrada con AES-256-GCM' : 'en contenedor STG1'}. La longitud declarada en la cabecera es de ${declaredPayloadLength.toLocaleString()} bytes (~${(declaredPayloadLength / 1024).toFixed(1)} KB), pero la resolución actual de la imagen (${width}×${height} px) solo puede albergar un máximo de ${maxCapacity.toLocaleString()} bytes (~${(maxCapacity / 1024).toFixed(1)} KB). La imagen portadora fue redimensionada, recortada o proviene de un archivo mayor: el 100% de la capacidad de la imagen (${(maxCapacity * 8).toLocaleString()} bits) está saturada con datos inyectados pero el archivo secreto está truncado.`;
  } else if (detectedHeaderType === 'STG1_CONTAINER') {
    finalConfidence = 99.8;
    verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
    verdictSummary = `Firma esteganográfica confirmada: Se detectó el contenedor STG1 en los planos LSB (longitud del payload: ${detectedPayloadLength.toLocaleString()} bytes).`;
  } else if (detectedHeaderType === 'AES_GCM_PACKAGE') {
    finalConfidence = 99.8;
    verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
    verdictSummary = `Firma criptográfica confirmada: Se detectó un paquete AES-256-GCM [Salt(16B) | IV(12B) | Tag(16B) | Ciphertext] inyectado en los planos LSB (longitud total: ${detectedPayloadLength.toLocaleString()} bytes).`;
  } else if (detectedHeaderType === 'PLAINTEXT_LSB') {
    finalConfidence = 99.5;
    verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
    verdictSummary = `Se detectó cabecera LSB de texto estructurado en los primeros bytes (longitud del payload: ${detectedPayloadLength.toLocaleString()} bytes).`;
  } else if (isBitAttackDetected) {
    // Detección de sabotaje o mutación de bits (Módulo 4 / Glitches / Bit-Flips)
    finalConfidence = Math.min(99.2, Math.max(89.0, 78 + (msbSpikeRatio * 8000) + (bitflipSpikeRatio * 3000)));
    finalConfidence = Number(finalConfidence.toFixed(1));
    verdictStatus = 'ALTO_RIESGO_MANIPULACION_BITS';
    verdictSummary = `⚠️ ALERTA FORENSE DE INTEGRIDAD: Se detectó un ataque de mutación de bits o inyección de glitches destructivos (anomalía de saltos bruscos en planos de bits). La imagen ha sido manipulada y presenta sabotaje digital.`;
  } else if (hasSustainedPlateau && flatMismatchRate > 0.46) {
    // Esteganografía de terceros sin cabecera reconocida: meseta Westfeld sostenida por >= 2 intervalos
    finalConfidence = Math.min(96.0, 70 + (plateauLength * 2));
    verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
    verdictSummary = `Alta sospecha de esteganografía LSB. Pares PoV igualados continuamente en el primer ${estimatedOccupancyPct}% de la imagen (aprox. ${estimatedPayloadBytes.toLocaleString()} bytes inyectados).`;
  } else {
    // Sin cabecera ni meseta sostenida: imagen natural o fotografía limpia (incluso WhatsApp o capturas)
    const avgAsymmetry = (chiR.asymmetryPct + chiG.asymmetryPct + chiB.asymmetryPct) / 3;
    const maxChi = Math.max(chiR.chiSquare, chiG.chiSquare, chiB.chiSquare);

    if (maxChi > 500) {
      // Varianza natural fotográfica muy fuerte (frecuencias distantes en pares)
      finalConfidence = Math.max(3.0, flatMismatchRate * 25);
    } else {
      let povScore = avgAsymmetry < 5 ? 25 : 8;
      let flatScore = flatMismatchRate > 0.42 ? 25 : 8;
      finalConfidence = (povScore * 0.5) + (flatScore * 0.5);
    }

    finalConfidence = Math.min(22.0, Math.max(2.0, Number(finalConfidence.toFixed(1))));
    verdictStatus = 'IMAGEN_LIMPIA';
    verdictSummary = 'La distribución de frecuencias en pares PoV, la dispersión LSB y la continuidad espacial son plenamente consistentes con una imagen fotográfica limpia y no alterada.';
  }

  return {
    dimensions: {
      width,
      height,
      totalPixels,
      totalChannels: totalPixels * 3,
      maxPayloadCapacityBytes: Math.floor((totalPixels * 3) / 8) - 4
    },
    histograms: {
      red: histR,
      green: histG,
      blue: histB
    },
    shannonEntropy: {
      redLSB: Number(entropyR.toFixed(6)),
      greenLSB: Number(entropyG.toFixed(6)),
      blueLSB: Number(entropyB.toFixed(6)),
      globalLSB: Number(entropyGlobal.toFixed(6)),
      theoreticalMax: 1.000000,
      isAnomalouslyHigh: entropyGlobal > 0.9995
    },
    chiSquarePoV: {
      red: chiR,
      green: chiG,
      blue: chiB
    },
    westfeldAnalysis: {
      curve: westfeldCurve,
      estimatedPayloadBytes,
      estimatedOccupancyPct,
      hasPayloadSignature: estimatedPayloadBytes > 0 || (westfeldCurve.length > 0 && westfeldCurve[0].stegoProbability > 0.70)
    },
    verdict: {
      suspicionPercentage: finalConfidence,
      status: verdictStatus,
      summary: verdictSummary
    },
    payloadDetection: {
      detectedHeaderType,
      detectedPayloadLength,
      declaredPayloadLength: declaredPayloadLength || detectedPayloadLength,
      isTruncated: !!isTruncated,
      isBitAttackDetected,
      msbGlitchSpikes,
      isolatedBitflipSpikes,
      estimatedPayloadBytes,
      totalAlteredBits: detectedPayloadLength > 0 ? (4 + detectedPayloadLength) * 8 : (msbGlitchSpikes + isolatedBitflipSpikes)
    }
  };
}
