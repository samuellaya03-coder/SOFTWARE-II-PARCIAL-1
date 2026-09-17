/**
 * Validacion del contenedor LSB.
 *
 * Importa el modulo del frontend a proposito: es el mismo codigo que ejecuta el
 * motor de Canvas en el navegador, asi que estas pruebas validan el embebedor de
 * produccion y no una reimplementacion que podria divergir.
 *
 * El modulo es JavaScript puro sin APIs de navegador, de modo que Node lo carga
 * sin adaptaciones.
 */

import {
  MAGIC,
  VERSION,
  HEADER_SIZE,
  FLAGS,
  crc32,
  encodeContainer,
  decodeHeader,
  decodeBody,
  createWalk,
  countSamples,
  capacityBytes,
  payloadCapacityBytes,
  injectContainer,
  extractContainer
} from '../../frontend/src/services/lsbContainer.js';
import { createNaturalImage, createRandomPayload } from './fixtures/imageFactory.js';
import { assertClose, assertEquals, assertThrows, assertTrue, runSuite, section } from './harness.js';

const tests = [];

const WIDTH = 160;
const HEIGHT = 120;

/** Copia RGBA fresca de la portadora para no arrastrar modificaciones. */
function freshCarrier(seed = 20260917) {
  return Buffer.from(createNaturalImage({ width: WIDTH, height: HEIGHT, seed, noiseSigma: 2 }).data);
}

/** Semilla de 16 bytes derivada de una cadena, como haria la contrasena. */
function seedFrom(text) {
  const seed = new Uint8Array(16);
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i++) {
    seed[i % 16] ^= bytes[i] + i;
  }
  return seed;
}

section(tests, 'CRC-32');

tests.push(['Vectores conocidos del CRC-32 IEEE', () => {
  // Valores estandar del polinomio reflejado 0xEDB88320.
  assertEquals(crc32(new Uint8Array(0)) >>> 0, 0x00000000, 'cadena vacia');
  assertEquals(crc32(new TextEncoder().encode('a')) >>> 0, 0xe8b7be43, '"a"');
  assertEquals(crc32(new TextEncoder().encode('abc')) >>> 0, 0x352441c2, '"abc"');
  assertEquals(crc32(new TextEncoder().encode('123456789')) >>> 0, 0xcbf43926, '"123456789"');
}]);

tests.push(['Un solo bit alterado cambia el CRC', () => {
  const data = createRandomPayload(512, 11);
  const original = crc32(data);
  data[100] ^= 0x01;
  assertTrue(crc32(data) !== original, 'el CRC no detecto la alteracion de un bit');
}]);

section(tests, 'Formato del contenedor');

tests.push(['La cabecera mide 16 bytes y lleva magic, version y longitudes', () => {
  const payload = createRandomPayload(300, 7);
  const container = encodeContainer({ payload });

  assertClose(container.length, HEADER_SIZE + 300, 0);
  for (let i = 0; i < MAGIC.length; i++) {
    assertEquals(container[i], MAGIC[i], `magic[${i}]`);
  }
  assertEquals(container[4], VERSION, 'version');

  const header = decodeHeader(container.subarray(0, HEADER_SIZE));
  assertClose(header.payloadLength, 300, 0);
  assertClose(header.metaLength, 0, 0);
  assertEquals(header.flags, 0, 'flags');
}]);

tests.push(['Los flags reflejan cifrado, archivo y dispersion', () => {
  const payload = createRandomPayload(64, 3);
  const container = encodeContainer({
    payload,
    meta: { name: 'secreto.pdf', type: 'application/pdf' },
    encrypted: true,
    scattered: true
  });

  const header = decodeHeader(container.subarray(0, HEADER_SIZE));
  assertTrue((header.flags & FLAGS.ENCRYPTED) !== 0, 'falta el flag ENCRYPTED');
  assertTrue((header.flags & FLAGS.FILE) !== 0, 'falta el flag FILE');
  assertTrue((header.flags & FLAGS.SCATTERED) !== 0, 'falta el flag SCATTERED');
  assertTrue(header.metaLength > 0, 'los metadatos quedaron vacios');
}]);

