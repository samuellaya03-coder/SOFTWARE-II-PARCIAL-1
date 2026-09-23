/**
 * Validacion del endurecimiento HTTP contra un servidor real.
 *
 * Levanta el servidor en un puerto aparte con una configuracion estricta y le
 * hace peticiones de verdad. Comprobar las cabeceras y los limites leyendo el
 * codigo no sirve: lo que importa es lo que el servidor responde.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import { createNaturalImage } from './fixtures/imageFactory.js';
import { assertClose, assertEquals, assertTrue, runSuite, section } from './harness.js';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const PORT = 3998;
const BASE = `http://localhost:${PORT}`;
const ALLOWED_ORIGIN = 'http://localhost:5173';

// Cupos bajos a proposito, para que el limitador se pueda provocar en la prueba.
const server = spawn(process.execPath, [join(backendRoot, 'server.js')], {
  cwd: backendRoot,
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'test',
    CORS_ORIGINS: ALLOWED_ORIGIN,
    MAX_JSON_MB: '1',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX: '200',
    RATE_LIMIT_HEAVY_MAX: '5',
    FORENSICS_WORKERS: '1'
  },
  stdio: ['ignore', 'ignore', 'inherit']
});

async function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // Todavia no escucha.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('El servidor no arranco dentro del tiempo previsto.');
}

await waitForServer();

const tests = [];

section(tests, 'Cabeceras de seguridad');

tests.push(['La respuesta trae las cabeceras de helmet', async () => {
  const res = await fetch(`${BASE}/api/health`);

  assertEquals(res.headers.get('x-content-type-options'), 'nosniff', 'X-Content-Type-Options');
  assertEquals(res.headers.get('x-frame-options'), 'SAMEORIGIN', 'X-Frame-Options');
  assertEquals(res.headers.get('referrer-policy'), 'no-referrer', 'Referrer-Policy');
  assertTrue(
    res.headers.get('content-security-policy')?.includes("default-src 'none'"),
    `CSP inesperada: ${res.headers.get('content-security-policy')}`
  );
}]);

tests.push(['No se revela la tecnologia del servidor', async () => {
  const res = await fetch(`${BASE}/api/health`);
  assertEquals(res.headers.get('x-powered-by'), null, 'X-Powered-By');
}]);

section(tests, 'CORS restringido');

tests.push(['Un origen autorizado recibe la cabecera de permiso', async () => {
  const res = await fetch(`${BASE}/api/health`, { headers: { Origin: ALLOWED_ORIGIN } });
  assertEquals(res.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN, 'origen permitido');
}]);

tests.push(['Un origen ajeno se rechaza con 403', async () => {
  const res = await fetch(`${BASE}/api/health`, { headers: { Origin: 'https://sitio-malicioso.example' } });
  assertClose(res.status, 403, 0);

  const body = await res.json();
  assertTrue(
    body.error.includes('CORS'),
    `esperaba un error de CORS, obtuve: ${body.error}`
  );
}]);

tests.push(['Una peticion sin cabecera Origin se acepta (curl, mismo origen)', async () => {
  const res = await fetch(`${BASE}/api/health`);
  assertClose(res.status, 200, 0);
}]);

section(tests, 'Validacion del cuerpo');

const INVALID_BODIES = [
  { label: 'campos ausentes', body: {}, field: 'plaintext' },
  { label: 'contrasena vacia', body: { plaintext: 'x', password: '' }, field: 'password' },
  { label: 'tipo incorrecto', body: { plaintext: 123, password: 'x' }, field: 'plaintext' }
];

for (const target of INVALID_BODIES) {
  tests.push([`/encrypt rechaza ${target.label} con detalle del campo`, async () => {
    const res = await fetch(`${BASE}/api/crypto/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(target.body)
    });

    assertClose(res.status, 400, 0);
    const body = await res.json();
    assertTrue(Array.isArray(body.details), 'la respuesta no detalla los campos invalidos');
    assertTrue(
      body.details.some((detail) => detail.field === target.field),
      `esperaba un detalle sobre "${target.field}", obtuve ${JSON.stringify(body.details)}`
    );
  }]);
}

tests.push(['El descifrado hibrido valida la longitud del IV y del tag', async () => {
  const res = await fetch(`${BASE}/api/crypto/rsa/hybrid-decrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encryptedKeyBase64: 'QUJD',
      ivHex: 'aabb',                    // 2 bytes en lugar de 12
      tagHex: 'aa'.repeat(16),
      ciphertextBase64: 'QUJD',
      privateKeyPem: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----'
    })
  });

  assertClose(res.status, 400, 0);
  const body = await res.json();
  assertTrue(
    body.details.some((detail) => detail.field === 'ivHex'),
    `esperaba un detalle sobre ivHex, obtuve ${JSON.stringify(body.details)}`
  );
}]);

tests.push(['Una clave que no es PEM se rechaza antes de llegar a OpenSSL', async () => {
  const res = await fetch(`${BASE}/api/crypto/rsa/hybrid-encrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plaintext: 'hola', publicKeyPem: 'esto no es una clave' })
  });

  assertClose(res.status, 400, 0);
  const body = await res.json();
  assertTrue(
    body.details.some((detail) => detail.field === 'publicKeyPem'),
    `esperaba un detalle sobre publicKeyPem, obtuve ${JSON.stringify(body.details)}`
  );
}]);

tests.push(['Un JSON malformado responde 400, no 500', async () => {
  const res = await fetch(`${BASE}/api/crypto/encrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ esto no es json'
  });

  assertClose(res.status, 400, 0);
  const body = await res.json();
  assertTrue(body.error.includes('JSON'), `mensaje inesperado: ${body.error}`);
}]);

section(tests, 'Limites de tamano');

tests.push(['Un cuerpo JSON de mas de 1 MB responde 413', async () => {
  const res = await fetch(`${BASE}/api/crypto/encrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plaintext: 'A'.repeat(2 * 1024 * 1024), password: 'clave' })
  });

  assertClose(res.status, 413, 0);
}]);

section(tests, 'Verificacion de firma PNG');

tests.push(['Un archivo sin firma PNG se rechaza sin ocupar un worker', async () => {
  const form = new FormData();
  form.append('image', new Blob([Buffer.from('no soy un png')], { type: 'image/png' }), 'x.png');

  const res = await fetch(`${BASE}/api/analyze/image`, { method: 'POST', body: form });

  assertClose(res.status, 400, 0);
  const body = await res.json();
  assertTrue(
    body.error.includes('firma'),
    `esperaba una mencion a la firma PNG, obtuve: ${body.error}`
  );
}]);

tests.push(['Un PNG valido si se analiza', async () => {
  const { data } = createNaturalImage({ width: 64, height: 64, seed: 5, noiseSigma: 2 });
  const png = new PNG({ width: 64, height: 64 });
  data.copy(png.data);

  const form = new FormData();
  form.append('image', new Blob([PNG.sync.write(png)], { type: 'image/png' }), 'ok.png');

  const res = await fetch(`${BASE}/api/analyze/image`, { method: 'POST', body: form });
  assertClose(res.status, 200, 0);

  const body = await res.json();
  assertTrue(body.success, 'el analisis no reporto exito');
  assertTrue(body.data.verdict !== undefined, 'falta el veredicto en la respuesta');
}]);

section(tests, 'Rutas desconocidas');

tests.push(['Una ruta inexistente responde 404 en JSON', async () => {
  const res = await fetch(`${BASE}/api/no-existe`);

  assertClose(res.status, 404, 0);
  const body = await res.json();
  assertTrue(body.error.includes('no encontrada'), `mensaje inesperado: ${body.error}`);
}]);

section(tests, 'Limitacion de peticiones');

tests.push(['Las rutas costosas agotan su cupo y responden 429', async () => {
  // El cupo de /api/crypto es 20 por minuto. Se agota con peticiones invalidas,
  // que son baratas pero cuentan igual para el limitador.
  const statuses = [];
  for (let i = 0; i < 25; i++) {
    const res = await fetch(`${BASE}/api/crypto/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    statuses.push(res.status);
  }

  assertTrue(statuses.includes(429), `esperaba algun 429, obtuve ${statuses.join(', ')}`);

  const limited = await fetch(`${BASE}/api/crypto/encrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assertClose(limited.status, 429, 0);

  const body = await limited.json();
  // El texto exacto del aviso es propio de cada implementacion; lo que debe
  // cumplirse es que explique la causa en lugar de devolver un 429 mudo.
  assertTrue(
    /l[ií]mite|demasiadas|dos/i.test(body.error),
    `el aviso de cupo agotado no explica la causa: ${body.error}`
  );
}]);

tests.push(['El health check sigue respondiendo con el cupo costoso agotado', async () => {
  // El limitador estricto no debe arrastrar consigo al resto de la API.
  const res = await fetch(`${BASE}/api/health`);
  assertClose(res.status, 200, 0);
}]);

section(tests, 'Configuracion');

tests.push(['El health check declara entorno y estandares criptograficos', async () => {
  const body = await (await fetch(`${BASE}/api/health`)).json();

  assertEquals(body.environment, 'test', 'entorno');
  assertEquals(body.status, 'ONLINE', 'estado');
  assertTrue(body.standards.symmetric.includes('AES-256-GCM'), 'falta el cifrado simetrico declarado');
  assertTrue(body.standards.kdf.includes('PBKDF2'), 'falta el KDF declarado');
  assertTrue(body.standards.asymmetric.includes('RSA-OAEP'), 'falta el esquema asimetrico declarado');
}]);

try {
  await runSuite('ENDURECIMIENTO HTTP (server.js + middleware)', tests);
} finally {
  server.kill();
}
