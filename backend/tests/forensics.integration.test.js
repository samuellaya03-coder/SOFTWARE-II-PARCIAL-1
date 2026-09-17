/**
 * Validacion de extremo a extremo del analisis forense completo.
 *
 * Las pruebas anteriores validan cada estimador por separado; esta valida la
 * FUSION, que es donde se decide el veredicto. Lo que debe demostrarse:
 *
 *   1. Cero falsos positivos sobre un banco de portadoras limpias variadas.
 *   2. Deteccion sobre portadora de histograma liso, donde el X2 es ciego y solo
 *      RS y SPA sostienen el veredicto.
 *   3. Deteccion sobre portadora de camara con localizacion del payload.
 *   4. Un payload pequeno y secuencial se detecta por localizacion aunque la tasa
 *      global quede bajo el suelo de ruido.
 *   5. Ruido de sensor extremo se reporta como evidencia inconsistente, nunca como
 *      inyeccion.
 */

import { runForensicAnalysis } from '../services/forensics/index.js';
import { VERDICT_STATUS } from '../services/forensics/verdict.js';
import {
  createNaturalImage,
  createCameraPipelineImage,
  createSyntheticSmoothImage,
  createRandomPayload,
  embedLsbRandomSpread,
  embedLsbSequential
} from './fixtures/imageFactory.js';
import { assertClose, assertEquals, assertInRange, assertTrue, runSuite, section } from './harness.js';

const tests = [];

const WIDTH = 512;
const HEIGHT = 384;
const TOTAL_SAMPLES = WIDTH * HEIGHT * 3;

function analyze(rgba) {
  return runForensicAnalysis(rgba, WIDTH, HEIGHT);
}

/** Estego con payload que ocupa `fraction` de la capacidad LSB. */
function sequentialStego(carrierData, fraction, seed = 171) {
  const payloadBytes = Math.floor((TOTAL_SAMPLES / 8) * fraction) - 4;
  const stego = embedLsbSequential(carrierData, createRandomPayload(payloadBytes, seed));
  return { stego, totalEmbeddedBytes: payloadBytes + 4 };
}

section(tests, 'CERO FALSOS POSITIVOS sobre el banco de portadoras limpias');

const cleanCarriers = [
  ...[1, 7, 42, 101, 555, 2024, 20260917, 99991, 31337, 123456].map((seed) => ({
    label: `natural semilla ${seed}`,
    data: createNaturalImage({ width: WIDTH, height: HEIGHT, seed, noiseSigma: 2 }).data
  })),
  ...[0.5, 1, 3, 6].map((noiseSigma) => ({
    label: `natural ruido sigma=${noiseSigma}`,
    data: createNaturalImage({ width: WIDTH, height: HEIGHT, seed: 77, noiseSigma }).data
  })),
  ...[2, 3, 5].map((quantizationStep) => ({
    label: `camara cuantizacion q=${quantizationStep}`,
    data: createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed: 77, quantizationStep }).data
  })),
  {
    label: 'gradiente sintetico sin ruido',
    data: createSyntheticSmoothImage({ width: WIDTH, height: HEIGHT }).data
  }
];

for (const carrier of cleanCarriers) {
  tests.push([`Limpia: ${carrier.label} => no se declara inyeccion`, () => {
    const report = analyze(carrier.data);

    assertTrue(
      !report.verdict.detected,
      `FALSO POSITIVO: veredicto ${report.verdict.status} con tasa ${report.verdict.estimatedRate}`
    );
    assertTrue(
      report.verdict.estimatedPayloadBytes === null,
      `estimo ${report.verdict.estimatedPayloadBytes} bytes de payload en una imagen limpia`
    );
  }]);
}

tests.push(['Las 18 portadoras limpias dan veredicto LIMPIA', () => {
  const nonClean = cleanCarriers
    .map((carrier) => ({ label: carrier.label, status: analyze(carrier.data).verdict.status }))
    .filter((result) => result.status !== VERDICT_STATUS.CLEAN);

  assertTrue(
    nonClean.length === 0,
    `portadoras no clasificadas como LIMPIA: ${nonClean.map((r) => `${r.label}=${r.status}`).join(', ')}`
  );
}]);

section(tests, 'La entropia LSB confirma por que no puede usarse como discriminante');

tests.push(['Una foto limpia ya alcanza entropia LSB ~1.0', () => {
  const report = analyze(createNaturalImage({
    width: WIDTH, height: HEIGHT, seed: 20260917, noiseSigma: 2
  }).data);

  // Este es exactamente el valor que el umbral anterior (H > 0.9985) interpretaba
  // como esteganografia al 95%, sobre una imagen sin payload alguno.
  assertTrue(
    report.entropy.globalLsb > 0.9985,
    `esperaba H ~ 1.0 en una foto limpia, midio ${report.entropy.globalLsb}`
  );
  assertEquals(report.entropy.isDiscriminative, false, 'isDiscriminative');
  assertEquals(report.verdict.status, VERDICT_STATUS.CLEAN, 'veredicto');
}]);

section(tests, 'Deteccion sobre HISTOGRAMA LISO (el X2 es ciego, RS y SPA sostienen)');