tests.push(['Un magic incorrecto se rechaza como NO_CONTAINER', () => {
  const container = encodeContainer({ payload: createRandomPayload(32, 1) });
  container[0] = 0x00;

  const error = (() => {
    try { decodeHeader(container.subarray(0, HEADER_SIZE)); return null; } catch (e) { return e; }
  })();

  assertTrue(error !== null, 'acepto un magic corrupto');
  assertTrue(error.message.includes('NO_CONTAINER'), `mensaje inesperado: ${error.message}`);
}]);

tests.push(['Una version desconocida se rechaza', () => {
  const container = encodeContainer({ payload: createRandomPayload(32, 1) });
  container[4] = 99;
  assertThrows(() => decodeHeader(container.subarray(0, HEADER_SIZE)), 'acepto la version 99');
}]);

tests.push(['El CRC detecta corrupcion del cuerpo', () => {
  const payload = createRandomPayload(200, 5);
  const container = encodeContainer({ payload });
  const header = decodeHeader(container.subarray(0, HEADER_SIZE));

  const body = container.subarray(HEADER_SIZE).slice();
  body[50] ^= 0x01;

  const error = (() => {
    try { decodeBody(header, body); return null; } catch (e) { return e; }
  })();

  assertTrue(error !== null, 'acepto un cuerpo corrupto');
  assertTrue(error.message.includes('CRC_MISMATCH'), `mensaje inesperado: ${error.message}`);
}]);

tests.push(['Se rechazan metadatos que exceden 65535 bytes', () => {
  assertThrows(
    () => encodeContainer({
      payload: new Uint8Array(1),
      meta: { name: 'x'.repeat(70000) }
    }),
    'acepto metadatos de mas de 64 KiB'
  );
}]);

section(tests, 'Capacidad');

tests.push(['La capacidad descuenta el canal alfa', () => {
  const rgbaLength = WIDTH * HEIGHT * 4;

  assertClose(countSamples(rgbaLength), WIDTH * HEIGHT * 3, 0);
  assertClose(capacityBytes(rgbaLength), Math.floor((WIDTH * HEIGHT * 3) / 8), 0);
  assertClose(
    payloadCapacityBytes(rgbaLength),
    Math.floor((WIDTH * HEIGHT * 3) / 8) - HEADER_SIZE,
    0
  );
}]);

tests.push(['La capacidad util descuenta tambien los metadatos', () => {
  const rgbaLength = WIDTH * HEIGHT * 4;
  const withMeta = payloadCapacityBytes(rgbaLength, 40);
  assertClose(withMeta, payloadCapacityBytes(rgbaLength) - 40, 0);
}]);

tests.push(['Un contenedor que no cabe se rechaza', () => {
  const carrier = freshCarrier();
  const tooBig = createRandomPayload(payloadCapacityBytes(carrier.length) + 1, 9);

  assertThrows(
    () => injectContainer(carrier, { payload: tooBig }),
    'acepto un payload que excede la capacidad'
  );
}]);

section(tests, 'Recorrido secuencial y disperso');

tests.push(['El recorrido secuencial devuelve 0, 1, 2, ...', () => {
  const walk = createWalk(10);
  for (let i = 0; i < 10; i++) {
    assertClose(walk.next(), i, 0);
  }
  assertThrows(() => walk.next(), 'no agoto las muestras');
}]);

tests.push(['El recorrido disperso es una permutacion sin repeticiones', () => {
  const total = 5000;
  const walk = createWalk(total, seedFrom('contrasena de prueba'));
  const seen = new Set();

  for (let i = 0; i < total; i++) {
    const index = walk.next();
    assertTrue(index >= 0 && index < total, `indice fuera de rango: ${index}`);
    assertTrue(!seen.has(index), `indice repetido: ${index}`);
    seen.add(index);
  }

  assertClose(seen.size, total, 0);
}]);

