/**
 * Orquestador del analisis forense.
 *
 * Ejecuta los tres estimadores sobre la misma imagen y funde sus resultados en un
 * veredicto unico. Ver verdict.js para los criterios de fusion.
 */

import { extractChannelPlanes, extractInterleavedRgbStream, buildHistogram } from './samples.js';
import { progressiveChiSquareAttack } from './chiSquareAttack.js';
import { rsAnalysisRgb } from './rsAnalysis.js';
import { samplePairAnalysisRgb } from './samplePairAnalysis.js';
import { lsbEntropyRgb } from './entropy.js';
import { buildVerdict } from './verdict.js';

/**
 * @param {Buffer|Uint8Array} rgba - Búfer RGBA decodificado.
 * @param {number} width
 * @param {number} height
 * @param {object} [options] - Opciones reenviadas al ataque X2.
 */
export function runForensicAnalysis(rgba, width, height, options = {}) {
  const startedAt = process.hrtime.bigint();

  const totalPixels = width * height;
  const totalSamples = totalPixels * 3;

  const planes = extractChannelPlanes(rgba);
  const stream = extractInterleavedRgbStream(rgba);

  const chiSquare = progressiveChiSquareAttack(stream, options.chiSquare);
  const rs = rsAnalysisRgb(planes, width, height, options.rs);
  const spa = samplePairAnalysisRgb(planes, width, height);
  const entropy = lsbEntropyRgb(planes);

  const verdict = buildVerdict({ rs, spa, chiSquare, totalSamples });

  return {
    dimensions: {
      width,
      height,
      totalPixels,
      totalSamples,
      // 1 bit por muestra RGB, menos los 4 bytes de cabecera del protocolo LSB.
      maxPayloadCapacityBytes: Math.max(0, Math.floor(totalSamples / 8) - 4)
    },
    verdict,
    estimators: {
      chiSquareProgressive: chiSquare,
      rsAnalysis: rs,
      samplePairAnalysis: spa
    },
    entropy,
    histograms: {
      red: Array.from(buildHistogram(planes.red)),
      green: Array.from(buildHistogram(planes.green)),
      blue: Array.from(buildHistogram(planes.blue))
    },
    elapsedMs: Number(Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2)
  };
}

export { extractChannelPlanes, extractInterleavedRgbStream } from './samples.js';
export { progressiveChiSquareAttack, chiSquarePoV } from './chiSquareAttack.js';
export { rsAnalysis, rsAnalysisRgb } from './rsAnalysis.js';
export { samplePairAnalysis, samplePairAnalysisRgb } from './samplePairAnalysis.js';
export { lsbEntropyRgb } from './entropy.js';
export { buildVerdict, VERDICT_STATUS } from './verdict.js';
