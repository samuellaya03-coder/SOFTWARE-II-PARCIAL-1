import { ImageAttackEngine } from '../services/imageAttackEngine.js';
import { StegoEngine } from '../services/stegoEngine.js';

export function renderImageAttackTab(container, initialData = null) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado de la Pestaña -->
      <div class="card card-glow-rose" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; border-color: rgba(244, 63, 94, 0.4); box-shadow: 0 0 25px -5px rgba(244, 63, 94, 0.15);">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 1.5rem;">💥</span>
            <h2 style="font-size: 1.45rem; color: #fff;">Laboratorio de Ataque de Bits a Imágenes en Tiempo Real</h2>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Demostración visual del impacto de la corrupción de bits en imágenes. Compara a la izquierda los bits invisibles (LSB) y a la derecha la máscara negra con los bits atacados en rojo (o la foto con distorsión visual).
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span class="badge badge-rose">💥 Ataque de Bits (Bit-Flip)</span>
          <span class="badge badge-cyan">Máscara Negro / Rojo</span>
          <span class="badge badge-emerald">Métricas Forenses en Vivo</span>
        </div>
      </div>

      <!-- Barra de Carga de Imagen -->
      <div class="card" style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
          <h3 style="font-size: 1.15rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.5rem;">
            <span>🖼️</span> 1. Imagen en Análisis
          </h3>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btn-reset-attack" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.45rem 1rem;" disabled>
              🔄 Restablecer Ataque
            </button>
          </div>
        </div>

        <div class="grid-2" style="gap: 1rem; align-items: center;">
          <div id="dropzone-attack" class="dropzone" style="padding: 1.25rem 1rem; cursor: pointer;">
            <input type="file" id="attack-file-input" accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp, image/*" style="display: none;" />
            <div style="font-size: 2rem; margin-bottom: 0.35rem;">📂</div>
            <p style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">Arrastra una imagen o haz clic para seleccionarla</p>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Soporta PNG, JPEG, WebP o cualquier foto para atacar sus bits</p>
          </div>

          <div style="background: rgba(0,0,0,0.3); padding: 1.25rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.75rem;">
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

      <!-- SECCIÓN PRINCIPAL: CONSOLA DE ATAQUES Y LIENZOS EN TIEMPO REAL -->
      <div id="attack-workspace" style="display: none; flex-direction: column; gap: 1.5rem;">
        
        <!-- 2. Consola de Ataque Malicioso en Vivo -->
        <div class="card space-y-4" style="border-left: 4px solid var(--accent-rose);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 style="font-size: 1.15rem; color: #f87171; display: flex; align-items: center; gap: 0.5rem;">
                <span>💥</span> 2. Consola de Ataque de Bits (Inyección Hostil Bit-Flip)
              </h3>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
                Invierte bits en tiempo real para observar cómo se degradan los diferentes planos binarios de la imagen.
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span class="badge" style="background: rgba(244, 63, 94, 0.15); color: #f87171; border: 1px solid rgba(244, 63, 94, 0.3);">
                Vector Activo: Bit-Flip en Vivo
              </span>
            </div>
          </div>

          <!-- Panel Único: Bit-Flip -->
          <div id="attack-controls-panel" style="background: rgba(0,0,0,0.25); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div id="panel-attack-bitflip" style="display: flex; flex-direction: column; gap: 1rem;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
                  <span style="color: var(--text-secondary); font-weight: 600;">Intensidad del Ataque (% de píxeles con bit invertido):</span>
                  <span id="label-bitflip-pct" class="font-mono" style="color: var(--accent-rose); font-weight: 700;">0.00%</span>
                </div>
                <input type="range" id="slider-bitflip-pct" min="0" max="5" step="0.01" value="0" style="width: 100%; cursor: pointer;" />
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                  <span>0% (Canal Seguro / Limpio)</span>
                  <span>0.05% (Micro-ataque de 1-2 bits)</span>
                  <span>1.0% (Corrupción media)</span>
                  <span>5.0% (Sabotaje masivo)</span>
                </div>
                <div id="slider-hint-box" style="font-size: 0.75rem; color: #fca5a5; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem; background: rgba(244, 63, 94, 0.1); padding: 0.35rem 0.6rem; border-radius: 4px; border: 1px solid rgba(244, 63, 94, 0.25);">
                  <span>💡</span> <strong>Regla del ataque:</strong> La intensidad debe ser mayor a 0% para que los bits se inviertan. Al cambiar de plano se activa automáticamente.
                </div>
              </div>

              <div class="grid-2" style="gap: 1rem;">
                <div>
                  <label style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">
                    Plano de Bit Objetivo del Ataque:
                  </label>
                  <select id="select-target-bit">
                    <option value="0" selected>Bit 0 (LSB - Invisible al ojo humano, capa esteganográfica)</option>
                    <option value="1">Bit 1 (Casi invisible)</option>
                    <option value="2">Bit 2 (Textura leve)</option>
                    <option value="7">Bit 7 (MSB - Glitch visual extremo y distorsión radical)</option>
                  </select>
                </div>

                <div>
                  <label style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">
                    Canales de Color Afectados:
                  </label>
                  <select id="select-target-channel">
                    <option value="all" selected>Todos los Canales (R, G, B)</option>
                    <option value="r">Solo Canal Rojo (R)</option>
                    <option value="g">Solo Canal Verde (G)</option>
                    <option value="b">Solo Canal Azul (B)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. LIENZOS DE VISUALIZACIÓN DIVIDIDA EN TIEMPO REAL -->
        <div class="grid-2" style="gap: 1.25rem;">
          
          <!-- Lienzo 1 (Izquierda): Imagen Original con los Bits Invisibles -->
          <div class="card" style="display: flex; flex-direction: column; gap: 0.75rem; border-color: rgba(0, 240, 255, 0.35);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <h4 style="font-size: 1rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.4rem;">
                <span>🔬</span> Imagen Original (Bits Invisibles / LSB)
              </h4>
              <select id="select-left-view-mode" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; width: auto; border: 1px solid var(--accent-cyan); background: rgba(16, 22, 34, 0.9); color: var(--accent-cyan); font-weight: 600; border-radius: 6px;">
                <option value="lsb-bw" selected>Plano LSB (Bits que los humanos no ven)</option>
                <option value="lsb-rgb">Plano LSB Cromático (Canales R, G, B)</option>
                <option value="photo">Foto Original Visible</option>
              </select>
            </div>
            <div class="image-preview-box" style="min-height: 280px; max-height: 440px; overflow: auto; background: #000000; display: flex; justify-content: center; align-items: center; border: 1px solid rgba(0, 240, 255, 0.3);">
              <canvas id="canvas-left-view" style="max-width: 100%; object-fit: contain;"></canvas>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span id="left-view-desc">Muestra los bits menos significativos (LSB) imperceptibles al ojo humano</span>
              <span id="left-view-coords" class="font-mono text-white">-</span>
            </div>
          </div>

          <!-- Lienzo 2 (Derecha): Todo Negro con Bits Atacados Resaltando en Rojo -->
          <div class="card" style="display: flex; flex-direction: column; gap: 0.75rem; border-color: rgba(244, 63, 94, 0.4); box-shadow: 0 0 20px -5px rgba(244, 63, 94, 0.15);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <h4 style="font-size: 1rem; color: #f87171; display: flex; align-items: center; gap: 0.4rem;">
                <span>💥</span> Imagen Atacada / Bits Alterados
              </h4>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <span id="badge-attack-indicator" class="badge badge-emerald" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">ESTADO: INTACTO</span>
                <select id="select-heatmap-theme" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; width: auto; border: 1px solid rgba(244, 63, 94, 0.5); background: rgba(16, 22, 34, 0.9); color: #f87171; font-weight: 600; border-radius: 6px;">
                  <option value="lsb-rgb-attacked">Plano LSB Cromático Atacado (Canales R, G, B)</option>
                  <option value="lsb-bw-attacked">Plano LSB Atacado (B/N)</option>
                  <option value="pure-red" selected>Fondo Negro + Bits en Rojo (Diferencia Forense)</option>
                  <option value="photo-attacked">📸 Foto Atacada con Glitch Visual</option>
                  <option value="matrix">Verde Matrix</option>
                  <option value="cyan-glow">Cian Fosforescente</option>
                </select>
              </div>
            </div>
            <div class="image-preview-box" style="min-height: 280px; max-height: 440px; overflow: auto; background: #000000; display: flex; justify-content: center; align-items: center; border: 1px solid rgba(244, 63, 94, 0.4);">
              <canvas id="canvas-heatmap-view" style="max-width: 100%; object-fit: contain;"></canvas>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span id="right-view-desc">Muestra los bits alterados de la imagen atacada</span>
              <span id="heatmap-modified-counter" class="font-mono" style="color: #f87171; font-weight: 700;">0 píxeles alterados</span>
            </div>
          </div>

        </div>

        <!-- 3. MONITOR DE INTEGRIDAD Y DAÑO DE BITS -->
        <div class="card space-y-4" style="background: rgba(16, 22, 34, 0.95); border: 1px solid var(--border-glow);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <h3 style="font-size: 1.15rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.5rem;">
              <span>📊</span> 3. Diagnóstico de Impacto del Ataque en la Imagen
            </h3>
            <span id="attack-verdict-pill" class="badge badge-emerald" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
              ● IMAGEN INTACTA
            </span>
          </div>

          <!-- Alerta de Diagnóstico del Ataque -->
          <div id="attack-verdict-alert" class="alert-box alert-success" style="line-height: 1.6;">
            <strong>✅ Imagen Limpia:</strong> No se ha aplicado corrupción de bits. Todos los píxeles coinciden exactamente con la imagen original.
          </div>

          <!-- KPIs Numéricos Cuantitativos -->
          <div class="grid-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
            
            <!-- KPI 1: PSNR -->
            <div style="background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: 8px; border-left: 3px solid var(--accent-cyan);">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Fidelidad Visual (PSNR)</div>
              <div id="kpi-attack-psnr" class="font-mono" style="font-size: 1.35rem; font-weight: 700; color: var(--accent-cyan); margin: 0.2rem 0;">99.99 dB</div>
              <div id="kpi-attack-psnr-desc" style="font-size: 0.75rem; color: var(--text-secondary);">Idéntica a la original</div>
            </div>

            <!-- KPI 2: Píxeles Modificados -->
            <div style="background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: 8px; border-left: 3px solid var(--accent-rose);">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Píxeles Alterados</div>
              <div id="kpi-attack-modified-pixels" class="font-mono" style="font-size: 1.35rem; font-weight: 700; color: #f87171; margin: 0.2rem 0;">0 (0.00%)</div>
              <div id="kpi-attack-pixels-desc" style="font-size: 0.75rem; color: var(--text-secondary);">0 / 0 px</div>
            </div>

            <!-- KPI 3: Error Cuadrático Medio (MSE) -->
            <div style="background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: 8px; border-left: 3px solid var(--accent-purple);">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Error Cuadrático (MSE)</div>
              <div id="kpi-attack-mse" class="font-mono" style="font-size: 1.35rem; font-weight: 700; color: var(--accent-purple); margin: 0.2rem 0;">0.00</div>
              <div id="kpi-attack-mse-desc" style="font-size: 0.75rem; color: var(--text-secondary);">Sin distorsión cromática</div>
            </div>

            <!-- KPI 4: Severidad del Daño de Bits -->
            <div style="background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: 8px; border-left: 3px solid var(--accent-emerald);">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Severidad del Ataque</div>
              <div id="kpi-attack-severity" class="font-mono" style="font-size: 1.35rem; font-weight: 700; color: var(--accent-emerald); margin: 0.2rem 0;">CANAL LIMPIO</div>
              <div id="kpi-attack-severity-desc" style="font-size: 0.75rem; color: var(--text-secondary);">0 bits atacados</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `;

  // Referencias DOM
  const btnResetAttack = container.querySelector('#btn-reset-attack');
  const dropzoneAttack = container.querySelector('#dropzone-attack');
  const attackFileInput = container.querySelector('#attack-file-input');
  const carrierStatusTag = container.querySelector('#carrier-status-tag');
  const carrierDimLabel = container.querySelector('#carrier-dim-label');
  const carrierPixelsLabel = container.querySelector('#carrier-pixels-label');
  const attackWorkspace = container.querySelector('#attack-workspace');

  // Controles de ataque malicioso (Bit-Flip)
  const sliderBitflipPct = container.querySelector('#slider-bitflip-pct');
  const labelBitflipPct = container.querySelector('#label-bitflip-pct');
  const selectTargetBit = container.querySelector('#select-target-bit');
  const selectTargetChannel = container.querySelector('#select-target-channel');

  // Lienzos
  const canvasLeftView = container.querySelector('#canvas-left-view');
  const selectLeftViewMode = container.querySelector('#select-left-view-mode');
  const leftViewDesc = container.querySelector('#left-view-desc');
  const leftViewCoords = container.querySelector('#left-view-coords');

  const canvasHeatmapView = container.querySelector('#canvas-heatmap-view');
  const badgeAttackIndicator = container.querySelector('#badge-attack-indicator');
  const heatmapModifiedCounter = container.querySelector('#heatmap-modified-counter');
  const selectHeatmapTheme = container.querySelector('#select-heatmap-theme');
  const rightViewDesc = container.querySelector('#right-view-desc');

  // KPIs y Diagnóstico
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

  // Estado local
  let originalCarrierImageData = null;
  let currentAttackedImageData = null;

  // --- Subida de Imágenes por Dropzone ---
  dropzoneAttack.addEventListener('click', () => attackFileInput.click());
  dropzoneAttack.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneAttack.classList.add('active');
  });
  dropzoneAttack.addEventListener('dragleave', () => dropzoneAttack.classList.remove('active'));
  dropzoneAttack.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneAttack.classList.remove('active');
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

  // --- Inicializar la Imagen en el Entorno de Ataque ---
  function loadCarrierFromCanvas(canvas, name) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    originalCarrierImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    currentAttackedImageData = ImageAttackEngine.cloneImageData(originalCarrierImageData);

    const totalPx = canvas.width * canvas.height;
    carrierStatusTag.textContent = name;
    carrierDimLabel.textContent = `${canvas.width} × ${canvas.height} px`;
    carrierPixelsLabel.textContent = `${totalPx.toLocaleString()} px`;

    attackWorkspace.style.display = 'flex';
    btnResetAttack.disabled = false;

    canvasLeftView.width = canvas.width;
    canvasLeftView.height = canvas.height;
    canvasHeatmapView.width = canvas.width;
    canvasHeatmapView.height = canvas.height;

    sliderBitflipPct.value = 0;
    labelBitflipPct.textContent = '0.00%';

    renderCurrentState();
  }

  // --- Ejecución y Renderizado de Ataques en Vivo ---
  function renderCurrentState() {
    if (!originalCarrierImageData || !currentAttackedImageData) return;

    const targetBitVal = parseInt(selectTargetBit.value, 10) || 0;

    // 1. DIBUJAR LIENZO IZQUIERDO: Imagen Original con los Bits que los humanos no ven
    const leftMode = selectLeftViewMode.value;
    if (leftMode === 'lsb-bw') {
      ImageAttackEngine.renderLSBPlane(originalCarrierImageData, canvasLeftView, 'bw', targetBitVal);
      leftViewDesc.textContent = `Plano de Bit ${targetBitVal} Original (B/N): Bits originales sin ataque`;
    } else if (leftMode === 'lsb-rgb') {
      ImageAttackEngine.renderLSBPlane(originalCarrierImageData, canvasLeftView, 'rgb', targetBitVal);
      leftViewDesc.textContent = `Plano de Bit ${targetBitVal} Cromático Original: Proyección R, G y B limpia`;
    } else {
      const ctxLeft = canvasLeftView.getContext('2d');
      ctxLeft.putImageData(originalCarrierImageData, 0, 0);
      leftViewDesc.textContent = 'Fotografía original visible sin procesar';
    }

    // 2. DIBUJAR LIENZO DERECHO: Imagen Atacada / Bits Alterados
    const theme = selectHeatmapTheme.value || 'pure-red';
    if (theme === 'lsb-rgb-attacked') {
      ImageAttackEngine.renderLSBPlane(currentAttackedImageData, canvasHeatmapView, 'rgb', targetBitVal);
      if (rightViewDesc) rightViewDesc.textContent = `Plano de Bit ${targetBitVal} Cromático Atacado: Compara con la izquierda para ver los bits alterados`;
    } else if (theme === 'lsb-bw-attacked') {
      ImageAttackEngine.renderLSBPlane(currentAttackedImageData, canvasHeatmapView, 'bw', targetBitVal);
      if (rightViewDesc) rightViewDesc.textContent = `Plano de Bit ${targetBitVal} Atacado (B/N): Bits con la corrupción aplicada`;
    } else {
      ImageAttackEngine.renderDifferenceHeatmap(
        originalCarrierImageData,
        currentAttackedImageData,
        canvasHeatmapView,
        theme
      );
      if (rightViewDesc) {
        if (theme === 'photo-attacked') {
          rightViewDesc.textContent = 'Fotografía con distorsión visual directa del ataque';
        } else {
          rightViewDesc.textContent = 'Fondo negro absoluto: resalta los bits y píxeles alterados';
        }
      }
    }

    // 3. Calcular Métricas Cuantitativas
    const metrics = ImageAttackEngine.computeMetrics(originalCarrierImageData, currentAttackedImageData);
    
    kpiAttackPsnr.textContent = metrics.psnr >= 99 ? '∞ (Limpio)' : `${metrics.psnr} dB`;
    if (metrics.psnr >= 50) {
      kpiAttackPsnrDesc.textContent = 'Fidelidad imperceptible al ojo';
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
    heatmapModifiedCounter.textContent = `${metrics.modifiedPixels.toLocaleString()} píxeles alterados`;

    kpiAttackMse.textContent = metrics.mse.toFixed(2);
    kpiAttackMseDesc.textContent = metrics.mse === 0 ? 'Sin distorsión cromática' : `Error cuadrático promedio: ${metrics.mse.toFixed(2)}`;

    if (metrics.modifiedPixels === 0) {
      badgeAttackIndicator.className = 'badge badge-emerald';
      badgeAttackIndicator.textContent = 'ESTADO: INTACTO';

      attackVerdictPill.className = 'badge badge-emerald';
      attackVerdictPill.textContent = '● IMAGEN INTACTA';

      attackVerdictAlert.className = 'alert-box alert-success';
      attackVerdictAlert.innerHTML = `
        <strong>✅ Imagen Limpia:</strong> No se ha aplicado corrupción de bits. Todos los píxeles coinciden exactamente con la imagen original.
      `;

      kpiAttackSeverity.textContent = 'NINGUNO';
      kpiAttackSeverity.style.color = 'var(--accent-emerald)';
      kpiAttackSeverityDesc.textContent = 'Canal limpio (0 bits alterados)';
    } else {
      badgeAttackIndicator.className = 'badge badge-rose';
      badgeAttackIndicator.textContent = `ATAQUE ACTIVO (${metrics.modifiedPct}%)`;

      attackVerdictPill.className = 'badge badge-rose';
      attackVerdictPill.textContent = '⚠️ IMAGEN CORROMPIDA';

      const targetBitVal = parseInt(selectTargetBit.value, 10);
      const isLsb = targetBitVal === 0;

      attackVerdictAlert.className = 'alert-box alert-danger';
      attackVerdictAlert.innerHTML = `
        <strong>💥 Ataque Activo (${metrics.modifiedPixels.toLocaleString()} píxeles alterados - ${metrics.modifiedPct}%):</strong>
        Se ha invertido el <strong>Bit ${targetBitVal}</strong> (${isLsb ? 'LSB invisible' : 'MSB / Plano Superior'}).
        ${isLsb ? 'La foto luce visualmente intacta al ojo humano, pero la capa de datos binarios ha sido mutada.' : 'El ataque produce distorsión visual severa y glitch perceptible en los colores.'}
      `;

      if (metrics.modifiedPct < 0.1) {
        kpiAttackSeverity.textContent = 'MICRO-ATAQUE';
        kpiAttackSeverity.style.color = 'var(--accent-amber)';
        kpiAttackSeverityDesc.textContent = 'Alteración sutil de pocos bits';
      } else if (metrics.modifiedPct < 2) {
        kpiAttackSeverity.textContent = 'MODERADO';
        kpiAttackSeverity.style.color = 'var(--accent-amber)';
        kpiAttackSeverityDesc.textContent = 'Corrupción palpable en la máscara';
      } else {
        kpiAttackSeverity.textContent = 'SEVERO';
        kpiAttackSeverity.style.color = '#f87171';
        kpiAttackSeverityDesc.textContent = 'Sabotaje masivo del plano de bits';
      }
    }
  }

  // Evento mousemove sobre los canvas para mostrar coordenadas
  function handleCanvasCoords(e, canvas) {
    if (!originalCarrierImageData) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    leftViewCoords.textContent = `X: ${x}, Y: ${y}`;
  }

  canvasLeftView.addEventListener('mousemove', (e) => handleCanvasCoords(e, canvasLeftView));
  canvasHeatmapView.addEventListener('mousemove', (e) => handleCanvasCoords(e, canvasHeatmapView));

  // --- Eventos de Controles Reactivos en Tiempo Real ---

  // Selector de vista izquierda (Plano LSB vs Foto)
  selectLeftViewMode.addEventListener('change', () => renderCurrentState());

  // 1. Bit-Flip Slider
  sliderBitflipPct.addEventListener('input', () => {
    if (!originalCarrierImageData) return;
    const pct = parseFloat(sliderBitflipPct.value);
    labelBitflipPct.textContent = `${pct.toFixed(2)}%`;

    const targetBit = parseInt(selectTargetBit.value, 10);
    const channel = selectTargetChannel.value;

    const { attackedImageData } = ImageAttackEngine.applyBitFlip(
      originalCarrierImageData,
      pct,
      targetBit,
      channel
    );
    currentAttackedImageData = attackedImageData;
    renderCurrentState();
  });

  selectTargetBit.addEventListener('change', () => {
    // Si la intensidad está en 0%, la activamos automáticamente para que el cambio tenga efecto visible inmediato
    if (parseFloat(sliderBitflipPct.value) === 0) {
      sliderBitflipPct.value = 0.50;
      labelBitflipPct.textContent = '0.50%';
    }
    sliderBitflipPct.dispatchEvent(new Event('input'));
  });

  selectTargetChannel.addEventListener('change', () => {
    if (parseFloat(sliderBitflipPct.value) === 0) {
      sliderBitflipPct.value = 0.50;
      labelBitflipPct.textContent = '0.50%';
    }
    sliderBitflipPct.dispatchEvent(new Event('input'));
  });

  // Selector de tema del mapa de calor
  selectHeatmapTheme.addEventListener('change', () => renderCurrentState());

  // Botón Restablecer Ataque
  btnResetAttack.addEventListener('click', () => {
    if (!originalCarrierImageData) return;
    sliderBitflipPct.value = 0;
    labelBitflipPct.textContent = '0.00%';
    currentAttackedImageData = ImageAttackEngine.cloneImageData(originalCarrierImageData);
    renderCurrentState();
  });

  // Generador de imagen de prueba predeterminada para que el laboratorio esté listo de inmediato
  function createDefaultSampleCanvas() {
    const width = 512, height = 512;
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = width;
    demoCanvas.height = height;
    const ctx = demoCanvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0a192f');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 35; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.sin(i * 1.5) * 190 + 256,
        Math.cos(i * 1.2) * 190 + 256,
        20 + (i % 5) * 15,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.12)' : 'rgba(244, 63, 94, 0.12)';
      ctx.fill();
    }

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('LABORATORIO DE ATAQUE DE BITS', 40, 240);
    ctx.fillStyle = '#00f0ff';
    ctx.font = '15px monospace';
    ctx.fillText('ANÁLISIS DE INTEGRIDAD EN TIEMPO REAL', 65, 275);
    return demoCanvas;
  }

  // --- Inicialización: Cargar datos transferidos o imagen de prueba predeterminada ---
  if (initialData && initialData.canvas) {
    loadCarrierFromCanvas(
      initialData.canvas,
      initialData.filename || 'Imagen Transferida'
    );
  } else {
    const defaultCanvas = createDefaultSampleCanvas();
    loadCarrierFromCanvas(defaultCanvas, 'Imagen de Muestra Predeterminada');
  }
}
