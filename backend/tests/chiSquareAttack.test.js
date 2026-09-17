/**
 * Validacion del ataque X2 progresivo contra imagenes de verdad conocida:
 *  1. No produce falsos positivos sobre una foto limpia.
 *  2. Mide la longitud del payload, no solo lo detecta.
 *  3. El X2 global es ciego a payloads pequenos; el progresivo no.
 *  4. Sobre histograma liso se declara INCONCLUYENTE en vez de inventar veredicto.
 */

import { progressiveChiSquareAttack, chiSquarePoV } from '../services/forensics/chiSquareAttack.js';
import { extractInterleavedRgbStream } from '../services/forensics/samples.js';
import {
  createNaturalImage,
  createCameraPipelineImage,
  createRandomPayload,
  embedLsbSequential
} from './fixtures/imageFactory.js';
import { assertClose, assertEquals, assertInRange, assertTrue, runSuite, section } from './harness.js';

const tests = [];

const WIDTH = 320;
const HEIGHT = 240;
const TOTAL_SAMPLES = WIDTH * HEIGHT * 3;

/** Ejecuta el ataque sobre un búfer RGBA ya preparado. */
function attack(rgbaBuffer, options) {
  return progressiveChiSquareAttack(extractInterleavedRgbStream(rgbaBuffer), options);
}

/** Construye un estego con un payload que ocupa `fraction` de la capacidad LSB. */
function buildStego(carrierData, fraction, payloadSeed = 555) {
  const payloadBytes = Math.floor((TOTAL_SAMPLES / 8) * fraction) - 4;
  const payload = createRandomPayload(payloadBytes, payloadSeed);
  const stego = embedLsbSequential(carrierData, payload);
  return { stego, payloadBytes, totalEmbeddedBytes: payloadBytes + 4 };
}

section(tests, 'Estadistico X2 de PoVs: comportamiento sobre histogramas construidos');

tests.push(['Pares perfectamente equilibrados => X2 = 0 (firma de inyeccion)', () => {
  const histogram = new Int32Array(256);
  for (let k = 0; k < 128; k++) {
    histogram[2 * k] = 500;
    histogram[2 * k + 1] = 500;
  }
  const result = chiSquarePoV(histogram);
  assertClose(result.chiSquare, 0, 1e-12);
  assertClose(result.reducedChiSquare, 0, 1e-12);
  assertClose(result.degreesOfFreedom, 128, 0);
  assertClose(result.pValue, 1, 1e-12);
}]);

tests.push(['Pares maximamente desequilibrados => p = 0 (firma de imagen limpia)', () => {
  const histogram = new Int32Array(256);
  for (let k = 0; k < 128; k++) {
    histogram[2 * k] = 1000;
    histogram[2 * k + 1] = 8;
  }
  const result = chiSquarePoV(histogram);
  assertTrue(result.reducedChiSquare > 100, `X2/df deberia ser enorme, fue ${result.reducedChiSquare}`);
  assertTrue(result.pValue < 1e-12, `p deberia ser ~0, fue ${result.pValue}`);
}]);

tests.push(['Un par con reparto binomial exacto aporta X2_k = 1 por grado de libertad', () => {
  // Con m_k = 400 y desviacion de sqrt(m_k)/2 = 10 respecto al reparto 50/50,
  // el termino vale (2*10)^2 / 400 = 1, que es el valor esperado bajo H0.
  const histogram = new Int32Array(256);
  histogram[0] = 210;
  histogram[1] = 190;
  const result = chiSquarePoV(histogram);
  assertClose(result.chiSquare, 1, 1e-12);
  assertClose(result.degreesOfFreedom, 1, 0);
}]);

tests.push(['El estadistico clasico de Westfeld vale exactamente la mitad', () => {
  const histogram = new Int32Array(256);
  for (let k = 0; k < 128; k++) {
    histogram[2 * k] = 400 + k * 3;
    histogram[2 * k + 1] = 380 + k * 5;
  }
  const result = chiSquarePoV(histogram);
  // Se reconstruye la suma del paper para comprobar la identidad declarada.
  let halfStatistic = 0;
  for (let k = 0; k < 128; k++) {
    const nEven = histogram[2 * k];
    const nOdd = histogram[2 * k + 1];
    const expected = (nEven + nOdd) / 2;
    const deviation = nEven - expected;
    halfStatistic += (deviation * deviation) / expected;
  }
  assertClose(halfStatistic, result.chiSquare / 2, 1e-9, { relative: true });
}]);

