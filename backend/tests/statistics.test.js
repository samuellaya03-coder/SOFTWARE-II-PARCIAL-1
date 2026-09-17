/**
 * Validacion del nucleo estadistico contra dos fuentes independientes:
 *
 *  1. Forma cerrada exacta para grados de libertad PARES. Si k = 2m:
 *       P(X > x) = e^(-x/2) * SUM_{j=0..m-1} (x/2)^j / j!
 *     Sirve de oraculo de precision absoluta, incluso con Q ~ 1e-137.
 *
 *  2. Valores criticos tabulados de la literatura.
 */

import { chiSquareSurvival, regularizedGammaP, regularizedGammaQ, gammaLn } from '../services/forensics/statistics.js';
import { assertClose, assertTrue, runSuite, section } from './harness.js';

/** Oráculo analítico exacto para χ² con grados de libertad pares. */
function survivalEvenDf(x, df) {
  const m = df / 2;
  const halfX = x / 2;
  let sum = 0;
  let term = 1; // (x/2)^0 / 0!
  for (let j = 0; j < m; j++) {
    if (j > 0) term *= halfX / j;
    sum += term;
  }
  return Math.exp(-halfX) * sum;
}

const tests = [];

section(tests, 'gammaLn: valores exactos conocidos');

// La aproximación de Lanczos (g=7, n=9) sostiene ~12 cifras significativas en
// esta región, así que la exigencia se expresa como error RELATIVO de 1e-11.
const LANCZOS_REL_TOL = 1e-11;

// Γ(1) = 1 => ln Γ(1) = 0  (valor nulo: el error relativo no aplica)
tests.push(['ln Γ(1) = 0', () => assertClose(gammaLn(1), 0, 1e-12)]);
// Γ(1/2) = √π
tests.push(['ln Γ(1/2) = ln √π', () => assertClose(gammaLn(0.5), Math.log(Math.sqrt(Math.PI)), LANCZOS_REL_TOL, { relative: true })]);
// Γ(5) = 4! = 24
tests.push(['ln Γ(5) = ln 24', () => assertClose(gammaLn(5), Math.log(24), LANCZOS_REL_TOL, { relative: true })]);
// Γ(11) = 10! = 3628800
tests.push(['ln Γ(11) = ln 10!', () => assertClose(gammaLn(11), Math.log(3628800), LANCZOS_REL_TOL, { relative: true })]);
// Γ(21) = 20!
tests.push(['ln Γ(21) = ln 20!', () => {
  let f = 1; for (let i = 2; i <= 20; i++) f *= i;
  assertClose(gammaLn(21), Math.log(f), LANCZOS_REL_TOL, { relative: true });
}]);

section(tests, 'Complementariedad P + Q = 1');

for (const [s, x] of [[0.5, 0.25], [1, 1], [2.5, 3], [5, 4], [5, 20], [50, 50], [63.5, 200]]) {
  tests.push([`P(${s},${x}) + Q(${s},${x}) = 1`, () => {
    assertClose(regularizedGammaP(s, x) + regularizedGammaQ(s, x), 1, 1e-13);
  }]);
}

section(tests, 'Supervivencia χ² contra forma cerrada analítica (df par)');

// Barrido sobre ambas ramas del algoritmo y sobre la cola extrema.
// la cola extrema, donde una implementación ingenua "1 - P" colapsaría a 0.
for (const df of [2, 4, 6, 10, 20, 50, 100, 126]) {
  for (const x of [0.5, 1, 5, df * 0.5, df, df * 1.5, df * 3, df * 8]) {
    const expected = survivalEvenDf(x, df);
    tests.push([`Q(χ²=${x}, df=${df}) = ${expected.toExponential(3)}`, () => {
      // Tolerancia RELATIVA: exige precisión incluso cuando Q ~ 1e-40
      assertClose(chiSquareSurvival(x, df), expected, 1e-10, { relative: true });
    }]);
  }
}

section(tests, 'Valores críticos tabulados de la distribución χ²');

// [df, x crítico, alpha] — tablas estándar a 4 decimales
const CRITICAL_VALUES = [
  [1, 3.8415, 0.05],   [1, 6.6349, 0.01],   [1, 10.8276, 0.001],
  [2, 5.9915, 0.05],   [2, 9.2103, 0.01],
  [3, 7.8147, 0.05],   [3, 11.3449, 0.01],
  [5, 11.0705, 0.05],  [5, 15.0863, 0.01],
  [10, 18.3070, 0.05], [10, 23.2093, 0.01],
  [20, 31.4104, 0.05], [20, 37.5662, 0.01],
  [50, 67.5048, 0.05], [50, 76.1539, 0.01],
  [100, 124.3421, 0.05], [100, 135.8067, 0.01]
];

for (const [df, x, alpha] of CRITICAL_VALUES) {
  tests.push([`Q(${x}, df=${df}) = ${alpha}`, () => {
    // Las tablas traen 4-6 cifras en x, así que el p-value reproducido sólo
    // puede exigirse a ~1e-4 relativo.
    assertClose(chiSquareSurvival(x, df), alpha, 5e-4, { relative: true });
  }]);
}

section(tests, 'Casos frontera y monotonía');

tests.push(['Q(0, df) = 1 (χ² nulo => inyección total)', () => {
  assertClose(chiSquareSurvival(0, 127), 1, 1e-15);
}]);

tests.push(['Q(χ² enorme, df) -> 0 sin NaN', () => {
  const p = chiSquareSurvival(1e6, 127);
  assertTrue(Number.isFinite(p) && p >= 0 && p < 1e-300, `esperaba ~0 finito, obtuve ${p}`);
}]);

tests.push(['Q es monótona decreciente en χ²', () => {
  let prev = Infinity;
  for (let x = 0; x <= 400; x += 2.5) {
    const p = chiSquareSurvival(x, 127);
    assertTrue(p <= prev + 1e-15, `no monótona en χ²=${x}: ${p} > ${prev}`);
    prev = p;
  }
}]);

tests.push(['df <= 0 devuelve 1 en lugar de NaN', () => {
  assertClose(chiSquareSurvival(10, 0), 1, 0);
}]);

runSuite('NÚCLEO ESTADÍSTICO (statistics.js)', tests);
