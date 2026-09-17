/**
 * Mide el retardo del event loop del servidor bajo carga concurrente.
 *
 * El retardo se mide DENTRO del proceso servidor con un temporizador de
 * intervalo fijo: si el bucle esta libre, cada tick llega a su hora; si una
 * operacion sincrona lo ocupa, el tick se retrasa exactamente ese tiempo. Es la
 * metrica que importa, porque un event loop bloqueado no solo ralentiza la
 * peticion en curso: congela TODAS las demas, incluido el health check.
 *
 * Uso:  node tests/benchmark-eventloop.js
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, '..');

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;

const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

/** Percentil de una muestra ya ordenable. */
function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

function formatMs(value) {
  return `${value.toFixed(1)} ms`.padStart(10);
}

async function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {
      // El servidor todavia no escucha.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('El servidor no respondio dentro del tiempo previsto.');
}

/**
 * Sondea /api/health a intervalo fijo mientras corre la carga. La latencia de
 * esas sondas es el sintoma observable del bloqueo: un health check debe
 * responder en microsegundos.
 */
function startHealthProbe(intervalMs = 25) {
  const latencies = [];
  let running = true;

  const loop = (async () => {
    while (running) {
      const started = process.hrtime.bigint();
      try {
        await fetch(`${BASE}/api/health`);
        latencies.push(Number(process.hrtime.bigint() - started) / 1e6);
      } catch {
        // Una sonda fallida no invalida la medicion del resto.
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  })();

  return {
    async stop() {
      running = false;
      await loop;
      return latencies;
    }
  };
}

/** Lanza `count` peticiones simultaneas y devuelve sus latencias. */
async function fireConcurrent(count, requestFactory) {
  const results = await Promise.all(
    Array.from({ length: count }, async () => {
      const started = process.hrtime.bigint();
      try {
        const res = await requestFactory();
        await res.arrayBuffer();
        return Number(process.hrtime.bigint() - started) / 1e6;
      } catch {
        return null;
      }
    })
  );
  return results.filter((value) => value !== null);
}

async function measure(label, concurrency, requestFactory) {
  const probe = startHealthProbe();
  const started = process.hrtime.bigint();

  const latencies = await fireConcurrent(concurrency, requestFactory);

  const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
  const probeLatencies = await probe.stop();

  console.log(`\n${BOLD}${label}${RESET} ${DIM}(${concurrency} peticiones simultaneas)${RESET}`);
  console.log(`  Completadas            ${String(latencies.length).padStart(7)} / ${concurrency}`);
  console.log(`  Duracion total        ${formatMs(wallMs)}`);
  console.log(`  Latencia p50          ${formatMs(percentile(latencies, 50))}`);
  console.log(`  Latencia p99          ${formatMs(percentile(latencies, 99))}`);
  console.log(`  ${YELLOW}Health check p50      ${formatMs(percentile(probeLatencies, 50))}${RESET}`);
  console.log(`  ${YELLOW}Health check p99      ${formatMs(percentile(probeLatencies, 99))}  <- sintoma de bloqueo${RESET}`);
  console.log(`  ${DIM}sondas de salud: ${probeLatencies.length}${RESET}`);

  return {
    label,
    wallMs,
    requestP50: percentile(latencies, 50),
    requestP99: percentile(latencies, 99),
    healthP50: percentile(probeLatencies, 50),
    healthP99: percentile(probeLatencies, 99)
  };
}

/** Construye un PNG de prueba con inyeccion conocida. */
async function buildTestPng() {
  const { PNG } = await import('pngjs');
  const { createCameraPipelineImage, createRandomPayload, embedLsbSequential } =
    await import('./fixtures/imageFactory.js');

  const width = 640;
  const height = 480;
  const totalSamples = width * height * 3;

  const carrier = createCameraPipelineImage({ width, height, seed: 20260917 });
  const payload = createRandomPayload(Math.floor((totalSamples / 8) * 0.3) - 4, 171);
  const stego = embedLsbSequential(carrier.data, payload);

  const png = new PNG({ width, height });
  stego.data.copy(png.data);
  return PNG.sync.write(png);
}

const server = spawn(process.execPath, [join(backendRoot, 'server.js')], {
  cwd: backendRoot,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'ignore', 'inherit']
});

try {
  await waitForServer();

  console.log(`\n${BOLD}${CYAN}${'='.repeat(74)}${RESET}`);
  console.log(`${BOLD}${CYAN} RETARDO DEL EVENT LOOP BAJO CARGA${RESET}`);
  console.log(`${BOLD}${CYAN}${'='.repeat(74)}${RESET}`);
  console.log(`${DIM} Un health check debe responder en microsegundos. Si su p99 se dispara,${RESET}`);
  console.log(`${DIM} el event loop esta bloqueado y el servidor entero deja de atender.${RESET}`);

  const pngBuffer = await buildTestPng();
  console.log(`${DIM} PNG de prueba: ${(pngBuffer.length / 1024).toFixed(0)} KB, 640x480 con 30% inyectado${RESET}`);

  const results = [];

  results.push(await measure('POST /api/crypto/encrypt', 12, () => fetch(`${BASE}/api/crypto/encrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plaintext: 'dato confidencial de prueba', password: 'ClaveDePrueba#2026' })
  })));

  results.push(await measure('GET /api/crypto/rsa/keygen', 6, () => fetch(`${BASE}/api/crypto/rsa/keygen`)));

  results.push(await measure('POST /api/analyze/image', 8, () => {
    const form = new FormData();
    form.append('image', new Blob([pngBuffer], { type: 'image/png' }), 'muestra.png');
    return fetch(`${BASE}/api/analyze/image`, { method: 'POST', body: form });
  }));

  console.log(`\n${BOLD}${'-'.repeat(74)}${RESET}`);
  console.log(`${BOLD} RESUMEN${RESET}`);
  console.log(`${BOLD}${'-'.repeat(74)}${RESET}`);
  console.log(' Endpoint                        req p99     health p50    health p99');
  for (const result of results) {
    console.log(
      ` ${result.label.padEnd(30)}`
      + `${result.requestP99.toFixed(0).padStart(8)} ms`
      + `${result.healthP50.toFixed(1).padStart(11)} ms`
      + `${result.healthP99.toFixed(1).padStart(12)} ms`
    );
  }
  console.log(`${BOLD}${'-'.repeat(74)}${RESET}\n`);
} finally {
  server.kill();
}
