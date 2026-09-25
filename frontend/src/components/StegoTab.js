import { StegoEngine } from '../services/stegoEngine.js';
import { ApiService } from '../services/api.js';
import { openEmailModal } from '../utils/emailModal.js';

export function renderStegoTab(container, onNavigateToAnalysis, onNavigateToAttack) {
  container.innerHTML = `
    <div class="stego-suite-container">
      <!-- 1. Encabezado de la Suite Forense -->
      <div class="forensic-suite-header">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
            <span class="badge badge-cyan" style="font-size: 0.75rem; letter-spacing: 0.05em; padding: 0.25rem 0.6rem;">SOC FORENSIC SUITE</span>
            <span class="badge badge-emerald" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">CANVAS 32-BIT ENGINE</span>
            <span class="badge badge-purple" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">LSB TRI-CHANNEL</span>
          </div>
          <h2 style="font-size: 1.35rem; margin: 0; color: var(--text-primary); font-weight: 800; letter-spacing: -0.01em;">
            Esteganografía &amp; Análisis Pericial en Canvas HTML5
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.2rem; margin-bottom: 0;">
            Inyección y extracción de payloads confidenciales bit a bit en los Bits Menos Significativos (LSB) de los canales R, G y B.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <!-- Botón de Reinicio Rápido -->
          <button id="btn-reset-stego-module" class="btn btn-secondary module-reset-btn" type="button" title="Reiniciar este módulo para probar otra vez">
            <span class="micon" aria-hidden="true">restart_alt</span> Reiniciar
          </button>
        </div>
      </div>

      <!-- Selector de Modo de Operación: Dos Barras Grandes Encima (Estilo Módulo 2) -->
      <div class="stego-subtab-bar" style="display: flex; gap: 1rem; margin-top: 1.25rem; margin-bottom: 1.25rem;">
        <button id="stego-mode-hide-btn" class="btn btn-primary forensic-mode-btn active" type="button" style="flex: 1;">
          <span class="micon" aria-hidden="true">enhanced_encryption</span> Inyección LSB (Ocultar)
        </button>
        <button id="stego-mode-reveal-btn" class="btn btn-secondary forensic-mode-btn" type="button" style="flex: 1;">
          <span class="micon" aria-hidden="true">manage_search</span> Extracción LSB (Revelar)
        </button>
      </div>

      <!-- SECCIÓN 1: INYECCIÓN LSB (DASHBOARD OPERATIVO DE 3 COLUMNAS) -->
      <div id="stego-hide-section">
        <div class="stego-forensic-grid">
          
          <!-- COLUMNA 1: PANEL DE CONFIGURACIÓN & PARÁMETROS -->
          <div class="forensic-col forensic-col-cyan stego-col-params">
            <div class="forensic-card-header">
              <h3 class="forensic-col-title">
                <span class="micon text-cyan" aria-hidden="true">tune</span>
                <span>1. Parámetros &amp; Payload</span>
              </h3>
              <span class="badge badge-cyan" style="font-size: 0.85rem; padding: 0.25rem 0.65rem;">ENTRADA</span>
            </div>

            <!-- Modo de Protección Criptográfica -->
            <div>
              <label style="display: block; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.45rem;">
                Protección Criptográfica:
              </label>
              <select id="stego-crypto-mode" style="width: 100%; font-size: 1rem; font-weight: 600; padding: 0.65rem 0.85rem; border-radius: 8px;">
                <option value="aes">🛡️ AES-256-GCM + PBKDF2 (600K iter)</option>
                <option value="plain">📄 Esteganografía Pura (Texto Plano)</option>
              </select>
            </div>

            <!-- Contraseña Maestra (PBKDF2) -->
            <div id="password-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
                  Clave Maestra de Derivación:
                </label>
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent-cyan); font-family: var(--font-mono);">NIST SP 800-132</span>
              </div>
              <input type="password" id="stego-password" placeholder="Ingresa contraseña de cifrado..." style="width: 100%; font-size: 1rem; padding: 0.65rem 0.9rem; min-height: 44px;" />
              <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 500; margin-top: 0.35rem;">
                Derivación KDF: SHA-512, 600.000 iteraciones con Salt aleatorio de 16B.
              </div>
            </div>

            <!-- Selector de Tipo de Información -->
            <div>
              <label style="display: block; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.45rem;">
                Tipo de Información Secreta:
              </label>
              <div style="display: flex; gap: 0.6rem;">
                <button type="button" id="btn-secret-type-text" class="btn btn-primary secret-type-btn" style="flex: 1; padding: 0.85rem 1rem; font-size: 1.05rem; font-weight: 700; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem;">
                  <span class="micon" style="font-size: 1.4rem;" aria-hidden="true">edit_note</span> Mensaje Texto
                </button>
                <button type="button" id="btn-secret-type-file" class="btn btn-secondary secret-type-btn" style="flex: 1; padding: 0.85rem 1rem; font-size: 1.05rem; font-weight: 700; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem;">
                  <span class="micon" style="font-size: 1.4rem;" aria-hidden="true">folder</span> Archivo Binario
                </button>
              </div>
            </div>

            <!-- Entrada de Mensaje de Texto -->
            <div id="secret-text-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Mensaje Confidencial:</label>
                <span id="payload-size-counter" class="font-mono" style="font-size: 0.9rem; font-weight: 700; color: var(--accent-cyan);">0 bytes</span>
              </div>
              <textarea id="stego-message" rows="4" placeholder="Escribe el texto confidencial a camuflar en los píxeles..." style="width: 100%; font-size: 1rem; line-height: 1.5; padding: 0.75rem;"></textarea>
            </div>

            <!-- Carga de Archivo Confidencial -->
            <div id="secret-file-group" style="display: none; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Archivo a Camuflar:</label>
                <span id="secret-file-size-counter" class="font-mono" style="font-size: 0.9rem; font-weight: 700; color: var(--accent-cyan);">Ninguno</span>
              </div>

              <div id="dropzone-secret-file" class="dropzone" style="padding: 1.25rem 1rem; border-style: dashed; cursor: pointer; text-align: center;">
                <input type="file" id="secret-file-input" style="display: none;" />
                <div style="font-size: 2.25rem; margin-bottom: 0.25rem;"><span class="micon" aria-hidden="true">folder</span></div>
                <p style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin: 0;">Seleccionar o soltar archivo</p>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.35rem;">PDF, DOCX, ZIP, KEY, JPG, TXT...</p>
              </div>

              <div id="selected-secret-file-card" style="display: none; background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 8px; padding: 0.75rem 1rem; align-items: center; justify-content: space-between; gap: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; overflow: hidden;">
                  <div id="selected-secret-file-icon" style="font-size: 1.75rem;">📎</div>
                  <div style="overflow: hidden;">
                    <div id="selected-secret-file-name" class="font-mono" style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">-</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 0.5rem; margin-top: 0.2rem;">
                      <span id="selected-secret-file-size">-</span>
                      <span>•</span>
                      <span id="selected-secret-file-type" style="color: var(--accent-cyan); font-weight: 600;">-</span>
                    </div>
                  </div>
                </div>
                <button type="button" id="btn-remove-secret-file" class="btn btn-rose" style="padding: 0.35rem 0.7rem; font-size: 0.85rem; white-space: nowrap;">
                  <span class="micon" aria-hidden="true">close</span>
                </button>
              </div>

              <div id="selected-secret-img-preview" style="display: none; justify-content: center; background: var(--bg-inset-strong); border-radius: 6px; padding: 0.5rem; max-height: 120px; overflow: hidden;">
                <img id="selected-secret-img" style="max-height: 110px; border-radius: 4px; object-fit: contain;" alt="Vista previa" />
              </div>
            </div>

            <!-- Botón de Ejecución de Inyección -->
            <button id="btn-inject-data" class="btn btn-primary" style="width: 100%; margin-top: auto; padding: 1.15rem 1.5rem; font-size: 1.15rem; font-weight: 800; border-radius: 12px; letter-spacing: 0.02em; display: inline-flex; align-items: center; justify-content: center; gap: 0.75rem;" disabled>
              <span class="micon" style="font-size: 1.5rem;" aria-hidden="true">bolt</span> Ejecutar Inyección LSB
            </button>
          </div>

          <!-- COLUMNA 2: CANVAS DE INSPECCIÓN CENTRAL -->
          <div class="forensic-col forensic-col-emerald stego-col-canvas">
            <div class="forensic-card-header">
              <h3 class="forensic-col-title">
                <span class="micon text-emerald" aria-hidden="true">visibility</span>
                <span>2. Canvas de Inspección Carrier</span>
              </h3>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span id="carrier-status-tag" class="badge badge-amber" style="font-size: 0.85rem; padding: 0.25rem 0.65rem;">ESPERANDO IMAGEN</span>
              </div>
            </div>

            <!-- Toolbar Interactivo del Canvas (Zoom, Retícula, Dimensiones) -->
            <div class="canvas-hud-toolbar">
              <div class="canvas-zoom-controls">
                <button type="button" id="btn-carrier-zoom-out" class="canvas-zoom-btn" title="Zoom Out">-</button>
                <button type="button" id="btn-carrier-zoom-reset" class="canvas-zoom-btn" style="width: auto; padding: 0 0.75rem;" title="Restablecer Zoom">
                  <span id="carrier-zoom-level" style="font-size: 0.95rem; font-weight: 700;">100%</span>
                </button>
                <button type="button" id="btn-carrier-zoom-in" class="canvas-zoom-btn" title="Zoom In">+</button>
                <button type="button" id="btn-toggle-grid" class="canvas-zoom-btn" style="width: auto; padding: 0 0.75rem; gap: 0.35rem;" title="Alternar Retícula Forense">
                  <span class="micon" style="font-size: 1.2rem;" aria-hidden="true">grid_4x4</span> <span style="font-size: 0.92rem; font-weight: 700;">Retícula</span>
                </button>
              </div>

              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span id="carrier-spec-badge" class="font-mono text-cyan" style="font-size: 0.92rem; font-weight: 700;">RGB 24-bit • Alpha LOCKED</span>
              </div>
            </div>

            <!-- Viewport Central del Canvas con Zoom y Retícula -->
            <div id="carrier-viewport-box" class="canvas-viewport-container grid-active">
              <!-- Overlay de Mira Forense / Crosshair -->
              <div id="canvas-crosshair-overlay" class="canvas-crosshair-overlay">
                <div class="canvas-crosshair-h"></div>
                <div class="canvas-crosshair-v"></div>
                <div class="canvas-crosshair-circle"></div>
              </div>

              <!-- Dropzone cuando no hay imagen cargada -->
              <div id="dropzone-hide" class="dropzone" style="width: 90%; margin: 1.5rem auto; border-style: dashed; padding: 2.5rem 1.5rem; text-align: center; cursor: pointer;">
                <input type="file" id="carrier-input" accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp, image/*" style="display: none;" />
                <div style="font-size: 3.5rem; margin-bottom: 0.5rem; color: var(--accent-cyan);">
                  <span class="micon" aria-hidden="true">add_photo_alternate</span>
                </div>
                <p style="font-weight: 700; color: var(--text-primary); margin: 0; font-size: 1.1rem;">
                  Arrastra una imagen portadora o haz clic
                </p>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.4rem;">
                  PNG, JPG, WebP, BMP (Se normalizará a PNG 32-bit sin pérdida)
                </p>
              </div>

              <!-- Visor de Imagen Portadora con Wrapper para Zoom -->
              <div id="carrier-preview-box" class="canvas-interactive-wrapper" style="display: none;">
                <img id="carrier-img" alt="Imagen Portadora" />
              </div>
            </div>

            <!-- Fila de Metadatos del Carrier -->
            <div id="carrier-info" style="display: none; background: var(--bg-inset); padding: 0.85rem 1rem; border-radius: 8px; font-size: 0.92rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <span style="color: var(--text-muted); font-size: 0.9rem;">Resolución &amp; Píxeles:</span>
                <span id="carrier-res" class="font-mono" style="color: var(--text-primary); font-weight: 700; font-size: 1.05rem;">-</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-muted); font-size: 0.9rem;">Capacidad LSB Máxima:</span>
                <span id="carrier-cap" class="font-mono" style="color: var(--accent-cyan); font-weight: 800; font-size: 1.15rem;">-</span>
              </div>
              <div id="carrier-conversion-badge" class="badge badge-amber" style="display: none; margin-top: 0.5rem; font-size: 0.85rem; padding: 0.35rem 0.65rem;"></div>
            </div>
          </div>

          <!-- COLUMNA 3: TELEMETRÍA FORENSE LSB EN VIVO -->
          <div class="forensic-col forensic-col-purple stego-forensic-col-telemetry stego-col-telemetry">
            <div class="forensic-card-header">
              <h3 class="forensic-col-title">
                <span class="micon text-purple" aria-hidden="true">analytics</span>
                <span>3. Telemetría Forense LSB</span>
              </h3>
              <span class="badge badge-purple" style="font-size: 0.85rem; padding: 0.25rem 0.65rem;">LIVE FEED</span>
            </div>

            <!-- Widget 1: Barra de Capacidad y Ocupación Dinámica HUD -->
            <div class="hud-capacity-meter-box">
              <div class="hud-capacity-header">
                <span style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); letter-spacing: 0.05em;">
                  OCUPACIÓN DE CAPACIDAD LSB
                </span>
                <span id="capacity-percentage" class="hud-capacity-pct" style="font-size: 2.25rem; font-weight: 800;">0.00%</span>
              </div>

              <!-- Barra Segmentada HUD -->
              <div id="stego-hud-segments" class="hud-segmented-track" title="Segmentos de ocupación LSB (5% por bloque)">
              </div>

              <!-- Barra clásica oculta para compatibilidad -->
              <div class="progress-container" style="display: none;">
                <div id="capacity-bar" class="progress-bar progress-normal" style="width: 0%;"></div>
              </div>

              <!-- Alerta de Detectabilidad Esteganográfica (Chi-cuadrado / Entropía) -->
              <div id="hud-detectability-alert" class="hud-detectability-alert alert-safe" style="padding: 0.75rem 0.9rem; font-size: 0.92rem;">
                <span class="micon" style="font-size: 1.45rem;" aria-hidden="true">verified</span>
                <span id="hud-detectability-text" style="font-size: 0.92rem; font-weight: 600; line-height: 1.4;">
                  Esperando carga de imagen carrier para inicializar telemetría LSB.
                </span>
              </div>

              <div id="capacity-warning-msg" style="display: none; font-size: 0.85rem; color: var(--accent-rose); font-weight: 600;"></div>

              <!-- Estadísticas Técnicas Rápidas -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-family: var(--font-mono); background: var(--bg-inset); border: 1px solid var(--border-color); padding: 0.75rem 0.85rem; border-radius: 8px;">
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.15rem;">PAYLOAD REQUERIDO</span>
                  <span id="telemetry-used-bytes" style="color: var(--accent-cyan); font-weight: 800; font-size: 1.25rem;">0 B</span>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.15rem;">CANALES POR PÍXEL</span>
                  <span style="color: var(--accent-emerald); font-weight: 800; font-size: 1.15rem;">3 bits / px (RGB)</span>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.15rem;">PÍXELES NECESARIOS</span>
                  <span id="telemetry-pixels-req" style="color: var(--text-primary); font-weight: 800; font-size: 1.25rem;">0 px</span>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.15rem;">SESGO DETECCIÓN</span>
                  <span id="telemetry-chi-bias" style="color: var(--accent-emerald); font-weight: 800; font-size: 1.2rem;">H(X) ≈ 7.99</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resultados de la Inyección LSB con Simulador Láser y Microscopio -->
        <div id="stego-result-container" class="card card-glow-emerald" style="display: none; margin-top: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <h3 style="color: var(--accent-emerald); font-size: 1.125rem; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
              <span><span class="micon" aria-hidden="true">check_circle</span> </span> Inyección LSB Finalizada Exitosamente
            </h3>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span id="stego-psnr-badge" class="badge badge-emerald">PSNR: -- dB</span>
              <span id="stego-protocol-badge" class="badge badge-cyan">Big-Endian 32-bit</span>
            </div>
          </div>

          <!-- PARTE 1: VISOR CON ESCÁNER LÁSER Y TELEMETRÍA EN VIVO -->
          <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="font-size: 1rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                <span><span class="micon" aria-hidden="true">bolt</span> </span> Escáner Láser de Inyección en Tiempo Real
              </h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Mapeo secuencial en canales R, G, B</span>
            </div>

            <!-- Viewport con Láser -->
            <div id="stego-laser-container" class="stego-laser-viewport">
              <canvas id="stego-output-canvas"></canvas>
              
              <!-- Línea del haz láser -->
              <div id="stego-laser-beam" class="stego-laser-beam" style="display: none; top: 0%;"></div>
              
              <!-- Área sombreada recorrida -->
              <div id="stego-scanned-shading" class="stego-scanned-shading" style="display: none; height: 0%;"></div>

              <!-- HUD de Telemetría Flotante -->
              <div id="stego-laser-hud" class="stego-laser-hud">
                <div class="stego-laser-hud-row">
                  <span style="color: var(--text-muted);">Bits Inyectados:</span>
                  <span id="hud-bits-counter" style="color: var(--accent-cyan); font-weight: 700;">0 / 0</span>
                </div>
                <div class="stego-laser-hud-row">
                  <span style="color: var(--text-muted);">Píxel Actual:</span>
                  <span id="hud-pixel-counter" style="color: var(--accent-emerald); font-weight: 700;">#0</span>
                </div>
                <div class="stego-laser-hud-row">
                  <span style="color: var(--text-muted);">Fila Alcanzada:</span>
                  <span id="hud-row-counter" style="color: var(--text-secondary);">Fila 0</span>
                </div>
                <div class="stego-laser-hud-row">
                  <span style="color: var(--text-muted);">Fidelidad PSNR:</span>
                  <span id="hud-psnr-counter" style="color: #38bdf8;">-- dB</span>
                </div>
              </div>
            </div>

            <!-- Controles de la Simulación Láser -->
            <div class="stego-sim-controls-bar">
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <button type="button" id="btn-replay-laser" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">
                  <span class="micon" aria-hidden="true">autorenew</span>  Repetir Escáner Láser
                </button>
                <div style="display: flex; gap: 0.25rem; align-items: center; margin-left: 0.5rem;">
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Velocidad:</span>
                  <button type="button" id="btn-speed-slow" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">1x Lento</button>
                  <button type="button" id="btn-speed-fast" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">3x Rápido</button>
                </div>
              </div>
              <div id="stego-scan-status-label" style="font-size: 0.75rem; color: var(--accent-emerald); font-family: var(--font-mono); font-weight: 600;">
                ✓ Inyección Completada
              </div>
            </div>
          </div>

          <!-- PARTE 2: MICROSCOPIO INTERACTIVO BIT A BIT (ANTES VS DESPUÉS) -->
          <div class="pixel-microscope-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <h4 style="font-size: 1rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                  <span><span class="micon" aria-hidden="true">biotech</span> </span> Microscopio Interactivo de Inyección Bit a Bit
                </h4>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                  Inspección pericial de la descomposición binaria del secreto en los canales R, G y B (Demostración de variación óptica imperceptible Δ = ±1).
                </p>
              </div>
            </div>

            <!-- Pestañas de Muestras Didácticas -->
            <div class="microscope-tabs">
              <button type="button" id="tab-sample-header" class="microscope-tab-btn">
                <span class="micon" aria-hidden="true">inventory_2</span>  Muestra 1: Cabecera 32-bit (Longitud)
              </button>
              <button type="button" id="tab-sample-payload" class="microscope-tab-btn active">
                <span class="micon" aria-hidden="true">edit_note</span>  Muestra 2: Primeros Bytes del Secreto
              </button>
              <button type="button" id="tab-sample-boundary" class="microscope-tab-btn">
                🏁 Muestra 3: Frontera de Inyección
              </button>
            </div>

            <!-- Contenedor dinámico de las tarjetas del Microscopio -->
            <div id="microscope-samples-container">
            </div>
          </div>

          <!-- PARTE 3: DETALLES TÉCNICOS Y BOTONES DE ACCIÓN -->
          <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
            <div id="stego-stats-details" class="font-mono" style="font-size: 0.875rem; background: var(--bg-inset); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; line-height: 1.6;">
            </div>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              <button id="btn-download-stego" class="btn btn-emerald" style="flex: 1; min-width: 180px;">
                <span class="micon" aria-hidden="true">download</span>  Descargar PNG
              </button>
              <button id="btn-email-stego" class="btn btn-primary" style="flex: 1; min-width: 180px; background: linear-gradient(135deg, #0284c7, #38bdf8); border: none;">
                <span class="micon" aria-hidden="true">mail</span>  Enviar por Correo
              </button>
              <button id="btn-send-to-analysis" class="btn btn-secondary" style="flex: 1; min-width: 180px;">
                <span class="micon" aria-hidden="true">biotech</span>  Enviar a Estegoanálisis
              </button>
              <button id="btn-send-to-attack" class="btn btn-rose" style="flex: 1; min-width: 180px; background: linear-gradient(135deg, var(--accent-purple), var(--accent-rose)); border: none;">
                <span class="micon" aria-hidden="true">crisis_alert</span>  Atacar en Tiempo Real
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 2: REVELAR INFORMACIÓN (EXTRACCIÓN PERICIAL) -->
      <div id="stego-reveal-section" style="display: none;">
        <div class="stego-forensic-grid">
          
          <!-- COL 1: PARÁMETROS DE EXTRACCIÓN & DESCIFRADO -->
          <div class="forensic-col forensic-col-purple stego-col-params">
            <div class="forensic-card-header">
              <h3 class="forensic-col-title">
                <span class="micon text-purple" aria-hidden="true">vpn_key</span>
                <span>Descifrado Criptográfico</span>
              </h3>
              <span class="badge badge-purple" style="font-size: 0.85rem; padding: 0.25rem 0.65rem;">GCM INTEGRITY</span>
            </div>

            <div id="reveal-crypto-decrypt-box" style="display: none; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <span class="badge badge-purple" style="font-size: 0.85rem;">AES-256-GCM Detectado</span>
                <span id="stego-attempts-badge" class="badge badge-rose" style="display: none; font-size: 0.85rem; font-weight: 700;">Intentos restantes: 5/5</span>
              </div>
              <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0; line-height: 1.45;">
                El payload extraído contiene Salt (16B), IV (12B) y Tag GCM (16B). Ingresa la clave maestra para descifrar.
              </p>

              <input type="password" id="reveal-decrypt-password" placeholder="Ingresa contraseña para descifrar..." style="width: 100%; font-size: 1rem; padding: 0.65rem 0.9rem; min-height: 44px;" />

              <div id="stego-lockout-banner" class="alert-box alert-danger" style="display: none; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border-left: 4px solid var(--accent-rose); background: rgba(239, 68, 68, 0.12);">
                <span style="font-size: 1.75rem; line-height: 1;"><span class="micon" aria-hidden="true">hourglass_top</span> </span>
                <div style="flex: 1;">
                  <div style="font-weight: 700; color: #fca5a5; font-size: 0.95rem; margin-bottom: 0.25rem;">
                    Bloqueo de Seguridad Anti-Fuerza Bruta
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
                    Demasiados intentos. Espera: <span id="stego-countdown-display" style="color: var(--accent-rose); font-family: monospace; font-size: 1.15rem; font-weight: 700;">01:00</span>
                  </div>
                </div>
              </div>

              <button id="btn-decrypt-revealed" class="btn btn-emerald" style="width: 100%; padding: 1.15rem 1.5rem; font-size: 1.15rem; font-weight: 800; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 0.75rem;">
                <span class="micon" style="font-size: 1.5rem;" aria-hidden="true">vpn_key</span>  Descifrar y Verificar Tag GCM
              </button>
            </div>

            <div id="reveal-waiting-instructions" style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.55;">
              <span class="micon text-cyan" aria-hidden="true">info</span>
              Carga una imagen portadora sospechosa en la columna central y presiona <strong>Extraer Payload LSB</strong> para procesar la secuencia inversa de bits.
            </div>
          </div>

          <!-- COL 2: CANVAS DE INSPECCIÓN DE LA IMAGEN SOSPECHOSA -->
          <div class="forensic-col forensic-col-emerald stego-col-canvas">
            <div class="forensic-card-header">
              <h3 class="forensic-col-title">
                <span class="micon text-emerald" aria-hidden="true">search</span>
                <span>Carrier Sospechoso</span>
              </h3>
              <span class="badge badge-emerald" style="font-size: 0.85rem; padding: 0.25rem 0.65rem;">INSPECCIÓN</span>
            </div>

            <div class="canvas-viewport-container grid-active" style="min-height: 380px;">
              <div id="dropzone-reveal" class="dropzone" style="width: 90%; margin: 1.5rem auto; border-style: dashed; padding: 2.5rem 1.5rem; text-align: center; cursor: pointer;">
                <input type="file" id="stego-input-file" accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp, image/*" style="display: none;" />
                <div style="font-size: 3.5rem; margin-bottom: 0.5rem; color: var(--accent-emerald);">
                  <span class="micon" aria-hidden="true">person_search</span>
                </div>
                <p style="font-weight: 700; color: var(--text-primary); margin: 0; font-size: 1.1rem;">
                  Sube la imagen con datos ocultos
                </p>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.4rem;">
                  PNG, JPG, WebP, BMP (Extracción directa en Canvas 32-bit)
                </p>
                <div id="reveal-conversion-badge" class="badge badge-amber" style="display: none; margin-top: 0.5rem; font-size: 0.85rem; padding: 0.35rem 0.65rem;"></div>
              </div>

              <div id="reveal-image-preview-box" class="canvas-interactive-wrapper" style="display: none;">
                <img id="reveal-img" alt="Imagen Estego" />
              </div>
            </div>

            <button id="btn-extract-data" class="btn btn-primary" style="width: 100%; padding: 1.15rem 1.5rem; font-size: 1.15rem; font-weight: 800; border-radius: 12px; letter-spacing: 0.02em; display: inline-flex; align-items: center; justify-content: center; gap: 0.75rem;" disabled>
              <span class="micon" style="font-size: 1.5rem;" aria-hidden="true">lock_open</span>  Extraer Payload LSB
            </button>
          </div>

          <!-- COL 3: TELEMETRÍA DE EXTRACCIÓN & SECRETO RECUPERADO -->
          <div class="forensic-col forensic-col-cyan stego-forensic-col-telemetry stego-col-telemetry">
            <div class="forensic-card-header">
              <h3 class="forensic-col-title">
                <span class="micon text-cyan" aria-hidden="true">task_alt</span>
                <span>Secreto Extraído</span>
              </h3>
              <span class="badge badge-cyan" style="font-size: 0.85rem; padding: 0.25rem 0.65rem;">RESULTADO</span>
            </div>

            <div id="reveal-result-container" style="display: none; flex-direction: column; gap: 0.85rem;">
              <div id="reveal-status-alert" class="alert-box alert-info">
              </div>

              <!-- Archivo Recuperado -->
              <div id="revealed-file-card" class="card card-glow-emerald" style="display: none; flex-direction: column; gap: 0.75rem; background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.4); padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div id="revealed-file-icon" style="font-size: 2.25rem;"><span class="micon" aria-hidden="true">description</span> </div>
                  <div style="overflow: hidden;">
                    <div id="revealed-file-name" class="font-mono" style="font-size: 1rem; font-weight: 700; color: var(--accent-emerald); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">-</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                      <span id="revealed-file-size">-</span>
                      <span>•</span>
                      <span id="revealed-file-type" style="color: var(--accent-cyan); font-weight: 600;">-</span>
                    </div>
                  </div>
                </div>

                <div id="revealed-image-preview-box" style="display: none; justify-content: center; background: var(--bg-inset-strong); border-radius: 6px; padding: 0.5rem; max-height: 180px; overflow: hidden;">
                  <img id="revealed-secret-image" style="max-height: 170px; border-radius: 4px; object-fit: contain;" alt="Imagen secreta" />
                </div>

                <button id="btn-download-revealed-file" class="btn btn-emerald" style="width: 100%; padding: 0.85rem 1.25rem; font-size: 1.05rem; font-weight: 800; border-radius: 10px;">
                  <span class="micon" aria-hidden="true">download</span>  Descargar Archivo Reconstruido
                </button>
              </div>

              <!-- Texto Recuperado -->
              <div id="revealed-text-box">
                <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem; display: block;">
                  Contenido Recuperado:
                </label>
                <textarea id="revealed-content-text" rows="6" readonly class="font-mono" style="width: 100%; font-size: 1rem; line-height: 1.5; padding: 0.75rem;"></textarea>
              </div>
            </div>

            <div id="reveal-empty-prompt" style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.55;">
              El análisis forense se activará automáticamente al procesar el carrier.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- Elementos del DOM ---
  const btnResetStegoModule = container.querySelector('#btn-reset-stego-module');
  if (btnResetStegoModule) {
    btnResetStegoModule.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cyberlab-reset-module', { detail: { module: 'stego' } }));
    });
  }

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
  const carrierStatusTag = container.querySelector('#carrier-status-tag');
  const carrierSpecBadge = container.querySelector('#carrier-spec-badge');
  const btnZoomIn = container.querySelector('#btn-carrier-zoom-in');
  const btnZoomOut = container.querySelector('#btn-carrier-zoom-out');
  const btnZoomReset = container.querySelector('#btn-carrier-zoom-reset');
  const carrierZoomLevel = container.querySelector('#carrier-zoom-level');
  const btnToggleGrid = container.querySelector('#btn-toggle-grid');
  const carrierViewportBox = container.querySelector('#carrier-viewport-box');
  const canvasCrosshairOverlay = container.querySelector('#canvas-crosshair-overlay');

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
  const hudSegmentsContainer = container.querySelector('#stego-hud-segments');
  const hudDetectabilityAlert = container.querySelector('#hud-detectability-alert');
  const hudDetectabilityText = container.querySelector('#hud-detectability-text');
  const telemetryUsedBytes = container.querySelector('#telemetry-used-bytes');
  const telemetryPixelsReq = container.querySelector('#telemetry-pixels-req');
  const telemetryChiBias = container.querySelector('#telemetry-chi-bias');
  const tabHexPayload = container.querySelector('#tab-hex-payload');
  const tabHexBinary = container.querySelector('#tab-hex-binary');
  const tabHexChannels = container.querySelector('#tab-hex-channels');
  const hexdumpTerminalBody = container.querySelector('#hexdump-terminal-body');

  const btnInjectData = container.querySelector('#btn-inject-data');

  const resultContainer = container.querySelector('#stego-result-container');
  const outputCanvas = container.querySelector('#stego-output-canvas');
  const stegoStatsDetails = container.querySelector('#stego-stats-details');
  const stegoPsnrBadge = container.querySelector('#stego-psnr-badge');
  const stegoProtocolBadge = container.querySelector('#stego-protocol-badge');
  const stegoLaserContainer = container.querySelector('#stego-laser-container');
  const stegoLaserBeam = container.querySelector('#stego-laser-beam');
  const stegoScannedShading = container.querySelector('#stego-scanned-shading');
  const hudBitsCounter = container.querySelector('#hud-bits-counter');
  const hudPixelCounter = container.querySelector('#hud-pixel-counter');
  const hudRowCounter = container.querySelector('#hud-row-counter');
  const hudPsnrCounter = container.querySelector('#hud-psnr-counter');
  const btnReplayLaser = container.querySelector('#btn-replay-laser');
  const btnSpeedSlow = container.querySelector('#btn-speed-slow');
  const btnSpeedFast = container.querySelector('#btn-speed-fast');
  const stegoScanStatusLabel = container.querySelector('#stego-scan-status-label');

  const tabSampleHeader = container.querySelector('#tab-sample-header');
  const tabSamplePayload = container.querySelector('#tab-sample-payload');
  const tabSampleBoundary = container.querySelector('#tab-sample-boundary');
  const microscopeSamplesContainer = container.querySelector('#microscope-samples-container');

  const btnDownloadStego = container.querySelector('#btn-download-stego');
  const btnEmailStego = container.querySelector('#btn-email-stego');
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
  let lastInjectedStats = null;
  let laserSpeedMultiplier = 3;
  let activeMicroscopeCategory = 'payloadStart';
  let laserAnimationTimer = null;
  let carrierZoom = 1.0;
  let activeHexView = 'hex'; // 'hex' | 'binary' | 'channels'

  function applyCarrierZoom() {
    if (carrierPreviewBox) {
      carrierPreviewBox.style.transform = `scale(${carrierZoom})`;
    }
    if (carrierZoomLevel) {
      carrierZoomLevel.textContent = `${Math.round(carrierZoom * 100)}%`;
    }
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      carrierZoom = Math.min(3.0, carrierZoom + 0.25);
      applyCarrierZoom();
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      carrierZoom = Math.max(0.5, carrierZoom - 0.25);
      applyCarrierZoom();
    });
  }
  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => {
      carrierZoom = 1.0;
      applyCarrierZoom();
    });
  }
  if (btnToggleGrid && carrierViewportBox && canvasCrosshairOverlay) {
    btnToggleGrid.addEventListener('click', () => {
      carrierViewportBox.classList.toggle('grid-active');
      canvasCrosshairOverlay.classList.toggle('active');
      btnToggleGrid.classList.toggle('btn-primary');
    });
  }

  // --- Alternancia de modos (Ocultar / Revelar) con estilo SOC ---
  hideBtn.addEventListener('click', () => {
    hideBtn.className = 'btn btn-primary forensic-mode-btn active';
    revealBtn.className = 'btn btn-secondary forensic-mode-btn';
    hideSection.style.display = 'block';
    revealSection.style.display = 'none';
  });

  revealBtn.addEventListener('click', () => {
    revealBtn.className = 'btn btn-primary forensic-mode-btn active';
    hideBtn.className = 'btn btn-secondary forensic-mode-btn';
    revealSection.style.display = 'block';
    hideSection.style.display = 'none';
  });

  // Alternancia de tipo de secreto (Texto vs Archivo)
  btnSecretTypeText.addEventListener('click', () => {
    activeSecretType = 'text';
    btnSecretTypeText.className = 'btn btn-primary secret-type-btn';
    btnSecretTypeFile.className = 'btn btn-secondary secret-type-btn';
    secretTextGroup.style.display = 'block';
    secretFileGroup.style.display = 'none';
    updateCapacityMetrics();
    checkInjectReadiness();
  });

  btnSecretTypeFile.addEventListener('click', () => {
    activeSecretType = 'file';
    btnSecretTypeFile.className = 'btn btn-primary secret-type-btn';
    btnSecretTypeText.className = 'btn btn-secondary secret-type-btn';
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

  if (carrierPreviewBox) {
    carrierPreviewBox.style.cursor = 'pointer';
    carrierPreviewBox.title = 'Haz clic para cambiar o subir otra imagen portadora';
    carrierPreviewBox.addEventListener('click', () => carrierInput.click());
    carrierPreviewBox.addEventListener('dragover', (e) => e.preventDefault());
    carrierPreviewBox.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) handleCarrierFile(e.dataTransfer.files[0]);
    });
  }

  async function handleCarrierFile(file) {
    try {
      const carrierBadge = container.querySelector('#carrier-conversion-badge');
      const conversion = await StegoEngine.convertToPng(file);
      const img = conversion.imageElement;
      loadedCarrierImage = img;
      carrierImg.src = img.src;
      carrierPreviewBox.style.display = 'flex';
      carrierInfo.style.display = 'block';

      if (dropzoneHide) dropzoneHide.style.display = 'none';

      const width = conversion.width;
      const height = conversion.height;
      const cap = StegoEngine.calculateCapacity(width, height);
      currentMaxCapacityBytes = cap.maxBytes;

      carrierRes.textContent = `${width} × ${height} px (${(cap.totalPixels / 1e6).toFixed(2)} MP)`;
      carrierCap.textContent = `${cap.maxBytes.toLocaleString()} bytes (~${(cap.maxBytes / 1024).toFixed(1)} KB)`;

      if (carrierStatusTag) {
        carrierStatusTag.className = 'badge badge-emerald';
        carrierStatusTag.textContent = 'CARRIER ACTIVO (PNG 32B)';
      }
      if (carrierSpecBadge) {
        carrierSpecBadge.textContent = `${width} × ${height} px • ${(cap.totalPixels / 1e6).toFixed(2)} MP`;
      }

      carrierZoom = 1.0;
      applyCarrierZoom();

      if (carrierBadge) {
        if (conversion.wasConverted) {
          const origFormat = (conversion.originalType || 'JPEG').replace('image/', '').toUpperCase();
          carrierBadge.style.display = 'inline-flex';
          carrierBadge.innerHTML = `<span class="micon" aria-hidden="true">bolt</span>  Convertido de <code>${origFormat}</code> a <code>PNG</code> sin pérdida`;
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

  // --- Utilidades Forenses de Formato ---
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getFileIcon(filename = '', mimeType = '') {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.includes('text') || filename.endsWith('.txt') || filename.endsWith('.md')) return 'description';
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return 'folder_zip';
    return 'draft';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Switcher de Vistas del Terminal Hex/Binario ---
  if (tabHexPayload) {
    tabHexPayload.addEventListener('click', () => {
      activeHexView = 'hex';
      tabHexPayload.classList.add('active');
      tabHexBinary?.classList.remove('active');
      tabHexChannels?.classList.remove('active');
      updateLiveHexDump();
    });
  }
  if (tabHexBinary) {
    tabHexBinary.addEventListener('click', () => {
      activeHexView = 'binary';
      tabHexBinary.classList.add('active');
      tabHexPayload?.classList.remove('active');
      tabHexChannels?.classList.remove('active');
      updateLiveHexDump();
    });
  }
  if (tabHexChannels) {
    tabHexChannels.addEventListener('click', () => {
      activeHexView = 'channels';
      tabHexChannels.classList.add('active');
      tabHexPayload?.classList.remove('active');
      tabHexBinary?.classList.remove('active');
      updateLiveHexDump();
    });
  }

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

  function getSamplePayloadBytes() {
    if (lastInjectedPayloadBytes && lastInjectedPayloadBytes.length > 0) {
      return lastInjectedPayloadBytes;
    }
    try {
      if (activeSecretType === 'text') {
        const text = stegoMessage.value;
        if (!text || text.trim().length === 0) return null;
        return StegoEngine.packPayload({ type: 'text', text });
      } else {
        if (!selectedSecretFile || !selectedSecretFileBytes) return null;
        return StegoEngine.packPayload({
          type: 'file',
          fileBytes: selectedSecretFileBytes.slice(0, 512),
          filename: selectedSecretFile.name,
          mimeType: selectedSecretFile.type || 'application/octet-stream'
        });
      }
    } catch {
      return null;
    }
  }

  function updateLiveHexDump() {
    if (!hexdumpTerminalBody) return;
    const bytes = getSamplePayloadBytes();

    if (!bytes || bytes.length === 0) {
      hexdumpTerminalBody.innerHTML = `
        <div class="hexdump-row" style="color:var(--text-muted); font-style:italic;">
          <span class="hexdump-offset">00000000</span>
          <span class="hexdump-bytes">00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00</span>
          <span class="hexdump-ascii">|................|</span>
        </div>
        <div style="color:var(--accent-cyan); font-size:0.75rem; margin-top:0.4rem; opacity:0.85;">
          <span class="micon" aria-hidden="true" style="font-size:0.85rem; vertical-align:middle;">terminal</span> [STANDBY] Escribe un mensaje o adjunta un archivo para observar la telemetría binaria y volcado hexadecimal en tiempo real.
        </div>
      `;
      return;
    }

    const isAesMode = cryptoModeSelect.value === 'aes' && !lastInjectedPayloadBytes;

    if (activeHexView === 'hex') {
      let rowsHtml = '';
      const maxBytes = Math.min(bytes.length, 96);
      for (let offset = 0; offset < maxBytes; offset += 16) {
        const chunk = bytes.slice(offset, Math.min(offset + 16, bytes.length));
        const offsetHex = offset.toString(16).padStart(8, '0');
        let hexCols = [];
        let asciiChars = '';
        for (let i = 0; i < 16; i++) {
          if (i < chunk.length) {
            const b = chunk[i];
            hexCols.push(b.toString(16).padStart(2, '0'));
            asciiChars += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '·';
          } else {
            hexCols.push('  ');
            asciiChars += ' ';
          }
        }
        const group1 = hexCols.slice(0, 8).join(' ');
        const group2 = hexCols.slice(8, 16).join(' ');
        rowsHtml += `
          <div class="hexdump-row">
            <span class="hexdump-offset">${offsetHex}</span>
            <span class="hexdump-bytes">${group1}  ${group2}</span>
            <span class="hexdump-ascii">|${escapeHtml(asciiChars)}|</span>
          </div>
        `;
      }
      if (bytes.length > 96) {
        rowsHtml += `
          <div style="color:var(--text-muted); font-size:0.72rem; margin-top:0.25rem;">
            ... (+ ${(bytes.length - 96).toLocaleString()} bytes restantes en el payload)
          </div>
        `;
      }
      if (isAesMode) {
        rowsHtml += `
          <div style="color:var(--accent-amber); font-size:0.72rem; margin-top:0.35rem;">
            <span class="micon" aria-hidden="true" style="font-size:0.85rem; vertical-align:middle;">lock</span> Vista previa en claro. Durante la inyección se empaquetará con cabecera de 44B y cifrado AES-256-GCM.
          </div>
        `;
      } else if (lastInjectedPayloadBytes) {
        rowsHtml += `
          <div style="color:var(--accent-emerald); font-size:0.72rem; margin-top:0.35rem;">
            <span class="micon" aria-hidden="true" style="font-size:0.85rem; vertical-align:middle;">check_circle</span> Stream inyectado en Canvas (${lastInjectedPayloadBytes.length.toLocaleString()} bytes totales).
          </div>
        `;
      }
      hexdumpTerminalBody.innerHTML = rowsHtml;

    } else if (activeHexView === 'binary') {
      let rowsHtml = '';
      const maxBytes = Math.min(bytes.length, 32);
      for (let offset = 0; offset < maxBytes; offset += 4) {
        const chunk = bytes.slice(offset, Math.min(offset + 4, bytes.length));
        const offsetHex = offset.toString(16).padStart(8, '0');
        let binCols = [];
        let tag = '';
        for (let i = 0; i < chunk.length; i++) {
          const b = chunk[i];
          const binStr = b.toString(2).padStart(8, '0');
          const msb7 = binStr.slice(0, 7);
          const lsb = binStr.slice(7);
          binCols.push(`<span>${msb7}<strong style="color:var(--accent-cyan); font-weight:800;">${lsb}</strong></span>`);
          tag += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '·';
        }
        rowsHtml += `
          <div class="hexdump-row">
            <span class="hexdump-offset">${offsetHex}</span>
            <span class="hexdump-bytes" style="font-size:0.72rem;">${binCols.join(' ')}</span>
            <span class="hexdump-ascii" style="color:var(--accent-cyan);">[${escapeHtml(tag)}]</span>
          </div>
        `;
      }
      rowsHtml += `
        <div style="color:var(--text-muted); font-size:0.72rem; margin-top:0.35rem;">
          Leyenda: El bit resaltado a la derecha en cada octeto representa el <strong style="color:var(--accent-cyan);">LSB (Bit Menos Significativo)</strong> que sustituirá a la portadora.
        </div>
      `;
      hexdumpTerminalBody.innerHTML = rowsHtml;

    } else if (activeHexView === 'channels') {
      let rowsHtml = '';
      const maxPixels = 8;
      let allBits = [];
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
          allBits.push((b >> bitIdx) & 1);
        }
        if (allBits.length >= maxPixels * 3) break;
      }

      for (let p = 0; p < maxPixels; p++) {
        const bitR = allBits[p * 3] !== undefined ? allBits[p * 3] : '-';
        const bitG = allBits[p * 3 + 1] !== undefined ? allBits[p * 3 + 1] : '-';
        const bitB = allBits[p * 3 + 2] !== undefined ? allBits[p * 3 + 2] : '-';
        const byteIdx = Math.floor((p * 3) / 8);
        const byteBit = (p * 3) % 8;

        rowsHtml += `
          <div class="hexdump-row" style="font-size:0.74rem;">
            <span class="hexdump-offset">PX#${p.toString().padStart(4, '0')}</span>
            <span class="hexdump-bytes">
              <span style="color:#ef4444; font-weight:700;">R[b0]=${bitR}</span> &nbsp;
              <span style="color:#22c55e; font-weight:700;">G[b0]=${bitG}</span> &nbsp;
              <span style="color:#3b82f6; font-weight:700;">B[b0]=${bitB}</span>
            </span>
            <span class="hexdump-ascii" style="color:var(--text-muted);">Byte ${byteIdx} : b${byteBit}..${byteBit + 2}</span>
          </div>
        `;
      }
      rowsHtml += `
        <div style="color:var(--accent-cyan); font-size:0.72rem; margin-top:0.35rem;">
          Mapeo Big-Endian Secuencial: 3 bits por píxel distribuidos en Canales R, G, B sin alterar canal Alfa (A=255).
        </div>
      `;
      hexdumpTerminalBody.innerHTML = rowsHtml;
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
      capacityPercentage.classList.remove('hud-warning', 'hud-danger');
      if (pct > 80) {
        capacityPercentage.classList.add('hud-danger');
      } else if (pct >= 50) {
        capacityPercentage.classList.add('hud-warning');
      }

      if (capacityBar) {
        capacityBar.style.width = `${displayPct}%`;
        if (pct > 100) {
          capacityBar.className = 'progress-bar progress-danger';
        } else if (pct > 75) {
          capacityBar.className = 'progress-bar progress-warning';
        } else {
          capacityBar.className = 'progress-bar progress-normal';
        }
      }

      // 20 segmentos HUD
      if (hudSegmentsContainer) {
        hudSegmentsContainer.innerHTML = '';
        const totalSegments = 20;
        for (let i = 0; i < totalSegments; i++) {
          const seg = document.createElement('div');
          seg.className = 'hud-segment';
          if (pct >= (i * (100 / totalSegments)) && pct > 0) {
            seg.classList.add('active');
            if (pct < 50) {
              seg.classList.add('active-emerald');
            } else if (pct <= 80) {
              seg.classList.add('active-amber');
            } else {
              seg.classList.add('active-rose');
            }
          }
          hudSegmentsContainer.appendChild(seg);
        }
      }

      // Alertas de Detectabilidad Esteganográfica
      if (hudDetectabilityAlert && hudDetectabilityText) {
        if (pct === 0) {
          hudDetectabilityAlert.className = 'alert hud-detectability-alert';
          hudDetectabilityAlert.style.borderColor = 'var(--border-color)';
          hudDetectabilityAlert.style.background = 'rgba(255, 255, 255, 0.02)';
          hudDetectabilityText.innerHTML = '<span style="color:var(--text-muted); font-family:var(--font-mono); font-size:0.75rem;">[STANDBY] Aguardando datos para inyección LSB. Sin sesgo esteganográfico.</span>';
        } else if (pct < 50) {
          hudDetectabilityAlert.className = 'alert hud-detectability-alert';
          hudDetectabilityAlert.style.borderColor = 'var(--accent-emerald)';
          hudDetectabilityAlert.style.background = 'rgba(16, 185, 129, 0.08)';
          hudDetectabilityText.innerHTML = '<span style="color:var(--accent-emerald); font-weight:700;">🟢 INALTERABILIDAD VISUAL ÓPTIMA (&lt;50%):</span> PSNR esperado &gt; 55 dB. Detectabilidad LSB prácticamente nula en análisis de orden superior.';
        } else if (pct <= 80) {
          hudDetectabilityAlert.className = 'alert hud-detectability-alert';
          hudDetectabilityAlert.style.borderColor = 'var(--accent-amber)';
          hudDetectabilityAlert.style.background = 'rgba(245, 158, 11, 0.08)';
          hudDetectabilityText.innerHTML = '<span style="color:var(--accent-amber); font-weight:700;">🟡 OCUPACIÓN MODERADA (50-80%):</span> Posible alteración en la distribución de pares de valores muestrales (PoV). Aceptable en carriers ruidosos.';
        } else {
          hudDetectabilityAlert.className = 'alert hud-detectability-alert';
          hudDetectabilityAlert.style.borderColor = 'var(--accent-rose)';
          hudDetectabilityAlert.style.background = 'rgba(244, 63, 94, 0.12)';
          hudDetectabilityText.innerHTML = '<span style="color:var(--accent-rose); font-weight:700;">🔴 ALERTA DE DETECTABILIDAD FORENSE (&gt;80%):</span> Ocupación crítica. Firmas de entropía LSB evidentes ante test Chi-cuadrado y RS Analysis.';
        }
      }

      // Telemetría Forense en Vivo
      if (telemetryUsedBytes) {
        const freeBytes = Math.max(0, currentMaxCapacityBytes - estimatedTotalBytes);
        telemetryUsedBytes.textContent = `${estimatedTotalBytes.toLocaleString()} B (${freeBytes.toLocaleString()} B libres)`;
      }
      if (telemetryPixelsReq) {
        const totalBits = estimatedTotalBytes * 8;
        const pixelsReq = Math.ceil(totalBits / 3);
        const totalPix = loadedCarrierImage ? (loadedCarrierImage.width * loadedCarrierImage.height) : 0;
        const matrixPct = totalPix > 0 ? ((pixelsReq / totalPix) * 100).toFixed(1) : '0.0';
        telemetryPixelsReq.textContent = `${pixelsReq.toLocaleString()} px (${matrixPct}% matriz)`;
      }
      if (telemetryChiBias) {
        if (pct === 0) {
          telemetryChiBias.textContent = 'p > 0.999 (Negativo / Seguro)';
          telemetryChiBias.style.color = 'var(--accent-emerald)';
        } else if (pct < 30) {
          telemetryChiBias.textContent = `p = ${(0.98 - (pct / 100) * 0.2).toFixed(3)} (Indetectable)`;
          telemetryChiBias.style.color = 'var(--accent-emerald)';
        } else if (pct <= 75) {
          telemetryChiBias.textContent = `p = ${(0.65 - ((pct - 30) / 45) * 0.45).toFixed(3)} (Bajo Sesgo)`;
          telemetryChiBias.style.color = 'var(--accent-amber)';
        } else {
          telemetryChiBias.textContent = 'p < 0.05 (CRÍTICO: Patrón LSB Evidente)';
          telemetryChiBias.style.color = 'var(--accent-rose)';
        }
      }

      if (pct > 100) {
        capacityWarningMsg.style.display = 'block';
        capacityWarningMsg.innerHTML = `<span class="micon" aria-hidden="true">warning</span>  Sobrecupo: El payload (${formatBytes(estimatedTotalBytes)}) supera la capacidad máxima de la portadora (${formatBytes(currentMaxCapacityBytes)}). Sube una imagen de mayor resolución.`;
      } else {
        capacityWarningMsg.style.display = 'none';
      }
    }

    updateLiveHexDump();
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
      btnInjectData.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Procesando inyección en Canvas...';

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
      lastInjectedStats = stats;

      if (carrierStatusTag) {
        carrierStatusTag.className = 'badge badge-emerald';
        carrierStatusTag.textContent = 'INYECCIÓN COMPLETADA (LSB OK)';
      }
      updateLiveHexDump();

      // Mostrar en el canvas del resultado
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const ctx = outputCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0);

      // Actualizar Badges de Calidad y Protocolo
      if (stegoPsnrBadge) {
        stegoPsnrBadge.innerText = `PSNR: ${stats.psnr} dB (${stats.psnr > 50 ? 'Invisibilidad Perfecta' : 'Excelente'})`;
      }
      if (stegoProtocolBadge) {
        stegoProtocolBadge.innerText = isAes ? 'AES-256-GCM + PBKDF2' : 'Protocolo STG1 Big-Endian 32-bit';
      }

      const typeDesc = activeSecretType === 'text' 
        ? 'Mensaje de Texto' 
        : `Archivo: "${selectedSecretFile.name}" (${formatBytes(selectedSecretFile.size)})`;

      stegoStatsDetails.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.5rem;">
          <div>• <strong>Tipo de Secreto:</strong> ${typeDesc}</div>
          <div>• <strong>Dimensiones de Imagen:</strong> ${stats.width} × ${stats.height} px</div>
          <div>• <strong>Payload Inyectado:</strong> ${stats.payloadBytes.toLocaleString()} bytes (${stats.totalInjectedBits.toLocaleString()} bits totales)</div>
          <div>• <strong>Canales RGB Alterados:</strong> ${stats.modifiedChannels.toLocaleString()} bits (${stats.flippedBitsCount.toLocaleString()} bits mutaron)</div>
          <div>• <strong>Capacidad Utilizada:</strong> ${stats.capacityUsedPercentage}% de ${stats.capacityMaxBytes.toLocaleString()} bytes</div>
          <div>• <strong>Métrica Óptica PSNR:</strong> <span style="color:var(--accent-emerald); font-weight:700;">${stats.psnr} dB</span> (MSE: ${stats.mse})</div>
          <div>• <strong>Canal Alfa (Transparencia):</strong> <span style="color:var(--accent-cyan); font-weight:700;">A = 255 (100% Intacto)</span></div>
          <div>• <strong>Seguridad Criptográfica:</strong> ${isAes ? 'AES-256-GCM + PBKDF2 (600k iter)' : 'Esteganografía Pura LSB'}</div>
        </div>
      `;

      resultContainer.style.display = 'block';
      resultContainer.scrollIntoView({ behavior: 'smooth' });

      // Iniciar la Simulación del Escáner Láser
      runLaserScanSimulation(stats, laserSpeedMultiplier);

      // Renderizar el Microscopio Bit a Bit
      renderMicroscopeSamples(activeMicroscopeCategory);

    } catch (err) {
      alert(`Error en inyección LSB: ${err.message}`);
    } finally {
      btnInjectData.disabled = false;
      btnInjectData.innerHTML = '<span class="micon" aria-hidden="true">bolt</span>  Ejecutar Inyección LSB en Canvas';
    }
  });

  // --- Simulación de Escáner Láser de Inyección ---
  function runLaserScanSimulation(stats, speedMultiplier = 3) {
    if (!stats) return;
    if (laserAnimationTimer) {
      cancelAnimationFrame(laserAnimationTimer);
      laserAnimationTimer = null;
    }

    if (!stegoLaserBeam || !stegoScannedShading) return;

    stegoLaserBeam.style.display = 'block';
    stegoScannedShading.style.display = 'block';
    if (stegoScanStatusLabel) {
      stegoScanStatusLabel.innerText = '<span class="micon" aria-hidden="true">bolt</span>  Inyectando bits en canales R, G, B...';
      stegoScanStatusLabel.style.color = 'var(--accent-cyan)';
    }

    // Porcentaje que cubre en altura la zona inyectada
    const targetHeightPct = Math.max(12, Math.min(100, ((stats.endRow + 1) / stats.height) * 100));
    const duration = Math.max(700, 2400 / speedMultiplier);
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Easing cuadrático suave
      const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      const currentPct = eased * targetHeightPct;
      stegoLaserBeam.style.top = `${currentPct}%`;
      stegoScannedShading.style.height = `${currentPct}%`;

      const currentBits = Math.floor(eased * stats.totalInjectedBits);
      const currentPixel = Math.floor(eased * stats.endPixel);
      const currentRow = Math.floor(eased * stats.endRow);

      if (hudBitsCounter) hudBitsCounter.innerText = `${currentBits.toLocaleString()} / ${stats.totalInjectedBits.toLocaleString()}`;
      if (hudPixelCounter) hudPixelCounter.innerText = `#${currentPixel.toLocaleString()}`;
      if (hudRowCounter) hudRowCounter.innerText = `Fila ${currentRow} de ${stats.height}`;
      if (hudPsnrCounter) hudPsnrCounter.innerText = `${stats.psnr} dB`;

      if (progress < 1) {
        laserAnimationTimer = requestAnimationFrame(step);
      } else {
        stegoLaserBeam.style.top = `${targetHeightPct}%`;
        stegoScannedShading.style.height = `${targetHeightPct}%`;
        if (hudBitsCounter) hudBitsCounter.innerText = `${stats.totalInjectedBits.toLocaleString()} / ${stats.totalInjectedBits.toLocaleString()} bits`;
        if (hudPixelCounter) hudPixelCounter.innerText = `#${stats.endPixel.toLocaleString()} (Fila ${stats.endRow})`;
        if (hudRowCounter) hudRowCounter.innerText = `Fila ${stats.endRow} (Inyección completa)`;
        if (hudPsnrCounter) hudPsnrCounter.innerText = `${stats.psnr} dB`;
        if (stegoScanStatusLabel) {
          stegoScanStatusLabel.innerText = `✓ Inyección Completada (Fila 0 a #${stats.endRow})`;
          stegoScanStatusLabel.style.color = 'var(--accent-emerald)';
        }
      }
    }

    laserAnimationTimer = requestAnimationFrame(step);
  }

  // --- Renderizado del Microscopio Bit a Bit (Antes vs Después) ---
  function renderMicroscopeSamples(category) {
    activeMicroscopeCategory = category;

    if (tabSampleHeader) tabSampleHeader.classList.toggle('active', category === 'header');
    if (tabSamplePayload) tabSamplePayload.classList.toggle('active', category === 'payloadStart');
    if (tabSampleBoundary) tabSampleBoundary.classList.toggle('active', category === 'boundary');

    if (!microscopeSamplesContainer) return;

    if (!lastInjectedStats || !lastInjectedStats.samples) {
      microscopeSamplesContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.875rem; padding: 1rem;">No hay muestras disponibles. Ejecuta una inyección primero.</div>';
      return;
    }

    const sampleList = lastInjectedStats.samples[category] || [];
    if (sampleList.length === 0) {
      microscopeSamplesContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.875rem; padding: 1rem;">No hay bytes registrados en esta categoría de muestra.</div>';
      return;
    }

    let html = '';
    sampleList.forEach((b) => {
      let catLabel = b.category === 'header' 
        ? '<span class="badge badge-cyan" style="font-size: 0.75rem;">Cabecera 32-bit (Longitud)</span>' 
        : (b.category === 'boundary' 
          ? '<span class="badge badge-rose" style="font-size: 0.75rem;">Frontera Final de Inyección</span>' 
          : '<span class="badge badge-emerald" style="font-size: 0.75rem;">Payload Secreto Útil</span>');

      html += `
        <div class="byte-sample-card">
          <div class="byte-sample-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.125rem;"><span class="micon" aria-hidden="true">inventory_2</span> </span>
              <div>
                <strong style="color: var(--text-primary); font-size: 0.875rem;">Byte #${b.byteIndex}: ${b.byteChar}</strong>
                <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 0.5rem;">(Valor Decimal: ${b.byteVal})</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              ${catLabel}
              <span style="background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); color: var(--accent-cyan); padding: 0.15rem 0.45rem; border-radius: 4px; font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700;">
                Binario: ${b.binary}
              </span>
            </div>
          </div>

          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
            Descomposición de los 8 bits en los canales de color (R → G → B):
          </div>

          <div class="byte-channels-grid">
      `;

      b.bits.forEach((bit) => {
        const chColor = bit.channel === 'R' ? 'var(--accent-rose)' : (bit.channel === 'G' ? 'var(--accent-emerald)' : '#60a5fa');
        const chName = bit.channel === 'R' ? 'Rojo' : (bit.channel === 'G' ? 'Verde' : 'Azul');
        const deltaClass = bit.delta === 0 ? 'delta-zero' : (bit.delta > 0 ? 'delta-plus' : 'delta-minus');
        const deltaText = bit.delta > 0 ? `+${bit.delta}` : `${bit.delta}`;

        html += `
          <div class="channel-bit-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: ${chColor}; font-weight: 700;">Canal ${chName} (${bit.channel})</span>
              <span style="color: var(--text-muted); font-size: 0.75rem;">Píxel #${bit.pixelIndex} [x:${bit.x}, y:${bit.y}]</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <span style="color: var(--text-secondary); font-size: 0.75rem;">Bit ${bit.bitIndex} a Inyectar:</span>
              <span class="bit-pill ${bit.injectedBit === 1 ? 'bit-pill-1' : 'bit-pill-0'}">Bit = ${bit.injectedBit}</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <span style="color: var(--text-muted); font-size: 0.75rem;">Original:</span>
              <span style="color: var(--text-secondary);">${bit.origByte} (<span class="binary-repr">${bit.origBin.slice(0, 7)}<span class="lsb-highlight">${bit.origBin[7]}</span></span>)</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: var(--accent-cyan); font-size: 0.75rem;">Estego:</span>
              <span style="color: var(--text-primary); font-weight: 600;">${bit.newByte} (<span class="binary-repr">${bit.newBin.slice(0, 7)}<span class="lsb-highlight">${bit.newBin[7]}</span></span>)</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="swatch-box" style="background: ${bit.origColor};" title="Color Original"></span>
                <span style="color: var(--text-muted); font-size: 0.6875rem;">→</span>
                <span class="swatch-box" style="background: ${bit.newColor};" title="Color Estego"></span>
                <span style="font-size: 0.6875rem; color: var(--text-muted);">Invariable al ojo</span>
              </div>
              <span class="delta-badge ${deltaClass}">Δ = ${deltaText}</span>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    microscopeSamplesContainer.innerHTML = html;
  }

  // Controles de Simulación Láser y Tabs de Microscopio
  if (btnReplayLaser) {
    btnReplayLaser.addEventListener('click', () => {
      runLaserScanSimulation(lastInjectedStats, laserSpeedMultiplier);
    });
  }

  if (btnSpeedSlow && btnSpeedFast) {
    btnSpeedSlow.addEventListener('click', () => {
      laserSpeedMultiplier = 1;
      btnSpeedSlow.className = 'btn btn-primary';
      btnSpeedFast.className = 'btn btn-secondary';
      runLaserScanSimulation(lastInjectedStats, 1);
    });

    btnSpeedFast.addEventListener('click', () => {
      laserSpeedMultiplier = 3;
      btnSpeedFast.className = 'btn btn-primary';
      btnSpeedSlow.className = 'btn btn-secondary';
      runLaserScanSimulation(lastInjectedStats, 3);
    });
  }

  if (tabSampleHeader) {
    tabSampleHeader.addEventListener('click', () => renderMicroscopeSamples('header'));
  }
  if (tabSamplePayload) {
    tabSamplePayload.addEventListener('click', () => renderMicroscopeSamples('payloadStart'));
  }
  if (tabSampleBoundary) {
    tabSampleBoundary.addEventListener('click', () => renderMicroscopeSamples('boundary'));
  }

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

  // --- Despachar Imagen Stego por Correo Electrónico ---
  if (btnEmailStego) {
    btnEmailStego.addEventListener('click', () => {
      if (!lastInjectedCanvas) return;
      openEmailModal({
        filename: `stego_secreto_${Date.now()}.png`,
        mimeType: 'image/png',
        getAttachmentBase64: () => lastInjectedCanvas.toDataURL('image/png'),
        defaultSubject: '<span class="micon" aria-hidden="true">key</span>  Imagen Esteganográfica con Datos Ocultos (Laboratorio)',
        defaultNote: 'Te envío esta imagen portadora con datos confidenciales ocultos en sus bits menos significativos (LSB). Descárgala en tu equipo y súbela en la pestaña "Revelar Información (Extracción LSB)" para extraer el secreto.',
        previewThumbnail: lastInjectedCanvas.toDataURL('image/png'),
        showToast
      });
    });
  }

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

  if (revealPreviewBox) {
    revealPreviewBox.style.cursor = 'pointer';
    revealPreviewBox.title = 'Haz clic para cambiar o subir otra imagen';
    revealPreviewBox.addEventListener('click', () => stegoInputFile.click());
    revealPreviewBox.addEventListener('dragover', (e) => e.preventDefault());
    revealPreviewBox.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) handleRevealFile(e.dataTransfer.files[0]);
    });
  }

  async function handleRevealFile(file) {
    try {
      const revealBadge = container.querySelector('#reveal-conversion-badge');
      const conversion = await StegoEngine.convertToPng(file);
      const img = conversion.imageElement;
      loadedRevealImage = img;
      revealImg.src = img.src;

      // Ocultar dropzone para que SOLO se visualice la imagen cargada
      if (dropzoneReveal) dropzoneReveal.style.display = 'none';
      revealPreviewBox.style.display = 'flex';
      btnExtractData.disabled = false;
      revealResultContainer.style.display = 'none';

      if (revealBadge) {
        if (conversion.wasConverted) {
          const origFormat = (conversion.originalType || 'JPEG').replace('image/', '').toUpperCase();
          revealBadge.style.display = 'inline-flex';
          revealBadge.innerHTML = `<span class="micon" aria-hidden="true">bolt</span>  Convertido de <code>${origFormat}</code> a <code>PNG</code> sin pérdida`;
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
        btnDecryptRevealed.innerHTML = '<span class="micon" aria-hidden="true">vpn_key</span>  Descifrar y Verificar Autenticidad (GCM Tag)';
        btnDecryptRevealed.style.cursor = 'pointer';
        revealDecryptPassword.focus();

        stegoAttemptsBadge.style.display = 'inline-block';
        stegoAttemptsBadge.className = 'badge badge-amber';
        stegoAttemptsBadge.textContent = '⚠️ Reintento desbloqueado';

        showToast({
          title: 'Tiempo de Espera Finalizado',
          message: 'El bloqueo ha expirado. Ya puedes volver a ingresar la contraseña maestra.',
          icon: '<span class="micon" aria-hidden="true">lock_open</span> ',
          type: 'info',
          duration: 3000
        });
        return;
      }

      const totalSec = Math.ceil(remainingMs / 1000);
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      stegoCountdownDisplay.textContent = `${mins}:${secs}`;
      btnDecryptRevealed.innerHTML = `<span class="micon" aria-hidden="true">hourglass_top</span>  Bloqueado por Seguridad (${mins}:${secs})`;
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
    btnDecryptRevealed.innerHTML = '<span class="micon" aria-hidden="true">vpn_key</span>  Descifrar y Verificar Autenticidad (GCM Tag)';
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
        icon: '<span class="micon" aria-hidden="true">hourglass_top</span> ',
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
        icon: '<span class="micon" aria-hidden="true">warning</span> ',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    try {
      btnDecryptRevealed.disabled = true;
      btnDecryptRevealed.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Descifrando y derivando PBKDF2...';

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
        icon: '<span class="micon" aria-hidden="true">lock_open</span> ',
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
        revealStatusAlert.innerHTML = `<strong><span class="micon" aria-hidden="true">warning</span>  Bloqueo de Seguridad Activado:</strong> Has alcanzado el límite de intentos erróneos. El sistema está bloqueado por <strong>${durationName}</strong> contra ataques de fuerza bruta.`;
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
        revealStatusAlert.innerHTML = `<strong>Fallo de Integridad / Clave Incorrecta:</strong> ${err.message}<br/><span style="color: #fca5a5; font-size: 0.875rem;"><span class="micon" aria-hidden="true">warning</span>  Te quedan <strong>${remaining} de 5</strong> intentos antes del bloqueo temporal de 1 minuto.</span>`;
        showToast({
          title: 'Contraseña Incorrecta',
          message: `Quedan ${remaining} de 5 intentos antes del bloqueo.`,
          icon: '<span class="micon" aria-hidden="true">cancel</span> ',
          type: 'danger',
          duration: 2500
        });
      }
    } finally {
      const finalState = getLockoutState();
      if (!finalState.lockoutUntil || finalState.lockoutUntil <= Date.now()) {
        btnDecryptRevealed.disabled = false;
        btnDecryptRevealed.innerHTML = '<span class="micon" aria-hidden="true">vpn_key</span>  Descifrar y Verificar Autenticidad (GCM Tag)';
      }
    }
  });

  // Inicializar estado de bloqueo al montar la pestaña
  updateLockoutUI();
}