tests.push(['El recorrido disperso es reproducible con la misma semilla', () => {
  const a = createWalk(2000, seedFrom('clave'));
  const b = createWalk(2000, seedFrom('clave'));

  for (let i = 0; i < 2000; i++) {
    assertClose(a.next(), b.next(), 0);
  }
}]);

tests.push(['Semillas distintas producen recorridos distintos', () => {
  const a = createWalk(2000, seedFrom('clave A'));
  const b = createWalk(2000, seedFrom('clave B'));

  let differences = 0;
  for (let i = 0; i < 2000; i++) {
    if (a.next() !== b.next()) differences++;
  }

  assertTrue(differences > 1900, `los recorridos coincidian demasiado: ${2000 - differences} iguales`);
}]);

tests.push(['El recorrido disperso cubre toda la imagen, no un prefijo', () => {
  // Se toman solo los primeros 1000 indices de un espacio de 100000: si el
  // recorrido fuese secuencial todos caerian bajo 1000.
  const total = 100000;
  const walk = createWalk(total, seedFrom('clave'));
  const indices = Array.from({ length: 1000 }, () => walk.next());

  const beyondPrefix = indices.filter((index) => index > total * 0.1).length;
  assertTrue(
    beyondPrefix > 800,
    `solo ${beyondPrefix} de 1000 indices salieron del primer 10% de la imagen`
  );
}]);

section(tests, 'Viaje de ida y vuelta sobre pixeles');

tests.push(['Texto: inyeccion y extraccion secuencial', () => {
  const carrier = freshCarrier();
  const message = 'Mensaje confidencial con acentos: aeiou y simbolos #@!';
  const payload = new TextEncoder().encode(message);

  const stats = injectContainer(carrier, { payload });
  assertClose(stats.payloadBytes, payload.length, 0);
  assertTrue(!stats.scattered, 'marco como disperso un recorrido secuencial');

  const extracted = extractContainer(carrier);
  assertEquals(new TextDecoder().decode(extracted.payload), message, 'mensaje');
  assertTrue(!extracted.isFile, 'marco el payload como archivo');
  assertTrue(!extracted.encrypted, 'marco el payload como cifrado');
}]);

tests.push(['Archivo: los metadatos sobreviven al viaje', () => {
  const carrier = freshCarrier();
  const payload = createRandomPayload(2048, 42);
  const meta = { name: 'informe secreto.pdf', type: 'application/pdf', size: 2048 };

  injectContainer(carrier, { payload, meta });
  const extracted = extractContainer(carrier);

  assertTrue(extracted.isFile, 'no marco el payload como archivo');
  assertEquals(extracted.meta.name, meta.name, 'nombre del archivo');
  assertEquals(extracted.meta.type, meta.type, 'tipo MIME');
  assertEquals(
    Buffer.from(extracted.payload).toString('hex'),
    Buffer.from(payload).toString('hex'),
    'contenido del archivo'
  );
}]);

tests.push(['Disperso: inyeccion y extraccion con la misma semilla', () => {
  const carrier = freshCarrier();
  const payload = createRandomPayload(1500, 77);
  const seedBytes = seedFrom('ClaveMaestra#2026');

  const stats = injectContainer(carrier, { payload, seedBytes, encrypted: true });
  assertTrue(stats.scattered, 'no marco el recorrido como disperso');

  const extracted = extractContainer(carrier, seedBytes);
  assertTrue(extracted.scattered, 'el flag SCATTERED no viajo');
  assertTrue(extracted.encrypted, 'el flag ENCRYPTED no viajo');
  assertEquals(
    Buffer.from(extracted.payload).toString('hex'),
    Buffer.from(payload).toString('hex'),
    'payload'
  );
}]);

