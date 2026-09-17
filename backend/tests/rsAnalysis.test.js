/**
 * Validacion de RS Analysis. Es un ESTIMADOR de tasa, no un detector binario, asi
 * que se mide su exactitud contra tasas conocidas:
 *  1. Sobre imagen limpia estima ~0.
 *  2. Recupera la tasa real en todo el rango utilizable.
 *  3. Funciona sobre histograma liso, donde el X2 de PoVs es ciego.
 *  4. El diagrama RS exhibe la geometria que predice el paper.
 */

import { rsAnalysis, rsAnalysisRgb, countRegularSingular } from '../services/forensics/rsAnalysis.js';
import { extractChannelPlanes } from '../services/forensics/samples.js';
import {
  createNaturalImage,
  createCameraPipelineImage,
  createSyntheticSmoothImage,
  createRandomPayload,
  embedLsbRandomSpread,
  embedLsbSequential
} from './fixtures/imageFactory.js';
import { assertClose, assertTrue, assertThrows, runSuite, section } from './harness.js';

const tests = [];

const WIDTH = 512;
const HEIGHT = 384;
const TOTAL_SAMPLES = WIDTH * HEIGHT * 3;

/** Estimacion agregada RGB sobre un búfer RGBA. */
function estimate(rgba) {
  return rsAnalysisRgb(extractChannelPlanes(rgba), WIDTH, HEIGHT);
}

const cleanCarrier = createNaturalImage({
  width: WIDTH, height: HEIGHT, seed: 20260917, noiseSigma: 2
});

section(tests, 'Mecanica de los grupos regulares y singulares');

tests.push(['Un plano constante no produce grupos regulares', () => {
  // Con f(G) = 0 la rugosidad solo puede subir o quedarse igual, nunca bajar.
  const plane = new Uint8Array(64 * 8).fill(128);
  const result = countRegularSingular(plane, 64, 8, [0, 1, 1, 0], 4);

  assertClose(result.singular, 0, 1e-12);
  assertTrue(result.regular > 0, 'esperaba grupos regulares sobre un plano constante');
  assertClose(result.regular + result.singular + result.unusable, 1, 1e-12);
}]);

tests.push(['Las fracciones R, S y U siempre suman 1', () => {
  const planes = extractChannelPlanes(cleanCarrier.data);
  const result = countRegularSingular(planes.red, WIDTH, HEIGHT, [0, 1, 1, 0], 4);
  assertClose(result.regular + result.singular + result.unusable, 1, 1e-12);
  assertClose(result.groups, Math.floor(WIDTH / 4) * HEIGHT, 0);
}]);

tests.push(['La mascara debe tener la longitud del grupo', () => {
  const planes = extractChannelPlanes(cleanCarrier.data);
  assertThrows(
    () => rsAnalysis(planes.red, WIDTH, HEIGHT, { mask: [0, 1, 1], groupSize: 4 }),
    'acepto una mascara de longitud incompatible con el grupo'
  );
}]);

tests.push(['Imagen demasiado pequena se reporta como no aplicable', () => {
  const plane = new Uint8Array(6);
  const result = rsAnalysis(plane, 3, 2, {});
  assertTrue(!result.applicable, 'acepto una imagen sin grupos completos');
  assertTrue(result.estimatedRate === null, 'emitio una tasa sobre una imagen no analizable');
}]);

section(tests, 'CASO CRITICO: la imagen limpia debe estimar tasa ~0');

// Sesgo admisible sobre portadora limpia.
const CLEAN_BIAS_LIMIT = 0.04;

for (const seed of [20260917, 4242, 99991]) {
  tests.push([`Portadora natural limpia (semilla ${seed}) => tasa ~0`, () => {
    const { data } = createNaturalImage({ width: WIDTH, height: HEIGHT, seed, noiseSigma: 2 });
    const result = estimate(data);

    assertTrue(result.estimatedRate !== null, 'no produjo estimacion sobre una imagen limpia');
    assertTrue(
      result.estimatedRate < CLEAN_BIAS_LIMIT,
      `esperaba tasa ~0 en una imagen limpia, estimo ${result.estimatedRate}`
    );
  }]);
}

