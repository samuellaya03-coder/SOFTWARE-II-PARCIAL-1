/**
 * Validacion del pool de worker_threads.
 *
 * Un pool con fallos es peor que no tener pool: un trabajo perdido deja una
 * peticion colgada para siempre. Se comprueba el reparto, la cola, los errores
 * propagados y que el event loop siga libre mientras los workers trabajan.
 */

import { PNG } from 'pngjs';
import { ForensicsPool } from '../services/forensics/pool.js';
import { VERDICT_STATUS } from '../services/forensics/verdict.js';
import {
  createCameraPipelineImage,
  createRandomPayload,
  embedLsbSequential
} from './fixtures/imageFactory.js';
import {
  assertClose, assertEquals, assertRejects, assertTrue,
  measureEventLoopBlocking, runSuite, section
} from './harness.js';

const tests = [];

const WIDTH = 320;
const HEIGHT = 240;
const TOTAL_SAMPLES = WIDTH * HEIGHT * 3;

/** Codifica un búfer RGBA como PNG. */
function toPng(rgba) {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  rgba.copy(png.data);
  return PNG.sync.write(png);
}

const carrier = createCameraPipelineImage({ width: WIDTH, height: HEIGHT, seed: 20260917 });
const cleanPng = toPng(carrier.data);

const payloadBytes = Math.floor((TOTAL_SAMPLES / 8) * 0.3) - 4;
const stegoPng = toPng(embedLsbSequential(carrier.data, createRandomPayload(payloadBytes, 171)).data);

const pool = new ForensicsPool({ size: 2 });

section(tests, 'Analisis a traves del pool');

tests.push(['Un PNG limpio devuelve veredicto LIMPIA', async () => {
  const report = await pool.analyze(cleanPng);
  assertEquals(report.verdict.status, VERDICT_STATUS.CLEAN, 'veredicto');
  assertClose(report.dimensions.width, WIDTH, 0);
  assertClose(report.dimensions.height, HEIGHT, 0);
}]);

tests.push(['Un PNG esteganografiado devuelve INYECCION_CONFIRMADA', async () => {
  const report = await pool.analyze(stegoPng);
  assertEquals(report.verdict.status, VERDICT_STATUS.CONFIRMED, 'veredicto');
  assertTrue(report.verdict.localization !== null, 'no aporto localizacion');
}]);

tests.push(['El informe del worker es identico al del hilo principal', async () => {
  const { runForensicAnalysis } = await import('../services/forensics/index.js');
  const direct = runForensicAnalysis(
    embedLsbSequential(carrier.data, createRandomPayload(payloadBytes, 171)).data,
    WIDTH, HEIGHT
  );
  const viaPool = await pool.analyze(stegoPng);

  // elapsedMs difiere legitimamente entre ejecuciones; el resto debe coincidir.
  assertEquals(viaPool.verdict.status, direct.verdict.status, 'veredicto');
  assertEquals(viaPool.verdict.estimatedRate, direct.verdict.estimatedRate, 'tasa');
  assertEquals(
    viaPool.verdict.estimatedPayloadBytes, direct.verdict.estimatedPayloadBytes,
    'bytes estimados'
  );
  assertEquals(viaPool.entropy.globalLsb, direct.entropy.globalLsb, 'entropia');
}]);

section(tests, 'Concurrencia y cola');

tests.push(['Mas trabajos que workers: todos se completan', async () => {
  // 6 trabajos sobre 2 workers obliga a usar la cola.
  const reports = await Promise.all(
    Array.from({ length: 6 }, (_, index) => pool.analyze(index % 2 === 0 ? cleanPng : stegoPng))
  );

  assertClose(reports.length, 6, 0);
  for (let index = 0; index < reports.length; index++) {
    const expected = index % 2 === 0 ? VERDICT_STATUS.CLEAN : VERDICT_STATUS.CONFIRMED;
    assertEquals(reports[index].verdict.status, expected, `veredicto del trabajo ${index}`);
  }
}]);

tests.push(['El pool queda vacio tras completar la carga', () => {
  const stats = pool.stats();
  assertClose(stats.size, 2, 0);
  assertClose(stats.busy, 0, 0);
  assertClose(stats.queued, 0, 0);
}]);

tests.push(['El event loop sigue libre mientras los workers analizan', async () => {
  const { maxGapMs, elapsedMs } = await measureEventLoopBlocking(
    () => Promise.all(Array.from({ length: 8 }, () => pool.analyze(stegoPng)))
  );

  // Ejecutando el analisis en el hilo principal el hueco seria del orden de
  // elapsedMs; con los workers debe quedarse cerca del intervalo del temporizador.
  assertTrue(
    maxGapMs < 25,
    `el event loop quedo bloqueado ${maxGapMs.toFixed(1)} ms durante ${elapsedMs.toFixed(0)} ms de analisis`
  );
}]);

section(tests, 'Errores');

tests.push(['Un PNG invalido se rechaza marcado como error de decodificacion', async () => {
  const error = await assertRejects(
    () => pool.analyze(Buffer.from('esto no es un PNG')),
    'acepto datos que no son PNG'
  );
  assertEquals(error.isDecodeError, true, 'isDecodeError');
}]);

tests.push(['Un error de un trabajo no inutiliza el pool', async () => {
  await assertRejects(() => pool.analyze(Buffer.from('basura')), 'acepto basura');

  // El siguiente trabajo debe funcionar con normalidad.
  const report = await pool.analyze(cleanPng);
  assertEquals(report.verdict.status, VERDICT_STATUS.CLEAN, 'veredicto tras el error');
}]);

tests.push(['El búfer de entrada del llamante no se corrompe al transferirse', async () => {
  // El pool copia a un ArrayBuffer propio antes de transferir: los Buffer de Node
  // comparten un pool interno y transferirlo invalidaria búferes ajenos.
  const original = Buffer.from(cleanPng);
  await pool.analyze(cleanPng);

  assertEquals(cleanPng.length, original.length, 'longitud del búfer');
  assertTrue(cleanPng.equals(original), 'el búfer del llamante fue alterado');
}]);

section(tests, 'Cierre');

tests.push(['Tras cerrar, el pool rechaza nuevos trabajos', async () => {
  const localPool = new ForensicsPool({ size: 1 });
  await localPool.analyze(cleanPng);
  await localPool.close();

  await assertRejects(() => localPool.analyze(cleanPng), 'acepto un trabajo con el pool cerrado');
}]);

tests.push(['Un trabajo que excede el tiempo limite se rechaza', async () => {
  const impatientPool = new ForensicsPool({ size: 1, jobTimeoutMs: 1 });
  try {
    await assertRejects(
      () => impatientPool.analyze(stegoPng),
      'no aplico el tiempo limite'
    );
  } finally {
    await impatientPool.close();
  }
}]);

await runSuite('POOL DE WORKERS (forensics/pool.js)', tests);

// Sin cerrar el pool los workers mantendrian vivo el proceso.
await pool.close();
