/**
 * Funcion de supervivencia Chi-cuadrado: si X ~ X2(k), P(X > x) = Q(k/2, x/2),
 * donde Q es la funcion gamma incompleta superior regularizada.
 *
 * La serie de potencias converge rapido si x < s+1 y la fraccion continua si
 * x >= s+1. Q se calcula DIRECTAMENTE en su rama (nunca como 1 - P) para no
 * perder precision en la cola derecha, que es donde vive la evidencia de una
 * imagen limpia.
 */

const EPS = 3e-16;
const FPMIN = 1e-300;
const MAX_ITER = 300;

/** ln Γ(z) por la aproximacion de Lanczos (g=7, n=9). ~12 cifras significativas. */
export function gammaLn(z) {
  // Reflexion de Euler: Γ(z)Γ(1-z) = π / sin(πz)
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
  }

  const LANCZOS = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109585652681, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  const G = 7;

  const x = z - 1;
  let series = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) {
    series += LANCZOS[i] / (x + i);
  }

  const t = x + G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(series);
}

/** P(s,x) por serie de potencias. Converge para x < s+1. */
function lowerGammaSeries(s, x) {
  if (x <= 0) return 0;

  let term = 1 / s;
  let sum = term;
  let denom = s;

  for (let n = 1; n <= MAX_ITER; n++) {
    denom += 1;
    term *= x / denom;
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * EPS) break;
  }

  return sum * Math.exp(-x + s * Math.log(x) - gammaLn(s));
}

/** Q(s,x) por la fraccion continua de Legendre (algoritmo de Lentz). Converge para x >= s+1. */
function upperGammaContinuedFraction(s, x) {
  let b = x + 1 - s;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i <= MAX_ITER; i++) {
    const an = -i * (i - s);
    b += 2;

    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;

    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;

    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < EPS) break;
  }

  return Math.exp(-x + s * Math.log(x) - gammaLn(s)) * h;
}

/**
 * Gamma incompleta inferior regularizada P(s,x) = γ(s,x)/Γ(s).
 * @returns {number} Valor en [0, 1], o NaN si los argumentos son invalidos.
 */
export function regularizedGammaP(s, x) {
  if (!Number.isFinite(s) || !Number.isFinite(x) || s <= 0 || x < 0) return NaN;
  if (x === 0) return 0;
  return x < s + 1
    ? lowerGammaSeries(s, x)
    : 1 - upperGammaContinuedFraction(s, x);
}

/**
 * Gamma incompleta superior regularizada Q(s,x) = Γ(s,x)/Γ(s).
 * @returns {number} Valor en [0, 1], o NaN si los argumentos son invalidos.
 */
export function regularizedGammaQ(s, x) {
  if (!Number.isFinite(s) || !Number.isFinite(x) || s <= 0 || x < 0) return NaN;
  if (x === 0) return 1;
  return x < s + 1
    ? 1 - lowerGammaSeries(s, x)
    : upperGammaContinuedFraction(s, x);
}

/**
 * P(X > chiSquare) para X ~ X2(df).
 *
 * En estegoanalisis de PoVs la lectura es contraintuitiva: p ~ 1 significa pares
 * equilibrados (inyeccion LSB) y p ~ 0 significa pares desequilibrados (imagen
 * natural limpia).
 */
export function chiSquareSurvival(chiSquare, df) {
  if (!Number.isFinite(chiSquare) || !Number.isFinite(df)) return NaN;
  if (df <= 0 || chiSquare <= 0) return 1;

  const p = regularizedGammaQ(df / 2, chiSquare / 2);
  return Math.min(1, Math.max(0, p));
}
