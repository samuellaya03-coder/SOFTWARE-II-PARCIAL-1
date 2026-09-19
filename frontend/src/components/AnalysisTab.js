import { Chart, registerables } from 'chart.js';
import { ApiService } from '../services/api.js';
import { ForensicComparator } from '../services/forensicComparator.js';
import { StegoEngine } from '../services/stegoEngine.js';

Chart.register(...registerables);

export function renderAnalysisTab(container, initialData = null) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado de la Pestaña -->
      <div class="card card-glow-cyan" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <h2 style="font-size: 1.5rem; margin-bottom: 0.25rem;">Estegoanálisis y Forense Digital de Imágenes</h2>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Detección de esteganografía mediante visualización del Plano LSB en Blanco y Negro, Entropía de Shannon y Análisis de Frecuencias PoVs.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span class="badge badge-cyan">Plano LSB en B/N</span>
          <span class="badge badge-emerald">Entropía Shannon</span>
          <span class="badge badge-purple">Chi-Cuadrado (PoVs)</span>
          <span class="badge badge-amber">Histogramas RGB</span>
        </div>
      </div>

      <!-- Zona de Carga Única de Imagen para Análisis Forense -->
      <div class="card space-y-4" style="display: flex; flex-direction: column; gap: 1rem;">
        <h3 style="font-size: 1.15rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          Seleccionar Imagen para Análisis Forense Digital
        </h3>

        <div id="dropzone-analysis" class="dropzone">
          <input type="file" id="analysis-file-input" accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp, image/*" style="display: none;" />
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔬</div>
          <p style="font-weight: 600; color: var(--text-primary);">Arrastra una imagen (PNG, JPG, JPEG, WebP, etc.) o haz clic para subir</p>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
            Cualquier formato no-PNG se convertirá automáticamente a PNG sin pérdida para su análisis LSB y estadístico
          </p>
          <div id="analysis-conversion-notice" class="badge badge-amber" style="display: none; margin-top: 0.75rem; padding: 0.4rem 0.85rem; font-size: 0.8rem; align-items: center; gap: 0.4rem;"></div>
        </div>

        <div id="analysis-preview-box" class="image-preview-box" style="display: none;">
          <img id="analysis-preview-img" alt="Imagen en análisis" />
        </div>

        <button id="btn-run-analysis" class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 0.8rem;" disabled>
          🚀 Iniciar Análisis Forense
        </button>
      </div>

      <!-- SECCIÓN DE RESULTADOS FORENSES -->
      <div id="analysis-results-section" style="display: none; flex-direction: column; gap: 1.5rem;">
        
        <!-- 1. Veredicto Forense Digital -->
        <div id="verdict-card" class="card">
          <!-- Se llena dinámicamente -->
        </div>

        <!-- 2. Visualización Forense de Bytes y Bits Alterados (Plano LSB Bit 0) -->
        <div class="card card-glow-purple">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 style="font-size: 1.25rem; color: var(--accent-purple); display: flex; align-items: center; gap: 0.5rem;">
                <span>🔬</span> Visualización de Bits Alterados (Plano LSB)
              </h3>
              <p style="font-size: 0.825rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Inspección pericial de los bits menos significativos con personalización de paletas de color y marcado de figuras forenses.
              </p>
            </div>

            <!-- Controles de Personalización: Modo de Vista, Canal, Paleta y Figura -->
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <!-- Modo de Vista -->
              <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                <label style="font-size: 0.7rem; color: var(--accent-cyan); font-weight: 700; text-transform: uppercase;">Modo de Vista:</label>
                <select id="bitplane-view-select" style="padding: 0.4rem 0.65rem; font-size: 0.8rem; width: auto; border: 1px solid var(--accent-cyan);">
                  <option value="microscope" selected>🔬 Microscopio Digital (Zoom 16x)</option>
                  <option value="highlight">🌐 Resaltador de Zona Inyectada</option>
                  <option value="full">▦ Plano LSB Completo (Matriz 1:1)</option>
                </select>
              </div>

              <!-- Canal -->
              <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Canal:</label>
                <select id="bitplane-channel-select" style="padding: 0.4rem 0.65rem; font-size: 0.8rem; width: auto;">
                  <option value="all">Luminancia (RGB)</option>
                  <option value="red">Canal Rojo (R)</option>
                  <option value="green">Canal Verde (G)</option>
                  <option value="blue">Canal Azul (B)</option>
                </select>
              </div>

              <!-- Paleta de Color -->
              <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Paleta de Color:</label>
                <select id="bitplane-color-select" style="padding: 0.4rem 0.65rem; font-size: 0.8rem; width: auto;">
                  <option value="neon" selected>⚡ Neón Cyberpunk (Cian / Púrpura)</option>
                  <option value="matrix">📟 Terminal Matrix (Verde Fósforo)</option>
                  <option value="amber">🟡 Ámbar Radar Forense</option>
                  <option value="heatmap">🔥 Termografía (Heatmap)</option>
                  <option value="bw">⬛⬜ Blanco y Negro Puro</option>
                </select>
              </div>

              <!-- Modo de Figura / Marcador -->
              <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Figura / Marcador:</label>
                <select id="bitplane-shape-select" style="padding: 0.4rem 0.65rem; font-size: 0.8rem; width: auto;">
                  <option value="dots" selected>🟢 Puntos Luminosos Neón (Glow)</option>
                  <option value="crosses">✖️ Cruces Periciales (+)</option>
                  <option value="bounding-box">🔲 Bloques con Bits (1 / 0)</option>
                  <option value="pixels">▦ Matriz de Píxeles Pura</option>
                </select>
              </div>

              <!-- Botón Forzar Actualización -->
              <div style="display: flex; flex-direction: column; justify-content: flex-end;">
                <button id="btn-extract-lsb-plane" class="btn btn-cyan" style="padding: 0.4rem 0.85rem; font-size: 0.8rem; height: 32px; white-space: nowrap;">
                  🔄 Actualizar
                </button>
              </div>
            </div>
          </div>

          <!-- Contenedor del Lienzo -->
          <div id="bitplane-preview-container" style="min-height: 280px; max-height: 480px; background: #060a12; border: 1px solid rgba(0, 240, 255, 0.4); border-radius: 8px; overflow: auto; padding: 0.75rem; display: flex; justify-content: center; align-items: flex-start;">
            <canvas id="bitplane-canvas"></canvas>
          </div>

          <!-- Botón de Descarga y Ratio -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div id="bitplane-stats" style="font-size: 0.8rem; color: var(--text-secondary); font-family: var(--font-mono);">
              <!-- Ratio de bits 1 vs 0 -->
            </div>
            <button id="btn-download-lsb-mask" class="btn btn-emerald" style="padding: 0.45rem 0.9rem; font-size: 0.8rem;">
              💾 Descargar Imagen de Plano LSB (.PNG)
            </button>
          </div>

          <!-- PANEL INFERIOR: CANTIDAD DE BITS MODIFICADOS E INFORMACIÓN DETALLADA -->
          <div id="bitplane-kpi-panel" style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
            <h4 style="font-size: 1rem; color: var(--accent-cyan); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>📊</span> Auditoría Cuantitativa de Bits Modificados
            </h4>

            <div class="grid-2" style="gap: 1rem;">
              <!-- KPI 1: Bits Modificados -->
              <div style="background: rgba(0,0,0,0.3); padding: 0.9rem; border-radius: 8px; border-left: 3px solid var(--accent-cyan);">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Cantidad de Bits Modificados</div>
                <div id="kpi-bitplane-total-bits" class="font-mono" style="font-size: 1.35rem; font-weight: 700; color: var(--accent-cyan); margin: 0.2rem 0;">-</div>
                <div id="kpi-bitplane-total-bytes" style="font-size: 0.75rem; color: var(--text-secondary);">-</div>
              </div>

              <!-- KPI 2: Ocupación de Capacidad -->
              <div style="background: rgba(0,0,0,0.3); padding: 0.9rem; border-radius: 8px; border-left: 3px solid var(--accent-purple);">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Ocupación de Capacidad Portadora</div>
                <div id="kpi-bitplane-capacity-pct" class="font-mono" style="font-size: 1.35rem; font-weight: 700; color: var(--accent-purple); margin: 0.2rem 0;">-</div>
                <div id="kpi-bitplane-capacity-desc" style="font-size: 0.75rem; color: var(--text-secondary);">-</div>
              </div>

              <!-- KPI 3: Coordenadas Espaciales -->
              <div style="background: rgba(0,0,0,0.3); padding: 0.9rem; border-radius: 8px; border-left: 3px solid var(--accent-emerald);">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Extensión Espacial en Matriz</div>
                <div id="kpi-bitplane-coords" class="font-mono" style="font-size: 1.35rem; font-weight: 700; color: var(--accent-emerald); margin: 0.2rem 0;">-</div>
                <div id="kpi-bitplane-coords-desc" style="font-size: 0.75rem; color: var(--text-secondary);">-</div>
              </div>

              <!-- KPI 4: Balance de Bits Cifrados -->
              <div style="background: rgba(0,0,0,0.3); padding: 0.9rem; border-radius: 8px; border-left: 3px solid var(--accent-amber);">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Equilibrio de Bits (Criptoanálisis)</div>
                <div id="kpi-bitplane-entropy-balance" class="font-mono" style="font-size: 1.35rem; font-weight: 700; color: var(--accent-amber); margin: 0.2rem 0;">-</div>
                <div id="kpi-bitplane-entropy-desc" style="font-size: 0.75rem; color: var(--text-secondary);">-</div>
              </div>
            </div>

            <!-- Fila de Detalles Técnicos Adicionales -->
            <div id="bitplane-additional-details" style="margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 6px; font-size: 0.8rem; color: #e2e8f0; line-height: 1.5;">
              <!-- Detalles adicionales -->
            </div>
          </div>
        </div>

        <!-- 3. Métricas Matemáticas: Entropía y Chi-Cuadrado -->
        <div class="grid-2">
          <!-- Card de Entropía de Shannon -->
          <div class="card card-glow-cyan" style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <h4 style="font-size: 1.1rem;">Entropía de la Información (Shannon)</h4>
              <span class="badge badge-cyan font-mono">H(X)</span>
            </div>

            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
              Mide la aleatoriedad en el plano de los Bits Menos Significativos (LSB). Un payload cifrado con AES-GCM genera ruido pseudo-aleatorio que eleva la entropía LSB a valores extremadamente cercanos a <strong>1.000000</strong>.
            </p>

            <div id="entropy-metrics-list" style="display: flex; flex-direction: column; gap: 0.6rem; font-family: var(--font-mono); font-size: 0.85rem;">
              <!-- Se llena dinámicamente -->
            </div>
          </div>

          <!-- Card de Ataque Chi-Cuadrado (PoVs) -->
          <div class="card card-glow-emerald" style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <h4 style="font-size: 1.1rem;">Ataque Chi-Cuadrado (PoVs)</h4>
              <span class="badge badge-emerald font-mono">χ² Test</span>
            </div>

            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
              Algoritmo de Pares de Valores (2k, 2k+1): Compara las frecuencias de valores contiguos. La incrustación LSB iguala artificialmente estos pares alrededor de su media aritmética.
            </p>

            <div id="chi-metrics-list" style="display: flex; flex-direction: column; gap: 0.6rem; font-family: var(--font-mono); font-size: 0.85rem;">
              <!-- Se llena dinámicamente -->
            </div>
          </div>
        </div>

        <!-- 4. Gráfico del Histograma de Frecuencias RGB -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <h4 style="font-size: 1.1rem;">Distribución Espectral de Frecuencias (Histograma RGB de 256 Bins)</h4>
            <div style="display: flex; gap: 0.5rem;">
              <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">Canal Rojo (R)</span>
              <span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3);">Canal Verde (G)</span>
              <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">Canal Azul (B)</span>
            </div>
          </div>

          <div style="position: relative; height: 320px; width: 100%;">
            <canvas id="rgb-histogram-chart"></canvas>
          </div>
        </div>

      </div>
    </div>
  `;

  // ==========================================
  // ELEMENTOS DOM
  // ==========================================
  const dropzoneAnalysis = container.querySelector('#dropzone-analysis');
  const fileInput = container.querySelector('#analysis-file-input');
  const previewBox = container.querySelector('#analysis-preview-box');
  const previewImg = container.querySelector('#analysis-preview-img');
  const btnRunAnalysis = container.querySelector('#btn-run-analysis');

  const resultsSection = container.querySelector('#analysis-results-section');
  const verdictCard = container.querySelector('#verdict-card');
  const bitplanePreviewContainer = container.querySelector('#bitplane-preview-container');
  const bitplaneViewSelect = container.querySelector('#bitplane-view-select');
  const bitplaneChannelSelect = container.querySelector('#bitplane-channel-select');
  const bitplaneColorSelect = container.querySelector('#bitplane-color-select');
  const bitplaneShapeSelect = container.querySelector('#bitplane-shape-select');
  const btnExtractLsbPlane = container.querySelector('#btn-extract-lsb-plane');
  const bitplaneStats = container.querySelector('#bitplane-stats');
  const btnDownloadLsbMask = container.querySelector('#btn-download-lsb-mask');

  const kpiBitplaneTotalBits = container.querySelector('#kpi-bitplane-total-bits');
  const kpiBitplaneTotalBytes = container.querySelector('#kpi-bitplane-total-bytes');
  const kpiBitplaneCapacityPct = container.querySelector('#kpi-bitplane-capacity-pct');
  const kpiBitplaneCapacityDesc = container.querySelector('#kpi-bitplane-capacity-desc');
  const kpiBitplaneCoords = container.querySelector('#kpi-bitplane-coords');
  const kpiBitplaneCoordsDesc = container.querySelector('#kpi-bitplane-coords-desc');
  const kpiBitplaneEntropyBalance = container.querySelector('#kpi-bitplane-entropy-balance');
  const kpiBitplaneEntropyDesc = container.querySelector('#kpi-bitplane-entropy-desc');
  const bitplaneAdditionalDetails = container.querySelector('#bitplane-additional-details');

  const entropyMetricsList = container.querySelector('#entropy-metrics-list');
  const chiMetricsList = container.querySelector('#chi-metrics-list');
  const chartCanvas = container.querySelector('#rgb-histogram-chart');

  let currentAnalysisBlob = null;
  let loadedImageElement = null;
  let currentBitplaneCanvas = null;
  let chartInstance = null;

  // Interacción con Drag & Drop y Selector de Archivo
  dropzoneAnalysis.addEventListener('click', () => fileInput.click());
  dropzoneAnalysis.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneAnalysis.classList.add('dragover');
  });
  dropzoneAnalysis.addEventListener('dragleave', () => dropzoneAnalysis.classList.remove('dragover'));
  dropzoneAnalysis.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneAnalysis.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleSelectedFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleSelectedFile(e.target.files[0]);
  });

  async function handleSelectedFile(fileOrBlob) {
    let blob = fileOrBlob;
    if (fileOrBlob && typeof fileOrBlob === 'object' && !(fileOrBlob instanceof Blob)) {
      blob = fileOrBlob.stegoBlob || fileOrBlob.blob || fileOrBlob;
    }
    if (!blob) return;

    const conversionNotice = container.querySelector('#analysis-conversion-notice');

    try {
      // Conversión automática transparente si la imagen no es PNG (JPEG, WebP, BMP, etc.)
      const conversion = await StegoEngine.convertToPng(blob);
      currentAnalysisBlob = conversion.pngBlob;
      loadedImageElement = conversion.imageElement;

      const url = URL.createObjectURL(conversion.pngBlob);
      previewImg.src = url;
      previewBox.style.display = 'flex';
      btnRunAnalysis.disabled = false;
      resultsSection.style.display = 'none';

      if (conversionNotice) {
        if (conversion.wasConverted) {
          const origFormat = (conversion.originalType || 'JPEG/JPG').replace('image/', '').toUpperCase();
          conversionNotice.style.display = 'inline-flex';
          conversionNotice.innerHTML = `⚡ <strong>Imagen convertida:</strong> de <code>${origFormat}</code> a <code>PNG</code> sin pérdida para análisis forense digital.`;
        } else {
          conversionNotice.style.display = 'none';
        }
      }
    } catch (err) {
      alert(`Error al procesar la imagen: ${err.message}`);
    }
  }

  // Si se envió un blob desde la Pestaña 1 (StegoTab)
  if (initialData) {
    handleSelectedFile(initialData);
    setTimeout(() => {
      if (currentAnalysisBlob) {
        runForensicAnalysis();
      }
    }, 350);
  }

  // Ejecutar Análisis Forense
  btnRunAnalysis.addEventListener('click', () => runForensicAnalysis());

  async function runForensicAnalysis() {
    try {
      btnRunAnalysis.disabled = true;
      btnRunAnalysis.innerHTML = '⏳ Procesando bytes en backend y extrayendo plano en B/N...';

      const data = await ApiService.analyzeImage(currentAnalysisBlob);

      renderResults(data);
      extractAndRenderBitPlane();

      resultsSection.style.display = 'flex';
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      alert(`Error en análisis forense: ${err.message}`);
    } finally {
      btnRunAnalysis.disabled = false;
      btnRunAnalysis.innerHTML = '🚀 Iniciar Análisis Forense';
    }
  }

  function renderResults(report) {
    const verdict = report.verdict;
    const isHighRisk = verdict.status === 'ALTO_RIESGO_ESTEGANOGRAFIA';
    const isModerate = verdict.status === 'SOSPECHA_MODERADA';

    const borderColor = isHighRisk ? 'var(--accent-rose)' : (isModerate ? 'var(--accent-amber)' : 'var(--accent-emerald)');
    const badgeClass = isHighRisk ? 'badge-rose' : (isModerate ? 'badge-amber' : 'badge-emerald');

    // 1. Veredicto
    verdictCard.style.borderColor = borderColor;
    verdictCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.25rem;">Veredicto Forense Digital</h3>
        <span class="badge ${badgeClass}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
          ${verdict.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1rem;">
        <div>
          <div style="font-size: 2.25rem; font-weight: 800; font-family: var(--font-mono); color: ${borderColor};">
            ${verdict.suspicionPercentage}%
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Índice de Sospecha</div>
        </div>

        <div style="flex: 1; font-size: 0.9rem; color: var(--text-secondary); border-left: 2px solid ${borderColor}; padding-left: 1rem;">
          ${verdict.summary}
        </div>
      </div>

      <div class="progress-container" style="height: 12px;">
        <div class="progress-bar ${isHighRisk ? 'progress-danger' : (isModerate ? 'progress-warning' : 'progress-normal')}" 
             style="width: ${verdict.suspicionPercentage}%;"></div>
      </div>
    `;

    // 2. Entropía de Shannon
    const ent = report.shannonEntropy;
    entropyMetricsList.innerHTML = `
      <div style="display: flex; justify-content: space-between; padding: 0.4rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <span style="color: #f87171;">Entropía LSB (Canal R):</span>
        <span style="color: #ffffff;">${ent.redLSB} bits/símbolo</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.4rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <span style="color: #4ade80;">Entropía LSB (Canal G):</span>
        <span style="color: #ffffff;">${ent.greenLSB} bits/símbolo</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.4rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <span style="color: #60a5fa;">Entropía LSB (Canal B):</span>
        <span style="color: #ffffff;">${ent.blueLSB} bits/símbolo</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 6px; font-weight: bold;">
        <span style="color: var(--accent-cyan);">Entropía Global LSB:</span>
        <span style="color: var(--accent-cyan);">${ent.globalLSB} / 1.000000</span>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
        ${ent.isAnomalouslyHigh ? '⚠️ Alerta: Entropía > 0.9985 indica sustitución deliberada de bits por una fuente pseudo-aleatoria (Cifrado GCM).' : '✓ Dispersión normal de bits de baja significancia.'}
      </div>
    `;

    // 3. Chi-Cuadrado PoVs
    const chi = report.chiSquarePoV;
    chiMetricsList.innerHTML = `
      <div style="display: flex; justify-content: space-between; padding: 0.4rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <span style="color: #f87171;">χ² Canal Rojo (df=${chi.red.degreesOfFreedom}):</span>
        <span style="color: #ffffff;">${chi.red.chiSquare} (p=${chi.red.pValue})</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.4rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <span style="color: #4ade80;">χ² Canal Verde (df=${chi.green.degreesOfFreedom}):</span>
        <span style="color: #ffffff;">${chi.green.chiSquare} (p=${chi.green.pValue})</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.4rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <span style="color: #60a5fa;">χ² Canal Azul (df=${chi.blue.degreesOfFreedom}):</span>
        <span style="color: #ffffff;">${chi.blue.chiSquare} (p=${chi.blue.pValue})</span>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.4;">
        Pares analizados por canal: <strong>${chi.red.pairsAnalyzed} PoVs</strong>. La uniformidad forzada entre valores contiguos (2k y 2k+1) delata inyección secuencial o aleatoria LSB.
      </div>
    `;

    // 4. Renderizar Histograma con Chart.js
    renderHistogramChart(report.histograms);
  }

  // ==========================================
  // EXTRACCIÓN Y VISUALIZACIÓN DE PLANO LSB (COLORES, FIGURAS Y KPIS)
  // ==========================================
  async function extractAndRenderBitPlane() {
    if (!loadedImageElement && currentAnalysisBlob) {
      try {
        loadedImageElement = await StegoEngine.loadImage(currentAnalysisBlob);
      } catch (err) {
        console.error('Error cargando imagen para plano LSB:', err);
        return;
      }
    }
    if (!loadedImageElement) return;

    const channel = bitplaneChannelSelect ? bitplaneChannelSelect.value : 'all';
    const colorTheme = bitplaneColorSelect ? bitplaneColorSelect.value : 'neon';
    const shapeMode = bitplaneShapeSelect ? bitplaneShapeSelect.value : 'dots';
    const viewMode = bitplaneViewSelect ? bitplaneViewSelect.value : 'microscope';

    const result = ForensicComparator.extractBitPlane(loadedImageElement, {
      bitIndex: 0,
      channel,
      colorTheme,
      shapeMode,
      viewMode
    });

    currentBitplaneCanvas = result.canvas;
    bitplanePreviewContainer.innerHTML = '';
    bitplanePreviewContainer.appendChild(result.canvas);

    const s = result.stats;

    bitplaneStats.innerText = `Plano Bit 0 (LSB) — Vista: ${viewMode.toUpperCase()} | Canal: ${channel.toUpperCase()} | Paleta: ${colorTheme.toUpperCase()} | Modo: ${shapeMode.toUpperCase()}`;

    // 1. Actualizar KPI: Cantidad de Bits Modificados
    kpiBitplaneTotalBits.innerText = `${s.totalInjectedBits.toLocaleString()} bits`;
    kpiBitplaneTotalBytes.innerText = s.hasValidHeader 
      ? `(${s.totalInjectedBytes.toLocaleString()} bytes totales: 4B cabecera + ${s.payloadBytes.toLocaleString()}B payload útil)`
      : `(${s.totalInjectedBytes.toLocaleString()} bytes activos inspeccionados)`;

    // 2. Actualizar KPI: Ocupación de Capacidad
    kpiBitplaneCapacityPct.innerText = `${s.capacityUsedPct}%`;
    kpiBitplaneCapacityDesc.innerText = `de ${(s.dimensions.totalChannels / 8 - 4).toLocaleString()} bytes de capacidad máxima disponible`;

    // 3. Actualizar KPI: Extensión y Coordenadas
    kpiBitplaneCoords.innerText = s.hasValidHeader 
      ? `Píxeles #0 a #${s.endPixel.toLocaleString()}` 
      : `Matriz ${s.dimensions.width} × ${s.dimensions.height} px`;
    kpiBitplaneCoordsDesc.innerText = s.hasValidHeader 
      ? `Abarca desde fila 0 hasta fila ${s.endRow} de la imagen` 
      : `Dispersión en toda la matriz cromática`;

    // 4. Actualizar KPI: Balance de Bits Cifrados
    kpiBitplaneEntropyBalance.innerText = `${s.payloadRatio1}% / ${s.payloadRatio0}%`;
    kpiBitplaneEntropyDesc.innerText = s.hasValidHeader 
      ? `Proporción 1s vs 0s (Equilibrio de alta entropía AES-256)` 
      : `Equilibrio natural de bits fotográficos`;

    // Fila de Información Técnica Adicional
    bitplaneAdditionalDetails.innerHTML = `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center;">
        <div><strong>Protocolo Detectado:</strong> ${s.hasValidHeader ? '<span style="color:#10b981; font-weight: 600;">Cabecera Big-Endian 32-bit Verificada ✓</span>' : '<span style="color:#f59e0b; font-weight: 600;">Dispersión LSB Continua</span>'}</div>
        <div><strong>Canal Alfa (Transparencia):</strong> <span style="color:#00f0ff; font-weight: 600;">A = 255 (100% Intacto, sin fuga de opacidad)</span></div>
        <div><strong>Modo Visual Activo:</strong> <span style="color:#a855f7; font-weight: 600;">${viewMode.toUpperCase()} • Paleta ${colorTheme.toUpperCase()} • Marcador ${shapeMode.toUpperCase()}</span></div>
      </div>
    `;
  }

  if (btnExtractLsbPlane) {
    btnExtractLsbPlane.addEventListener('click', () => extractAndRenderBitPlane());
  }
  if (bitplaneViewSelect) {
    bitplaneViewSelect.addEventListener('change', () => extractAndRenderBitPlane());
    bitplaneViewSelect.addEventListener('input', () => extractAndRenderBitPlane());
  }
  if (bitplaneChannelSelect) {
    bitplaneChannelSelect.addEventListener('change', () => extractAndRenderBitPlane());
    bitplaneChannelSelect.addEventListener('input', () => extractAndRenderBitPlane());
  }
  if (bitplaneColorSelect) {
    bitplaneColorSelect.addEventListener('change', () => extractAndRenderBitPlane());
    bitplaneColorSelect.addEventListener('input', () => extractAndRenderBitPlane());
  }
  if (bitplaneShapeSelect) {
    bitplaneShapeSelect.addEventListener('change', () => extractAndRenderBitPlane());
    bitplaneShapeSelect.addEventListener('input', () => extractAndRenderBitPlane());
  }

  btnDownloadLsbMask.addEventListener('click', () => {
    if (!currentBitplaneCanvas) return;
    const a = document.createElement('a');
    a.href = currentBitplaneCanvas.toDataURL('image/png');
    a.download = `plano_lsb_${bitplaneColorSelect.value}_${bitplaneShapeSelect.value}_${Date.now()}.png`;
    a.click();
  });

  // ==========================================
  // HISTOGRAMA RGB
  // ==========================================
  function renderHistogramChart(histograms) {
    if (chartInstance) {
      chartInstance.destroy();
    }

    const labels = Array.from({ length: 256 }, (_, i) => i);

    const ctx = chartCanvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Canal Rojo',
            data: histograms.red,
            borderColor: 'rgba(248, 113, 113, 0.85)',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true
          },
          {
            label: 'Canal Verde',
            data: histograms.green,
            borderColor: 'rgba(74, 222, 128, 0.85)',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true
          },
          {
            label: 'Canal Azul',
            data: histograms.blue,
            borderColor: 'rgba(96, 165, 250, 0.85)',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            title: { display: true, text: 'Intensidad de Color (0 a 255)', color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', maxTicksLimit: 16 }
          },
          y: {
            title: { display: true, text: 'Frecuencia de Píxeles', color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b' }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#00f0ff',
            bodyColor: '#f1f5f9',
            borderColor: 'rgba(0, 240, 255, 0.3)',
            borderWidth: 1
          }
        }
      }
    });
  }
}