tests.push(['Portadora de camara limpia => tasa ~0', () => {
  const { data } = createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed: 20260917 });
  const result = estimate(data);
  assertTrue(
    result.estimatedRate < CLEAN_BIAS_LIMIT,
    `esperaba tasa ~0, estimo ${result.estimatedRate}`
  );
}]);

tests.push(['Portadora limpia con ruido de sensor alto (sigma=6) => tasa ~0', () => {
  const { data } = createNaturalImage({ width: WIDTH, height: HEIGHT, seed: 31337, noiseSigma: 6 });
  const result = estimate(data);
  assertTrue(
    result.estimatedRate < 0.08,
    `el ruido de sensor no debe confundirse con payload, estimo ${result.estimatedRate}`
  );
}]);

section(tests, 'Exactitud del estimador sobre inyeccion dispersa');

// Inyeccion dispersa: se cumplen los supuestos del metodo y el error medido
// nunca supera 0.009 en el rango 0.02-0.80.
const SPREAD_RATE_TOLERANCE = 0.02;

// Inyeccion secuencial: la extrapolacion de RS modela una tasa HOMOGENEA, y un
// payload secuencial parte el plano en dos regiones heterogeneas, asi que los
// conteos agregados corresponden a una mezcla y el estimador se sesga hacia 0.5.
// Sesgo medido (512x384, semilla 20260917):
//
//      tasa real   0.05   0.15   0.25   0.30   0.35   0.50   0.60   0.70
//      error RS   -0.003 +0.019 +0.051 +0.072 +0.084 -0.005 -0.070 -0.093
//
// Por eso el veredicto toma la longitud del X2 progresivo cuando la inyeccion es
// secuencial, y la tasa de RS/SPA cuando es dispersa.
const SEQUENTIAL_RATE_TOLERANCE = 0.10;

for (const rate of [0.02, 0.05, 0.10, 0.20, 0.35, 0.50, 0.75]) {
  tests.push([`Inyeccion dispersa al ${(rate * 100).toFixed(0)}% => tasa recuperada`, () => {
    const stego = embedLsbRandomSpread(cleanCarrier.data, rate, 99);
    const result = estimate(stego.data);

    assertTrue(result.estimatedRate !== null, 'no produjo estimacion');
    assertClose(result.estimatedRate, stego.rate, SPREAD_RATE_TOLERANCE);
  }]);
}

tests.push(['Saturacion total (100%) se estima alta aunque la cuadratica degenere', () => {
  const stego = embedLsbRandomSpread(cleanCarrier.data, 1.0, 99);
  const result = estimate(stego.data);

  // Cerca de x = 1/2 la extrapolacion pierde condicionamiento y subestima.
  assertTrue(
    result.estimatedRate > 0.85,
    `con la capacidad saturada esperaba tasa > 0.85, estimo ${result.estimatedRate}`
  );
}]);

tests.push(['El estimador es monotono creciente en la tasa real', () => {
  let previous = -Infinity;
  for (const rate of [0, 0.05, 0.15, 0.3, 0.5, 0.7]) {
    const stego = rate === 0
      ? { data: cleanCarrier.data }
      : embedLsbRandomSpread(cleanCarrier.data, rate, 99);
    const current = estimate(stego.data).estimatedRate;
    assertTrue(
      current > previous,
      `la estimacion no crecio al pasar a tasa ${rate}: ${current} <= ${previous}`
    );
    previous = current;
  }
}]);

section(tests, 'Exactitud sobre la inyeccion SECUENCIAL del motor real');

for (const capacityFraction of [0.05, 0.20, 0.50]) {
  tests.push([`Inyeccion secuencial al ${(capacityFraction * 100).toFixed(0)}% de la capacidad`, () => {
    const payloadBytes = Math.floor((TOTAL_SAMPLES / 8) * capacityFraction) - 4;
    const payload = createRandomPayload(payloadBytes, 171);
    const stego = embedLsbSequential(cleanCarrier.data, payload);
    const result = estimate(stego.data);

    // RS estima la fraccion global de muestras usadas, sin asumir localizacion.
    assertClose(result.estimatedRate, stego.embeddedFraction, SEQUENTIAL_RATE_TOLERANCE);
  }]);
}