tests.push(['Pares con esperanza < 4 quedan excluidos de la suma', () => {
  const histogram = new Int32Array(256);
  for (let k = 0; k < 128; k++) {
    const usable = k < 20;
    histogram[2 * k] = usable ? 60 : 1;
    histogram[2 * k + 1] = usable ? 40 : 0;
  }
  const result = chiSquarePoV(histogram);
  assertClose(result.usablePairs, 20, 0);
  assertClose(result.degreesOfFreedom, 20, 0);
}]);

section(tests, 'CASO CRITICO: la fotografia limpia no debe dar falso positivo');

for (const seed of [20260917, 4242, 99991]) {
  tests.push([`Portadora de camara limpia (semilla ${seed}) => sin deteccion`, () => {
    const { data } = createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed });
    const result = attack(data);

    assertTrue(result.conclusive, `el ataque deberia ser concluyente, fue ${result.status}`);
    assertClose(result.embeddedFraction, 0, 1e-12);
    assertTrue(!result.sequentialEmbeddingDetected, 'declaro inyeccion en una imagen limpia');
    assertClose(result.estimatedEmbeddedBytes, 0, 0);
  }]);
}

tests.push(['Portadora limpia con ruido de sensor alto (sigma=6) => sin deteccion', () => {
  const { data } = createCameraPipelineImage({
    width: WIDTH, height: HEIGHT, seed: 31337, noiseSigma: 6
  });
  const result = attack(data);
  assertTrue(!result.sequentialEmbeddingDetected, 'declaro inyeccion con ruido de sensor alto');
}]);

tests.push(['Portadora limpia con cuantizacion suave (q=2) => sin deteccion', () => {
  const { data } = createCameraPipelineImage({
    width: WIDTH, height: HEIGHT, seed: 20260917, quantizationStep: 2
  });
  const result = attack(data);
  assertTrue(result.conclusive, `esperaba concluyente, fue ${result.status}`);
  assertTrue(!result.sequentialEmbeddingDetected, 'declaro inyeccion en una imagen limpia');
}]);

section(tests, 'Medicion de la longitud del payload inyectado');

// Resolucion de la curva: 1/steps = ~0.78 puntos porcentuales con 128 pasos.
const FRACTION_TOLERANCE = 0.02;

for (const capacityFraction of [0.05, 0.10, 0.25, 0.50, 0.90]) {
  tests.push([`Inyeccion secuencial al ${(capacityFraction * 100).toFixed(0)}% de la capacidad`, () => {
    const carrier = createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed: 20260917 });
    const { stego, totalEmbeddedBytes } = buildStego(carrier.data, capacityFraction);
    const result = attack(stego.data);

    assertTrue(result.conclusive, `el ataque deberia ser concluyente, fue ${result.status}`);
    assertTrue(result.sequentialEmbeddingDetected, 'no detecto una inyeccion real');
    assertClose(result.embeddedFraction, stego.embeddedFraction, FRACTION_TOLERANCE);

    assertInRange(
      result.estimatedEmbeddedBytes,
      totalEmbeddedBytes * 0.9,
      totalEmbeddedBytes * 1.12,
      `bytes estimados (reales: ${totalEmbeddedBytes})`
    );
  }]);
}

tests.push(['Payload diminuto (0.5% de la capacidad) sigue siendo localizable', () => {
  const carrier = createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed: 20260917 });
  const { stego } = buildStego(carrier.data, 0.005, 4711);
  const result = attack(stego.data, { steps: 512, minSamples: 1024 });

  assertTrue(result.sequentialEmbeddingDetected, 'no detecto un payload pequeno');
  assertClose(result.embeddedFraction, stego.embeddedFraction, 0.01);
}]);

section(tests, 'JUSTIFICACION DEL REDISENO: el X2 global es ciego, el progresivo no');

tests.push(['Payload del 6%: invisible al X2 global, localizado por la curva', () => {
  const carrier = createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed: 20260917 });
  const { stego } = buildStego(carrier.data, 0.06, 313);
  const result = attack(stego.data);

  // El 94% natural domina la suma y mantiene X2/df sobre el umbral.
  assertTrue(
    result.globalReducedChiSquare > result.balanceThreshold * 10,
    `se esperaba que el X2 global fuese ciego, pero dio X2/df=${result.globalReducedChiSquare}`
  );
  assertTrue(
    result.globalPValue < 1e-6,
    `el p-value global deberia ser ~0, fue ${result.globalPValue}`
  );

  // La curva, en cambio, localiza el prefijo inyectado.
  assertTrue(result.sequentialEmbeddingDetected, 'la version progresiva tambien fallo');
  assertClose(result.embeddedFraction, stego.embeddedFraction, FRACTION_TOLERANCE);
}]);

