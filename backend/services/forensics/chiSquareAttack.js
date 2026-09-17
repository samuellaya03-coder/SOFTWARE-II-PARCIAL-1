/**
 * Ataque Chi-cuadrado progresivo sobre Pares de Valores (PoVs).
 * Westfeld & Pfitzmann, "Attacks on Steganographic Systems" (IH 1999).
 *
 * Voltear el LSB solo mueve una muestra entre los dos miembros de su par
 * 2k <-> 2k+1, asi que la suma del par m_k es invariante. Bajo inyeccion con
 * bits uniformes, n_2k ~ Bin(m_k, 1/2), lo que da un test de 1 gdl por par:
 *
 *     X2 = SUM_k (n_2k - n_{2k+1})^2 / m_k   ~ X2(K) bajo inyeccion
 *
 *     X2/K ~ 1   => pares equilibrados    => region inyectada
 *     X2/K >> 1  => pares desequilibrados => region natural limpia
 *
 * El paper suma solo el miembro par contra K-1 gdl, lo que vale exactamente la
 * mitad; esa calibracion a mitad de escala es el origen del "p ~ 1" clasico. Se
 * reporta en `westfeldPValue` por fidelidad a la fuente.
 *
 * PROGRESIVO, no global: una inyeccion secuencial ocupa solo un prefijo del
 * flujo, y un X2 unico sobre la imagen completa queda dominado por el resto
 * natural y no detecta nada. Evaluando prefijos crecientes, el punto de ruptura
 * de la curva mide la longitud del payload.
 *
 * LIMITE: el ataque presupone desequilibrio natural en el histograma. Sobre
 * portadoras de histograma liso los pares ya estan equilibrados de fabrica y el
 * metodo es ciego (medido: X2/df 1.67 limpia frente a 1.91 con 30% inyectado).
 * Por eso se autocalibra contra la cola del flujo y se declara INCONCLUYENTE en
 * vez de inventar un veredicto. Ver README para la tabla completa.
 */

import { chiSquareSurvival, regularizedGammaP } from './statistics.js';

/** Un par entra en la suma solo si su frecuencia esperada alcanza 4 observaciones. */
const MIN_EXPECTED_FREQUENCY = 4;

/**
 * Desequilibrio minimo exigido a la cola para considerar el ataque concluyente.
 * Calibrado con dos ordenes de magnitud de margen: histograma liso mide 1.6-4.0,
 * histograma con peine mide 660-945.
 */
const MIN_TAIL_REDUCED_CHI_SQUARE = 10;

/**
 * Cota superior de X2/df para considerar un prefijo equilibrado. Bajo inyeccion
 * X2/df ~ 1 con desviacion sqrt(2/df) ~ 0.2, asi que 3.0 esta a mas de 9 sigmas y
 * muy por debajo del primer punto post-borde medido (47.9).
 */
const BALANCE_THRESHOLD = 3.0;

/**
 * Cota INFERIOR, por la cola izquierda de la distribucion.
 *
 * "Consistente con inyeccion" es un contraste de dos lados: bajo inyeccion real
 * cada par aporta un X2(1), asi que X2/df ~ 1 por construccion y un prefijo
 * DEMASIADO equilibrado es igual de imposible que uno desequilibrado. Sin esta
 * cota, un gradiente sintetico con apenas 37 pares utilizables mide X2/df = 0.10
 * y se cuela como payload: P(X2(37) < 3.8) es del orden de 1e-12, es decir, mucho
 * mas equilibrado de lo que cualquier inyeccion real podria producir.
 */
const MIN_LEFT_TAIL_P = 1e-4;

/**
 * Estadistico X2 de PoVs sobre un histograma de 256 niveles.
 * @param {Int32Array|number[]} histogram
 */
export function chiSquarePoV(histogram) {
  let chiSquare = 0;
  let usablePairs = 0;

  for (let k = 0; k < 128; k++) {
    const nEven = histogram[2 * k];
    const nOdd = histogram[2 * k + 1];
    const pairTotal = nEven + nOdd;

    if (pairTotal / 2 < MIN_EXPECTED_FREQUENCY) continue;

    const imbalance = nEven - nOdd;
    chiSquare += (imbalance * imbalance) / pairTotal;
    usablePairs++;
  }

  if (usablePairs < 1) {
    return {
      chiSquare: 0,
      degreesOfFreedom: 0,
      reducedChiSquare: NaN,
      pValue: NaN,
      westfeldPValue: NaN,
      usablePairs: 0
    };
  }

  return {
    chiSquare,
    degreesOfFreedom: usablePairs,
    reducedChiSquare: chiSquare / usablePairs,
    pValue: chiSquareSurvival(chiSquare, usablePairs),
    westfeldPValue: usablePairs > 1
      ? chiSquareSurvival(chiSquare / 2, usablePairs - 1)
      : NaN,
    usablePairs
  };
}

