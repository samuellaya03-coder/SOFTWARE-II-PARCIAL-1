/**
 * RS Analysis: grupos Regulares y Singulares.
 * Fridrich, Goljan & Du, "Reliable Detection of LSB Steganography" (ACM MM 2001).
 *
 * A diferencia del X2 de PoVs, no mira el histograma sino la CORRELACION
 * ESPACIAL entre vecinos, asi que funciona en portadoras donde el X2 es ciego.
 *
 * Funcion discriminante (rugosidad):  f(G) = SUM |x_{i+1} - x_i|
 * Volteos:  F_1(x) = x XOR 1          (el que aplica la inyeccion LSB)
 *           F_-1(x) = ((x+1) XOR 1)-1 (volteo dual, desplazado un nivel)
 * Mascara M: indica que volteo aplicar a cada pixel del grupo.
 *
 * Grupo REGULAR si f(F_M(G)) > f(G), SINGULAR si <, INUTIL si =.
 *
 * En una imagen natural voltear LSB rompe la suavidad, asi que
 * R_M ~ R_-M >> S_M ~ S_-M. Al crecer la tasa p, R_M y S_M convergen mientras
 * R_-M y S_-M divergen; en p=1 se cumple R_M = S_M.
 *
 * Extrapolacion: la imagen recibida se mide en x = p/2 (sobrescribir p*N LSB con
 * bits aleatorios solo cambia la mitad) y volteando todos los LSB se obtiene el
 * punto x = 1 - p/2. Con d0 = R_M - S_M, dn0 = R_-M - S_-M y sus homologos d1,
 * dn1 tras el volteo total, la raiz de menor modulo de
 *
 *     2(d1 + d0)x^2 + (dn0 - dn1 - d1 - 3d0)x + (d0 - dn0) = 0
 *
 * da la tasa  p = x / (x - 1/2).
 *
 * Exactitud medida con inyeccion dispersa: error <= 0.009 en el rango 0.02-0.80.
 * Con inyeccion secuencial se sesga hacia 0.5 (hasta 0.09) porque el modelo
 * asume tasa homogenea; ver README.
 */

const DEFAULT_GROUP_SIZE = 4;
const DEFAULT_MASK = [0, 1, 1, 0];

/**
 * F_-1 puede producir -1 (desde 0) y 256 (desde 255). Es deliberado: la
 * definicion del paper extiende el dominio a esos valores virtuales y la funcion
 * discriminante solo usa diferencias absolutas. Saturar sesgaria el conteo de
 * grupos singulares.
 */
function applyFlip(value, maskValue) {
  if (maskValue === 1) return value ^ 1;
  if (maskValue === -1) return ((value + 1) ^ 1) - 1;
  return value;
}

function negateMask(mask) {
  return mask.map((value) => -value);
}

/**
 * Cuenta grupos regulares y singulares bajo una mascara.
 *
 * Los grupos se toman por FILAS en bloques disjuntos: dos muestras consecutivas
 * del búfer solo son vecinas de verdad dentro de la misma fila. El resto de la
 * fila que no completa un grupo se descarta.
 *
 * @returns {{ regular: number, singular: number, unusable: number, groups: number }}
 *          Los tres primeros son fracciones sobre el total de grupos.
 */
export function countRegularSingular(plane, width, height, mask, groupSize) {
  const groupsPerRow = Math.floor(width / groupSize);

  let regular = 0;
  let singular = 0;
  let unusable = 0;
  let groups = 0;

  for (let y = 0; y < height; y++) {
    const rowStart = y * width;

    for (let g = 0; g < groupsPerRow; g++) {
      const base = rowStart + g * groupSize;

      let roughness = 0;
      let flippedRoughness = 0;
      let previous = plane[base];
      let previousFlipped = applyFlip(previous, mask[0]);

      for (let i = 1; i < groupSize; i++) {
        const current = plane[base + i];
        const currentFlipped = applyFlip(current, mask[i]);

        roughness += Math.abs(current - previous);
        flippedRoughness += Math.abs(currentFlipped - previousFlipped);

        previous = current;
        previousFlipped = currentFlipped;
      }

      if (flippedRoughness > roughness) regular++;
      else if (flippedRoughness < roughness) singular++;
      else unusable++;

      groups++;
    }
  }

  if (groups === 0) {
    return { regular: 0, singular: 0, unusable: 0, groups: 0 };
  }

  return {
    regular: regular / groups,
    singular: singular / groups,
    unusable: unusable / groups,
    groups
  };
}