tests.push(['La curva rompe justo en el borde del payload', () => {
  const carrier = createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed: 20260917 });
  const { stego } = buildStego(carrier.data, 0.30, 171);
  const result = attack(stego.data);
  const valid = result.curve.filter((point) => point.valid);

  const insideEdge = valid.filter((point) => point.fraction < stego.embeddedFraction * 0.9);
  const outsideEdge = valid.filter((point) => point.fraction > stego.embeddedFraction * 1.2);

  assertTrue(insideEdge.length > 0 && outsideEdge.length > 0, 'la curva no cubre ambos lados del borde');
  assertTrue(
    insideEdge.every((point) => point.reducedChiSquare <= result.balanceThreshold),
    'dentro de la region inyectada X2/df deberia mantenerse en el regimen equilibrado'
  );
  assertTrue(
    outsideEdge.every((point) => point.reducedChiSquare > result.balanceThreshold * 3),
    'pasado el borde X2/df deberia dispararse'
  );
}]);

section(tests, 'RECONOCIMIENTO DEL LIMITE: portadoras de histograma liso');

tests.push(['Histograma liso limpio => INCONCLUYENTE, nunca falso positivo', () => {
  const { data } = createNaturalImage({ width: WIDTH, height: HEIGHT, seed: 20260917, noiseSigma: 2 });
  const result = attack(data);

  assertTrue(!result.conclusive, 'se declaro concluyente sobre un histograma liso');
  assertEquals(result.status, 'INCONCLUYENTE_HISTOGRAMA_LISO', 'status');
  assertTrue(result.embeddedFraction === null, 'emitio una fraccion pese a ser inconcluyente');
  assertTrue(!result.sequentialEmbeddingDetected, 'declaro inyeccion sin poder distinguirla');
  assertTrue(
    result.tailReducedChiSquare < 10,
    `la cola deberia delatar el histograma liso, midio ${result.tailReducedChiSquare}`
  );
}]);

tests.push(['Histograma liso CON payload => tambien INCONCLUYENTE, no falso negativo silencioso', () => {
  const carrier = createNaturalImage({ width: WIDTH, height: HEIGHT, seed: 20260917, noiseSigma: 2 });
  const { stego } = buildStego(carrier.data, 0.30, 171);
  const result = attack(stego.data);

  // Lo dice explicitamente en vez de devolver "limpio" y dejar pasar el payload.
  assertTrue(!result.conclusive, 'se declaro concluyente sobre un histograma liso');
  assertTrue(
    result.reason.includes('RS Analysis'),
    'la explicacion deberia delegar el veredicto a los estimadores robustos'
  );
}]);

section(tests, 'Robustez de la curva');

tests.push(['Los puntos con muy pocas muestras se marcan como no validos', () => {
  const { data } = createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed: 7 });
  const result = attack(data, { steps: 128, minSamples: 100000 });
  const invalid = result.curve.filter((point) => !point.valid);

  assertTrue(invalid.length > 0, 'ningun punto quedo marcado como no valido');
  assertTrue(
    invalid.every((point) => point.sampleCount < 100000),
    'se marco como no valido un punto que si alcanzaba el minimo de muestras'
  );
}]);

tests.push(['Flujo demasiado corto se rechaza sin romperse', () => {
  const result = progressiveChiSquareAttack(new Uint8Array(100));
  assertTrue(!result.applicable, 'acepto un flujo por debajo del minimo');
  assertEquals(result.status, 'FLUJO_INSUFICIENTE', 'status');
  assertTrue(result.curve.length === 0, 'genero puntos de curva sobre un flujo insuficiente');
}]);

tests.push(['Flujo vacio no rompe el estimador', () => {
  const result = progressiveChiSquareAttack(new Uint8Array(0));
  assertTrue(!result.applicable, 'acepto un flujo vacio');
  assertTrue(result.embeddedFraction === null, 'emitio una fraccion sobre un flujo vacio');
}]);

tests.push(['La curva entrega exactamente el numero de puntos solicitado', () => {
  const { data } = createCameraPipelineImage({ width: 160, height: 120, seed: 11 });
  const result = attack(data, { steps: 64 });
  assertClose(result.curve.length, 64, 0);
  assertClose(result.curve[63].fraction, 1, 1e-9);
}]);

await runSuite('ATAQUE X2 PROGRESIVO (chiSquareAttack.js)', tests);