tests.push(['Disperso: una semilla incorrecta no encuentra el contenedor', () => {
  const carrier = freshCarrier();
  const payload = createRandomPayload(1500, 77);

  injectContainer(carrier, { payload, seedBytes: seedFrom('clave correcta') });

  // Con la semilla equivocada se leen bits de posiciones arbitrarias, asi que el
  // magic no cuadra: el fallo es inmediato y explicito, no una lectura de basura.
  const error = (() => {
    try { extractContainer(carrier, seedFrom('clave equivocada')); return null; } catch (e) { return e; }
  })();

  assertTrue(error !== null, 'extrajo algo con la semilla equivocada');
  assertTrue(error.message.includes('NO_CONTAINER'), `mensaje inesperado: ${error.message}`);
}]);

tests.push(['Disperso: leer en modo secuencial tampoco encuentra nada', () => {
  const carrier = freshCarrier();
  injectContainer(carrier, {
    payload: createRandomPayload(1500, 77),
    seedBytes: seedFrom('clave')
  });

  assertThrows(() => extractContainer(carrier), 'leyo un contenedor disperso como secuencial');
}]);

tests.push(['Una imagen limpia no aparenta contener nada', () => {
  const carrier = freshCarrier(4242);
  const error = (() => {
    try { extractContainer(carrier); return null; } catch (e) { return e; }
  })();

  assertTrue(error !== null, 'encontro un contenedor en una imagen limpia');
  assertTrue(error.message.includes('NO_CONTAINER'), `mensaje inesperado: ${error.message}`);
}]);

tests.push(['Payload vacio: contenedor valido de solo cabecera', () => {
  const carrier = freshCarrier();
  injectContainer(carrier, { payload: new Uint8Array(0) });

  const extracted = extractContainer(carrier);
  assertClose(extracted.payload.length, 0, 0);
}]);

tests.push(['Payload al limite de la capacidad', () => {
  const carrier = freshCarrier();
  const payload = createRandomPayload(payloadCapacityBytes(carrier.length), 13);

  injectContainer(carrier, { payload });
  const extracted = extractContainer(carrier);

  assertEquals(
    Buffer.from(extracted.payload).toString('hex'),
    Buffer.from(payload).toString('hex'),
    'payload al limite'
  );
}]);

section(tests, 'Integridad de la portadora');

tests.push(['El canal alfa nunca se altera', () => {
  const carrier = freshCarrier();
  const originalAlpha = [];
  for (let i = 3; i < carrier.length; i += 4) originalAlpha.push(carrier[i]);

  injectContainer(carrier, { payload: createRandomPayload(2000, 8) });

  let position = 0;
  for (let i = 3; i < carrier.length; i += 4) {
    assertClose(carrier[i], originalAlpha[position++], 0);
  }
}]);

tests.push(['La alteracion fotometrica por muestra nunca excede 1 nivel', () => {
  const original = freshCarrier();
  const carrier = Buffer.from(original);

  injectContainer(carrier, { payload: createRandomPayload(3000, 21) });

  let maxDelta = 0;
  for (let i = 0; i < carrier.length; i++) {
    maxDelta = Math.max(maxDelta, Math.abs(carrier[i] - original[i]));
  }

  assertClose(maxDelta, 1, 0);
}]);

tests.push(['El CRC detecta la manipulacion de la imagen tras la inyeccion', () => {
  const carrier = freshCarrier();
  injectContainer(carrier, { payload: createRandomPayload(800, 33) });

  // Se voltea el LSB de una muestra dentro del cuerpo, no de la cabecera.
  const bodyStartSample = HEADER_SIZE * 8;
  const offset = Math.floor((bodyStartSample + 100) / 3) * 4 + ((bodyStartSample + 100) % 3);
  carrier[offset] ^= 0x01;

  const error = (() => {
    try { extractContainer(carrier); return null; } catch (e) { return e; }
  })();

  assertTrue(error !== null, 'no detecto la manipulacion');
  assertTrue(error.message.includes('CRC_MISMATCH'), `mensaje inesperado: ${error.message}`);
}]);

await runSuite('CONTENEDOR LSB (frontend/src/services/lsbContainer.js)', tests);
