/**
 * Sample Pair Analysis (SPA).
 * Dumitrescu, Wu & Wang, "Detection of LSB Steganography via Sample Pair
 * Analysis" (IEEE Trans. Signal Processing, 2003).
 *
 * Toma pares de muestras vecinas (u,v) y los clasifica segun la paridad de v y el
 * orden entre u y v. La inyeccion LSB provoca transiciones entre esas clases con
 * probabilidades conocidas, y la conservacion del flujo entre clases cierra una
 * ecuacion cuadratica en la tasa p.
 *
 *     X = {(u,v) : (v par y u < v) o (v impar y u > v)}
 *     Y = {(u,v) : (v par y u > v) o (v impar y u < v)}
 *     Z = {(u,v) : u = v}
 *     W = {(u,v) de Y : floor(u/2) = floor(v/2)}   (difieren solo en el LSB)
 *
 * X, Y y Z particionan el conjunto de pares; W es un subconjunto de Y.
 *
 *     (|W| + |Z|)/2 * p^2 + (2|X| - |P|) * p + (|Y| - |X|) = 0
 *
 * La raiz menor es la tasa estimada. SPA es mas preciso que RS a tasas bajas
 * porque no extrapola: mide directamente sobre la imagen recibida, sin necesitar
 * una segunda medicion con todos los LSB volteados.
 */

/**
 * Cuenta las clases de pares de un plano cromatico.
 *
 * Los pares se toman horizontales y DISJUNTOS dentro de cada fila. Disjuntos para
 * que las observaciones sean independientes, y por filas porque dos muestras
 * consecutivas del búfer solo son vecinas de verdad en la misma fila.
 *
 * @param {Uint8Array} plane - Plano en orden de barrido.
 * @returns {{ X: number, Y: number, Z: number, W: number, total: number }}
 */
export function countSamplePairs(plane, width, height) {
  const pairsPerRow = Math.floor(width / 2);

  let X = 0;
  let Y = 0;
  let Z = 0;
  let W = 0;
  let total = 0;

  for (let y = 0; y < height; y++) {
    const rowStart = y * width;

    for (let k = 0; k < pairsPerRow; k++) {
      const u = plane[rowStart + 2 * k];
      const v = plane[rowStart + 2 * k + 1];
      total++;

      if (u === v) {
        Z++;
        continue;
      }

      const vIsEven = (v & 1) === 0;
      const uIsSmaller = u < v;

      if (vIsEven === uIsSmaller) {
        X++;
      } else {
        Y++;
        if ((u >> 1) === (v >> 1)) W++;
      }
    }
  }

  return { X, Y, Z, W, total };
}

/** Raiz de menor modulo de ax^2 + bx + c. */
function solveSmallestRoot(a, b, c) {
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return null;
    return -c / b;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const root1 = (-b + sqrtDiscriminant) / (2 * a);
  const root2 = (-b - sqrtDiscriminant) / (2 * a);

  return Math.abs(root1) <= Math.abs(root2) ? root1 : root2;
}

/**
 * SPA sobre un plano cromatico.
 * @param {Uint8Array} plane - Plano en orden de barrido.
 */
export function samplePairAnalysis(plane, width, height) {
  if (Math.floor(width / 2) < 1 || height < 1) {
    return {
      applicable: false,
      reason: `La imagen (${width}x${height}) no admite pares horizontales.`,
      estimatedRate: null
    };
  }

  const counts = countSamplePairs(plane, width, height);

  const a = (counts.W + counts.Z) / 2;
  const b = 2 * counts.X - counts.total;
  const c = counts.Y - counts.X;

  const root = solveSmallestRoot(a, b, c);

  const rawRate = Number.isFinite(root) ? root : null;
  let unstable = false;
  let estimatedRate = null;

  if (rawRate === null) {
    unstable = true;
  } else {
    unstable = rawRate < -0.1 || rawRate > 1.25;
    estimatedRate = Math.min(1, Math.max(0, rawRate));
  }

  return {
    applicable: true,
    counts,
    quadratic: {
      a: Number(a.toFixed(4)),
      b: Number(b.toFixed(4)),
      c: Number(c.toFixed(4)),
      selectedRoot: root === null ? null : Number(root.toFixed(8))
    },
    estimatedRate: estimatedRate === null ? null : Number(estimatedRate.toFixed(6)),
    rawEstimatedRate: rawRate === null ? null : Number(rawRate.toFixed(6)),
    unstable,
    pairsAnalyzed: counts.total
  };
}

/**
 * SPA sobre los tres planos, promediando la estimacion.
 */
export function samplePairAnalysisRgb(planes, width, height) {
  const red = samplePairAnalysis(planes.red, width, height);
  const green = samplePairAnalysis(planes.green, width, height);
  const blue = samplePairAnalysis(planes.blue, width, height);

  const usable = [red, green, blue].filter(
    (channel) => channel.applicable && channel.estimatedRate !== null && !channel.unstable
  );

  const meanRate = usable.length > 0
    ? usable.reduce((sum, channel) => sum + channel.estimatedRate, 0) / usable.length
    : null;

  let spread = null;
  if (usable.length > 1) {
    const rates = usable.map((channel) => channel.estimatedRate);
    spread = Math.max(...rates) - Math.min(...rates);
  }

  return {
    perChannel: { red, green, blue },
    estimatedRate: meanRate === null ? null : Number(meanRate.toFixed(6)),
    channelsUsed: usable.length,
    channelSpread: spread === null ? null : Number(spread.toFixed(6))
  };
}
