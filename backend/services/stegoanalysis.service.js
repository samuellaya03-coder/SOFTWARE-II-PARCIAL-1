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
  if (df <= 0 || chiSq < 0) return 1;
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
  let estimatedPayloadBytes = 0;
  let estimatedOccupancyPct = 0;
  let kneeIndex = -1;

  for (let i = 0; i < westfeldCurve.length; i++) {
    if (westfeldCurve[i].stegoProbability > 0.65) {
      kneeIndex = i;
    } else if (kneeIndex !== -1 && westfeldCurve[i].stegoProbability < 0.35) {
      break;
    }
  }

  if (kneeIndex >= 0 && westfeldCurve[0].stegoProbability > 0.60) {
    const endSample = westfeldCurve[kneeIndex].channelSample;
    estimatedPayloadBytes = Math.max(0, Math.floor(endSample / 8) - 4);
    estimatedOccupancyPct = Number(((endSample / totalChannels) * 100).toFixed(2));
  }

  // 6. Detección Determinística de Cabecera LSB
  let detectedHeaderType = null;
  let detectedPayloadLength = 0;
  const sampleBytes = new Uint8Array(16);
  let bitIdx = 0;
  for (let b = 0; b < 16; b++) {
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

  // A) Cabecera mágica STG1 (Cifrado AES-256-GCM + PBKDF2)
  if (sampleBytes[0] === 0x53 && sampleBytes[1] === 0x54 && sampleBytes[2] === 0x47 && sampleBytes[3] === 0x31) {
    detectedHeaderType = 'STG1_CONTAINER';
  } else {
    // B) Longitud de texto plano LSB (32 bits enteros)
    const len32 = (sampleBytes[0] << 24) | (sampleBytes[1] << 16) | (sampleBytes[2] << 8) | sampleBytes[3];
    const maxCapacity = Math.floor((totalPixels * 3) / 8) - 4;
    if (len32 > 0 && len32 <= maxCapacity) {
      let printableCount = 0;
      for (let i = 4; i < 12; i++) {
        if ((sampleBytes[i] >= 32 && sampleBytes[i] <= 126) || sampleBytes[i] === 10 || sampleBytes[i] === 13) {
          printableCount++;
        }
      }
      if (printableCount >= 6) {
        detectedHeaderType = 'PLAINTEXT_LSB';
        detectedPayloadLength = len32;
      }
    }
  }

  // 7. Análisis de Dispersión Espacial de LSBs en Zonas Homogéneas (Flat-Area Flips)
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

  // 8. Calibración del Veredicto Forense Multicriterio (Sin Falsos Positivos)
  let finalConfidence = 0;
  let verdictStatus = 'IMAGEN_LIMPIA';
  let verdictSummary = '';

  if (detectedHeaderType === 'STG1_CONTAINER') {
    finalConfidence = 99.8;
    verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
    verdictSummary = 'Firma criptográfica confirmada: Se detectó el contenedor esteganográfico STG1 (AES-256-GCM + PBKDF2) en los planos LSB.';
  } else if (detectedHeaderType === 'PLAINTEXT_LSB') {
    finalConfidence = 99.5;
    verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
    verdictSummary = `Se detectó cabecera LSB de texto estructurado en los primeros bytes (longitud del payload: ${detectedPayloadLength.toLocaleString()} bytes).`;
  } else {
    const avgAsymmetry = (chiR.asymmetryPct + chiG.asymmetryPct + chiB.asymmetryPct) / 3;

    // Asimetría de pares PoV (Limpia: >15%, Stego: <4%)
    let povScore = 0;
    if (avgAsymmetry < 2.0) povScore = 95;
    else if (avgAsymmetry < 5.0) povScore = 80;
    else if (avgAsymmetry < 10.0) povScore = 45;
    else if (avgAsymmetry < 16.0) povScore = 20;
    else povScore = Math.max(2, 12 - (avgAsymmetry * 0.15));

    // Descorrelación LSB en zonas planas (Limpia: <32%, Stego: ~50%)
    let flatScore = 0;
    if (flatMismatchRate > 0.47) flatScore = 90;
    else if (flatMismatchRate > 0.44) flatScore = 65;
    else if (flatMismatchRate > 0.38) flatScore = 35;
    else if (flatMismatchRate > 0.30) flatScore = 15;
    else flatScore = 4;

    // Puntuación Westfeld inicial
    const initialWestfeldProb = westfeldCurve.length > 0 ? westfeldCurve[0].stegoProbability : 0;
    let westfeldScore = initialWestfeldProb * 100;

    // Calibración para imágenes limpias (fotos de WhatsApp, capturas de pantalla, texturas fotográficas)
    if (avgAsymmetry >= 14.0 && flatMismatchRate < 0.38) {
      finalConfidence = Math.max(3.0, (flatScore * 0.5) + (povScore * 0.5));
    } else {
      finalConfidence = (povScore * 0.40) + (flatScore * 0.35) + (westfeldScore * 0.25);
    }

    finalConfidence = Math.min(99.0, Math.max(2.0, Number(finalConfidence.toFixed(1))));

    if (finalConfidence >= 65 || (initialWestfeldProb > 0.75 && flatMismatchRate > 0.46)) {
      verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
      verdictSummary = estimatedPayloadBytes > 0
        ? `Alta sospecha de esteganografía LSB. Pares PoV igualados en el primer ${estimatedOccupancyPct}% de la imagen (aprox. ${estimatedPayloadBytes.toLocaleString()} bytes inyectados).`
        : 'Se detecta igualación artificial en pares de valores (PoVs) y aleatoriedad LSB consistente con un payload inyectado.';
    } else if (finalConfidence >= 30) {
      verdictStatus = 'SOSPECHA_MODERADA';
      verdictSummary = 'Anomalías estadísticas leves en zonas planas o histograma LSB. Se recomienda inspección visual microscópica.';
    } else {
      verdictStatus = 'IMAGEN_LIMPIA';
      verdictSummary = 'La distribución de frecuencias en pares PoV, la dispersión LSB y la continuidad espacial son plenamente consistentes con una imagen fotográfica limpia y no alterada.';
    }
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
    }
  };
}