const smoothCarrier = createNaturalImage({
  width: WIDTH, height: HEIGHT, seed: 20260917, noiseSigma: 2
});

for (const rate of [0.20, 0.35, 0.50, 0.75]) {
  tests.push([`Dispersa al ${(rate * 100).toFixed(0)}% => detectada sin ayuda del X2`, () => {
    const stego = embedLsbRandomSpread(smoothCarrier.data, rate, 99);
    const report = analyze(stego.data);

    assertTrue(report.verdict.detected, `no detecto una inyeccion al ${rate * 100}%`);
    assertEquals(
      report.estimators.chiSquareProgressive.conclusive, false,
      'el X2 deberia declararse inconcluyente sobre histograma liso'
    );
    assertClose(report.verdict.estimatedRate, stego.rate, 0.04);
  }]);
}

section(tests, 'Deteccion y LOCALIZACION sobre portadora de camara');

const cameraCarrier = createCameraPipelineImage({
  width: WIDTH, height: HEIGHT, seed: 20260917
});

for (const fraction of [0.25, 0.50, 0.75]) {
  tests.push([`Secuencial al ${(fraction * 100).toFixed(0)}% => CONFIRMADA con localizacion`, () => {
    const { stego, totalEmbeddedBytes } = sequentialStego(cameraCarrier.data, fraction);
    const report = analyze(stego.data);

    assertEquals(report.verdict.status, VERDICT_STATUS.CONFIRMED, 'veredicto');
    assertTrue(report.verdict.localization !== null, 'no aporto localizacion del payload');
    assertEquals(report.verdict.payloadSource, 'X2_PROGRESIVO', 'fuente de la estimacion');

    assertInRange(
      report.verdict.estimatedPayloadBytes,
      totalEmbeddedBytes * 0.9,
      totalEmbeddedBytes * 1.12,
      `bytes estimados (reales: ${totalEmbeddedBytes})`
    );
  }]);
}

tests.push(['Payload PEQUENO (2%): la localizacion lo detecta aunque la tasa global no', () => {
  const { stego, totalEmbeddedBytes } = sequentialStego(cameraCarrier.data, 0.02, 4711);
  const report = analyze(stego.data);

  assertTrue(report.verdict.detected, 'no detecto un payload pequeno y secuencial');
  assertTrue(report.verdict.localization !== null, 'no aporto localizacion');

  // La tasa global queda por debajo del umbral de deteccion: es el X2 quien
  // resuelve el caso, que es justamente la complementariedad buscada.
  assertTrue(
    report.verdict.estimatedRate < report.verdict.thresholds.detectionRate,
    `la tasa global no deberia alcanzar el umbral, fue ${report.verdict.estimatedRate}`
  );
  assertInRange(
    report.verdict.estimatedPayloadBytes,
    totalEmbeddedBytes * 0.8,
    totalEmbeddedBytes * 1.3,
    `bytes estimados (reales: ${totalEmbeddedBytes})`
  );
}]);

section(tests, 'El ruido extremo se reporta como inconsistente, no como inyeccion');

tests.push(['Portadora limpia con ruido sigma=10 => nunca INYECCION', () => {
  const { data } = createNaturalImage({
    width: WIDTH, height: HEIGHT, seed: 77, noiseSigma: 10
  });
  const report = analyze(data);

  assertTrue(
    !report.verdict.detected,
    `FALSO POSITIVO con ruido extremo: ${report.verdict.status}`
  );
  // La discordancia entre RS y SPA es la que salva este caso.
  assertTrue(
    report.verdict.evidence.disagreement > 0.05,
    `esperaba discordancia alta entre RS y SPA, fue ${report.verdict.evidence.disagreement}`
  );
}]);

section(tests, 'Estructura del informe');

tests.push(['El informe expone dimensiones, capacidad y los tres estimadores', () => {
  const report = analyze(cameraCarrier.data);

  assertClose(report.dimensions.width, WIDTH, 0);
  assertClose(report.dimensions.totalSamples, TOTAL_SAMPLES, 0);
  assertClose(report.dimensions.maxPayloadCapacityBytes, Math.floor(TOTAL_SAMPLES / 8) - 4, 0);

  assertTrue(report.estimators.chiSquareProgressive.curve.length > 0, 'falta la curva del X2');
  assertTrue(report.estimators.rsAnalysis.perChannel.red.applicable, 'falta RS por canal');
  assertTrue(report.estimators.samplePairAnalysis.perChannel.red.applicable, 'falta SPA por canal');
  assertTrue(report.verdict.findings.length > 0, 'el veredicto no explica su razonamiento');
}]);

tests.push(['Los histogramas tienen 256 niveles y suman el total de pixeles', () => {
  const report = analyze(cameraCarrier.data);

  for (const channel of ['red', 'green', 'blue']) {
    const histogram = report.histograms[channel];
    assertClose(histogram.length, 256, 0);
    assertClose(
      histogram.reduce((sum, count) => sum + count, 0),
      WIDTH * HEIGHT,
      0
    );
  }
}]);

await runSuite('ANALISIS FORENSE DE EXTREMO A EXTREMO (forensics/index.js)', tests);
