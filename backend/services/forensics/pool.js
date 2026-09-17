/**
 * Pool de worker_threads para el analisis forense.
 *
 * Cada worker atiende un trabajo a la vez; los que llegan sin hilo libre esperan
 * en cola. El tamano se limita a los nucleos disponibles menos uno para que el
 * hilo principal conserve siempre una CPU con la que atender peticiones.
 *
 * Un worker que muere (error no capturado, salida inesperada) rechaza su trabajo
 * en curso y se sustituye, de modo que un fallo aislado no degrada el pool.
 */

import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const workerPath = join(dirname(fileURLToPath(import.meta.url)), 'analysis.worker.js');

/** Milisegundos tras los que un trabajo se considera colgado. */
const DEFAULT_JOB_TIMEOUT_MS = 60000;

function defaultPoolSize() {
  const fromEnv = Number.parseInt(process.env.FORENSICS_WORKERS ?? '', 10);
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv;
  return Math.max(1, Math.min(4, availableParallelism() - 1));
}

export class ForensicsPool {
  /**
   * @param {object} [options]
   * @param {number} [options.size] - Numero de workers.
   * @param {number} [options.jobTimeoutMs]
   */
  constructor(options = {}) {
    this.size = options.size ?? defaultPoolSize();
    this.jobTimeoutMs = options.jobTimeoutMs ?? DEFAULT_JOB_TIMEOUT_MS;

    /** @type {Array<{ worker: Worker, busy: boolean, job: object|null }>} */
    this.slots = [];
    /** @type {Array<object>} */
    this.queue = [];
    this.nextJobId = 1;
    this.closed = false;

    for (let i = 0; i < this.size; i++) {
      this.slots.push(this.#spawnSlot());
    }
  }

  #spawnSlot() {
    const worker = new Worker(workerPath);
    const slot = { worker, busy: false, job: null };

    worker.on('message', (message) => {
      const job = slot.job;
      // Un mensaje de un trabajo ya resuelto (por timeout) se descarta.
      if (!job || job.id !== message.jobId) return;

      this.#release(slot);

      if (message.ok) {
        job.resolve(message.report);
      } else {
        const error = new Error(message.error.message);
        error.isDecodeError = message.error.isDecodeError;
        job.reject(error);
      }
    });

    const fail = (reason) => {
      const job = slot.job;
      this.#replaceSlot(slot);
      if (job) {
        clearTimeout(job.timer);
        job.reject(new Error(`El worker de analisis fallo: ${reason}`));
      }
      this.#drain();
    };

    worker.on('error', (error) => fail(error.message));
    worker.on('exit', (code) => {
      if (!this.closed && code !== 0) fail(`salio con codigo ${code}`);
    });

    return slot;
  }

  #replaceSlot(deadSlot) {
    const index = this.slots.indexOf(deadSlot);
    if (index < 0) return;

    deadSlot.worker.terminate().catch(() => {});
    this.slots[index] = this.closed
      ? { worker: deadSlot.worker, busy: false, job: null }
      : this.#spawnSlot();
  }

  #release(slot) {
    if (slot.job) clearTimeout(slot.job.timer);
    slot.busy = false;
    slot.job = null;
    this.#drain();
  }

  #drain() {
    while (this.queue.length > 0) {
      const slot = this.slots.find((candidate) => !candidate.busy);
      if (!slot) return;
      this.#dispatch(slot, this.queue.shift());
    }
  }

  #dispatch(slot, job) {
    slot.busy = true;
    slot.job = job;

    job.timer = setTimeout(() => {
      // Un worker colgado no se recupera solo: se descarta y se reemplaza.
      const stuck = slot.job;
      this.#replaceSlot(slot);
      if (stuck) {
        stuck.reject(new Error(`El analisis excedio el tiempo limite de ${this.jobTimeoutMs} ms.`));
      }
      this.#drain();
    }, this.jobTimeoutMs);

    // El búfer se transfiere en lugar de copiarse: la propiedad pasa al worker y
    // el hilo principal deja de poder leerlo, que es exactamente lo que se quiere.
    slot.worker.postMessage(
      { jobId: job.id, pngBuffer: job.pngBuffer, options: job.options },
      [job.pngBuffer]
    );
  }

  /**
   * Encola un analisis.
   * @param {Buffer} pngBuffer - PNG crudo.
   * @param {object} [options] - Opciones reenviadas a runForensicAnalysis.
   * @returns {Promise<object>} Informe forense.
   */
  analyze(pngBuffer, options = {}) {
    if (this.closed) {
      return Promise.reject(new Error('El pool de analisis esta cerrado.'));
    }

    // Se copia a un ArrayBuffer exclusivo: los Buffer de Node comparten un pool
    // interno, y transferir ese ArrayBuffer invalidaria búferes ajenos.
    const owned = new ArrayBuffer(pngBuffer.length);
    Buffer.from(owned).set(pngBuffer);

    return new Promise((resolve, reject) => {
      const job = {
        id: this.nextJobId++,
        pngBuffer: owned,
        options,
        resolve,
        reject,
        timer: null
      };

      const slot = this.slots.find((candidate) => !candidate.busy);
      if (slot) {
        this.#dispatch(slot, job);
      } else {
        this.queue.push(job);
      }
    });
  }

  /** Estado del pool, para el health check. */
  stats() {
    return {
      size: this.size,
      busy: this.slots.filter((slot) => slot.busy).length,
      queued: this.queue.length
    };
  }

  /** Termina todos los workers y rechaza lo que quede en cola. */
  async close() {
    this.closed = true;

    for (const job of this.queue) {
      clearTimeout(job.timer);
      job.reject(new Error('El pool de analisis se cerro antes de atender el trabajo.'));
    }
    this.queue.length = 0;

    await Promise.all(this.slots.map((slot) => {
      if (slot.job) {
        clearTimeout(slot.job.timer);
        slot.job.reject(new Error('El pool de analisis se cerro durante el trabajo.'));
      }
      return slot.worker.terminate();
    }));
  }
}

let sharedPool = null;

/** Pool compartido del proceso, creado en el primer uso. */
export function getForensicsPool() {
  if (!sharedPool) sharedPool = new ForensicsPool();
  return sharedPool;
}

/** Cierra el pool compartido (usado al apagar el servidor y en pruebas). */
export async function closeForensicsPool() {
  if (!sharedPool) return;
  const pool = sharedPool;
  sharedPool = null;
  await pool.close();
}
