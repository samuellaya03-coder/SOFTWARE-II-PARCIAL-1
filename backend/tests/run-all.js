/**
 * Ejecuta todas las suites en procesos separados y agrega el resultado.
 *
 * Procesos separados para que un fallo catastrofico en una suite (un bucle
 * infinito, un crash del runtime) no oculte el resto.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const SUITES = [
  'crypto.test.js',
  'http.security.test.js'
];

const results = [];
let failed = false;

for (const suite of SUITES) {
  const run = spawnSync(process.execPath, [join(here, suite)], { stdio: 'inherit' });
  const ok = run.status === 0;
  if (!ok) failed = true;
  results.push({ suite, ok });
}

console.log('\n' + '='.repeat(74));
console.log(' RESUMEN');
console.log('='.repeat(74));
for (const result of results) {
  console.log(`  ${result.ok ? 'OK   ' : 'FALLO'} ${result.suite}`);
}
console.log('='.repeat(74) + '\n');

process.exit(failed ? 1 : 0);