/** Raiz de menor modulo, la que el paper identifica como admisible. */
function solveSmallestRoot(a, b, c) {
  // Degenera a lineal cuando d1 + d0 ~ 0, tipico en planos casi saturados.
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
 * RS Analysis sobre un plano cromatico.
 * @param {Uint8Array} plane - Plano en orden de barrido.
 */
export function rsAnalysis(plane, width, height, options = {}) {
  const { mask = DEFAULT_MASK, groupSize = DEFAULT_GROUP_SIZE } = options;

  if (mask.length !== groupSize) {
    throw new Error(
      `La mascara tiene longitud ${mask.length} y el tamano de grupo es ${groupSize}; deben coincidir.`
    );
  }

  if (Math.floor(width / groupSize) < 1 || height < 1) {
    return {
      applicable: false,
      reason: `La imagen (${width}x${height}) no admite grupos de ${groupSize} pixeles por fila.`,
      estimatedRate: null
    };
  }

  const negatedMask = negateMask(mask);

  // Medicion en x = p/2: la imagen tal como llego.
  const rsMask = countRegularSingular(plane, width, height, mask, groupSize);
  const rsNegated = countRegularSingular(plane, width, height, negatedMask, groupSize);

  // Medicion en x = 1 - p/2: todos los LSB volteados.
  const flippedPlane = new Uint8Array(plane.length);
  for (let i = 0; i < plane.length; i++) {
    flippedPlane[i] = plane[i] ^ 1;
  }
  const rsMaskFlipped = countRegularSingular(flippedPlane, width, height, mask, groupSize);
  const rsNegatedFlipped = countRegularSingular(flippedPlane, width, height, negatedMask, groupSize);

  const d0 = rsMask.regular - rsMask.singular;
  const dn0 = rsNegated.regular - rsNegated.singular;
  const d1 = rsMaskFlipped.regular - rsMaskFlipped.singular;
  const dn1 = rsNegatedFlipped.regular - rsNegatedFlipped.singular;

  const a = 2 * (d1 + d0);
  const b = dn0 - dn1 - d1 - 3 * d0;
  const c = d0 - dn0;

  const root = solveSmallestRoot(a, b, c);

  let rate = null;
  if (root !== null && Math.abs(root - 0.5) > 1e-12) {
    rate = root / (root - 0.5);
  }

  // Una tasa fuera de [0,1] indica extrapolacion inestable (plano pequeno,
  // textura extrema o saturacion) y se marca, no se recorta en silencio.
  const rawRate = Number.isFinite(rate) ? rate : null;
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
    diagram: {
      regularMask: Number(rsMask.regular.toFixed(6)),
      singularMask: Number(rsMask.singular.toFixed(6)),
      regularNegatedMask: Number(rsNegated.regular.toFixed(6)),
      singularNegatedMask: Number(rsNegated.singular.toFixed(6)),
      regularMaskFlipped: Number(rsMaskFlipped.regular.toFixed(6)),
      singularMaskFlipped: Number(rsMaskFlipped.singular.toFixed(6)),
      regularNegatedMaskFlipped: Number(rsNegatedFlipped.regular.toFixed(6)),
      singularNegatedMaskFlipped: Number(rsNegatedFlipped.singular.toFixed(6))
    },
    differences: {
      d0: Number(d0.toFixed(8)),
      dNegated0: Number(dn0.toFixed(8)),
      d1: Number(d1.toFixed(8)),
      dNegated1: Number(dn1.toFixed(8))
    },
    quadratic: {
      a: Number(a.toFixed(8)),
      b: Number(b.toFixed(8)),
      c: Number(c.toFixed(8)),
      selectedRoot: root === null ? null : Number(root.toFixed(8))
    },
    estimatedRate: estimatedRate === null ? null : Number(estimatedRate.toFixed(6)),
    rawEstimatedRate: rawRate === null ? null : Number(rawRate.toFixed(6)),
    unstable,
    groupsAnalyzed: rsMask.groups,
    mask: [...mask],
    groupSize
  };
}

/**
 * RS Analysis sobre los tres planos, promediando la estimacion.
 *
 * Cada plano es una medicion casi independiente de la misma tasa, porque el motor
 * LSB reparte el payload entre R, G y B por igual. La dispersion entre canales
 * indica si la extrapolacion opera dentro de su regimen de validez.
 */
export function rsAnalysisRgb(planes, width, height, options = {}) {
  const red = rsAnalysis(planes.red, width, height, options);
  const green = rsAnalysis(planes.green, width, height, options);
  const blue = rsAnalysis(planes.blue, width, height, options);

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
