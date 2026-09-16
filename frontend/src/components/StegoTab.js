import { StegoEngine } from '../services/stegoEngine.js';
import { ApiService } from '../services/api.js';

export function renderStegoTab(container, onNavigateToAnalysis) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado de la Pestaña -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card card-glow-cyan" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size: 1.5rem; margin-bottom: 0.25rem;">Esteganografía en Canvas HTML5</h2>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Ocultación de payloads mediante inyección bit a bit en los Bits Menos Significativos (LSB) de los canales R, G y B.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <span class="badge badge-cyan">Canvas API</span>
          <span class="badge badge-emerald">LSB 3-Channel</span>
          <span class="badge badge-purple">PNG Lossless</span>
        </div>
      </div>

      <!-- Selector de Modo de Operación (Ocultar vs Extraer) -->
      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button id="stego-mode-hide-btn" class="btn btn-primary" style="flex: 1;">
          📥 Ocultar Información (Inyección LSB)
        </button>
        <button id="stego-mode-reveal-btn" class="btn btn-secondary" style="flex: 1;">
          🔍 Revelar Información (Extracción LSB)
        </button>
      </div>

      <!-- SECCIÓN 1: OCULTAR INFORMACIÓN -->
      <div id="stego-hide-section" style="margin-top: 1.5rem;">
        <div class="grid-2">
          <!-- Columna Izquierda: Carga de Imagen y Configuración -->
          <div class="card space-y-4" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <h3 style="font-size: 1.15rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              1. Imagen Portadora (Carrier)
            </h3>

            <div id="dropzone-hide" class="dropzone">
              <input type="file" id="carrier-input" accept="image/png, image/jpeg, image/webp" style="display: none;" />
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🖼️</div>
              <p style="font-weight: 600; color: var(--text-primary);">Arrastra una imagen o haz clic para seleccionarla</p>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Soporta PNG, JPEG, WebP (Se convertirá a PNG sin pérdida)</p>
            </div>

            <div id="carrier-info" style="display: none; background: rgba(0,0,0,0.25); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                <span style="color: var(--text-muted);">Resolución:</span>
                <span id="carrier-res" class="font-mono text-white">-</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                <span style="color: var(--text-muted);">Capacidad Máxima LSB:</span>
                <span id="carrier-cap" class="font-mono text-white" style="color: var(--accent-cyan);">-</span>
              </div>
            </div>

            <!-- Preview Imagen Portadora -->
            <div id="carrier-preview-box" class="image-preview-box" style="display: none;">
              <img id="carrier-img" alt="Imagen Portadora" />
            </div>
          </div>

          <!-- Columna Derecha: Carga de Payload y Cifrado -->
          <div class="card space-y-4" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <h3 style="font-size: 1.15rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              2. Datos a Ocultar (Payload)
            </h3>

            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                Modo de Protección Criptográfica:
              </label>
              <select id="stego-crypto-mode" style="margin-bottom: 1rem;">
                <option value="aes">🛡️ Cripto-Esteganografía (Cifrado AES-256-GCM con PBKDF2)</option>
                <option value="plain">📄 Esteganografía Pura (Texto Plano directo)</option>
              </select>
            </div>

            <div id="password-group">
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Contraseña Maestra para Derivación (PBKDF2 600,000 iteraciones):
              </label>
              <input type="password" id="stego-password" placeholder="Ingresa una clave segura..." />
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                <label style="font-size: 0.85rem; color: var(--text-secondary);">Mensaje o Secreto:</label>
                <span id="payload-size-counter" class="font-mono" style="font-size: 0.75rem; color: var(--text-muted);">0 bytes</span>
              </div>
              <textarea id="stego-message" rows="4" placeholder="Escribe aquí el texto confidencial o mensaje secreto que deseas camuflar..."></textarea>
            </div>

            <!-- Barra de Capacidad en Tiempo Real -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.25rem;">
                <span style="color: var(--text-muted);">Ocupación de Capacidad:</span>
                <span id="capacity-percentage" class="font-mono">0%</span>
              </div>
              <div class="progress-container">
                <div id="capacity-bar" class="progress-bar progress-normal" style="width: 0%;"></div>
              </div>
            </div>

            <button id="btn-inject-data" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;" disabled>
              ⚡ Ejecutar Inyección LSB en Canvas
            </button>
          </div>
        </div>

        <!-- Resultados de la Inyección LSB -->
        <div id="stego-result-container" class="card card-glow-emerald" style="display: none; margin-top: 1.5rem;">
          <h3 style="color: var(--accent-emerald); font-size: 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            ✅ Inyección LSB Finalizada Exitosamente
          </h3>

          <div class="grid-2" style="align-items: center;">
            <div>
              <div class="image-preview-box">
                <canvas id="stego-output-canvas"></canvas>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="alert-box alert-success">
                <div>
                  <strong>Protocolo de 32 bits aplicado:</strong> Los primeros 4 bytes registran la longitud exacta del payload en formato Big-Endian, seguido por la secuencia de bits inyectada en los LSBs RGB.
                </div>
              </div>

              <div id="stego-stats-details" class="font-mono" style="font-size: 0.85rem; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; line-height: 1.6;">
                <!-- Se llena dinámicamente -->
              </div>

              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button id="btn-download-stego" class="btn btn-emerald" style="flex: 1;">
                  💾 Descargar PNG Esteganografiado
                </button>
                <button id="btn-send-to-analysis" class="btn btn-secondary" style="flex: 1;">
                  🔬 Enviar a Estegoanálisis Forense
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 2: REVELAR INFORMACIÓN -->
      <div id="stego-reveal-section" style="display: none; margin-top: 1.5rem;">
        <div class="card space-y-4" style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem;">
          <h3 style="font-size: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            Extracción Inversa de Datos Ocultos
          </h3>

          <div id="dropzone-reveal" class="dropzone">
            <input type="file" id="stego-input-file" accept="image/png" style="display: none;" />
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🕵️‍♂️</div>
            <p style="font-weight: 600; color: var(--text-primary);">Sube la imagen PNG sospechosa de contener datos</p>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">El motor LSB leerá la cabecera de 32 bits y reconstruirá el payload</p>
          </div>

          <div id="reveal-image-preview-box" class="image-preview-box" style="display: none;">
            <img id="reveal-img" alt="Imagen Estego" />
          </div>

          <button id="btn-extract-data" class="btn btn-primary" style="width: 100%;" disabled>
            🔓 Extraer Payload LSB
          </button>

          <!-- Resultado de la Extracción -->
          <div id="reveal-result-container" style="display: none; display: flex; flex-direction: column; gap: 1rem;">
            <div id="reveal-status-alert" class="alert-box alert-info">
              <!-- Mensaje de estado -->
            </div>

            <!-- Si el payload extraído es un paquete cifrado AES-GCM -->
            <div id="reveal-crypto-decrypt-box" class="card" style="display: none; background: rgba(0,0,0,0.35); border-color: rgba(168, 85, 247, 0.4); display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="badge badge-purple">AES-256-GCM Detectado</span>
                <span style="font-size: 0.85rem; color: var(--text-secondary);">El payload extraído corresponde a un paquete criptográfico [Salt|IV|Tag|Ciphertext].</span>
              </div>
              <input type="password" id="reveal-decrypt-password" placeholder="Ingresa la contraseña para descifrar el paquete..." />
              <button id="btn-decrypt-revealed" class="btn btn-emerald">
                🔑 Descifrar y Verificar Autenticidad (GCM Tag)
              </button>
            </div>

            <div>
              <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">
                Contenido Revelado:
              </label>
              <textarea id="revealed-content-text" rows="5" readonly class="font-mono"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- Elementos del DOM ---
  const hideBtn = container.querySelector('#stego-mode-hide-btn');
  const revealBtn = container.querySelector('#stego-mode-reveal-btn');
  const hideSection = container.querySelector('#stego-hide-section');
  const revealSection = container.querySelector('#stego-reveal-section');

  const dropzoneHide = container.querySelector('#dropzone-hide');
  const carrierInput = container.querySelector('#carrier-input');
  const carrierInfo = container.querySelector('#carrier-info');
  const carrierRes = container.querySelector('#carrier-res');
  const carrierCap = container.querySelector('#carrier-cap');
  const carrierPreviewBox = container.querySelector('#carrier-preview-box');
  const carrierImg = container.querySelector('#carrier-img');

  const cryptoModeSelect = container.querySelector('#stego-crypto-mode');
  const passwordGroup = container.querySelector('#password-group');
  const stegoPassword = container.querySelector('#stego-password');
  const stegoMessage = container.querySelector('#stego-message');
  const payloadSizeCounter = container.querySelector('#payload-size-counter');
  const capacityBar = container.querySelector('#capacity-bar');
  const capacityPercentage = container.querySelector('#capacity-percentage');
  const btnInjectData = container.querySelector('#btn-inject-data');

  const resultContainer = container.querySelector('#stego-result-container');
  const outputCanvas = container.querySelector('#stego-output-canvas');
  const stegoStatsDetails = container.querySelector('#stego-stats-details');
  const btnDownloadStego = container.querySelector('#btn-download-stego');
  const btnSendToAnalysis = container.querySelector('#btn-send-to-analysis');

  // Reveal elements
  const dropzoneReveal = container.querySelector('#dropzone-reveal');
  const stegoInputFile = container.querySelector('#stego-input-file');
  const revealPreviewBox = container.querySelector('#reveal-image-preview-box');
  const revealImg = container.querySelector('#reveal-img');
  const btnExtractData = container.querySelector('#btn-extract-data');
  const revealResultContainer = container.querySelector('#reveal-result-container');
  const revealStatusAlert = container.querySelector('#reveal-status-alert');
  const revealCryptoDecryptBox = container.querySelector('#reveal-crypto-decrypt-box');
  const revealDecryptPassword = container.querySelector('#reveal-decrypt-password');
  const btnDecryptRevealed = container.querySelector('#btn-decrypt-revealed');
  const revealedContentText = container.querySelector('#revealed-content-text');

  // --- Estado local ---
  let loadedCarrierImage = null;
  let currentMaxCapacityBytes = 0;
  let lastInjectedCanvas = null;
  let loadedRevealImage = null;
  let extractedRawBytes = null;

  // --- Alternancia de modos (Ocultar / Revelar) ---
  hideBtn.addEventListener('click', () => {
    hideBtn.className = 'btn btn-primary';
    revealBtn.className = 'btn btn-secondary';
    hideSection.style.display = 'block';
    revealSection.style.display = 'none';
  });

  revealBtn.addEventListener('click', () => {
    revealBtn.className = 'btn btn-primary';
    hideBtn.className = 'btn btn-secondary';
    revealSection.style.display = 'block';
    hideSection.style.display = 'none';
  });

  // Alternar campo de contraseña según modo
  cryptoModeSelect.addEventListener('change', () => {
    passwordGroup.style.display = cryptoModeSelect.value === 'aes' ? 'block' : 'none';
    updateCapacityMetrics();
  });

  // --- Carga de Imagen Portadora ---
  dropzoneHide.addEventListener('click', () => carrierInput.click());
  dropzoneHide.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneHide.classList.add('dragover');
  });
  dropzoneHide.addEventListener('dragleave', () => dropzoneHide.classList.remove('dragover'));
  dropzoneHide.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneHide.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleCarrierFile(e.dataTransfer.files[0]);
  });
  carrierInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleCarrierFile(e.target.files[0]);
  });

  async function handleCarrierFile(file) {
    try {
      const img = await StegoEngine.loadImage(file);
      loadedCarrierImage = img;
      carrierImg.src = img.src;
      carrierPreviewBox.style.display = 'flex';
      carrierInfo.style.display = 'block';

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const cap = StegoEngine.calculateCapacity(width, height);
      currentMaxCapacityBytes = cap.maxBytes;

      carrierRes.textContent = `${width} × ${height} px (${(cap.totalPixels / 1e6).toFixed(2)} MP)`;
      carrierCap.textContent = `${cap.maxBytes.toLocaleString()} bytes (~${(cap.maxBytes / 1024).toFixed(1)} KB)`;

      updateCapacityMetrics();
      checkInjectReadiness();
    } catch (err) {
      alert(`Error cargando imagen: ${err.message}`);
    }
  }

  // --- Métricas de Capacidad en Vivo ---
  stegoMessage.addEventListener('input', updateCapacityMetrics);

  function updateCapacityMetrics() {
    const text = stegoMessage.value;
    const textBytes = new TextEncoder().encode(text).length;
    // Si es AES, el paquete añade 44 bytes de cabecera [Salt(16)+IV(12)+Tag(16)]
    const isAes = cryptoModeSelect.value === 'aes';
    const estimatedPayloadBytes = isAes ? (textBytes + 44) : textBytes;

    payloadSizeCounter.textContent = `${estimatedPayloadBytes} bytes ${isAes ? '(incluye cabecera criptográfica 44B)' : ''}`;

    if (currentMaxCapacityBytes > 0) {
      const pct = Math.min(100, (estimatedPayloadBytes / currentMaxCapacityBytes) * 100);
      capacityPercentage.textContent = `${pct.toFixed(2)}%`;
      capacityBar.style.width = `${pct}%`;

      if (pct < 70) {
        capacityBar.className = 'progress-bar progress-normal';
      } else if (pct <= 100) {
        capacityBar.className = 'progress-bar progress-warning';
      } else {
        capacityBar.className = 'progress-bar progress-danger';
      }
    }
    checkInjectReadiness();
  }

  function checkInjectReadiness() {
    const hasImage = !!loadedCarrierImage;
    const hasText = stegoMessage.value.trim().length > 0;
    const isAes = cryptoModeSelect.value === 'aes';
    const hasPass = isAes ? stegoPassword.value.length > 0 : true;

    btnInjectData.disabled = !(hasImage && hasText && hasPass);
  }

  stegoPassword.addEventListener('input', checkInjectReadiness);

  // --- Inyección LSB ---
  btnInjectData.addEventListener('click', async () => {
    try {
      btnInjectData.disabled = true;
      btnInjectData.innerHTML = '⏳ Procesando inyección en Canvas...';

      let payloadBytes;
      const text = stegoMessage.value;
      const isAes = cryptoModeSelect.value === 'aes';

      if (isAes) {
        const password = stegoPassword.value;
        const cryptoResult = await ApiService.encryptAESGCM(text, password);
        // cryptoResult.packedBuffer viene en Base64 desde el backend
        const binaryString = atob(cryptoResult.packedBase64);
        payloadBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          payloadBytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        payloadBytes = new TextEncoder().encode(text);
      }

      // Ejecutar inyección LSB
      const { canvas, stats } = StegoEngine.hideData(loadedCarrierImage, payloadBytes);
      lastInjectedCanvas = canvas;

      // Mostrar en el canvas del resultado
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const ctx = outputCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0);

      stegoStatsDetails.innerHTML = `
        <div>• <strong>Dimensiones de Imagen:</strong> ${stats.width} × ${stats.height} px</div>
        <div>• <strong>Tamaño del Payload Inyectado:</strong> ${stats.payloadBytes} bytes</div>
        <div>• <strong>Canales RGB Alterados:</strong> ${stats.modifiedChannels.toLocaleString()} bits</div>
        <div>• <strong>Capacidad Utilizada:</strong> ${stats.capacityUsedPercentage}% de ${stats.capacityMaxBytes.toLocaleString()} bytes</div>
        <div>• <strong>Seguridad:</strong> ${isAes ? 'AES-256-GCM + PBKDF2-SHA512' : 'Texto Plano LSB'}</div>
      `;

      resultContainer.style.display = 'block';
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      alert(`Error en inyección LSB: ${err.message}`);
    } finally {
      btnInjectData.disabled = false;
      btnInjectData.innerHTML = '⚡ Ejecutar Inyección LSB en Canvas';
    }
  });

  // --- Descargar Imagen Stego como PNG sin pérdida ---
  btnDownloadStego.addEventListener('click', async () => {
    if (!lastInjectedCanvas) return;
    const blob = await StegoEngine.exportToPngBlob(lastInjectedCanvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stego_image_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Enviar a Estegoanálisis ---
  btnSendToAnalysis.addEventListener('click', async () => {
    if (!lastInjectedCanvas) return;
    const blob = await StegoEngine.exportToPngBlob(lastInjectedCanvas);
    if (onNavigateToAnalysis) {
      onNavigateToAnalysis(blob);
    }
  });

  // --- SECCIÓN REVELAR / EXTRAER ---
  dropzoneReveal.addEventListener('click', () => stegoInputFile.click());
  stegoInputFile.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const img = await StegoEngine.loadImage(file);
        loadedRevealImage = img;
        revealImg.src = img.src;
        revealPreviewBox.style.display = 'flex';
        btnExtractData.disabled = false;
        revealResultContainer.style.display = 'none';
      } catch (err) {
        alert(err.message);
      }
    }
  });

  btnExtractData.addEventListener('click', () => {
    try {
      if (!loadedRevealImage) return;
      const extracted = StegoEngine.extractData(loadedRevealImage);
      extractedRawBytes = extracted.rawBytes;

      revealResultContainer.style.display = 'flex';

      // Verificar si es un paquete binario AES-GCM (>= 44 bytes de cabecera)
      if (extracted.length >= 44 && extracted.isBinary) {
        revealStatusAlert.className = 'alert-box alert-warning';
        revealStatusAlert.innerHTML = `
          <strong>Payload Cifrado Detectado:</strong> Se han extraído con éxito ${extracted.length} bytes binarios. El flujo contiene una cabecera con Salt, IV y Authentication Tag.
        `;
        revealCryptoDecryptBox.style.display = 'flex';
        // Mostrar Base64 del paquete
        const binaryStr = Array.from(extracted.rawBytes).map(b => String.fromCharCode(b)).join('');
        revealedContentText.value = `[PAQUETE CIFRADO AES-256-GCM - ${extracted.length} BYTES]\nBase64: ${btoa(binaryStr)}`;
      } else {
        revealCryptoDecryptBox.style.display = 'none';
        revealStatusAlert.className = 'alert-box alert-success';
        revealStatusAlert.innerHTML = `
          <strong>Extracción Exitosa:</strong> Se han recuperado ${extracted.length} bytes en texto plano UTF-8.
        `;
        revealedContentText.value = extracted.text || '(Datos no legibles como UTF-8)';
      }
    } catch (err) {
      revealResultContainer.style.display = 'flex';
      revealCryptoDecryptBox.style.display = 'none';
      revealStatusAlert.className = 'alert-box alert-danger';
      revealStatusAlert.innerHTML = `<strong>Error de Extracción:</strong> ${err.message}`;
      revealedContentText.value = '';
    }
  });

  btnDecryptRevealed.addEventListener('click', async () => {
    try {
      const password = revealDecryptPassword.value;
      if (!password) {
        alert('Por favor ingresa la contraseña maestra para descifrar.');
        return;
      }
      const binaryStr = Array.from(extractedRawBytes).map(b => String.fromCharCode(b)).join('');
      const base64Data = btoa(binaryStr);

      const decrypted = await ApiService.decryptAESGCM(base64Data, password);

      revealStatusAlert.className = 'alert-box alert-success';
      revealStatusAlert.innerHTML = `
        <strong>¡Autenticación y Descifrado Exitosos!</strong> El Authentication Tag de 16 bytes coincidió matemáticamente. La integridad y confidencialidad fueron verificadas.
      `;
      revealedContentText.value = decrypted.plaintextUtf8;
    } catch (err) {
      revealStatusAlert.className = 'alert-box alert-danger';
      revealStatusAlert.innerHTML = `<strong>Fallo de Integridad / Clave Incorrecta:</strong> ${err.message}`;
    }
  });
}