section(tests, 'COMPLEMENTARIEDAD: RS funciona donde el X2 de PoVs es ciego');

tests.push(['Histograma liso al 30%: RS lo mide (el X2 no puede)', () => {
  // Misma portadora donde el X2 se declara INCONCLUYENTE por histograma liso.
  const payload = createRandomPayload(Math.floor((TOTAL_SAMPLES / 8) * 0.30) - 4, 171);
  const stego = embedLsbSequential(cleanCarrier.data, payload);
  const result = estimate(stego.data);

  assertClose(result.estimatedRate, stego.embeddedFraction, SEQUENTIAL_RATE_TOLERANCE);
  assertTrue(result.channelsUsed === 3, `esperaba los 3 canales utilizables, hubo ${result.channelsUsed}`);
}]);

tests.push(['Gradiente sintetico sin ruido: portadora degenerada, estimacion no espuria', () => {
  // Sin ruido de sensor se violan los supuestos de RS: lo exigible es que no
  // invente un payload, no exactitud.
  const { data } = createSyntheticSmoothImage({ width: WIDTH, height: HEIGHT });
  const result = rsAnalysisRgb(extractChannelPlanes(data), WIDTH, HEIGHT);

  const noPayloadClaimed = result.estimatedRate === null || result.estimatedRate < 0.25;
  assertTrue(
    noPayloadClaimed,
    `sobre un gradiente limpio no debe afirmarse payload, estimo ${result.estimatedRate}`
  );
}]);

section(tests, 'Geometria del diagrama RS predicha por el paper');

tests.push(['Imagen limpia: R_M ~ R_-M y S_M ~ S_-M, con R > S', () => {
  const planes = extractChannelPlanes(cleanCarrier.data);
  const { diagram } = rsAnalysis(planes.red, WIDTH, HEIGHT);

  assertTrue(
    diagram.regularMask > diagram.singularMask,
    'en una imagen natural deben abundar los grupos regulares'
  );
  assertClose(diagram.regularMask, diagram.regularNegatedMask, 0.02);
  assertClose(diagram.singularMask, diagram.singularNegatedMask, 0.02);
}]);

tests.push(['Al inyectar: R_M y S_M convergen, R_-M y S_-M divergen', () => {
  const planes = extractChannelPlanes(cleanCarrier.data);
  const clean = rsAnalysis(planes.red, WIDTH, HEIGHT).diagram;

  const stego = embedLsbRandomSpread(cleanCarrier.data, 0.5, 99);
  const dirty = rsAnalysis(extractChannelPlanes(stego.data).red, WIDTH, HEIGHT).diagram;

  const cleanGapMask = clean.regularMask - clean.singularMask;
  const dirtyGapMask = dirty.regularMask - dirty.singularMask;
  const cleanGapNegated = clean.regularNegatedMask - clean.singularNegatedMask;
  const dirtyGapNegated = dirty.regularNegatedMask - dirty.singularNegatedMask;

  assertTrue(
    dirtyGapMask < cleanGapMask,
    `R_M y S_M debian converger: separacion paso de ${cleanGapMask} a ${dirtyGapMask}`
  );
  assertTrue(
    dirtyGapNegated > cleanGapNegated,
    `R_-M y S_-M debian divergir: separacion paso de ${cleanGapNegated} a ${dirtyGapNegated}`
  );
}]);

section(tests, 'Coherencia entre canales');

tests.push(['Los tres canales concuerdan sobre la misma tasa', () => {
  const stego = embedLsbRandomSpread(cleanCarrier.data, 0.4, 99);
  const result = estimate(stego.data);

  assertTrue(
    result.channelSpread < 0.15,
    `los canales debian concordar, dispersion ${result.channelSpread}`
  );
  for (const channel of ['red', 'green', 'blue']) {
    assertClose(result.perChannel[channel].estimatedRate, stego.rate, 0.10);
  }
}]);

await runSuite('RS ANALYSIS (rsAnalysis.js)', tests);
