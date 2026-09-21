import { StegoEngine } from '../services/stegoEngine.js';
import { ApiService } from '../services/api.js';

export function renderStegoTab(container, onNavigateToAnalysis, onNavigateToAttack) {
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
              <input type="file" id="carrier-input" accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp, image/*" style="display: none;" />
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🖼️</div>
              <p style="font-weight: 600; color: var(--text-primary);">Arrastra una imagen o haz clic para seleccionarla</p>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Soporta PNG, JPEG, JPG, WebP, BMP (Se convertirá a PNG automáticamente sin pérdida)</p>
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
              <div id="carrier-conversion-badge" class="badge badge-amber" style="display: none; margin-top: 0.5rem; font-size: 0.75rem; padding: 0.35rem 0.65rem;"></div>
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

            <!-- Selector de Tipo de Secreto: Texto vs Archivo -->
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                Tipo de Información a Ocultar:
              </label>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                <button type="button" id="btn-secret-type-text" class="btn btn-primary" style="flex: 1; padding: 0.45rem 0.75rem; font-size: 0.85rem;">
                  📝 Mensaje de Texto
                </button>
                <button type="button" id="btn-secret-type-file" class="btn btn-secondary" style="flex: 1; padding: 0.45rem 0.75rem; font-size: 0.85rem;">
                  📁 Archivo Confidencial (Cualquiera)
                </button>
              </div>
            </div>

            <!-- Grupo de Mensaje de Texto -->
            <div id="secret-text-group">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                <label style="font-size: 0.85rem; color: var(--text-secondary);">Mensaje o Secreto:</label>
                <span id="payload-size-counter" class="font-mono" style="font-size: 0.75rem; color: var(--text-muted);">0 bytes</span>
              </div>
              <textarea id="stego-message" rows="4" placeholder="Escribe aquí el texto confidencial o mensaje secreto que deseas camuflar..."></textarea>
            </div>

            <!-- Grupo de Carga de Archivo Confidencial -->
            <div id="secret-file-group" style="display: none; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                <label style="font-size: 0.85rem; color: var(--text-secondary);">Archivo Confidencial a Camuflar:</label>
                <span id="secret-file-size-counter" class="font-mono" style="font-size: 0.75rem; color: var(--text-muted);">Ningún archivo seleccionado</span>
              </div>

              <div id="dropzone-secret-file" class="dropzone" style="padding: 1.25rem 1rem; border-style: dashed; cursor: pointer;">
                <input type="file" id="secret-file-input" style="display: none;" />
                <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">📁</div>
                <p style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">Arrastra un archivo o haz clic para seleccionarlo</p>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Soporta PDF, DOCX, ZIP, PNG, JPG, TXT, KEY o cualquier binario</p>
              </div>

              <!-- Tarjeta de Archivo Seleccionado -->
              <div id="selected-secret-file-card" style="display: none; background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 8px; padding: 0.75rem 1rem; align-items: center; justify-content: space-between; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden;">
                  <div id="selected-secret-file-icon" style="font-size: 1.8rem;">📎</div>
                  <div style="overflow: hidden;">
                    <div id="selected-secret-file-name" class="font-mono" style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">-</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.5rem;">
                      <span id="selected-secret-file-size">-</span>
                      <span>•</span>
                      <span id="selected-secret-file-type" style="color: var(--accent-cyan);">-</span>
                    </div>
                  </div>
                </div>
                <button type="button" id="btn-remove-secret-file" class="btn btn-rose" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; white-space: nowrap;">
                  ✕ Quitar
                </button>
              </div>

              <!-- Miniatura si el archivo secreto es una imagen -->
              <div id="selected-secret-img-preview" style="display: none; justify-content: center; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 0.5rem; max-height: 140px; overflow: hidden;">
                <img id="selected-secret-img" style="max-height: 120px; border-radius: 4px; object-fit: contain;" alt="Vista previa de imagen secreta" />
              </div>
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
              <div id="capacity-warning-msg" style="display: none; margin-top: 0.35rem; font-size: 0.75rem; color: #f87171;">
                <!-- Mensaje de sobrecupo si el archivo excede -->
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
                  <strong>Protocolo STG1 de 32 bits aplicado:</strong> El payload incluye cabecera de longitud Big-Endian con contenedor estructurado, inyectado bit a bit en los LSBs de los canales R, G y B.
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
                <button id="btn-send-to-attack" class="btn btn-rose" style="flex: 1; background: linear-gradient(135deg, #a855f7, #f43f5e); border: none;">
                  💥 Atacar en Tiempo Real
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
            <input type="file" id="stego-input-file" accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp, image/*" style="display: none;" />
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🕵️‍♂️</div>
            <p style="font-weight: 600; color: var(--text-primary);">Sube la imagen sospechosa de contener datos (PNG, JPEG, WebP, etc.)</p>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Se convertirá y analizará automáticamente sin pérdida para extraer el payload LSB</p>
            <div id="reveal-conversion-badge" class="badge badge-amber" style="display: none; margin-top: 0.5rem; font-size: 0.75rem; padding: 0.35rem 0.65rem;"></div>
          </div>

          <div id="reveal-image-preview-box" class="image-preview-box" style="display: none;">
            <img id="reveal-img" alt="Imagen Estego" />
          </div>

          <button id="btn-extract-data" class="btn btn-primary" style="width: 100%;" disabled>
            🔓 Extraer Payload LSB
          </button>

          <!-- Resultado de la Extracción -->
          <div id="reveal-result-container" style="display: none; flex-direction: column; gap: 1rem;">
            <div id="reveal-status-alert" class="alert-box alert-info">
              <!-- Mensaje de estado -->
            </div>

            <!-- Si el payload extraído es un paquete cifrado AES-GCM -->
            <div id="reveal-crypto-decrypt-box" class="card" style="display: none; background: rgba(0,0,0,0.35); border-color: rgba(168, 85, 247, 0.4); flex-direction: column; gap: 0.85rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="badge badge-purple">AES-256-GCM Detectado</span>
                  <span style="font-size: 0.85rem; color: var(--text-secondary);">El payload extraído corresponde a un paquete criptográfico [Salt|IV|Tag|Ciphertext].</span>
                </div>
                <span id="stego-attempts-badge" class="badge badge-rose" style="display: none; font-size: 0.75rem; font-weight: 600;">Intentos restantes: 5/5</span>
              </div>

              <!-- Input de contraseña -->
              <input type="password" id="reveal-decrypt-password" placeholder="Ingresa la contraseña para descifrar el paquete..." />

              <!-- Banner de Bloqueo Temporal por Cooldown Anti-Fuerza Bruta -->
              <div id="stego-lockout-banner" class="alert-box alert-danger" style="display: none; align-items: center; gap: 0.85rem; padding: 0.85rem 1rem; border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.12);">
                <span style="font-size: 1.75rem; line-height: 1;">⏳</span>
                <div style="flex: 1;">
                  <div style="font-weight: 700; color: #fca5a5; font-size: 0.95rem; margin-bottom: 0.2rem;">
                    Bloqueo de Seguridad Anti-Fuerza Bruta
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
                    Demasiados intentos fallidos. Entrada suspendida por <strong id="stego-penalty-label" style="color: #fca5a5;">1 minuto</strong>.
                    Podrás volver a intentar en: <span id="stego-countdown-display" style="color: #ef4444; font-family: monospace; font-size: 1.1rem; font-weight: 700; margin-left: 0.25rem;">01:00</span>
                  </div>
                </div>
              </div>

              <button id="btn-decrypt-revealed" class="btn btn-emerald">
                🔑 Descifrar y Verificar Autenticidad (GCM Tag)
              </button>
            </div>

            <!-- Tarjeta si el contenido revelado es un archivo binario -->
            <div id="revealed-file-card" class="card card-glow-emerald" style="display: none; flex-direction: column; gap: 1rem; background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div id="revealed-file-icon" style="font-size: 2.2rem;">📄</div>
                  <div>
                    <div id="revealed-file-name" class="font-mono" style="font-size: 1.05rem; font-weight: 700; color: var(--accent-emerald);">-</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 0.75rem; margin-top: 0.2rem;">
                      <span id="revealed-file-size">-</span>
                      <span>•</span>
                      <span id="revealed-file-type" style="color: var(--accent-cyan);">-</span>
                    </div>
                  </div>
                </div>
                <span class="badge badge-emerald">Archivo Reconstruido ✓</span>
              </div>

              <!-- Vista previa si el archivo secreto es imagen -->
              <div id="revealed-image-preview-box" style="display: none; justify-content: center; background: rgba(0,0,0,0.4); border-radius: 6px; padding: 0.75rem; max-height: 240px; overflow: hidden;">
                <img id="revealed-secret-image" style="max-height: 220px; border-radius: 4px; object-fit: contain;" alt="Imagen secreta revelada" />
              </div>

              <div style="display: flex; gap: 0.75rem;">
                <button id="btn-download-revealed-file" class="btn btn-emerald" style="flex: 1; padding: 0.65rem 1.25rem; font-size: 0.9rem; font-weight: 600;">
                  💾 Descargar Archivo Extraído
                </button>
              </div>
            </div>

            <!-- Caja si el contenido revelado es texto -->
            <div id="revealed-text-box">
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

  // Selector de tipo de secreto
  const btnSecretTypeText = container.querySelector('#btn-secret-type-text');
  const btnSecretTypeFile = container.querySelector('#btn-secret-type-file');
  const secretTextGroup = container.querySelector('#secret-text-group');
  const secretFileGroup = container.querySelector('#secret-file-group');

  const stegoMessage = container.querySelector('#stego-message');
  const payloadSizeCounter = container.querySelector('#payload-size-counter');

  // File Secret Elements
  const dropzoneSecretFile = container.querySelector('#dropzone-secret-file');
  const secretFileInput = container.querySelector('#secret-file-input');
  const secretFileSizeCounter = container.querySelector('#secret-file-size-counter');
  const selectedSecretFileCard = container.querySelector('#selected-secret-file-card');
  const selectedSecretFileIcon = container.querySelector('#selected-secret-file-icon');
  const selectedSecretFileName = container.querySelector('#selected-secret-file-name');
  const selectedSecretFileSize = container.querySelector('#selected-secret-file-size');
  const selectedSecretFileType = container.querySelector('#selected-secret-file-type');
  const btnRemoveSecretFile = container.querySelector('#btn-remove-secret-file');
  const selectedSecretImgPreview = container.querySelector('#selected-secret-img-preview');
  const selectedSecretImg = container.querySelector('#selected-secret-img');

  const capacityBar = container.querySelector('#capacity-bar');
  const capacityPercentage = container.querySelector('#capacity-percentage');
  const capacityWarningMsg = container.querySelector('#capacity-warning-msg');
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
  const stegoAttemptsBadge = container.querySelector('#stego-attempts-badge');
  const stegoLockoutBanner = container.querySelector('#stego-lockout-banner');
  const stegoPenaltyLabel = container.querySelector('#stego-penalty-label');
  const stegoCountdownDisplay = container.querySelector('#stego-countdown-display');

  const revealedFileCard = container.querySelector('#revealed-file-card');
  const revealedFileIcon = container.querySelector('#revealed-file-icon');
  const revealedFileName = container.querySelector('#revealed-file-name');
  const revealedFileSize = container.querySelector('#revealed-file-size');
  const revealedFileType = container.querySelector('#revealed-file-type');
  const revealedImagePreviewBox = container.querySelector('#revealed-image-preview-box');
  const revealedSecretImage = container.querySelector('#revealed-secret-image');
  const btnDownloadRevealedFile = container.querySelector('#btn-download-revealed-file');

  const revealedTextBox = container.querySelector('#revealed-text-box');
  const revealedContentText = container.querySelector('#revealed-content-text');

  // --- Estado local ---
  let loadedCarrierImage = null;
  let currentMaxCapacityBytes = 0;
  let lastInjectedCanvas = null;
  let lastInjectedPayloadBytes = null;
  let lastInjectedIsAes = false;
  let lastInjectedPassword = '';
  let lastInjectedPlaintext = '';
  let loadedRevealImage = null;
  let extractedRawBytes = null;
  let activeSecretType = 'text'; // 'text' | 'file'
  let selectedSecretFile = null;
  let selectedSecretFileBytes = null;
  let lastExtractedUnpacked = null;

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getFileIcon(filename, mimeType) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext) || (mimeType && mimeType.startsWith('image/'))) return '🖼️';
    if (['pdf'].includes(ext) || mimeType === 'application/pdf') return '📕';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
    if (['txt', 'md', 'json', 'xml', 'log'].includes(ext)) return '📄';
    if (['key', 'pem', 'crt', 'cer', 'pub'].includes(ext)) return '🔑';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return '🎵';
    if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) return '🎬';
    return '📁';
  }

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

  // Alternancia de tipo de secreto (Texto vs Archivo)
  btnSecretTypeText.addEventListener('click', () => {
    activeSecretType = 'text';
    btnSecretTypeText.className = 'btn btn-primary';
    btnSecretTypeFile.className = 'btn btn-secondary';
    secretTextGroup.style.display = 'block';
    secretFileGroup.style.display = 'none';
    updateCapacityMetrics();
    checkInjectReadiness();
  });

  btnSecretTypeFile.addEventListener('click', () => {
    activeSecretType = 'file';
    btnSecretTypeFile.className = 'btn btn-primary';
    btnSecretTypeText.className = 'btn btn-secondary';
    secretFileGroup.style.display = 'flex';
    secretTextGroup.style.display = 'none';
    updateCapacityMetrics();
    checkInjectReadiness();
  });

  // Alternar campo de contraseña según modo criptográfico
  cryptoModeSelect.addEventListener('change', () => {
    passwordGroup.style.display = cryptoModeSelect.value === 'aes' ? 'block' : 'none';
    updateCapacityMetrics();
    checkInjectReadiness();
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
      const carrierBadge = container.querySelector('#carrier-conversion-badge');
      const conversion = await StegoEngine.convertToPng(file);
      const img = conversion.imageElement;
      loadedCarrierImage = img;
      carrierImg.src = img.src;
      carrierPreviewBox.style.display = 'flex';
      carrierInfo.style.display = 'block';

      const width = conversion.width;
      const height = conversion.height;
      const cap = StegoEngine.calculateCapacity(width, height);
      currentMaxCapacityBytes = cap.maxBytes;

      carrierRes.textContent = `${width} × ${height} px (${(cap.totalPixels / 1e6).toFixed(2)} MP)`;
      carrierCap.textContent = `${cap.maxBytes.toLocaleString()} bytes (~${(cap.maxBytes / 1024).toFixed(1)} KB)`;

      if (carrierBadge) {
        if (conversion.wasConverted) {
          const origFormat = (conversion.originalType || 'JPEG').replace('image/', '').toUpperCase();
          carrierBadge.style.display = 'inline-flex';
          carrierBadge.innerHTML = `⚡ Convertido de <code>${origFormat}</code> a <code>PNG</code> sin pérdida`;
        } else {
          carrierBadge.style.display = 'none';
        }
      }

      updateCapacityMetrics();
      checkInjectReadiness();
    } catch (err) {
      alert(`Error cargando imagen: ${err.message}`);
    }
  }

  // --- Carga de Archivo Confidencial a Ocultar ---
  dropzoneSecretFile.addEventListener('click', () => secretFileInput.click());
  dropzoneSecretFile.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneSecretFile.classList.add('dragover');
  });
  dropzoneSecretFile.addEventListener('dragleave', () => dropzoneSecretFile.classList.remove('dragover'));
  dropzoneSecretFile.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneSecretFile.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleSecretFile(e.dataTransfer.files[0]);
  });
  secretFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleSecretFile(e.target.files[0]);
  });

  function handleSecretFile(file) {
    selectedSecretFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedSecretFileBytes = new Uint8Array(e.target.result);

      selectedSecretFileName.textContent = file.name;
      selectedSecretFileSize.textContent = formatBytes(file.size);
      selectedSecretFileType.textContent = file.type || 'Binario genérico';
      selectedSecretFileIcon.textContent = getFileIcon(file.name, file.type);
      secretFileSizeCounter.textContent = `${formatBytes(file.size)} (${file.size.toLocaleString()} bytes)`;

      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        selectedSecretImg.src = url;
        selectedSecretImgPreview.style.display = 'flex';
      } else {
        selectedSecretImgPreview.style.display = 'none';
      }

      selectedSecretFileCard.style.display = 'flex';
      dropzoneSecretFile.style.display = 'none';

      updateCapacityMetrics();
      checkInjectReadiness();
    };
    reader.readAsArrayBuffer(file);
  }

  btnRemoveSecretFile.addEventListener('click', () => {
    selectedSecretFile = null;
    selectedSecretFileBytes = null;
    secretFileInput.value = '';
    selectedSecretFileCard.style.display = 'none';
    selectedSecretImgPreview.style.display = 'none';
    dropzoneSecretFile.style.display = 'block';
    secretFileSizeCounter.textContent = 'Ningún archivo seleccionado';
    updateCapacityMetrics();
    checkInjectReadiness();
  });

  // --- Métricas de Capacidad en Vivo ---
  stegoMessage.addEventListener('input', updateCapacityMetrics);
  stegoPassword.addEventListener('input', checkInjectReadiness);

  function calculateRawPayloadSize() {
    if (activeSecretType === 'text') {
      const text = stegoMessage.value;
      const textLen = new TextEncoder().encode(text).length;
      return textLen > 0 ? (5 + textLen) : 0; // 4B magic + 1B type + textLen
    } else {
      if (!selectedSecretFile || !selectedSecretFileBytes) return 0;
      const nameLen = new TextEncoder().encode(selectedSecretFile.name).length;
      const mimeLen = new TextEncoder().encode(selectedSecretFile.type || 'application/octet-stream').length;
      return 4 + 1 + 2 + nameLen + 2 + mimeLen + selectedSecretFileBytes.length;
    }
  }

  function updateCapacityMetrics() {
    const rawPayloadBytes = calculateRawPayloadSize();
    const isAes = cryptoModeSelect.value === 'aes';
    const estimatedTotalBytes = rawPayloadBytes > 0 ? (isAes ? (rawPayloadBytes + 44) : rawPayloadBytes) : 0;

    const descText = `${estimatedTotalBytes.toLocaleString()} bytes ${isAes ? '(incluye cabecera AES-GCM 44B)' : ''}`;
    payloadSizeCounter.textContent = descText;
    if (activeSecretType === 'file' && selectedSecretFile) {
      secretFileSizeCounter.textContent = `${selectedSecretFile.name} — ${formatBytes(selectedSecretFile.size)} [Total empaquetado: ${descText}]`;
    }

    if (currentMaxCapacityBytes > 0) {
      const pct = (estimatedTotalBytes / currentMaxCapacityBytes) * 100;
      const displayPct = Math.min(100, pct);
      capacityPercentage.textContent = `${pct.toFixed(2)}%`;
      capacityBar.style.width = `${displayPct}%`;

      if (pct > 100) {
        capacityBar.className = 'progress-bar progress-danger';
        capacityWarningMsg.style.display = 'block';
        capacityWarningMsg.innerHTML = `⚠️ Sobrecupo: El payload (${formatBytes(estimatedTotalBytes)}) supera la capacidad máxima de la portadora (${formatBytes(currentMaxCapacityBytes)}). Sube una imagen de mayor resolución.`;
      } else if (pct > 75) {
        capacityBar.className = 'progress-bar progress-warning';
        capacityWarningMsg.style.display = 'none';
      } else {
        capacityBar.className = 'progress-bar progress-normal';
        capacityWarningMsg.style.display = 'none';
      }
    }
    checkInjectReadiness();
  }

  function checkInjectReadiness() {
    const hasImage = !!loadedCarrierImage;
    const hasPayload = activeSecretType === 'text' 
      ? stegoMessage.value.trim().length > 0 
      : (!!selectedSecretFile && !!selectedSecretFileBytes);
    const isAes = cryptoModeSelect.value === 'aes';
    const hasPass = isAes ? stegoPassword.value.length > 0 : true;

    const rawPayloadBytes = calculateRawPayloadSize();
    const estimatedTotalBytes = rawPayloadBytes > 0 ? (isAes ? (rawPayloadBytes + 44) : rawPayloadBytes) : 0;
    const fitsCapacity = currentMaxCapacityBytes > 0 && estimatedTotalBytes <= currentMaxCapacityBytes;

    btnInjectData.disabled = !(hasImage && hasPayload && hasPass && fitsCapacity);
  }

  // --- Inyección LSB ---
  btnInjectData.addEventListener('click', async () => {
    try {
      btnInjectData.disabled = true;
      btnInjectData.innerHTML = '⏳ Procesando inyección en Canvas...';

      let unencryptedPayloadBytes;
      if (activeSecretType === 'text') {
        const text = stegoMessage.value;
        unencryptedPayloadBytes = StegoEngine.packPayload({ type: 'text', text });
      } else {
        unencryptedPayloadBytes = StegoEngine.packPayload({
          type: 'file',
          fileBytes: selectedSecretFileBytes,
          filename: selectedSecretFile.name,
          mimeType: selectedSecretFile.type || 'application/octet-stream'
        });
      }

      let payloadBytesToInject;
      const isAes = cryptoModeSelect.value === 'aes';

      if (isAes) {
        const password = stegoPassword.value;
        const cryptoResult = await ApiService.encryptAESGCM(unencryptedPayloadBytes, password);
        const binaryString = atob(cryptoResult.packedBase64);
        payloadBytesToInject = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          payloadBytesToInject[i] = binaryString.charCodeAt(i);
        }
      } else {
        payloadBytesToInject = unencryptedPayloadBytes;
      }

      // Ejecutar inyección LSB
      const { canvas, stats } = StegoEngine.hideData(loadedCarrierImage, payloadBytesToInject);
      lastInjectedCanvas = canvas;
      lastInjectedPayloadBytes = payloadBytesToInject;
      lastInjectedIsAes = isAes;
      lastInjectedPassword = isAes ? stegoPassword.value : '';
      lastInjectedPlaintext = activeSecretType === 'text' ? stegoMessage.value : (selectedSecretFile ? selectedSecretFile.name : '');

      // Mostrar en el canvas del resultado
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const ctx = outputCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0);

      const typeDesc = activeSecretType === 'text' 
        ? 'Mensaje de Texto' 
        : `Archivo: "${selectedSecretFile.name}" (${formatBytes(selectedSecretFile.size)})`;

      stegoStatsDetails.innerHTML = `
        <div>• <strong>Tipo de Secreto:</strong> ${typeDesc}</div>
        <div>• <strong>Dimensiones de Imagen:</strong> ${stats.width} × ${stats.height} px</div>
        <div>• <strong>Tamaño del Payload Inyectado:</strong> ${stats.payloadBytes.toLocaleString()} bytes</div>
        <div>• <strong>Canales RGB Alterados:</strong> ${stats.modifiedChannels.toLocaleString()} bits</div>
        <div>• <strong>Capacidad Utilizada:</strong> ${stats.capacityUsedPercentage}% de ${stats.capacityMaxBytes.toLocaleString()} bytes</div>
        <div>• <strong>Seguridad:</strong> ${isAes ? 'AES-256-GCM + PBKDF2-SHA512' : 'Esteganografía Pura LSB'}</div>
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

  // --- Enviar a Ataque en Tiempo Real ---
  const btnSendToAttack = container.querySelector('#btn-send-to-attack');
  if (btnSendToAttack) {
    btnSendToAttack.addEventListener('click', () => {
      if (!lastInjectedCanvas) return;
      if (onNavigateToAttack) {
        onNavigateToAttack({
          canvas: lastInjectedCanvas,
          payloadBytes: lastInjectedPayloadBytes,
          isAes: lastInjectedIsAes,
          password: lastInjectedPassword,
          plaintext: lastInjectedPlaintext,
          filename: 'Imagen Esteganográfica Inyectada'
        });
      }
    });
  }

  // --- SECCIÓN REVELAR / EXTRAER ---
  dropzoneReveal.addEventListener('click', () => stegoInputFile.click());
  dropzoneReveal.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneReveal.classList.add('dragover');
  });
  dropzoneReveal.addEventListener('dragleave', () => dropzoneReveal.classList.remove('dragover'));
  dropzoneReveal.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneReveal.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleRevealFile(e.dataTransfer.files[0]);
  });
  stegoInputFile.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      handleRevealFile(e.target.files[0]);
    }
  });

  async function handleRevealFile(file) {
    try {
      const revealBadge = container.querySelector('#reveal-conversion-badge');
      const conversion = await StegoEngine.convertToPng(file);
      const img = conversion.imageElement;
      loadedRevealImage = img;
      revealImg.src = img.src;
      revealPreviewBox.style.display = 'flex';
      btnExtractData.disabled = false;
      revealResultContainer.style.display = 'none';

      if (revealBadge) {
        if (conversion.wasConverted) {
          const origFormat = (conversion.originalType || 'JPEG').replace('image/', '').toUpperCase();
          revealBadge.style.display = 'inline-flex';
          revealBadge.innerHTML = `⚡ Convertido de <code>${origFormat}</code> a <code>PNG</code> sin pérdida`;
        } else {
          revealBadge.style.display = 'none';
        }
      }
    } catch (err) {
      alert(`Error cargando imagen: ${err.message}`);
    }
  }

  function renderRevealedContent(unpacked) {
    lastExtractedUnpacked = unpacked;

    if (unpacked.type === 'file') {
      revealedFileCard.style.display = 'flex';
      revealedTextBox.style.display = 'none';

      revealedFileName.textContent = unpacked.filename || 'archivo_extraido.bin';
      revealedFileSize.textContent = formatBytes(unpacked.size);
      revealedFileType.textContent = unpacked.mimeType || 'application/octet-stream';
      revealedFileIcon.textContent = getFileIcon(unpacked.filename, unpacked.mimeType);

      if (unpacked.mimeType && unpacked.mimeType.startsWith('image/') && unpacked.blob) {
        const url = URL.createObjectURL(unpacked.blob);
        revealedSecretImage.src = url;
        revealedImagePreviewBox.style.display = 'flex';
      } else {
        revealedImagePreviewBox.style.display = 'none';
      }
    } else {
      revealedFileCard.style.display = 'none';
      revealedTextBox.style.display = 'block';
      revealedContentText.value = unpacked.text || '(Mensaje de texto vacío)';
    }
  }

  btnDownloadRevealedFile.addEventListener('click', () => {
    if (!lastExtractedUnpacked || !lastExtractedUnpacked.blob) return;
    const url = URL.createObjectURL(lastExtractedUnpacked.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lastExtractedUnpacked.filename || 'archivo_extraido.bin';
    a.click();
    URL.revokeObjectURL(url);
  });

  btnExtractData.addEventListener('click', () => {
    try {
      if (!loadedRevealImage) return;
      const extracted = StegoEngine.extractData(loadedRevealImage);
      extractedRawBytes = extracted.rawBytes;

      revealResultContainer.style.display = 'flex';

      // Verificar si es un paquete binario AES-GCM (>= 44 bytes de cabecera [Salt(16)+IV(12)+Tag(16)])
      // Un paquete AES GCM tiene salt/iv/tag aleatorio por lo que no comienza por STG1
      const isStg1 = extracted.rawBytes.length >= 5 &&
        extracted.rawBytes[0] === 0x53 &&
        extracted.rawBytes[1] === 0x54 &&
        extracted.rawBytes[2] === 0x47 &&
        extracted.rawBytes[3] === 0x31;

      if (!isStg1 && extracted.length >= 44 && extracted.isBinary) {
        revealStatusAlert.className = 'alert-box alert-warning';
        revealStatusAlert.innerHTML = `
          <strong>Payload Cifrado Detectado:</strong> Se han extraído con éxito ${extracted.length.toLocaleString()} bytes binarios. El flujo contiene una cabecera con Salt, IV y Authentication Tag.
        `;
        revealCryptoDecryptBox.style.display = 'flex';
        updateLockoutUI();
        revealedFileCard.style.display = 'none';
        revealedTextBox.style.display = 'block';
        const binaryStr = Array.from(extracted.rawBytes).map(b => String.fromCharCode(b)).join('');
        revealedContentText.value = `[PAQUETE CIFRADO AES-256-GCM - ${extracted.length} BYTES]\nBase64: ${btoa(binaryStr)}`;
      } else {
        revealCryptoDecryptBox.style.display = 'none';
        const unpacked = StegoEngine.unpackPayload(extracted.rawBytes);
        revealStatusAlert.className = 'alert-box alert-success';
        revealStatusAlert.innerHTML = `
          <strong>Extracción Exitosa:</strong> Se ha reconstruido el secreto (${unpacked.type === 'file' ? `Archivo "${unpacked.filename}"` : 'Texto plano UTF-8'}) con un total de ${extracted.length.toLocaleString()} bytes.
        `;
        renderRevealedContent(unpacked);
      }
    } catch (err) {
      revealResultContainer.style.display = 'flex';
      revealCryptoDecryptBox.style.display = 'none';
      revealedFileCard.style.display = 'none';
      revealedTextBox.style.display = 'block';
      revealStatusAlert.className = 'alert-box alert-danger';
      revealStatusAlert.innerHTML = `<strong>Error de Extracción:</strong> ${err.message}`;
      revealedContentText.value = '';
    }
  });

  // --- Sistema de Notificaciones Toast en Esteganografía ---
  const showToast = ({ title, message, icon = 'ℹ️', type = 'info', duration = 2500 }) => {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = `crypto-toast crypto-toast-${type}`;
    toast.innerHTML = `
      <div class="crypto-toast-icon">${icon}</div>
      <div class="crypto-toast-content">
        <div class="crypto-toast-title">${title}</div>
        <div class="crypto-toast-body">${message}</div>
      </div>
      <div class="crypto-toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;
    toastContainer.appendChild(toast);
    const timer = setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        toast.remove();
        if (toastContainer && toastContainer.children.length === 0) toastContainer.remove();
      }, 300);
    }, duration);
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', () => {
      clearTimeout(timer);
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        toast.remove();
        if (toastContainer && toastContainer.children.length === 0) toastContainer.remove();
      }, 200);
    });
  };

  // --- Sistema Anti-Fuerza Bruta y Cooldown Progresivo (1m -> 5m -> 10m) ---
  const LOCKOUT_STORAGE_KEY = 'stego_bruteforce_lockout_v1';
  let countdownTimerId = null;

  function getLockoutState() {
    try {
      const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return { failedAttempts: 0, penaltyStage: 0, lockoutUntil: 0 };
  }

  function saveLockoutState(state) {
    try {
      localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Fallback
    }
  }

  function clearLockoutState() {
    try {
      localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    } catch {
      // Fallback
    }
    if (countdownTimerId) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
  }

  function startLockoutCountdown(lockoutUntil, penaltyStage) {
    if (countdownTimerId) clearInterval(countdownTimerId);

    stegoLockoutBanner.style.display = 'flex';
    revealDecryptPassword.disabled = true;
    btnDecryptRevealed.disabled = true;
    btnDecryptRevealed.style.cursor = 'not-allowed';

    let penaltyLabelText = '1 minuto';
    if (penaltyStage === 2) penaltyLabelText = '5 minutos';
    else if (penaltyStage >= 3) penaltyLabelText = '10 minutos';
    stegoPenaltyLabel.textContent = penaltyLabelText;

    stegoAttemptsBadge.style.display = 'inline-block';
    stegoAttemptsBadge.className = 'badge badge-rose';
    stegoAttemptsBadge.textContent = '🔒 Bloqueado por Cooldown';

    const tick = () => {
      const now = Date.now();
      const remainingMs = lockoutUntil - now;
      if (remainingMs <= 0) {
        clearInterval(countdownTimerId);
        countdownTimerId = null;
        stegoLockoutBanner.style.display = 'none';
        revealDecryptPassword.disabled = false;
        btnDecryptRevealed.disabled = false;
        btnDecryptRevealed.innerHTML = '🔑 Descifrar y Verificar Autenticidad (GCM Tag)';
        btnDecryptRevealed.style.cursor = 'pointer';
        revealDecryptPassword.focus();

        stegoAttemptsBadge.style.display = 'inline-block';
        stegoAttemptsBadge.className = 'badge badge-amber';
        stegoAttemptsBadge.textContent = '⚠️ Reintento desbloqueado';

        showToast({
          title: 'Tiempo de Espera Finalizado',
          message: 'El bloqueo ha expirado. Ya puedes volver a ingresar la contraseña maestra.',
          icon: '🔓',
          type: 'info',
          duration: 3000
        });
        return;
      }

      const totalSec = Math.ceil(remainingMs / 1000);
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      stegoCountdownDisplay.textContent = `${mins}:${secs}`;
      btnDecryptRevealed.innerHTML = `⏳ Bloqueado por Seguridad (${mins}:${secs})`;
    };

    tick();
    countdownTimerId = setInterval(tick, 1000);
  }

  function updateLockoutUI() {
    const state = getLockoutState();
    const now = Date.now();

    if (state.lockoutUntil && state.lockoutUntil > now) {
      startLockoutCountdown(state.lockoutUntil, state.penaltyStage);
      return;
    }

    if (countdownTimerId) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }

    stegoLockoutBanner.style.display = 'none';
    revealDecryptPassword.disabled = false;
    btnDecryptRevealed.disabled = false;
    btnDecryptRevealed.innerHTML = '🔑 Descifrar y Verificar Autenticidad (GCM Tag)';
    btnDecryptRevealed.style.cursor = 'pointer';

    if (state.penaltyStage === 0 && state.failedAttempts > 0 && state.failedAttempts < 5) {
      const remaining = 5 - state.failedAttempts;
      stegoAttemptsBadge.style.display = 'inline-block';
      stegoAttemptsBadge.className = remaining <= 2 ? 'badge badge-rose' : 'badge badge-amber';
      stegoAttemptsBadge.textContent = `Intentos restantes: ${remaining}/5`;
    } else if (state.penaltyStage > 0) {
      stegoAttemptsBadge.style.display = 'inline-block';
      stegoAttemptsBadge.className = 'badge badge-rose';
      stegoAttemptsBadge.textContent = '⚠️ 1 intento antes de nuevo cooldown';
    } else {
      stegoAttemptsBadge.style.display = 'none';
    }
  }

  btnDecryptRevealed.addEventListener('click', async () => {
    const state = getLockoutState();
    const now = Date.now();

    // Verificación preventiva de bloqueo activo
    if (state.lockoutUntil && state.lockoutUntil > now) {
      startLockoutCountdown(state.lockoutUntil, state.penaltyStage);
      showToast({
        title: 'Acceso en Cooldown',
        message: 'Debes esperar a que el temporizador finalice para reintentar.',
        icon: '⏳',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    const password = revealDecryptPassword.value;
    if (!password) {
      showToast({
        title: 'Contraseña Requerida',
        message: 'Por favor ingresa la contraseña maestra para descifrar.',
        icon: '⚠️',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    try {
      btnDecryptRevealed.disabled = true;
      btnDecryptRevealed.innerHTML = '⏳ Descifrando y derivando PBKDF2...';

      const binaryStr = Array.from(extractedRawBytes).map(b => String.fromCharCode(b)).join('');
      const base64Data = btoa(binaryStr);

      const decrypted = await ApiService.decryptAESGCM(base64Data, password);

      // ¡CONTRASEÑA CORRECTA! Reiniciar los 5 intentos y el nivel de penalización
      clearLockoutState();
      updateLockoutUI();

      // Convertir plaintextBase64 a Uint8Array
      const decryptedBinaryStr = atob(decrypted.plaintextBase64);
      const decryptedBytes = new Uint8Array(decryptedBinaryStr.length);
      for (let i = 0; i < decryptedBinaryStr.length; i++) {
        decryptedBytes[i] = decryptedBinaryStr.charCodeAt(i);
      }

      // Desempaquetar contenedor STG1
      const unpacked = StegoEngine.unpackPayload(decryptedBytes);

      revealStatusAlert.className = 'alert-box alert-success';
      revealStatusAlert.innerHTML = `
        <strong>¡Autenticación y Descifrado Exitosos!</strong> El Authentication Tag de 16 bytes coincidió matemáticamente. Se reconstruyó ${unpacked.type === 'file' ? `el archivo confidencial "${unpacked.filename}"` : 'el mensaje confidencial'}.
      `;
      renderRevealedContent(unpacked);

      showToast({
        title: '¡Descifrado Exitoso!',
        message: 'Contraseña válida. Intentos de seguridad restablecidos.',
        icon: '🔓',
        type: 'success',
        duration: 2500
      });
    } catch (err) {
      // Registrar intento fallido y evaluar cooldown progresivo
      let currentState = getLockoutState();
      currentState.failedAttempts = (currentState.failedAttempts || 0) + 1;

      let triggeredLockout = false;
      let durationMs = 0;
      let durationName = '';

      if (currentState.penaltyStage === 0) {
        if (currentState.failedAttempts >= 5) {
          // 5 intentos fallidos -> Bloqueo de 1 minuto
          currentState.penaltyStage = 1;
          durationMs = 60 * 1000;
          durationName = '1 minuto';
          currentState.lockoutUntil = Date.now() + durationMs;
          triggeredLockout = true;
        }
      } else if (currentState.penaltyStage === 1) {
        // Vuelve a fallar tras el primer cooldown -> Bloqueo de 5 minutos
        currentState.penaltyStage = 2;
        durationMs = 5 * 60 * 1000;
        durationName = '5 minutos';
        currentState.lockoutUntil = Date.now() + durationMs;
        triggeredLockout = true;
      } else {
        // Vuelve a fallar tras el segundo cooldown -> Bloqueo de 10 minutos
        currentState.penaltyStage = 3;
        durationMs = 10 * 60 * 1000;
        durationName = '10 minutos';
        currentState.lockoutUntil = Date.now() + durationMs;
        triggeredLockout = true;
      }

      saveLockoutState(currentState);

      if (triggeredLockout) {
        startLockoutCountdown(currentState.lockoutUntil, currentState.penaltyStage);
        revealStatusAlert.className = 'alert-box alert-danger';
        revealStatusAlert.innerHTML = `<strong>⚠️ Bloqueo de Seguridad Activado:</strong> Has alcanzado el límite de intentos erróneos. El sistema está bloqueado por <strong>${durationName}</strong> contra ataques de fuerza bruta.`;
        showToast({
          title: 'Bloqueo Anti-Fuerza Bruta',
          message: `Límite alcanzado. Entrada bloqueada por ${durationName}.`,
          icon: '🛑',
          type: 'danger',
          duration: 3000
        });
      } else {
        updateLockoutUI();
        const remaining = 5 - currentState.failedAttempts;
        revealStatusAlert.className = 'alert-box alert-danger';
        revealStatusAlert.innerHTML = `<strong>Fallo de Integridad / Clave Incorrecta:</strong> ${err.message}<br/><span style="color: #fca5a5; font-size: 0.85rem;">⚠️ Te quedan <strong>${remaining} de 5</strong> intentos antes del bloqueo temporal de 1 minuto.</span>`;
        showToast({
          title: 'Contraseña Incorrecta',
          message: `Quedan ${remaining} de 5 intentos antes del bloqueo.`,
          icon: '❌',
          type: 'danger',
          duration: 2500
        });
      }
    } finally {
      const finalState = getLockoutState();
      if (!finalState.lockoutUntil || finalState.lockoutUntil <= Date.now()) {
        btnDecryptRevealed.disabled = false;
        btnDecryptRevealed.innerHTML = '🔑 Descifrar y Verificar Autenticidad (GCM Tag)';
      }
    }
  });

  // Inicializar estado de bloqueo al montar la pestaña
  updateLockoutUI();
}
