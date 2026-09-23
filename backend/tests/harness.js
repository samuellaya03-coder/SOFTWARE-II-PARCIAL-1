/**
 * Runner de pruebas sin dependencias, con codigo de salida distinto de cero
 * cuando algo falla para que el CI pueda romper la build.
 */

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

export class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Compara dos numeros con tolerancia absoluta o relativa.
 * @param {{ relative?: boolean }} [options]
 */
export function assertClose(actual, expected, tolerance, options = {}) {
  if (!Number.isFinite(actual)) {
    throw new AssertionError(`esperaba un número finito, obtuve ${actual}`);
  }

  const diff = Math.abs(actual - expected);
  const scale = options.relative ? Math.max(Math.abs(expected), Number.MIN_VALUE) : 1;

  if (diff > tolerance * scale) {
    const kind = options.relative ? 'relativo' : 'absoluto';
    throw new AssertionError(
      `esperaba ${expected}, obtuve ${actual} `
      + `(error ${kind} ${(diff / scale).toExponential(3)} > ${tolerance.toExponential(3)})`
    );
  }
}

/** Verifica que un valor cae en el intervalo cerrado [low, high]. */
export function assertInRange(actual, low, high, label = 'valor') {
  if (!Number.isFinite(actual)) {
    throw new AssertionError(`${label}: esperaba un número finito, obtuve ${actual}`);
  }
  if (actual < low || actual > high) {
    throw new AssertionError(`${label}: ${actual} fuera del rango [${low}, ${high}]`);
  }
}

/** Igualdad estricta, para cadenas, booleanos y null. */
export function assertEquals(actual, expected, label = 'valor') {
  if (actual !== expected) {
    throw new AssertionError(
      `${label}: esperaba ${JSON.stringify(expected)}, obtuve ${JSON.stringify(actual)}`
    );
  }
}

export function assertTrue(condition, message) {
  if (!condition) {
    throw new AssertionError(message || 'la condición resultó falsa');
  }
}

export function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new AssertionError(message || 'esperaba que lanzara una excepción y no lo hizo');
  }
}

/**
 * Equivalente asincrono: verifica que una promesa se rechace.
 * @param {() => Promise<unknown>} fn
 * @returns {Promise<Error>} El error capturado, para poder inspeccionar su mensaje.
 */
export async function assertRejects(fn, message) {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new AssertionError(message || 'esperaba que la promesa se rechazara y se resolvió');
}

/** Inserta un encabezado de seccion en la lista de pruebas. */
export function section(tests, title) {
  tests.push(['__section__', title]);
}

/**
 * Ejecuta `fn` midiendo cuanto tiempo queda bloqueado el event loop.
 *
 * La metrica util es el HUECO MAXIMO entre ticks de un temporizador de intervalo
 * fijo, no el numero de ticks: contar ticks confunde "el bucle estaba bloqueado"
 * con "el trabajo termino rapido". Si el bucle esta libre el hueco se mantiene
 * cerca del intervalo; si algo lo bloquea, el hueco mide exactamente ese bloqueo.
 *
 * @param {() => Promise<unknown>} fn
 * @param {number} [intervalMs=4]
 * @returns {Promise<{ maxGapMs: number, ticks: number, elapsedMs: number, result: unknown }>}
 */
export async function measureEventLoopBlocking(fn, intervalMs = 4) {
  const gaps = [];
  let last = process.hrtime.bigint();

  const timer = setInterval(() => {
    const now = process.hrtime.bigint();
    gaps.push(Number(now - last) / 1e6);
    last = now;
  }, intervalMs);

  const started = process.hrtime.bigint();
  let result;
  try {
    result = await fn();
  } finally {
    clearInterval(timer);
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  // Sin ningun tick no hay medicion: se reporta el intervalo completo como hueco.
  const maxGapMs = gaps.length > 0 ? Math.max(...gaps) : elapsedMs;

  return { maxGapMs, ticks: gaps.length, elapsedMs, result };
}

/**
 * Ejecuta una lista de pruebas [nombre, fn] y marca exitCode 1 si falla alguna.
 * Las funciones pueden ser sincronas o asincronas; se esperan en serie para que
 * la salida conserve el orden y las mediciones no se solapen.
 * @param {Array<[string, Function]>} tests
 */
export async function runSuite(suiteName, tests) {
  console.log(`\n${BOLD}${CYAN}${'='.repeat(74)}${RESET}`);
  console.log(`${BOLD}${CYAN} ${suiteName}${RESET}`);
  console.log(`${BOLD}${CYAN}${'='.repeat(74)}${RESET}`);

  let passed = 0;
  const failures = [];
  const started = process.hrtime.bigint();

  for (const [name, fn] of tests) {
    if (name === '__section__') {
      console.log(`\n${YELLOW}> ${fn}${RESET}`);
      continue;
    }

    try {
      await fn();
      passed++;
      console.log(`  ${GREEN}OK${RESET} ${DIM}${name}${RESET}`);
    } catch (error) {
      failures.push({ name, error });
      console.log(`  ${RED}FALLO ${name}${RESET}`);
      console.log(`    ${RED}${error.message}${RESET}`);
    }
  }

  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  console.log(`\n${BOLD}${'-'.repeat(74)}${RESET}`);
  if (failures.length === 0) {
    console.log(`${GREEN}${BOLD} ${passed} pruebas superadas${RESET} ${DIM}en ${elapsedMs.toFixed(0)} ms${RESET}`);
  } else {
    console.log(`${RED}${BOLD} ${failures.length} FALLIDAS${RESET}, ${passed} superadas ${DIM}en ${elapsedMs.toFixed(0)} ms${RESET}`);
    process.exitCode = 1;
  }
  console.log(`${BOLD}${'-'.repeat(74)}${RESET}\n`);

  return { passed, failed: failures.length };
}