/** Estadistico de PoVs sobre el segmento [from, to) del flujo. */
function chiSquareOnSegment(samples, from, to) {
  const histogram = new Int32Array(256);
  for (let i = from; i < to; i++) {
    histogram[samples[i]]++;
  }
  return chiSquarePoV(histogram);
}

/**
 * Contraste de dos lados: el prefijo esta equilibrado de forma COMPATIBLE con una
 * inyeccion LSB real, ni demasiado desequilibrado ni demasiado perfecto.
 */
function isConsistentWithEmbedding(test, balanceThreshold, minLeftTailP) {
  if (!Number.isFinite(test.reducedChiSquare) || test.degreesOfFreedom < 1) return false;
  if (test.reducedChiSquare > balanceThreshold) return false;

  const leftTail = regularizedGammaP(test.degreesOfFreedom / 2, test.chiSquare / 2);
  return Number.isFinite(leftTail) && leftTail >= minLeftTailP;
}

/**
 * Ataque X2 sobre prefijos crecientes. El histograma se acumula en una sola
 * pasada O(n) y se fotografia en cada punto de control.
 *
 * @param {Uint8Array} samples - Flujo en orden de inyeccion.
 * @param {object} [options]
 * @param {number} [options.steps=256] - Puntos de control de la curva.
 * @param {number} [options.minSamples=4096] - Muestras minimas para validar un punto.
 * @param {number} [options.minUsablePairs=16] - Pares minimos para validar un punto.
 * @param {number} [options.tailFraction=0.25] - Porcion final usada como calibracion.
 * @param {number} [options.minTailReducedChiSquare=10]
 * @param {number} [options.balanceThreshold=3]
 * @param {number} [options.minLeftTailP=1e-4]
 * @param {number} [options.refineSteps=64] - Subdivisiones del pase de refinamiento.
 */
