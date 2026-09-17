/**
 * Worker de analisis forense: decodifica el PNG y ejecuta los estimadores.
 *
 * Ambas etapas son JavaScript puro, asi que no pueden delegarse a la threadpool
 * de libuv como si hace OpenSSL. Ejecutarlas en un hilo real es la unica forma de
 * mantener el event loop principal libre.
 *
 * Recibe el PNG crudo, no el búfer RGBA ya decodificado: descomprimir el PNG es
 * tambien trabajo intensivo y debe salir del hilo principal.
 */

import { parentPort } from 'node:worker_threads';
import { PNG } from 'pngjs';
import { runForensicAnalysis } from './index.js';

/** Decodifica un PNG a RGBA crudo. */
function parsePng(imageBuffer) {
  return new Promise((resolve, reject) => {
    new PNG().parse(imageBuffer, (error, parsed) => {
      if (error) {
        reject(new Error(`No se pudo decodificar la imagen como PNG: ${error.message}`));
        return;
      }
      resolve({ width: parsed.width, height: parsed.height, data: parsed.data });
    });
  });
}

parentPort.on('message', async ({ jobId, pngBuffer, options }) => {
  try {
    const buffer = Buffer.from(pngBuffer);
    const { width, height, data } = await parsePng(buffer);
    const report = runForensicAnalysis(data, width, height, options);

    parentPort.postMessage({ jobId, ok: true, report });
  } catch (error) {
    parentPort.postMessage({
      jobId,
      ok: false,
      error: { message: error.message, isDecodeError: error.message.includes('decodificar') }
    });
  }
});
