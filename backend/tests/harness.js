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

/** Inserta un encabezado de seccion en la lista de pruebas. */
export function section(tests, title) {
  tests.push(['__section__', title]);
}

/**
 * Ejecuta una lista de pruebas [nombre, fn] y marca exitCode 1 si falla alguna.
 * @param {Array<[string, Function]>} tests
 */
export function runSuite(suiteName, tests) {
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
      fn();
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
