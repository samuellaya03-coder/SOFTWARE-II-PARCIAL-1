import {
  loadImage,
  describeCapacity,
  hide,
  revealAuto,
  exportToPngBlob,
  downloadBlob,
  HEADER_SIZE
} from '../services/stegoEngine.js';
import {
  encryptPacket,
  decryptPacket,
  deriveWalkSeed,
  readFileBytes,
  PACKET_HEADER_BYTES
} from '../services/webcrypto.js';

const numberFormat = new Intl.NumberFormat('es-ES');

function formatBytes(value) {
  if (value < 1024) return `${numberFormat.format(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

export function renderStegoTab(container, onNavigateToAnalysis) {
  container.innerHTML = `
    <div class="card card-glow-cyan" style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
      <div>
        <h2 style="font-size:1.5rem; margin-bottom:0.25rem;">Esteganografia LSB en Canvas HTML5</h2>
        <p style="color:var(--text-secondary); font-size:0.875rem;">
          Inyeccion bit a bit en los LSB de los canales R, G y B. Todo el proceso, incluido el
          cifrado, ocurre en el navegador: la contrasena nunca sale del cliente.
        </p>
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <span class="badge badge-cyan">Canvas API</span>
        <span class="badge badge-emerald">WebCrypto</span>
        <span class="badge badge-purple">PNG sin perdida</span>
      </div>
    </div>

    <div class="stack-row" style="margin-top:1.5rem;">
      <button id="mode-hide" class="btn btn-primary" style="flex:1;">Ocultar informacion</button>
      <button id="mode-reveal" class="btn btn-secondary" style="flex:1;">Revelar informacion</button>
    </div>

    <!-- ================= OCULTAR ================= -->
    <div id="section-hide" style="margin-top:1.5rem;">
      <div class="grid-2" style="gap:1.5rem;">

        <div class="card" style="display:flex; flex-direction:column; gap:1.1rem;">
          <h3 style="font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
            1. Imagen portadora
          </h3>

          <div id="dropzone-carrier" class="dropzone">
            <input type="file" id="input-carrier" accept="image/png, image/jpeg, image/webp" style="display:none;" />
            <div style="font-size:2.5rem; margin-bottom:0.5rem;">&#128443;</div>
            <p style="font-weight:600; color:var(--text-primary);">Arrastra una imagen o haz clic</p>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
              PNG, JPEG o WebP. La salida sera siempre PNG sin perdida.
            </p>
          </div>

          <div id="carrier-info" class="font-mono" style="display:none; background:rgba(0,0,0,0.25); padding:0.85rem; border-radius:8px; font-size:0.82rem; line-height:1.9;"></div>

          <div id="carrier-preview" class="image-preview-box" style="display:none;">
            <img id="carrier-img" alt="Imagen portadora" />
          </div>
        </div>

        <div class="card" style="display:flex; flex-direction:column; gap:1.1rem;">
          <h3 style="font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
            2. Datos a ocultar
          </h3>

          <div>
            <label style="display:block; font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.4rem;">
              Tipo de payload
            </label>
            <select id="payload-kind">
              <option value="text">Texto escrito a mano</option>
              <option value="file">Archivo arbitrario (cualquier tipo)</option>
            </select>
          </div>

          <div id="payload-text-group">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
              <label style="font-size:0.85rem; color:var(--text-secondary);">Mensaje secreto</label>
              <span id="payload-size" class="font-mono" style="font-size:0.75rem; color:var(--text-muted);">0 B</span>
            </div>
            <textarea id="payload-text" rows="4" placeholder="Escribe el texto confidencial..."></textarea>
          </div>

          <div id="payload-file-group" style="display:none;">
            <label style="display:block; font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.4rem;">
              Archivo a ocultar
            </label>
            <input type="file" id="input-payload-file" />
            <div id="payload-file-info" class="font-mono" style="display:none; margin-top:0.5rem; font-size:0.78rem; color:var(--accent-cyan);"></div>
          </div>

          <div>
            <label style="display:block; font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.4rem;">
              Proteccion criptografica
            </label>
            <select id="crypto-mode">
              <option value="aes">AES-256-GCM con PBKDF2-SHA512 (600.000 iteraciones)</option>
              <option value="plain">Ninguna: esteganografia pura</option>
            </select>
          </div>

          <div>
            <label style="display:block; font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.4rem;">
              Colocacion de los bits
            </label>
            <select id="walk-mode">
              <option value="scattered">Dispersa: permutacion sembrada por la contrasena</option>
              <option value="sequential">Secuencial: desde el primer pixel</option>
            </select>
            <p id="walk-hint" style="font-size:0.74rem; color:var(--text-muted); margin-top:0.35rem;"></p>
          </div>

          <div id="password-group">
            <label style="display:block; font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.35rem;">
              Contrasena maestra
            </label>
            <input type="password" id="password" placeholder="Clave para derivar la clave AES y la permutacion..." />
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.3rem;">
              <span style="color:var(--text-muted);">Ocupacion de la capacidad</span>
              <span id="capacity-label" class="font-mono">0%</span>
            </div>
            <div class="progress-container">
              <div id="capacity-bar" class="progress-bar progress-normal" style="width:0%;"></div>
            </div>
          </div>

          <button id="btn-inject" class="btn btn-primary" style="width:100%;" disabled>
            Ejecutar inyeccion LSB
          </button>
        </div>
      </div>

      <div id="hide-result" class="card card-glow-emerald" style="display:none; margin-top:1.5rem;">
        <h3 style="color:var(--accent-emerald); font-size:1.2rem; margin-bottom:1rem;">
          Inyeccion completada
        </h3>

        <div class="grid-2" style="gap:1.5rem; align-items:start;">
          <div class="image-preview-box">
            <canvas id="output-canvas"></canvas>
          </div>

          <div style="display:flex; flex-direction:column; gap:1rem;">
            <div id="hide-stats" class="font-mono" style="font-size:0.82rem; background:rgba(0,0,0,0.3); padding:1rem; border-radius:8px; line-height:1.9;"></div>
            <div class="stack-row">
              <button id="btn-download" class="btn btn-emerald" style="flex:1;">Descargar PNG</button>
              <button id="btn-to-analysis" class="btn btn-secondary" style="flex:1;">Enviar a estegoanalisis</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= REVELAR ================= -->
    <div id="section-reveal" style="display:none; margin-top:1.5rem;">
      <div class="card" style="max-width:860px; margin:0 auto; display:flex; flex-direction:column; gap:1.1rem;">
        <h3 style="font-size:1.2rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
          Extraccion inversa
        </h3>

        <div id="dropzone-stego" class="dropzone">
          <input type="file" id="input-stego" accept="image/png" style="display:none;" />
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">&#128269;</div>
          <p style="font-weight:600; color:var(--text-primary);">Sube el PNG sospechoso</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
            El motor busca la cabecera "STG1" y verifica el CRC-32 del contenido
          </p>
        </div>

        <div id="stego-preview" class="image-preview-box" style="display:none;">
          <img id="stego-img" alt="Imagen estego" />
        </div>

        <div>
          <label style="display:block; font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.35rem;">
            Contrasena (necesaria para el modo disperso y para descifrar)
          </label>
          <input type="password" id="reveal-password" placeholder="Contrasena maestra..." />
        </div>

        <button id="btn-extract" class="btn btn-primary" style="width:100%;" disabled>
          Extraer contenedor
        </button>

        <div id="reveal-result" style="display:none; flex-direction:column; gap:1rem;">
          <div id="reveal-alert" class="alert-box"></div>
          <div id="reveal-details" class="font-mono" style="display:none; font-size:0.8rem; background:rgba(0,0,0,0.3); padding:1rem; border-radius:8px; line-height:1.9;"></div>

          <div id="reveal-text-group" style="display:none;">
            <label style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.3rem; display:block;">
              Contenido revelado
            </label>
            <textarea id="reveal-text" rows="6" readonly class="font-mono"></textarea>
          </div>

          <div id="reveal-file-group" style="display:none;">
            <button id="btn-download-payload" class="btn btn-emerald" style="width:100%;"></button>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- Elementos ---
  const modeHide = container.querySelector('#mode-hide');
  const modeReveal = container.querySelector('#mode-reveal');
  const sectionHide = container.querySelector('#section-hide');
  const sectionReveal = container.querySelector('#section-reveal');

  const dropzoneCarrier = container.querySelector('#dropzone-carrier');
  const inputCarrier = container.querySelector('#input-carrier');
  const carrierInfo = container.querySelector('#carrier-info');
  const carrierPreview = container.querySelector('#carrier-preview');
  const carrierImg = container.querySelector('#carrier-img');

  const payloadKind = container.querySelector('#payload-kind');
  const payloadTextGroup = container.querySelector('#payload-text-group');
  const payloadFileGroup = container.querySelector('#payload-file-group');
  const payloadText = container.querySelector('#payload-text');
  const payloadSize = container.querySelector('#payload-size');
  const inputPayloadFile = container.querySelector('#input-payload-file');
  const payloadFileInfo = container.querySelector('#payload-file-info');

  const cryptoMode = container.querySelector('#crypto-mode');
  const walkMode = container.querySelector('#walk-mode');
  const walkHint = container.querySelector('#walk-hint');
  const passwordGroup = container.querySelector('#password-group');
  const password = container.querySelector('#password');

  const capacityLabel = container.querySelector('#capacity-label');
  const capacityBar = container.querySelector('#capacity-bar');
  const btnInject = container.querySelector('#btn-inject');

  const hideResult = container.querySelector('#hide-result');
  const outputCanvas = container.querySelector('#output-canvas');
  const hideStats = container.querySelector('#hide-stats');
  const btnDownload = container.querySelector('#btn-download');
  const btnToAnalysis = container.querySelector('#btn-to-analysis');

  const dropzoneStego = container.querySelector('#dropzone-stego');
  const inputStego = container.querySelector('#input-stego');
  const stegoPreview = container.querySelector('#stego-preview');
  const stegoImg = container.querySelector('#stego-img');
  const revealPassword = container.querySelector('#reveal-password');
  const btnExtract = container.querySelector('#btn-extract');
  const revealResult = container.querySelector('#reveal-result');
  const revealAlert = container.querySelector('#reveal-alert');
  const revealDetails = container.querySelector('#reveal-details');
  const revealTextGroup = container.querySelector('#reveal-text-group');
  const revealTextArea = container.querySelector('#reveal-text');
  const revealFileGroup = container.querySelector('#reveal-file-group');
  const btnDownloadPayload = container.querySelector('#btn-download-payload');

  // --- Estado ---
  let carrierImage = null;
  let carrierCapacity = null;
  let payloadFile = null;
  let payloadFileBytes = null;
  let injectedCanvas = null;
  let stegoImage = null;
  let extractedPayload = null;
  let extractedMeta = null;

  const WALK_HINTS = {
    scattered:
      'El payload se reparte por toda la imagen segun una permutacion derivada de la contrasena. '
      + 'Destruye el prefijo contiguo que localiza el ataque chi-cuadrado progresivo, y sin la '
      + 'contrasena no se puede ni localizar la cabecera.',
    sequential:
      'El payload ocupa un prefijo contiguo desde el primer pixel. Permite detectar el contenedor '
      + 'sin contrasena, pero el ataque chi-cuadrado progresivo puede medir su longitud exacta.'
  };

  // --- Alternancia de modo ---
  modeHide.addEventListener('click', () => {
    modeHide.className = 'btn btn-primary';
    modeReveal.className = 'btn btn-secondary';
    sectionHide.style.display = 'block';
    sectionReveal.style.display = 'none';
  });

  modeReveal.addEventListener('click', () => {
    modeReveal.className = 'btn btn-primary';
    modeHide.className = 'btn btn-secondary';
    sectionReveal.style.display = 'block';
    sectionHide.style.display = 'none';
  });

  // --- Portadora ---
  function wireDropzone(zone, input, handler) {
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('dragover');
      if (event.dataTransfer.files.length > 0) handler(event.dataTransfer.files[0]);
    });
    input.addEventListener('change', (event) => {
      if (event.target.files.length > 0) handler(event.target.files[0]);
    });
  }

  wireDropzone(dropzoneCarrier, inputCarrier, async (file) => {
    try {
      carrierImage = await loadImage(file);
      carrierCapacity = describeCapacity(carrierImage);

      carrierImg.src = carrierImage.src;
      carrierPreview.style.display = 'flex';

      carrierInfo.style.display = 'block';
      carrierInfo.innerHTML = `
        <div>Resolucion: <span style="color:var(--text-primary);">${carrierCapacity.width} x ${carrierCapacity.height} px</span></div>
        <div>Muestras RGB: <span style="color:var(--text-primary);">${numberFormat.format(carrierCapacity.totalSamples)}</span></div>
        <div>Capacidad total: <span style="color:var(--accent-cyan);">${formatBytes(carrierCapacity.containerCapacityBytes)}</span></div>
        <div>Capacidad util: <span style="color:var(--accent-emerald);">${formatBytes(carrierCapacity.payloadCapacityBytes)}</span>
          <span style="color:var(--text-muted);">(menos ${HEADER_SIZE} B de cabecera)</span></div>
      `;

      updateCapacity();
    } catch (error) {
      alert(error.message);
    }
  });

  // --- Payload ---
  payloadKind.addEventListener('change', () => {
    const isFile = payloadKind.value === 'file';
    payloadTextGroup.style.display = isFile ? 'none' : 'block';
    payloadFileGroup.style.display = isFile ? 'block' : 'none';
    updateCapacity();
  });

  inputPayloadFile.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      payloadFile = file;
      payloadFileBytes = await readFileBytes(file);
      payloadFileInfo.style.display = 'block';
      payloadFileInfo.textContent =
        `${file.name} — ${formatBytes(payloadFileBytes.length)} — ${file.type || 'tipo desconocido'}`;
      updateCapacity();
    } catch (error) {
      alert(`No se pudo leer el archivo: ${error.message}`);
    }
  });

  payloadText.addEventListener('input', updateCapacity);
  password.addEventListener('input', updateCapacity);

  cryptoMode.addEventListener('change', () => {
    // El modo disperso necesita contrasena para derivar la permutacion, aunque no
    // se cifre; solo el par "sin cifrado + secuencial" puede prescindir de ella.
    const needsPassword = cryptoMode.value === 'aes' || walkMode.value === 'scattered';
    passwordGroup.style.display = needsPassword ? 'block' : 'none';
    updateCapacity();
  });

  walkMode.addEventListener('change', () => {
    walkHint.textContent = WALK_HINTS[walkMode.value];
    const needsPassword = cryptoMode.value === 'aes' || walkMode.value === 'scattered';
    passwordGroup.style.display = needsPassword ? 'block' : 'none';
    updateCapacity();
  });

  walkHint.textContent = WALK_HINTS.scattered;

  /** Tamano y metadatos del payload actual, sin incluir la capa criptografica. */
  function currentPayload() {
    if (payloadKind.value === 'file') {
      if (!payloadFileBytes) return null;
      return {
        bytes: payloadFileBytes,
        meta: {
          name: payloadFile.name,
          type: payloadFile.type || 'application/octet-stream',
          size: payloadFileBytes.length
        }
      };
    }

    const text = payloadText.value;
    if (text.length === 0) return null;
    return { bytes: new TextEncoder().encode(text), meta: null };
  }

  function updateCapacity() {
    const payload = currentPayload();
    const rawBytes = payload ? payload.bytes.length : 0;

    // El cifrado anade la cabecera [salt|iv|tag] al payload.
    const encrypted = cryptoMode.value === 'aes';
    const payloadBytes = rawBytes + (encrypted && rawBytes >= 0 ? PACKET_HEADER_BYTES : 0);
    const metaBytes = payload?.meta
      ? new TextEncoder().encode(JSON.stringify(payload.meta)).length
      : 0;
    const containerBytes = HEADER_SIZE + metaBytes + payloadBytes;

    payloadSize.textContent = formatBytes(rawBytes);

    if (carrierCapacity) {
      const ratio = containerBytes / carrierCapacity.containerCapacityBytes;
      const percentage = Math.min(100, ratio * 100);

      capacityLabel.textContent = `${percentage.toFixed(2)}% — ${formatBytes(containerBytes)}`;
      capacityBar.style.width = `${percentage}%`;
      capacityBar.className = ratio > 1
        ? 'progress-bar progress-danger'
        : ratio > 0.7 ? 'progress-bar progress-warning' : 'progress-bar progress-normal';
    }

    const needsPassword = cryptoMode.value === 'aes' || walkMode.value === 'scattered';
    const fits = carrierCapacity && containerBytes <= carrierCapacity.containerCapacityBytes;

    btnInject.disabled = !(
      carrierImage && payload && fits && (!needsPassword || password.value.length > 0)
    );
  }

  // --- Inyeccion ---
  btnInject.addEventListener('click', async () => {
    const original = btnInject.innerHTML;

    try {
      btnInject.disabled = true;
      btnInject.innerHTML = 'Derivando clave (600.000 iteraciones)...';

      const payload = currentPayload();
      const encrypted = cryptoMode.value === 'aes';
      const scattered = walkMode.value === 'scattered';

      let bytes = payload.bytes;
      if (encrypted) {
        const sealed = await encryptPacket(bytes, password.value);
        bytes = sealed.packed;
      }

      const seedBytes = scattered ? await deriveWalkSeed(password.value) : null;

      btnInject.innerHTML = 'Inyectando en el canvas...';
      const { canvas, stats } = hide({
        image: carrierImage,
        payload: bytes,
        meta: payload.meta,
        encrypted,
        seedBytes
      });

      injectedCanvas = canvas;
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      outputCanvas.getContext('2d').drawImage(canvas, 0, 0);

      hideStats.innerHTML = `
        <div>Dimensiones: <span style="color:var(--text-primary);">${stats.width} x ${stats.height} px</span></div>
        <div>Contenedor: <span style="color:var(--accent-cyan);">${formatBytes(stats.containerBytes)}</span>
          <span style="color:var(--text-muted);">(${HEADER_SIZE} B cabecera + ${stats.metaBytes} B metadatos + ${formatBytes(stats.payloadBytes)} payload)</span></div>
        <div>Muestras alteradas: <span style="color:var(--text-primary);">${numberFormat.format(stats.samplesUsed)}</span> de ${numberFormat.format(stats.totalSamples)}</div>
        <div>Ocupacion: <span style="color:var(--text-primary);">${stats.capacityUsedPercentage}%</span></div>
        <div>Colocacion: <span style="color:var(--accent-purple);">${stats.scattered ? 'dispersa (permutacion por contrasena)' : 'secuencial'}</span></div>
        <div>Cifrado: <span style="color:${encrypted ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">${encrypted ? 'AES-256-GCM en el navegador' : 'ninguno'}</span></div>
      `;

      hideResult.style.display = 'block';
      hideResult.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      alert(`Error en la inyeccion: ${error.message}`);
    } finally {
      btnInject.disabled = false;
      btnInject.innerHTML = original;
      updateCapacity();
    }
  });

  btnDownload.addEventListener('click', async () => {
    if (!injectedCanvas) return;
    const blob = await exportToPngBlob(injectedCanvas);
    downloadBlob(blob, `stego_${Date.now()}.png`);
  });

  btnToAnalysis.addEventListener('click', async () => {
    if (!injectedCanvas || !onNavigateToAnalysis) return;
    onNavigateToAnalysis(await exportToPngBlob(injectedCanvas));
  });

  // --- Extraccion ---
  wireDropzone(dropzoneStego, inputStego, async (file) => {
    try {
      stegoImage = await loadImage(file);
      stegoImg.src = stegoImage.src;
      stegoPreview.style.display = 'flex';
      btnExtract.disabled = false;
      revealResult.style.display = 'none';
    } catch (error) {
      alert(error.message);
    }
  });

  btnExtract.addEventListener('click', async () => {
    const original = btnExtract.innerHTML;

    try {
      btnExtract.disabled = true;
      btnExtract.innerHTML = 'Buscando contenedor...';

      const seedBytes = revealPassword.value
        ? await deriveWalkSeed(revealPassword.value)
        : null;

      const attempt = revealAuto(stegoImage, seedBytes);
      revealResult.style.display = 'flex';
      revealTextGroup.style.display = 'none';
      revealFileGroup.style.display = 'none';
      revealDetails.style.display = 'none';

      if (!attempt.found) {
        const needsPassword = !revealPassword.value;
        revealAlert.className = 'alert-box alert-danger';
        revealAlert.innerHTML = `
          <div>
            <strong>No se encontro ningun contenedor.</strong>
            ${needsPassword
              ? ' Si la inyeccion fue dispersa, la contrasena es imprescindible para localizar la cabecera.'
              : ''}
            <div style="margin-top:0.5rem; font-size:0.78rem; color:var(--text-muted);">
              ${attempt.errors.map((line) => `<div>${line}</div>`).join('')}
            </div>
          </div>
        `;
        return;
      }

      const { result, mode } = attempt;
      extractedMeta = result.meta;

      revealDetails.style.display = 'block';
      revealDetails.innerHTML = `
        <div>Modo detectado: <span style="color:var(--accent-purple);">${mode}</span></div>
        <div>Version del contenedor: <span style="color:var(--text-primary);">${result.header.version}</span></div>
        <div>Payload: <span style="color:var(--accent-cyan);">${formatBytes(result.header.payloadLength)}</span></div>
        <div>CRC-32: <span style="color:var(--accent-emerald);">verificado</span></div>
        <div>Cifrado: <span style="color:var(--text-primary);">${result.encrypted ? 'si, AES-256-GCM' : 'no'}</span></div>
        ${result.isFile ? `<div>Archivo: <span style="color:var(--text-primary);">${result.meta.name}</span> (${result.meta.type})</div>` : ''}
      `;

      let payload = result.payload;

      if (result.encrypted) {
        if (!revealPassword.value) {
          revealAlert.className = 'alert-box alert-warning';
          revealAlert.innerHTML =
            '<div><strong>Contenedor cifrado localizado.</strong> Introduce la contrasena para '
            + 'descifrarlo y verificar el tag GCM.</div>';
          return;
        }

        btnExtract.innerHTML = 'Descifrando (600.000 iteraciones)...';
        payload = await decryptPacket(payload, revealPassword.value);
      }

      extractedPayload = payload;

      revealAlert.className = 'alert-box alert-success';
      revealAlert.innerHTML = `
        <div>
          <strong>Extraccion correcta.</strong>
          ${result.encrypted
            ? 'El tag de autenticacion GCM coincidio: confidencialidad e integridad verificadas.'
            : 'El CRC-32 del contenedor coincidio.'}
        </div>
      `;

      if (result.isFile) {
        revealFileGroup.style.display = 'block';
        btnDownloadPayload.textContent = `Descargar ${result.meta.name} (${formatBytes(payload.length)})`;
      } else {
        revealTextGroup.style.display = 'block';
        try {
          revealTextArea.value = new TextDecoder('utf-8', { fatal: true }).decode(payload);
        } catch {
          revealTextArea.value =
            `[${payload.length} bytes binarios no representables como UTF-8]\n`
            + 'Cambia el tipo de payload a archivo para descargarlo.';
        }
      }
    } catch (error) {
      revealResult.style.display = 'flex';
      revealAlert.className = 'alert-box alert-danger';
      revealAlert.innerHTML = `<div><strong>Error:</strong> ${error.message}</div>`;
    } finally {
      btnExtract.disabled = false;
      btnExtract.innerHTML = original;
    }
  });

  btnDownloadPayload.addEventListener('click', () => {
    if (!extractedPayload || !extractedMeta) return;
    downloadBlob(
      new Blob([extractedPayload], { type: extractedMeta.type || 'application/octet-stream' }),
      extractedMeta.name || 'payload.bin'
    );
  });
}
