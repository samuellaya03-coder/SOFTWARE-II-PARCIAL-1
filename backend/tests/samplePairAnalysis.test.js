/**
 * Validacion de SPA. Como RS, es un estimador de tasa, asi que se mide su
 * exactitud contra tasas conocidas y se comprueba que concuerda con RS: dos
 * metodos independientes que coinciden es la base del veredicto por fusion.
 */

import {
  samplePairAnalysis,
  samplePairAnalysisRgb,
  countSamplePairs
} from '../services/forensics/samplePairAnalysis.js';
import { rsAnalysisRgb } from '../services/forensics/rsAnalysis.js';
import { extractChannelPlanes } from '../services/forensics/samples.js';
import {
  createNaturalImage,
  createCameraPipelineImage,
  createRandomPayload,
  embedLsbRandomSpread,
  embedLsbSequential
} from './fixtures/imageFactory.js';
import { assertClose, assertTrue, runSuite, section } from './harness.js';

const tests = [];

const WIDTH = 512;
const HEIGHT = 384;
const TOTAL_SAMPLES = WIDTH * HEIGHT * 3;

function estimate(rgba) {
  return samplePairAnalysisRgb(extractChannelPlanes(rgba), WIDTH, HEIGHT);
}

const cleanCarrier = createNaturalImage({
  width: WIDTH, height: HEIGHT, seed: 20260917, noiseSigma: 2
});

section(tests, 'Clasificacion de pares');

tests.push(['X, Y y Z particionan el conjunto de pares', () => {
  const planes = extractChannelPlanes(cleanCarrier.data);
  const counts = countSamplePairs(planes.red, WIDTH, HEIGHT);

  assertClose(counts.X + counts.Y + counts.Z, counts.total, 0);
  assertClose(counts.total, Math.floor(WIDTH / 2) * HEIGHT, 0);
}]);

tests.push(['W es un subconjunto de Y', () => {
  const planes = extractChannelPlanes(cleanCarrier.data);
  const counts = countSamplePairs(planes.red, WIDTH, HEIGHT);
  assertTrue(counts.W <= counts.Y, `|W|=${counts.W} deberia ser <= |Y|=${counts.Y}`);
}]);

tests.push(['Clasificacion correcta de pares construidos a mano', () => {
  // (10,12): v par y u < v  => X
  // (12,10): v par y u > v  => Y, y floor(12/2) != floor(10/2) => no W
  // (10,11): v impar y u < v => Y, y floor(10/2) == floor(11/2) => W
  // (11,10): v par y u > v  => Y, y floor(11/2) == floor(10/2) => W
  // (20,20): u = v => Z
  const plane = Uint8Array.from([10, 12, 12, 10, 10, 11, 11, 10, 20, 20]);
  const counts = countSamplePairs(plane, 10, 1);

  assertClose(counts.total, 5, 0);
  assertClose(counts.X, 1, 0);
  assertClose(counts.Y, 3, 0);
  assertClose(counts.Z, 1, 0);
  assertClose(counts.W, 2, 0);
}]);

tests.push(['Imagen demasiado pequena se reporta como no aplicable', () => {
  const result = samplePairAnalysis(new Uint8Array(2), 1, 2);
  assertTrue(!result.applicable, 'acepto una imagen sin pares horizontales');
  assertTrue(result.estimatedRate === null, 'emitio una tasa sobre una imagen no analizable');
}]);

section(tests, 'CASO CRITICO: la imagen limpia debe estimar tasa ~0');

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

section(tests, 'Exactitud sobre inyeccion dispersa');

// Error medido <= 0.019 en el rango 0.01-0.75.
const SPREAD_RATE_TOLERANCE = 0.03;

for (const rate of [0.01, 0.02, 0.05, 0.10, 0.20, 0.35, 0.50, 0.75]) {
  tests.push([`Inyeccion dispersa al ${(rate * 100).toFixed(0)}% => tasa recuperada`, () => {
    const stego = embedLsbRandomSpread(cleanCarrier.data, rate, 99);
    const result = estimate(stego.data);

    assertTrue(result.estimatedRate !== null, 'no produjo estimacion');
    assertClose(result.estimatedRate, stego.rate, SPREAD_RATE_TOLERANCE);
  }]);
}

tests.push(['Sensibilidad a tasas bajas: distingue 1% de imagen limpia', () => {
  // La ventaja de SPA sobre RS es que no extrapola, asi que conserva resolucion
  // donde el payload es diminuto.
  const clean = estimate(cleanCarrier.data).estimatedRate;
  const stego = estimate(embedLsbRandomSpread(cleanCarrier.data, 0.01, 99).data).estimatedRate;

  assertTrue(stego > clean, `esperaba ${stego} > ${clean} con un payload del 1%`);
}]);

tests.push(['Saturacion total (100%) se senala sin ambiguedad', () => {
  const stego = embedLsbRandomSpread(cleanCarrier.data, 1.0, 99);
  const result = estimate(stego.data);
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
    assertTrue(current > previous, `la estimacion no crecio en la tasa ${rate}: ${current} <= ${previous}`);
    previous = current;
  }
}]);

section(tests, 'Inyeccion secuencial del motor real');

// Igual que RS, SPA asume tasa homogenea y se sesga con un payload secuencial.
const SEQUENTIAL_RATE_TOLERANCE = 0.10;

for (const capacityFraction of [0.05, 0.20, 0.50]) {
  tests.push([`Inyeccion secuencial al ${(capacityFraction * 100).toFixed(0)}% de la capacidad`, () => {
    const payload = createRandomPayload(
      Math.floor((TOTAL_SAMPLES / 8) * capacityFraction) - 4, 171
    );
    const stego = embedLsbSequential(cleanCarrier.data, payload);
    const result = estimate(stego.data);

    assertClose(result.estimatedRate, stego.embeddedFraction, SEQUENTIAL_RATE_TOLERANCE);
  }]);
}

section(tests, 'CONCORDANCIA CON RS: dos metodos independientes');

for (const rate of [0.05, 0.20, 0.50]) {
  tests.push([`SPA y RS concuerdan a tasa ${rate}`, () => {
    const stego = embedLsbRandomSpread(cleanCarrier.data, rate, 99);
    const planes = extractChannelPlanes(stego.data);

    const spa = samplePairAnalysisRgb(planes, WIDTH, HEIGHT).estimatedRate;
    const rs = rsAnalysisRgb(planes, WIDTH, HEIGHT).estimatedRate;

    // Concordancia entre dos metodos que no comparten ningun supuesto: SPA mide
    // transiciones entre clases de pares, RS extrapola rugosidad de grupos.
    assertClose(spa, rs, 0.03);
  }]);
}

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

runSuite('SAMPLE PAIR ANALYSIS (samplePairAnalysis.js)', tests);
