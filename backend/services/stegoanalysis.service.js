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

  // 3. Ataque de Chi-cuadrado sobre Pares de Valores (PoVs: 2k y 2k+1)
  function computeChiSquarePoVs(hist) {
    let chiSq = 0;
    let pairsCount = 0;
    const povDifferences = [];

    for (let k = 0; k < 128; k++) {
      const v2k = hist[2 * k];
      const v2k1 = hist[2 * k + 1];
      const expected = (v2k + v2k1) / 2;

      if (expected > 0) {
        const diff = (v2k - expected);
        chiSq += (diff * diff) / expected;
        pairsCount++;
        povDifferences.push({ pair: [2 * k, 2 * k + 1], v2k, v2k1, expected, diff: Math.abs(v2k - v2k1) });
      }
    }

    const df = Math.max(1, pairsCount - 1);
    const pValue = chiSquarePValue(chiSq, df);

    return {
      chiSquare: Number(chiSq.toFixed(4)),
      degreesOfFreedom: df,
      pValue: Number(pValue.toFixed(6)),
      pairsAnalyzed: pairsCount
    };
  }

  const chiR = computeChiSquarePoVs(histR);
  const chiG = computeChiSquarePoVs(histG);
  const chiB = computeChiSquarePoVs(histB);

  // 4. Curva Dinámica Acumulativa de Chi-cuadrado (Ataque Westfeld & Pfitzmann)
  // Analiza la probabilidad de esteganografía p(k) conforme se recorre la imagen en 60 intervalos.
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
        // En Westfeld: p(k) = 1 - pVal representa la probabilidad de que los PoVs estén artificialmente igualados
        const stegoProb = Math.max(0, Math.min(1, 1 - pVal));
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
  let detectionConfidence = 0;

  // Buscar punto de caída drástica de stegoProbability de >0.7 a <0.3
  let kneeIndex = -1;
  for (let i = 0; i < westfeldCurve.length; i++) {
    if (westfeldCurve[i].stegoProbability > 0.65) {
      kneeIndex = i;
    } else if (kneeIndex !== -1 && westfeldCurve[i].stegoProbability < 0.35) {
      // Punto de caída localizado
      break;
    }
  }

  if (kneeIndex >= 0 && westfeldCurve[0].stegoProbability > 0.5) {
    const endSample = westfeldCurve[kneeIndex].channelSample;
    estimatedPayloadBytes = Math.max(0, Math.floor(endSample / 8) - 4);
    estimatedOccupancyPct = Number(((endSample / totalChannels) * 100).toFixed(2));
  }

  // 6. Evaluación combinada y calibración del Veredicto Forense Multicriterio
  const entropyBias = Math.abs(1.0 - entropyGlobal);
  let entropyScore = 0;
  if (entropyBias < 0.001) entropyScore = 95;
  else if (entropyBias < 0.008) entropyScore = 75;
  else if (entropyBias < 0.03) entropyScore = 45;
  else entropyScore = Math.max(0, 20 - (entropyBias * 100));

  // Puntuación de Chi-cuadrado
  const avgPValue = (chiR.pValue + chiG.pValue + chiB.pValue) / 3;
  let chiScore = (1 - avgPValue) * 100;

  // Si la curva de Westfeld muestra alta sospecha en el inicio
  const initialWestfeldProb = westfeldCurve.length > 0 ? westfeldCurve[0].stegoProbability : 0;
  let westfeldScore = initialWestfeldProb * 100;

  // Ponderación: 40% Entropía + 35% Westfeld + 25% Chi-cuadrado
  let finalConfidence = (entropyScore * 0.40) + (westfeldScore * 0.35) + (chiScore * 0.25);
  finalConfidence = Math.min(99.9, Math.max(0.1, Number(finalConfidence.toFixed(1))));

  let verdictStatus = 'IMAGEN_LIMPIA';
  let verdictSummary = 'Las fluctuaciones estadísticas en los planos LSB y pares PoV son consistentes con la dispersión natural fotográfica.';

  if (finalConfidence >= 70 || (initialWestfeldProb > 0.8 && entropyGlobal > 0.998)) {
    verdictStatus = 'ALTO_RIESGO_ESTEGANOGRAFIA';
    verdictSummary = estimatedPayloadBytes > 0 
      ? `Alta sospecha de esteganografía LSB. Se detecta ruido pseudo-aleatorio con firma Westfeld activa en el primer ${estimatedOccupancyPct}% de la imagen (aprox. ${estimatedPayloadBytes.toLocaleString()} bytes inyectados).`
      : 'Se detecta entropía LSB cuasi-perfecta (~1.0000) consistente con un payload cifrado o aleatorizado (AES-256).';
  } else if (finalConfidence >= 35) {
    verdictStatus = 'SOSPECHA_MODERADA';
    verdictSummary = 'Anomalías leves en la distribución de pares PoV o entropía LSB. Requiere inspección visual de planos de bits.';
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
      isAnomalouslyHigh: entropyGlobal > 0.9985
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
      hasPayloadSignature: estimatedPayloadBytes > 0 || initialWestfeldProb > 0.75
    },
    verdict: {
      suspicionPercentage: finalConfidence,
      status: verdictStatus,
      summary: verdictSummary
    }
  };
}