export function progressiveChiSquareAttack(samples, options = {}) {
  const {
    steps = 256,
    minSamples = 4096,
    minUsablePairs = 16,
    tailFraction = 0.25,
    minTailReducedChiSquare = MIN_TAIL_REDUCED_CHI_SQUARE,
    balanceThreshold = BALANCE_THRESHOLD,
    minLeftTailP = MIN_LEFT_TAIL_P,
    refineSteps = 64
  } = options;

  const total = samples.length;

  if (total < minSamples) {
    return {
      applicable: false,
      conclusive: false,
      status: 'FLUJO_INSUFICIENTE',
      reason: `El flujo tiene ${total} muestras y se requieren al menos ${minSamples}.`,
      curve: [],
      tailReducedChiSquare: null,
      globalReducedChiSquare: null,
      globalPValue: null,
      westfeldGlobalPValue: null,
      embeddedFraction: null,
      embeddedSamples: null,
      estimatedEmbeddedBytes: null,
      sequentialEmbeddingDetected: false,
      balanceThreshold,
      validCheckpoints: 0
    };
  }

  // Autocalibracion: desequilibrio natural de la cola, la region con menos
  // probabilidad de estar inyectada.
  const tailStart = Math.floor(total * (1 - tailFraction));
  const tail = chiSquareOnSegment(samples, tailStart, total);
  const tailReducedChiSquare = tail.reducedChiSquare;
  const conclusive = Number.isFinite(tailReducedChiSquare)
    && tailReducedChiSquare >= minTailReducedChiSquare;

  const checkpoints = new Int32Array(steps);
  for (let s = 0; s < steps; s++) {
    checkpoints[s] = Math.max(1, Math.floor((total * (s + 1)) / steps));
  }
  checkpoints[steps - 1] = total;

  const histogram = new Int32Array(256);
  const curve = [];
  let nextCheckpoint = 0;

  for (let i = 0; i < total; i++) {
    histogram[samples[i]]++;

    const consumed = i + 1;
    // Un mismo indice puede coincidir con varios puntos de control en flujos cortos.
    while (nextCheckpoint < steps && consumed === checkpoints[nextCheckpoint]) {
      const test = chiSquarePoV(histogram);
      const valid = consumed >= minSamples
        && test.usablePairs >= minUsablePairs
        && Number.isFinite(test.reducedChiSquare);

      curve.push({
        fraction: Number((consumed / total).toFixed(6)),
        sampleCount: consumed,
        chiSquare: Number(test.chiSquare.toFixed(4)),
        degreesOfFreedom: test.degreesOfFreedom,
        reducedChiSquare: Number.isFinite(test.reducedChiSquare)
          ? Number(test.reducedChiSquare.toFixed(6))
          : null,
        pValue: Number.isFinite(test.pValue) ? Number(test.pValue.toExponential(6)) : null,
        westfeldPValue: Number.isFinite(test.westfeldPValue)
          ? Number(test.westfeldPValue.toFixed(8))
          : null,
        usablePairs: test.usablePairs,
        valid
      });

      nextCheckpoint++;
    }
  }

  const validPoints = curve.filter((point) => point.valid);
  const globalPoint = curve[curve.length - 1];

  // Localizacion gruesa: se avanza mientras el prefijo siga equilibrado. La
  // primera ruptura marca el final de la region inyectada. Se exige contiguidad
  // desde el inicio porque una inyeccion secuencial ocupa un prefijo, no
  // fragmentos dispersos.
  let coarseIndex = 0;
  let firstBrokenIndex = null;

  for (const point of validPoints) {
    const test = {
      reducedChiSquare: point.reducedChiSquare,
      chiSquare: point.chiSquare,
      degreesOfFreedom: point.degreesOfFreedom
    };

    if (isConsistentWithEmbedding(test, balanceThreshold, minLeftTailP)) {
      coarseIndex = point.sampleCount;
    } else {
      firstBrokenIndex = point.sampleCount;
      break;
    }
  }

  // Refinamiento: la rejilla gruesa solo resuelve 1/steps del flujo, lo que en un
  // payload pequeno es un error relativo grande (medido: -21.8% con 128 pasos
  // sobre un payload del 2%). Se reconstruye el histograma hasta el ultimo punto
  // equilibrado y se avanza en pasos finos hasta la ruptura real.
  let embeddedSamples = coarseIndex;

  if (coarseIndex > 0 && firstBrokenIndex !== null && refineSteps > 1) {
    const refineHistogram = new Int32Array(256);
    for (let i = 0; i < coarseIndex; i++) {
      refineHistogram[samples[i]]++;
    }

    const stride = Math.max(1, Math.floor((firstBrokenIndex - coarseIndex) / refineSteps));

    for (let i = coarseIndex; i < firstBrokenIndex; i++) {
      refineHistogram[samples[i]]++;

      const consumed = i + 1;
      if (consumed % stride !== 0 && consumed !== firstBrokenIndex) continue;

      if (isConsistentWithEmbedding(chiSquarePoV(refineHistogram), balanceThreshold, minLeftTailP)) {
        embeddedSamples = consumed;
      } else {
        break;
      }
    }
  }

  const embeddedFraction = embeddedSamples / total;

  const shared = {
    applicable: true,
    curve,
    tailReducedChiSquare: Number(tailReducedChiSquare.toFixed(6)),
    globalReducedChiSquare: globalPoint ? globalPoint.reducedChiSquare : null,
    globalPValue: globalPoint ? globalPoint.pValue : null,
    westfeldGlobalPValue: globalPoint ? globalPoint.westfeldPValue : null,
    balanceThreshold,
    validCheckpoints: validPoints.length
  };

  if (!conclusive) {
    return {
      ...shared,
      conclusive: false,
      status: 'INCONCLUYENTE_HISTOGRAMA_LISO',
      reason:
        `La cola mide X2/df = ${Number(tailReducedChiSquare).toFixed(3)}, por debajo del minimo de `
        + `${minTailReducedChiSquare}. El histograma de esta portadora es localmente liso: sus pares `
        + 'ya estan equilibrados de forma natural, asi que el ataque X2 no puede distinguir inyeccion '
        + 'de estadistica propia de la imagen. El veredicto se delega a RS Analysis y SPA.',
      embeddedFraction: null,
      embeddedSamples: null,
      estimatedEmbeddedBytes: null,
      sequentialEmbeddingDetected: false
    };
  }

  return {
    ...shared,
    conclusive: true,
    status: embeddedFraction > 0 ? 'INYECCION_SECUENCIAL_LOCALIZADA' : 'SIN_INYECCION_SECUENCIAL',
    reason: embeddedFraction > 0
      ? `El prefijo hasta la fraccion ${embeddedFraction.toFixed(4)} presenta pares equilibrados `
        + `(X2/df <= ${balanceThreshold}) mientras la cola mide ${tailReducedChiSquare.toFixed(1)}. `
        + 'La discontinuidad localiza el borde del payload.'
      : 'El desequilibrio natural se mantiene desde la primera muestra, lo que es incompatible con '
        + 'una inyeccion secuencial.',
    embeddedFraction: Number(embeddedFraction.toFixed(6)),
    embeddedSamples,
    // 1 bit por muestra => 8 muestras por byte. Incluye los 4 bytes de cabecera.
    estimatedEmbeddedBytes: Math.floor(embeddedSamples / 8),
    sequentialEmbeddingDetected: embeddedSamples > 0
  };
}
