import { ImageAttackEngine } from '../services/imageAttackEngine.js';
import { StegoEngine } from '../services/stegoEngine.js';

export function renderImageAttackTab(container, initialData = null) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado de la Pestaña -->
      <div class="card card-glow-rose" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: 1rem; border-color: rgba(244, 63, 94, 0.4); box-shadow: 0 0 25px -5px rgba(244, 63, 94, 0.15);">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 1.375rem;"><span class="micon" aria-hidden="true">movie</span> </span>
            <h2 style="font-size: 1.375rem; color: var(--text-primary);">Simulador Interactivo de Ataque y Mutación de Bits en Tiempo Real</h2>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0;">
            Reproduce en vivo la degradación progresiva de imágenes (Modo Vídeo). Compara en paralelo la referencia original, la imagen mutada con glitches cromáticos y el mapa de calor forense térmico con telemetría byte a byte.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button id="btn-reset-attack-module" class="btn btn-secondary module-reset-btn" type="button" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: var(--accent-amber); color: var(--accent-amber); display: inline-flex; align-items: center; gap: 0.35rem;" title="Reiniciar este módulo para probar otra vez">
            <span class="micon" aria-hidden="true">restart_alt</span> Reiniciar / Probar otra vez
          </button>
          <span class="badge badge-rose"><span class="micon" aria-hidden="true">movie</span>  Modo Vídeo Interactivo</span>
          <span class="badge badge-cyan"><span class="micon" aria-hidden="true">biotech</span>  Vista Tripartita</span>
          <span class="badge badge-emerald"><span class="micon" aria-hidden="true">terminal</span>  Telemetría Forense</span>
        </div>
      </div>

      <!-- 1. Barra de Carga de Imagen -->
      <div class="card" style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <h3 style="font-size: 1.125rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.5rem;">
            <span><span class="micon" aria-hidden="true">image</span> </span> 1. Imagen Portadora en Análisis
          </h3>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btn-download-attacked-top" class="btn btn-secondary" style="font-size: 0.875rem; padding: 0.45rem 1rem; color: #fca5a5; border-color: rgba(244, 63, 94, 0.45); display: none; align-items: center; gap: 0.5rem;" title="Descargar imagen atacada en formato PNG">
              <span><span class="micon" aria-hidden="true">download</span> </span> Descargar Imagen Atacada (PNG)
            </button>
            <button id="btn-reset-attack" class="btn btn-secondary" style="font-size: 0.875rem; padding: 0.45rem 1rem;" disabled>
              <span class="micon" aria-hidden="true">autorenew</span>  Restablecer Todo
            </button>
          </div>
        </div>

        <div class="grid-2" style="gap: 1rem; align-items: center;">
          <div id="dropzone-attack" class="dropzone" style="padding: 1.25rem 1rem; cursor: pointer;">
            <input type="file" id="attack-file-input" accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp, image/*" style="display: none;" />
            <div style="font-size: 1.75rem; margin-bottom: 0.25rem;"><span class="micon" aria-hidden="true">folder_open</span> </div>
            <p style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">Arrastra una imagen o haz clic para seleccionarla</p>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Soporta PNG, JPEG, WebP o BMP para someter a mutación de bits</p>
          </div>

          <div style="background: var(--bg-inset-strong); padding: 1.25rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.875rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Imagen Cargada:</span>
              <span id="carrier-status-tag" class="font-mono text-white">Ninguna imagen cargada</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Dimensiones:</span>
              <span id="carrier-dim-label" class="font-mono" style="color: var(--accent-cyan);">-</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Total de Píxeles:</span>
              <span id="carrier-pixels-label" class="font-mono" style="color: var(--accent-emerald);">-</span>
            </div>
          </div>
        </div>
      </div>

      <!-- WORKSPACE PRINCIPAL (Se activa al cargar imagen) -->
      <div id="attack-workspace" style="display: none; flex-direction: column; gap: 1.5rem;">
        
        <!-- 2. PRESETS RÁPIDOS DIDÁCTICOS & CONSOLA DE CONFIGURACIÓN -->
        <div class="card space-y-4" style="border-left: 4px solid var(--accent-rose);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 style="font-size: 1.125rem; color: #f87171; display: flex; align-items: center; gap: 0.5rem;">
                <span><span class="micon" aria-hidden="true">bolt</span> </span> 2. Presets Didácticos & Configuración del Ataque
              </h3>
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Elige un escenario preconfigurado para demostrar la diferencia entre ataques invisibles y destrucción masiva.
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="preset-stealth" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: rgba(16, 185, 129, 0.4); color: #34d399;">
                <span class="micon" aria-hidden="true">person_search</span>  Modo Sigiloso (Bit 0 LSB)
              </button>
              <button id="preset-glitch" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: rgba(244, 63, 94, 0.4); color: #f87171;">
                <span class="micon" aria-hidden="true">broken_image</span>  Glitch Destructivo (Bit 7 MSB)
              </button>
              <button id="preset-sabotage" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: rgba(245, 158, 11, 0.4); color: #fbbf24;">
                🌪 Sabotaje Total (Ruido Puro)
              </button>
            </div>
          </div>

          <div style="background: var(--bg-inset); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem;">
            <!-- Controles de Bit e Intensidad -->
            <div class="grid-3" style="gap: 1rem; align-items: center;">
              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">
                  Plano de Bit Objetivo:
                </label>
                <select id="select-target-bit" style="font-size: 1.1rem; padding: 0.55rem 0.9rem; min-height: 44px; font-weight: 600;">
                  <option value="0" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;" selected>Bit 0 (LSB - Regla Esteganográfica, ±1)</option>
                  <option value="1" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Bit 1 (±2, Textura micro-sutil)</option>
                  <option value="2" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Bit 2 (±4, Textura leve)</option>
                  <option value="4" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Bit 4 (±16, Distorsión media)</option>
                  <option value="7" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Bit 7 (MSB - Glitch Radical Máximo, ±128)</option>
                  <option value="random" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Ruido Aleatorio Puro (0 a 255)</option>
                </select>
              </div>

              <div>
                <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">
                  Canales de Color Afectados:
                </label>
                <select id="select-target-channel" style="font-size: 1.1rem; padding: 0.55rem 0.9rem; min-height: 44px; font-weight: 600;">
                  <option value="all" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;" selected>Todos los Canales (R, G, B)</option>
                  <option value="r" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Solo Canal Rojo (R)</option>
                  <option value="g" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Solo Canal Verde (G)</option>
                  <option value="b" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Solo Canal Azul (B)</option>
                </select>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.25rem;">
                  <span style="color: var(--text-secondary); font-weight: 600;">Objetivo del Ataque (% Píxeles):</span>
                  <span id="label-bitflip-pct" class="font-mono" style="color: var(--accent-rose); font-weight: 700;">2.00%</span>
                </div>
                <input type="range" id="slider-bitflip-pct" min="0.05" max="10" step="0.05" value="2" style="width: 100%; cursor: pointer;" />
              </div>
            </div>

            <!-- 3. BARRA DE REPRODUCCIÓN / TRANSPORTE (MODO VÍDEO) -->
            <div class="sim-transport-bar">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <button id="btn-sim-play" class="btn sim-btn-play" style="font-size: 0.875rem; padding: 0.45rem 1rem; display: flex; align-items: center; gap: 0.25rem;">
                  <span><span class="micon" aria-hidden="true">play_arrow</span> </span> Iniciar Simulación
                </button>
                <button id="btn-sim-pause" class="btn sim-btn-pause" style="font-size: 0.875rem; padding: 0.45rem 0.85rem; display: flex; align-items: center; gap: 0.25rem;" disabled>
                  <span><span class="micon" aria-hidden="true">pause</span> </span> Pausar
                </button>
                <button id="btn-sim-step" class="btn sim-btn-step" style="font-size: 0.875rem; padding: 0.45rem 0.85rem; display: flex; align-items: center; gap: 0.25rem;">
                  <span><span class="micon" aria-hidden="true">skip_next</span> </span> Paso a Paso
                </button>
                <button id="btn-sim-stop" class="btn sim-btn-stop" style="font-size: 0.875rem; padding: 0.45rem 0.85rem; display: flex; align-items: center; gap: 0.25rem;">
                  <span><span class="micon" aria-hidden="true">stop</span> </span> Reiniciar
                </button>
              </div>

              <!-- Selector de Velocidad Didáctica -->
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;"><span class="micon" aria-hidden="true">timer</span>  Velocidad:</span>
                <select id="select-sim-speed" style="padding: 0.55rem 0.9rem; font-size: 1.1rem; min-height: 44px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-weight: 600;">
                  <option value="350" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Ultra Lento (350 ms/paso - Clase explicativa)</option>
                  <option value="120" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Didáctico Lento (120 ms/paso)</option>
                  <option value="40" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;" selected>Normal (40 ms/paso)</option>
                  <option value="15" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Rápido (15 ms/paso)</option>
                </select>

                <!-- Badge de Estado Dinámico -->
                <span id="badge-sim-status" class="badge badge-cyan" style="font-size: 0.75rem; padding: 0.3rem 0.75rem;">
                  ● EN ESPERA
                </span>
              </div>
            </div>

            <!-- Barra de Progreso de la Simulación -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                <span>Progreso de Inyección en el Lienzo:</span>
                <span id="sim-progress-label" class="font-mono" style="color: var(--accent-cyan); font-weight: 700;">0% / 2.00%</span>
              </div>
              <div class="progress-container" style="height: 8px;">
                <div id="sim-progress-bar" class="progress-bar progress-normal" style="width: 0%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. VISTA TRIPLE COMPARATIVA SINCRONIZADA (3 CANVASES) -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 style="font-size: 1.35rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem; margin: 0; font-weight: 800;">
                <span><span class="micon" aria-hidden="true" style="font-size: 1.6rem;">biotech</span> </span> 3. Vista Tripartita Sincronizada (Original vs Atacada vs Máscara Forense)
              </h3>
              <p style="font-size: 1.05rem; color: var(--text-secondary); margin: 0.35rem 0 0 0;">
                Tres proyecciones simultáneas calculadas en memoria gráfica para evidenciar la detección forense de anomalías.
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 0.45rem; background: var(--bg-inset); padding: 0.35rem 0.65rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <span style="font-size: 0.88rem; color: var(--text-muted); font-weight: 700;">Tamaño de Lienzo:</span>
              <button type="button" id="btn-grid-view-3" class="btn btn-secondary btn-sm active" style="font-size: 0.78rem; padding: 0.25rem 0.65rem;" title="3 columnas simultáneas (Vista triple)">3 Vistas</button>
              <button type="button" id="btn-grid-view-2" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 0.25rem 0.65rem;" title="2 columnas (Lienzos más grandes)">2 Grandes</button>
              <button type="button" id="btn-grid-view-1" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 0.25rem 0.65rem;" title="1 columna (Lienzos gigantes)">1 Gigante</button>
            </div>
          </div>

          <div id="grid-canvases-container" class="grid-3-canvases">
            
            <!-- LIENZO 1: IMAGEN ORIGINAL (REFERENCIA LIMPIA) -->
            <div class="card" style="display: flex; flex-direction: column; gap: 0.85rem; border-color: rgba(0, 240, 255, 0.35);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <h4 style="font-size: 1.15rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.4rem; margin: 0; font-weight: 800;">
                  <span><span class="micon" aria-hidden="true" style="font-size: 1.35rem;">image</span> </span> 1. Referencia Limpia
                </h4>
                <select id="select-left-view-mode" style="padding: 0.55rem 0.9rem; font-size: 1.1rem; min-height: 44px; border: 1px solid var(--accent-cyan); background: rgba(16, 22, 34, 0.95); color: var(--accent-cyan); font-weight: 600; border-radius: 8px;">
                  <option value="photo" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;" selected>Foto Natural Visible</option>
                  <option value="lsb-bw" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Plano LSB (B/N)</option>
                  <option value="lsb-rgb" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Plano LSB Cromático (RGB)</option>
                </select>
              </div>

              <div class="image-preview-box" style="height: 520px; min-height: 480px; max-height: 700px; overflow: hidden; background: #000000; display: flex; justify-content: center; align-items: center; border: 1px solid rgba(0, 240, 255, 0.25);">
                <canvas id="canvas-orig-view" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
              </div>

              <div style="font-size: 0.95rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
                <span id="orig-view-desc">Imagen intacta sin corrupción</span>
                <span id="orig-view-coords" class="font-mono text-white" style="font-size: 1rem; font-weight: 700;">-</span>
              </div>
            </div>

            <!-- LIENZO 2: IMAGEN ATACADA EN VIVO (GLITCHES & MUTACIÓN) -->
            <div class="card" style="display: flex; flex-direction: column; gap: 0.85rem; border-color: rgba(244, 63, 94, 0.45); box-shadow: 0 0 20px -5px rgba(244, 63, 94, 0.15);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <h4 style="font-size: 1.15rem; color: #f87171; display: flex; align-items: center; gap: 0.4rem; margin: 0; font-weight: 800;">
                  <span><span class="micon" aria-hidden="true" style="font-size: 1.35rem;">broken_image</span> </span> 2. Atacada en Vivo
                </h4>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <button id="btn-download-attacked" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.2rem 0.6rem; color: #fca5a5; border-color: rgba(244, 63, 94, 0.45); display: flex; align-items: center; gap: 0.25rem;" title="Descargar imagen mutada / atacada en formato PNG">
                    <span><span class="micon" aria-hidden="true">download</span> </span> Descargar PNG
                  </button>
                  <span id="badge-attack-mode-label" class="badge badge-rose" style="font-size: 0.78rem; padding: 0.2rem 0.55rem; font-weight: 800;">
                    GLITCH EN VIVO
                  </span>
                </div>
              </div>

              <div class="image-preview-box" style="height: 520px; min-height: 480px; max-height: 700px; overflow: hidden; background: #000000; display: flex; justify-content: center; align-items: center; border: 1px solid rgba(244, 63, 94, 0.3);">
                <canvas id="canvas-attacked-view" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
              </div>

              <div style="font-size: 0.95rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
                <span id="attacked-view-desc">Mutaciones reflejadas en tiempo real</span>
                <span id="attacked-pixel-counter" class="font-mono" style="color: #f87171; font-weight: 700; font-size: 1.05rem;">0 px mutados</span>
              </div>
            </div>

            <!-- LIENZO 3: MÁSCARA FORENSE DE DIFERENCIAS (HEATMAP TÉRMICO) -->
            <div class="card" style="display: flex; flex-direction: column; gap: 0.85rem; border-color: rgba(168, 85, 247, 0.45);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <h4 style="font-size: 1.15rem; color: #d8b4fe; display: flex; align-items: center; gap: 0.4rem; margin: 0; font-weight: 800;">
                  <span><span class="micon" aria-hidden="true" style="font-size: 1.35rem;">target</span> </span> 3. Máscara Forense
                </h4>
                <select id="select-heatmap-theme" style="padding: 0.55rem 0.9rem; font-size: 1.1rem; min-height: 44px; border: 1px solid rgba(168, 85, 247, 0.5); background: rgba(16, 22, 34, 0.95); color: #d8b4fe; font-weight: 600; border-radius: 8px;">
                  <option value="pure-red" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;" selected>Rojo Neón Forense</option>
                  <option value="matrix" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Verde Matrix</option>
                  <option value="cyan-glow" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Cian Térmico</option>
                  <option value="lsb-rgb-attacked" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Plano LSB Atacado (RGB)</option>
                  <option value="lsb-bw-attacked" style="font-size: 1.25rem; padding: 12px 16px; background-color: #0d1424; color: #f8fafc;">Plano LSB Atacado (B/N)</option>
                </select>
              </div>

              <div class="image-preview-box" style="height: 520px; min-height: 480px; max-height: 700px; overflow: hidden; background: #000000; display: flex; justify-content: center; align-items: center; border: 1px solid rgba(168, 85, 247, 0.3);">
                <canvas id="canvas-heatmap-view" style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
              </div>

              <div style="font-size: 0.95rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
                <span>Fondo negro: ilumina las coordenadas alteradas</span>
                <span id="heatmap-coords" class="font-mono text-white" style="font-size: 1rem; font-weight: 700;">-</span>
              </div>
            </div>

          </div>
        </div>

        <!-- 4. CONSOLA DE TELEMETRÍA DE BYTES EN VIVO -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.5rem;">
            <h3 style="font-size: 1rem; color: #00f2fe; text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em; display: flex; align-items: center; gap: 0.5rem; margin: 0; text-shadow: 0 0 12px rgba(0, 242, 254, 0.35);">
              <span><span class="micon" aria-hidden="true">biotech</span> </span> CONSOLA DE TELEMETRÍA DE BYTES EN VIVO:
            </h3>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span id="telemetry-event-count" class="badge badge-cyan" style="font-size: 0.6875rem; padding: 0.2rem 0.5rem;">
                0 eventos registrados
              </span>
              <button id="btn-toggle-autoscroll" class="btn btn-secondary" style="font-size: 0.6875rem; padding: 0.2rem 0.5rem; border-color: rgba(255,255,255,0.15);">
                <span class="micon" aria-hidden="true">push_pin</span>  Auto-Scroll: ON
              </button>
              <button id="btn-clear-telemetry" class="btn btn-secondary" style="font-size: 0.6875rem; padding: 0.2rem 0.5rem; border-color: rgba(255,255,255,0.15);">
                🧹 Limpiar Terminal
              </button>
            </div>
          </div>

          <div class="telemetry-terminal-card">
            <div id="telemetry-log-body" class="telemetry-terminal-body">
              <div style="color: #64748b; font-style: italic; padding: 0.5rem 0.25rem;">
                [Esperando inicio de la simulación... Pulsa "<span class="micon" aria-hidden="true">play_arrow</span>  Iniciar Simulación" o "<span class="micon" aria-hidden="true">skip_next</span>  Paso a Paso" para registrar mutaciones binarias]
              </div>
            </div>
          </div>
        </div>

        <!-- 5. AUDITORÍA CUANTITATIVA DE INTEGRIDAD (MÉTRICAS MATEMÁTICAS) -->
        <div class="card space-y-4" style="background: rgba(16, 22, 34, 0.95); border: 1px solid var(--border-glow);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <h3 style="font-size: 1.125rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.5rem; margin: 0;">
              <span><span class="micon" aria-hidden="true">bar_chart</span> </span> 5. Auditoría Cuantitativa de Integridad Forense
            </h3>
            <span id="attack-verdict-pill" class="badge badge-emerald" style="font-size: 0.875rem; padding: 0.35rem 0.75rem;">
              ● IMAGEN INTACTA
            </span>
          </div>

          <!-- Alerta de Diagnóstico del Ataque -->
          <div id="attack-verdict-alert" class="alert-box alert-success" style="line-height: 1.6; margin: 0;">
            <strong><span class="micon" aria-hidden="true">check_circle</span>  Imagen Limpia:</strong> No se ha aplicado corrupción de bits. Todos los píxeles coinciden exactamente con la imagen original.
          </div>

          <!-- KPIs Numéricos Cuantitativos -->
          <div class="grid-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
            
            <!-- KPI 1: PSNR -->
            <div style="background: var(--bg-inset-strong); padding: 0.75rem; border-radius: 8px; border-left: 3px solid var(--accent-cyan);">
              <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Fidelidad Visual (PSNR)</div>
              <div id="kpi-attack-psnr" class="font-mono" style="font-size: 1.375rem; font-weight: 700; color: var(--accent-cyan); margin: 0.2rem 0;">99.99 dB</div>
              <div id="kpi-attack-psnr-desc" style="font-size: 0.75rem; color: var(--text-secondary);">Idéntica a la original</div>
            </div>

            <!-- KPI 2: Píxeles Modificados -->
            <div style="background: var(--bg-inset-strong); padding: 0.75rem; border-radius: 8px; border-left: 3px solid var(--accent-rose);">
              <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Píxeles Alterados</div>
              <div id="kpi-attack-modified-pixels" class="font-mono" style="font-size: 1.375rem; font-weight: 700; color: #f87171; margin: 0.2rem 0;">0 (0.00%)</div>
              <div id="kpi-attack-pixels-desc" style="font-size: 0.75rem; color: var(--text-secondary);">0 / 0 px</div>
            </div>

            <!-- KPI 3: Error Cuadrático Medio (MSE) -->
            <div style="background: var(--bg-inset-strong); padding: 0.75rem; border-radius: 8px; border-left: 3px solid var(--accent-purple);">
              <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Error Cuadrático (MSE)</div>
              <div id="kpi-attack-mse" class="font-mono" style="font-size: 1.375rem; font-weight: 700; color: var(--accent-purple); margin: 0.2rem 0;">0.00</div>
              <div id="kpi-attack-mse-desc" style="font-size: 0.75rem; color: var(--text-secondary);">Sin distorsión cromática</div>
            </div>

            <!-- KPI 4: Severidad del Daño de Bits -->
            <div style="background: var(--bg-inset-strong); padding: 0.75rem; border-radius: 8px; border-left: 3px solid var(--accent-emerald);">
              <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Severidad del Canal</div>
              <div id="kpi-attack-severity" class="font-mono" style="font-size: 1.375rem; font-weight: 700; color: var(--accent-emerald); margin: 0.2rem 0;">CANAL LIMPIO</div>
              <div id="kpi-attack-severity-desc" style="font-size: 0.75rem; color: var(--text-secondary);">0 bits atacados</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `;

  // --- REFERENCIAS AL DOM ---
  const btnResetAttackModule = container.querySelector('#btn-reset-attack-module');
  if (btnResetAttackModule) {
    btnResetAttackModule.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cyberlab-reset-module', { detail: { module: 'attack' } }));
    });
  }

  const btnResetAttack = container.querySelector('#btn-reset-attack');
  const dropzoneAttack = container.querySelector('#dropzone-attack');
  const attackFileInput = container.querySelector('#attack-file-input');
  const carrierStatusTag = container.querySelector('#carrier-status-tag');
  const carrierDimLabel = container.querySelector('#carrier-dim-label');
  const carrierPixelsLabel = container.querySelector('#carrier-pixels-label');
  const attackWorkspace = container.querySelector('#attack-workspace');

  // Presets
  const presetStealth = container.querySelector('#preset-stealth');
  const presetGlitch = container.querySelector('#preset-glitch');
  const presetSabotage = container.querySelector('#preset-sabotage');

  // Configuración del ataque
  const selectTargetBit = container.querySelector('#select-target-bit');
  const selectTargetChannel = container.querySelector('#select-target-channel');
  const sliderBitflipPct = container.querySelector('#slider-bitflip-pct');
  const labelBitflipPct = container.querySelector('#label-bitflip-pct');

  // Reproductor / Transporte
  const btnSimPlay = container.querySelector('#btn-sim-play');
  const btnSimPause = container.querySelector('#btn-sim-pause');
  const btnSimStep = container.querySelector('#btn-sim-step');
  const btnSimStop = container.querySelector('#btn-sim-stop');
  const selectSimSpeed = container.querySelector('#select-sim-speed');
  const badgeSimStatus = container.querySelector('#badge-sim-status');
  const simProgressBar = container.querySelector('#sim-progress-bar');
  const simProgressLabel = container.querySelector('#sim-progress-label');

  // Lienzos
  const canvasOrigView = container.querySelector('#canvas-orig-view');
  const selectLeftViewMode = container.querySelector('#select-left-view-mode');
  const origViewDesc = container.querySelector('#orig-view-desc');
  const origViewCoords = container.querySelector('#orig-view-coords');

  const canvasAttackedView = container.querySelector('#canvas-attacked-view');
  const btnDownloadAttacked = container.querySelector('#btn-download-attacked');
  const btnDownloadAttackedTop = container.querySelector('#btn-download-attacked-top');
  const badgeAttackModeLabel = container.querySelector('#badge-attack-mode-label');
  const attackedViewDesc = container.querySelector('#attacked-view-desc');
  const attackedPixelCounter = container.querySelector('#attacked-pixel-counter');

  const canvasHeatmapView = container.querySelector('#canvas-heatmap-view');
  const selectHeatmapTheme = container.querySelector('#select-heatmap-theme');
  const heatmapCoords = container.querySelector('#heatmap-coords');

  // Live Byte Inspector (Terminal)
  const telemetryEventCount = container.querySelector('#telemetry-event-count');
  const btnToggleAutoscroll = container.querySelector('#btn-toggle-autoscroll');
  const btnClearTelemetry = container.querySelector('#btn-clear-telemetry');
  const telemetryLogBody = container.querySelector('#telemetry-log-body');

  // Métricas Cuantitativas
  const attackVerdictPill = container.querySelector('#attack-verdict-pill');
  const attackVerdictAlert = container.querySelector('#attack-verdict-alert');
  const kpiAttackPsnr = container.querySelector('#kpi-attack-psnr');
  const kpiAttackPsnrDesc = container.querySelector('#kpi-attack-psnr-desc');
  const kpiAttackModifiedPixels = container.querySelector('#kpi-attack-modified-pixels');
  const kpiAttackPixelsDesc = container.querySelector('#kpi-attack-pixels-desc');
  const kpiAttackMse = container.querySelector('#kpi-attack-mse');
  const kpiAttackMseDesc = container.querySelector('#kpi-attack-mse-desc');
  const kpiAttackSeverity = container.querySelector('#kpi-attack-severity');
  const kpiAttackSeverityDesc = container.querySelector('#kpi-attack-severity-desc');

  // --- ESTADO INTERNO DEL SIMULADOR ---
  let originalCarrierImageData = null;
  let currentAttackedImageData = null;
  let imageWidth = 0;
  let imageHeight = 0;
  let totalPixels = 0;

  // Estado del bucle de simulación
  let simTimer = null;
  let isSimPlaying = false;
  let currentMutatedPixelsCount = 0;
  let targetTotalPixelsToMutate = 0;
  let autoScrollEnabled = true;
  let totalEventsLogged = 0;

  // Cronómetro de telemetría de alta precisión
  let simStartTime = null;
  let simAccumulatedTime = 0;
  let simLastResumeTime = null;

  function getSimElapsedSeconds() {
    if (!simStartTime) return '0.00';
    let total = simAccumulatedTime;
    if (isSimPlaying && simLastResumeTime) {
      total += (performance.now() - simLastResumeTime);
    }
    return (total / 1000).toFixed(2);
  }

  // Helper de conversión a binario de 8 bits
  const toByte8 = (n) => n.toString(2).padStart(8, '0');

  // --- Sistema de Notificaciones Toast ---
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
      }, 300);
    });
  };

  // --- Función para Descargar la Imagen Atacada ---
  function downloadAttackedImage() {
    if (!currentAttackedImageData || !imageWidth || !imageHeight) {
      showToast({
        title: 'Sin Imagen',
        message: 'Primero debes cargar una imagen para poder descargarla.',
        icon: '<span class="micon" aria-hidden="true">warning</span> ',
        type: 'warning'
      });
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageWidth;
    tempCanvas.height = imageHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(currentAttackedImageData, 0, 0);

    const targetBitVal = selectTargetBit ? selectTargetBit.value : '0';
    const bitLabel = targetBitVal === 'random' ? 'ruido_puro' : `bit_${targetBitVal}`;
    const filename = `imagen_atacada_${bitLabel}_${currentMutatedPixelsCount}px_mutados.png`;

    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast({
        title: 'Imagen Atacada Descargada',
        message: `Guardado como "${filename}" (${currentMutatedPixelsCount.toLocaleString()} píxeles mutados).`,
        icon: '<span class="micon" aria-hidden="true">download</span> ',
        type: 'success'
      });
    }, 'image/png');
  }

  // --- SUBIDA Y CARGA DE IMÁGENES ---
  dropzoneAttack.addEventListener('click', () => attackFileInput.click());
  dropzoneAttack.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneAttack.classList.add('drag-active');
  });
  dropzoneAttack.addEventListener('dragleave', () => dropzoneAttack.classList.remove('drag-active'));
  dropzoneAttack.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneAttack.classList.remove('drag-active');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  });
  attackFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  });

  async function handleImageUpload(file) {
    try {
      const { imageElement, width, height } = await StegoEngine.convertToPng(file);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(imageElement, 0, 0);

      loadCarrierFromCanvas(canvas, file.name);
    } catch (err) {
      alert(`Error cargando imagen: ${err.message}`);
    }
  }

  function loadCarrierFromCanvas(canvas, name) {
    stopSimulation();

    imageWidth = canvas.width;
    imageHeight = canvas.height;
    totalPixels = imageWidth * imageHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    originalCarrierImageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
    currentAttackedImageData = ImageAttackEngine.cloneImageData(originalCarrierImageData);

    carrierStatusTag.textContent = name;
    carrierDimLabel.textContent = `${imageWidth} × ${imageHeight} px`;
    carrierPixelsLabel.textContent = `${totalPixels.toLocaleString()} px`;

    attackWorkspace.style.display = 'flex';
    btnResetAttack.disabled = false;
    if (btnDownloadAttackedTop) btnDownloadAttackedTop.style.display = 'inline-flex';

    // Dimensionar los 3 Canvases
    canvasOrigView.width = imageWidth;
    canvasOrigView.height = imageHeight;
    canvasAttackedView.width = imageWidth;
    canvasAttackedView.height = imageHeight;
    canvasHeatmapView.width = imageWidth;
    canvasHeatmapView.height = imageHeight;

    // Inicializar estado de mutación
    currentMutatedPixelsCount = 0;
    calculateTargetPixels();
    clearTelemetryLogs();

    updateProgressUI();
    renderOriginalCanvas();
    renderAttackedCanvas();
    renderHeatmapCanvas();
    updateMetricsAndDiagnostics();
  }

  function calculateTargetPixels() {
    const pct = parseFloat(sliderBitflipPct.value) || 2;
    targetTotalPixelsToMutate = Math.max(1, Math.round(totalPixels * (pct / 100)));
  }

  // --- RENDERIZADO DE LOS 3 CANVASES ---

  // 1. Lienzo Original
  function renderOriginalCanvas() {
    if (!originalCarrierImageData) return;
    const mode = selectLeftViewMode.value;
    const bitVal = parseInt(selectTargetBit.value, 10) || 0;

    if (mode === 'lsb-bw') {
      ImageAttackEngine.renderLSBPlane(originalCarrierImageData, canvasOrigView, 'bw', bitVal);
      origViewDesc.textContent = `Plano de Bit ${bitVal} (B/N) limpio sin corruptores`;
    } else if (mode === 'lsb-rgb') {
      ImageAttackEngine.renderLSBPlane(originalCarrierImageData, canvasOrigView, 'rgb', bitVal);
      origViewDesc.textContent = `Plano de Bit ${bitVal} Cromático limpio (RGB)`;
    } else {
      const ctx = canvasOrigView.getContext('2d');
      ctx.putImageData(originalCarrierImageData, 0, 0);
      origViewDesc.textContent = 'Fotografía original visible sin procesar';
    }
  }

  // 2. Lienzo Atacado en Vivo
  function renderAttackedCanvas() {
    if (!currentAttackedImageData) return;
    const ctx = canvasAttackedView.getContext('2d');
    ctx.putImageData(currentAttackedImageData, 0, 0);
    attackedPixelCounter.textContent = `${currentMutatedPixelsCount.toLocaleString()} px mutados`;
  }

  // 3. Lienzo Máscara Forense de Diferencias
  function renderHeatmapCanvas() {
    if (!originalCarrierImageData || !currentAttackedImageData) return;
    const theme = selectHeatmapTheme.value || 'pure-red';
    const bitVal = parseInt(selectTargetBit.value, 10) || 0;

    if (theme === 'lsb-rgb-attacked') {
      ImageAttackEngine.renderLSBPlane(currentAttackedImageData, canvasHeatmapView, 'rgb', bitVal);
    } else if (theme === 'lsb-bw-attacked') {
      ImageAttackEngine.renderLSBPlane(currentAttackedImageData, canvasHeatmapView, 'bw', bitVal);
    } else {
      ImageAttackEngine.renderDifferenceHeatmap(
        originalCarrierImageData,
        currentAttackedImageData,
        canvasHeatmapView,
        theme
      );
    }
  }

  // --- MOTOR DE SIMULACIÓN Y MUTACIÓN PROGRESIVA (MODO VÍDEO) ---

  function applyMutationBatch(batchSize = 1, isManualStep = false) {
    if (!originalCarrierImageData || !currentAttackedImageData) return false;

    const targetBitStr = selectTargetBit.value;
    const channel = selectTargetChannel.value;
    const isRandomBit = targetBitStr === 'random';
    const bitShift = isRandomBit ? 0 : parseInt(targetBitStr, 10);
    const bitMask = isRandomBit ? 0 : (1 << bitShift);

    const origData = originalCarrierImageData.data;
    const attData = currentAttackedImageData.data;

    let mutationsApplied = 0;
    const logsToAdd = [];

    // Paso de dispersión pseudoaleatoria para cubrir toda la imagen
    for (let b = 0; b < batchSize; b++) {
      if (currentMutatedPixelsCount >= targetTotalPixelsToMutate) {
        break;
      }

      // Distribución equidistante con jitter para realismo
      const step = totalPixels / targetTotalPixelsToMutate;
      const baseIdx = Math.floor(currentMutatedPixelsCount * step);
      const pixelIndex = Math.min(totalPixels - 1, Math.max(0, baseIdx));
      const byteIdx = pixelIndex * 4;

      const pxX = pixelIndex % imageWidth;
      const pxY = Math.floor(pixelIndex / imageWidth);

      // Determinar canales a mutar
      const channelsToMutate = [];
      if (channel === 'all') channelsToMutate.push('r', 'g', 'b');
      else channelsToMutate.push(channel);

      const stepStr = String(currentMutatedPixelsCount + 1).padStart(4, '0');
      const timeStr = `T+${getSimElapsedSeconds()}s`;

      for (const ch of channelsToMutate) {
        const offset = ch === 'r' ? 0 : (ch === 'g' ? 1 : 2);
        const origVal = origData[byteIdx + offset];
        let newVal = attData[byteIdx + offset];

        if (isRandomBit) {
          newVal = Math.floor(Math.random() * 256);
        } else {
          newVal ^= bitMask;
        }

        attData[byteIdx + offset] = newVal;
        const delta = newVal - origVal;

        if (logsToAdd.length < (isManualStep ? 10 : 4)) {
          logsToAdd.push({
            stepStr,
            timeStr,
            x: pxX,
            y: pxY,
            channel: ch.toUpperCase(),
            origVal,
            newVal,
            delta,
            bitShift: isRandomBit ? 'RAND' : bitShift
          });
        }
      }

      currentMutatedPixelsCount++;
      mutationsApplied++;
    }

    if (mutationsApplied > 0) {
      renderAttackedCanvas();
      renderHeatmapCanvas();
      updateMetricsAndDiagnostics();
      updateProgressUI();

      // Agregar a la terminal de telemetría
      logsToAdd.forEach(log => appendTelemetryRow(log));
    }

    // Verificar si alcanzó el objetivo
    if (currentMutatedPixelsCount >= targetTotalPixelsToMutate) {
      stopSimulation(true);
      return false;
    }

    return true;
  }

  function runSimulationLoop() {
    if (!isSimPlaying) return;

    const speed = parseInt(selectSimSpeed.value, 10) || 40;
    
    // Ajustar el tamaño del lote según la velocidad para fluidez
    let batchSize = 1;
    if (speed <= 15) batchSize = Math.max(1, Math.round(totalPixels * 0.0003));
    else if (speed <= 40) batchSize = Math.max(1, Math.round(totalPixels * 0.0001));

    const canContinue = applyMutationBatch(batchSize, false);

    if (canContinue && isSimPlaying) {
      simTimer = setTimeout(runSimulationLoop, speed);
    }
  }

  function startSimulation() {
    if (!originalCarrierImageData) return;
    if (currentMutatedPixelsCount >= targetTotalPixelsToMutate) {
      // Si ya estaba al 100%, reiniciar desde cero
      resetMutatedImage();
    }

    if (!simStartTime) {
      simStartTime = performance.now();
      simAccumulatedTime = 0;
    }
    simLastResumeTime = performance.now();

    isSimPlaying = true;
    btnSimPlay.disabled = true;
    btnSimPause.disabled = false;
    btnSimStep.disabled = true;

    badgeSimStatus.className = 'badge sim-badge-pulsing-active';
    badgeSimStatus.textContent = '● SIMULACIÓN EN CURSO (MUTANDO)';
    badgeAttackModeLabel.className = 'badge badge-rose';
    badgeAttackModeLabel.textContent = 'ATAQUE EN VIVO';

    runSimulationLoop();
  }

  function pauseSimulation() {
    isSimPlaying = false;
    if (simTimer) clearTimeout(simTimer);
    simTimer = null;

    if (simLastResumeTime) {
      simAccumulatedTime += (performance.now() - simLastResumeTime);
      simLastResumeTime = null;
    }

    btnSimPlay.disabled = false;
    btnSimPause.disabled = true;
    btnSimStep.disabled = false;

    badgeSimStatus.className = 'badge sim-badge-pulsing-paused';
    badgeSimStatus.textContent = '⏸️ SIMULACIÓN PAUSADA';
  }

  function stopSimulation(isFinished = false) {
    isSimPlaying = false;
    if (simTimer) clearTimeout(simTimer);
    simTimer = null;

    if (!isFinished) {
      simStartTime = null;
      simAccumulatedTime = 0;
      simLastResumeTime = null;
    } else if (simLastResumeTime) {
      simAccumulatedTime += (performance.now() - simLastResumeTime);
      simLastResumeTime = null;
    }

    btnSimPlay.disabled = false;
    btnSimPause.disabled = true;
    btnSimStep.disabled = false;

    if (isFinished) {
      badgeSimStatus.className = 'badge badge-emerald';
      badgeSimStatus.textContent = '✅ ATAQUE COMPLETADO (OBJETIVO ALCANZADO)';
      badgeAttackModeLabel.className = 'badge badge-rose';
      badgeAttackModeLabel.textContent = 'CORRUPCIÓN TOTAL';
    } else {
      badgeSimStatus.className = 'badge badge-cyan';
      badgeSimStatus.textContent = '● EN ESPERA';
      badgeAttackModeLabel.className = 'badge badge-cyan';
      badgeAttackModeLabel.textContent = 'CANAL LIMPIO';
    }
  }

  function resetMutatedImage() {
    if (!originalCarrierImageData) return;
    currentAttackedImageData = ImageAttackEngine.cloneImageData(originalCarrierImageData);
    currentMutatedPixelsCount = 0;
    simStartTime = null;
    simAccumulatedTime = 0;
    simLastResumeTime = null;
    calculateTargetPixels();
    clearTelemetryLogs();

    renderAttackedCanvas();
    renderHeatmapCanvas();
    updateMetricsAndDiagnostics();
    updateProgressUI();
  }

  function updateProgressUI() {
    const targetPct = parseFloat(sliderBitflipPct.value) || 2;
    const currentPct = totalPixels > 0 ? (currentMutatedPixelsCount / totalPixels) * 100 : 0;
    const progressTowardTarget = targetTotalPixelsToMutate > 0 
      ? Math.min(100, (currentMutatedPixelsCount / targetTotalPixelsToMutate) * 100) 
      : 0;

    simProgressBar.style.width = `${progressTowardTarget}%`;
    simProgressLabel.textContent = `${currentPct.toFixed(2)}% / ${targetPct.toFixed(2)}% (${currentMutatedPixelsCount.toLocaleString()} px)`;

    if (progressTowardTarget >= 100) {
      simProgressBar.className = 'progress-bar progress-danger';
    } else if (progressTowardTarget >= 50) {
      simProgressBar.className = 'progress-bar progress-warning';
    } else {
      simProgressBar.className = 'progress-bar progress-normal';
    }
  }

  // --- TERMINAL DE TELEMETRÍA (CONSOLA DE TELEMETRÍA DE BYTES EN VIVO) ---

  function appendTelemetryRow(log) {
    totalEventsLogged++;
    telemetryEventCount.textContent = `${totalEventsLogged.toLocaleString()} eventos registrados`;

    // Si había mensaje de espera inicial, removerlo
    if (totalEventsLogged === 1) {
      telemetryLogBody.innerHTML = '';
    }

    const row = document.createElement('div');
    row.className = 'telemetry-log-row';

    const deltaSign = log.delta >= 0 ? `+${log.delta}` : `${log.delta}`;
    const isMsb = log.bitShift === 7 || Math.abs(log.delta) >= 64;
    const isLsb = log.bitShift === 0 || Math.abs(log.delta) === 1;
    const isRand = log.bitShift === 'RAND';

    let channelColor = '#60a5fa';
    let channelLabel = 'Canal Azul';
    if (log.channel === 'R' || log.channel === 'ROJO') {
      channelColor = '#f87171';
      channelLabel = 'Canal Rojo';
    } else if (log.channel === 'G' || log.channel === 'VERDE') {
      channelColor = '#4ade80';
      channelLabel = 'Canal Verde';
    } else if (log.channel === 'B' || log.channel === 'AZUL') {
      channelColor = '#60a5fa';
      channelLabel = 'Canal Azul';
    }

    let bitVerdictHtml = '';
    if (isRand) {
      bitVerdictHtml = `
        <span style="color: #f472b6;">Byte mutado por ruido aleatorio (Δ = ${deltaSign})</span>
        <span style="color: #64748b;"> | </span>
        <span style="color: #fb7185; font-weight: 800;">🌪️ ¡SABOTAJE TOTAL DE PÍXEL (RUIDO PURO)!</span>
      `;
    } else if (isMsb) {
      bitVerdictHtml = `
        <span style="color: #fca5a5;">Bit 7 (MSB) invertido (Δ = ${deltaSign})</span>
        <span style="color: #64748b;"> | </span>
        <span style="color: #ef4444; font-weight: 800;"><span class="micon" aria-hidden="true">broken_image</span>  ¡GLITCH VISUAL DESTRUCTIVO EN LA FOTO!</span>
      `;
    } else if (isLsb) {
      bitVerdictHtml = `
        <span style="color: #6ee7b7;">Bit 0 (LSB) invertido (Δ = ${deltaSign})</span>
        <span style="color: #64748b;"> | </span>
        <span style="color: #10b981; font-weight: 800;"><span class="micon" aria-hidden="true">person_search</span>  ¡CAMBIO INVISIBLE AL OJO HUMANO (ESTEGANOGRAFÍA)!</span>
      `;
    } else if (typeof log.bitShift === 'number' && log.bitShift <= 3) {
      bitVerdictHtml = `
        <span style="color: #93c5fd;">Bit ${log.bitShift} invertido (Δ = ${deltaSign})</span>
        <span style="color: #64748b;"> | </span>
        <span style="color: #38bdf8; font-weight: 800;"><span class="micon" aria-hidden="true">search</span>  ¡ALTERACIÓN SUBPERCEPTUAL (MICRO-TEXTURA)!</span>
      `;
    } else {
      bitVerdictHtml = `
        <span style="color: #fde047;">Bit ${log.bitShift} invertido (Δ = ${deltaSign})</span>
        <span style="color: #64748b;"> | </span>
        <span style="color: #f59e0b; font-weight: 800;"><span class="micon" aria-hidden="true">warning</span>  ¡DISTORSIÓN CROMÁTICA VISIBLE!</span>
      `;
    }

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span style="color: #fbbf24; font-size: 0.875rem;"><span class="micon" aria-hidden="true">bolt</span> </span>
        <span style="color: #38bdf8; font-weight: 700;">[Paso #${log.stepStr} | ${log.timeStr}]</span>
        <span style="color: #f8fafc; font-weight: 600;">Píxel (${log.x}, ${log.y})</span>
        <span style="color: ${channelColor}; font-weight: 700;">[${channelLabel}]</span>
      </div>
      <div style="padding-left: 1.25rem; color: #cbd5e1; margin-top: 0.25rem;">
        <span style="color: #94a3b8;">• Byte Original:</span>
        <span style="color: #f1f5f9; font-weight: 600;">${log.origVal} (0b${toByte8(log.origVal)})</span>
        <span style="color: #94a3b8;"> → Mutado:</span>
        <span style="color: #ef4444; font-weight: 700;">${log.newVal} (0b${toByte8(log.newVal)})</span>
      </div>
      <div style="padding-left: 1.25rem; margin-top: 0.25rem;">
        <span style="color: #94a3b8;">• </span>${bitVerdictHtml}
      </div>
    `;

    telemetryLogBody.appendChild(row);

    // Limitar el buffer a 100 registros en el DOM para rendimiento óptimo
    if (telemetryLogBody.children.length > 100) {
      telemetryLogBody.removeChild(telemetryLogBody.firstChild);
    }

    if (autoScrollEnabled) {
      telemetryLogBody.scrollTop = telemetryLogBody.scrollHeight;
    }
  }

  function clearTelemetryLogs() {
    totalEventsLogged = 0;
    telemetryEventCount.textContent = '0 eventos registrados';
    telemetryLogBody.innerHTML = `
      <div style="color: #64748b; font-style: italic; padding: 0.5rem 0.25rem;">
        [Esperando inicio de la simulación... Pulsa "<span class="micon" aria-hidden="true">play_arrow</span>  Iniciar Simulación" o "<span class="micon" aria-hidden="true">skip_next</span>  Paso a Paso" para registrar mutaciones binarias]
      </div>
    `;
  }

  // --- RECALCULO DE MÉTRICAS MATEMÁTICAS ---
  function updateMetricsAndDiagnostics() {
    if (!originalCarrierImageData || !currentAttackedImageData) return;

    const metrics = ImageAttackEngine.computeMetrics(originalCarrierImageData, currentAttackedImageData);

    kpiAttackPsnr.textContent = metrics.psnr >= 99 ? '∞ (Limpio)' : `${metrics.psnr} dB`;
    if (metrics.psnr >= 50) {
      kpiAttackPsnrDesc.textContent = 'Fidelidad imperceptible al ojo humano';
      kpiAttackPsnr.style.color = 'var(--accent-cyan)';
    } else if (metrics.psnr >= 35) {
      kpiAttackPsnrDesc.textContent = 'Leve degradación visible';
      kpiAttackPsnr.style.color = 'var(--accent-amber)';
    } else {
      kpiAttackPsnrDesc.textContent = 'Degradación visual severa';
      kpiAttackPsnr.style.color = '#f87171';
    }

    kpiAttackModifiedPixels.textContent = `${metrics.modifiedPixels.toLocaleString()} (${metrics.modifiedPct}%)`;
    kpiAttackPixelsDesc.textContent = `${metrics.modifiedPixels.toLocaleString()} / ${metrics.totalPixels.toLocaleString()} px`;

    kpiAttackMse.textContent = metrics.mse.toFixed(2);
    kpiAttackMseDesc.textContent = metrics.mse === 0 ? 'Sin distorsión cromática' : `Error cuadrático promedio: ${metrics.mse.toFixed(2)}`;

    if (metrics.modifiedPixels === 0) {
      attackVerdictPill.className = 'badge badge-emerald';
      attackVerdictPill.textContent = '● IMAGEN INTACTA';

      attackVerdictAlert.className = 'alert-box alert-success';
      attackVerdictAlert.innerHTML = `
        <strong><span class="micon" aria-hidden="true">check_circle</span>  Imagen Limpia:</strong> No se ha aplicado corrupción de bits. Todos los píxeles coinciden exactamente con la imagen original.
      `;

      kpiAttackSeverity.textContent = 'NINGUNO';
      kpiAttackSeverity.style.color = 'var(--accent-emerald)';
      kpiAttackSeverityDesc.textContent = 'Canal limpio (0 bits alterados)';
    } else {
      attackVerdictPill.className = 'badge badge-rose';
      attackVerdictPill.textContent = '⚠️ CANAL CORROMPIDO';

      const targetBitVal = selectTargetBit.value;
      const isLsb = targetBitVal === '0';
      const isMsb = targetBitVal === '7';

      attackVerdictAlert.className = 'alert-box alert-danger';
      attackVerdictAlert.innerHTML = `
        <strong><span class="micon" aria-hidden="true">broken_image</span>  Simulación Activa (${metrics.modifiedPixels.toLocaleString()} píxeles alterados - ${metrics.modifiedPct}%):</strong>
        Se está mutando el <strong>Bit ${targetBitVal}</strong> ${isLsb ? '(LSB - Regla Esteganográfica de ±1)' : (isMsb ? '(MSB - Peso Máximo de ±128)' : '')}.
        ${isLsb ? 'La foto luce visualmente intacta al ojo humano, pero la máscara térmica forense delata la alteración.' : 'El ataque produce distorsión agresiva, glitches cromáticos y destrucción de planos.'}
      `;

      if (metrics.modifiedPct < 0.2 && isLsb) {
        kpiAttackSeverity.textContent = 'SIGILOSO (LSB)';
        kpiAttackSeverity.style.color = '#34d399';
        kpiAttackSeverityDesc.textContent = 'Regla esteganográfica cumplida';
      } else if (metrics.modifiedPct < 1.5 && !isMsb) {
        kpiAttackSeverity.textContent = 'MODERADO';
        kpiAttackSeverity.style.color = 'var(--accent-amber)';
        kpiAttackSeverityDesc.textContent = 'Corrupción detectable en la máscara';
      } else {
        kpiAttackSeverity.textContent = 'CRÍTICO (GLITCH)';
        kpiAttackSeverity.style.color = '#f87171';
        kpiAttackSeverityDesc.textContent = 'Sabotaje severo de planos binarios';
      }
    }
  }

  // --- EVENT LISTENERS DE CONTROLES ---

  // Botones de Reproducción
  btnSimPlay.addEventListener('click', () => startSimulation());
  btnSimPause.addEventListener('click', () => pauseSimulation());
  btnSimStep.addEventListener('click', () => {
    if (!originalCarrierImageData) return;
    if (!simStartTime) {
      simStartTime = performance.now();
      simAccumulatedTime = 0;
    } else {
      simAccumulatedTime += 120;
    }
    pauseSimulation();
    applyMutationBatch(1, true);
  });
  btnSimStop.addEventListener('click', () => {
    stopSimulation();
    resetMutatedImage();
  });

  // Slider de Porcentaje Objetivo
  sliderBitflipPct.addEventListener('input', () => {
    const val = parseFloat(sliderBitflipPct.value);
    labelBitflipPct.textContent = `${val.toFixed(2)}%`;
    calculateTargetPixels();
    updateProgressUI();
  });

  // Selector de Plano de Bit
  selectTargetBit.addEventListener('change', () => {
    renderOriginalCanvas();
    renderHeatmapCanvas();
    updateMetricsAndDiagnostics();
  });

  // Selector de Canales
  selectTargetChannel.addEventListener('change', () => {
    updateMetricsAndDiagnostics();
  });

  // Selector de Vista Izquierda
  selectLeftViewMode.addEventListener('change', () => {
    renderOriginalCanvas();
  });

  // Selector de Tema de Calor
  selectHeatmapTheme.addEventListener('change', () => {
    renderHeatmapCanvas();
  });

  // Terminal: Auto-scroll y Limpiar
  btnToggleAutoscroll.addEventListener('click', () => {
    autoScrollEnabled = !autoScrollEnabled;
    btnToggleAutoscroll.textContent = `📌 Auto-Scroll: ${autoScrollEnabled ? 'ON' : 'OFF'}`;
  });
  btnClearTelemetry.addEventListener('click', () => {
    clearTelemetryLogs();
  });

  // Botón Restablecer Todo
  btnResetAttack.addEventListener('click', () => {
    stopSimulation();
    resetMutatedImage();
  });

  // Botones de Descarga de Imagen Atacada
  if (btnDownloadAttacked) {
    btnDownloadAttacked.addEventListener('click', () => downloadAttackedImage());
  }
  if (btnDownloadAttackedTop) {
    btnDownloadAttackedTop.addEventListener('click', () => downloadAttackedImage());
  }

  // --- PRESETS RÁPIDOS DIDÁCTICOS ---

  // 1. Preset Sigiloso (Bit 0 LSB)
  presetStealth.addEventListener('click', () => {
    selectTargetBit.value = '0';
    selectTargetChannel.value = 'all';
    sliderBitflipPct.value = 0.5;
    labelBitflipPct.textContent = '0.50%';
    selectSimSpeed.value = '120';
    selectLeftViewMode.value = 'lsb-bw';
    selectHeatmapTheme.value = 'pure-red';

    calculateTargetPixels();
    resetMutatedImage();
    startSimulation();
  });

  // 2. Preset Glitch Destructivo (Bit 7 MSB)
  presetGlitch.addEventListener('click', () => {
    selectTargetBit.value = '7';
    selectTargetChannel.value = 'all';
    sliderBitflipPct.value = 2.0;
    labelBitflipPct.textContent = '2.00%';
    selectSimSpeed.value = '40';
    selectLeftViewMode.value = 'photo';
    selectHeatmapTheme.value = 'pure-red';

    calculateTargetPixels();
    resetMutatedImage();
    startSimulation();
  });

  // 3. Preset Sabotaje Total (Ruido Puro)
  presetSabotage.addEventListener('click', () => {
    selectTargetBit.value = 'random';
    selectTargetChannel.value = 'all';
    sliderBitflipPct.value = 4.0;
    labelBitflipPct.textContent = '4.00%';
    selectSimSpeed.value = '40';
    selectLeftViewMode.value = 'photo';
    selectHeatmapTheme.value = 'matrix';

    calculateTargetPixels();
    resetMutatedImage();
    startSimulation();
  });

  // Inspección de Coordenadas con Mouse
  function bindMouseCoords(canvas, labelElement) {
    canvas.addEventListener('mousemove', (e) => {
      if (!imageWidth || !imageHeight) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = imageWidth / rect.width;
      const scaleY = imageHeight / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      labelElement.textContent = `X: ${x}, Y: ${y}`;
    });
    canvas.addEventListener('mouseleave', () => {
      labelElement.textContent = '-';
    });
  }

  bindMouseCoords(canvasOrigView, origViewCoords);
  bindMouseCoords(canvasHeatmapView, heatmapCoords);

  // Selector de tamaño / distribución de lienzos
  const gridCanvasesContainer = container.querySelector('#grid-canvases-container');
  const btnGridView3 = container.querySelector('#btn-grid-view-3');
  const btnGridView2 = container.querySelector('#btn-grid-view-2');
  const btnGridView1 = container.querySelector('#btn-grid-view-1');

  if (gridCanvasesContainer) {
    const setGridView = (cols) => {
      gridCanvasesContainer.classList.remove('grid-cols-2', 'grid-cols-1');
      if (btnGridView3) btnGridView3.classList.remove('active');
      if (btnGridView2) btnGridView2.classList.remove('active');
      if (btnGridView1) btnGridView1.classList.remove('active');

      if (cols === 2) {
        gridCanvasesContainer.classList.add('grid-cols-2');
        if (btnGridView2) btnGridView2.classList.add('active');
      } else if (cols === 1) {
        gridCanvasesContainer.classList.add('grid-cols-1');
        if (btnGridView1) btnGridView1.classList.add('active');
      } else {
        if (btnGridView3) btnGridView3.classList.add('active');
      }
    };

    if (btnGridView3) btnGridView3.addEventListener('click', () => setGridView(3));
    if (btnGridView2) btnGridView2.addEventListener('click', () => setGridView(2));
    if (btnGridView1) btnGridView1.addEventListener('click', () => setGridView(1));
  }

  // Soporte para datos iniciales
  if (initialData && initialData.canvas) {
    loadCarrierFromCanvas(initialData.canvas, initialData.name || 'muestra_inicial.png');
  }
}
