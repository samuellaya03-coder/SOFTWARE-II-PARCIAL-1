import { Chart, registerables } from 'chart.js';
import { ApiService } from '../services/api.js';

Chart.register(...registerables);

export function renderAnalysisTab(container, initialImageBlob = null) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado de la Pestaña -->
      <div class="card card-glow-cyan" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size: 1.5rem; margin-bottom: 0.25rem;">Estegoanálisis y Forense Digital de Imágenes</h2>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Detección de esteganografía mediante análisis de Entropía de Shannon en planos LSB y Ataque de Chi-cuadrado (χ²) sobre Pares de Valores (PoVs).
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span class="badge badge-cyan">Entropía de Shannon</span>
          <span class="badge badge-emerald">Ataque Chi-Cuadrado (PoVs)</span>
          <span class="badge badge-purple">Histogramas RGB</span>
        </div>
      </div>

      <!-- Zona de Carga de Imagen para Forense -->
      <div class="card space-y-4" style="display: flex; flex-direction: column; gap: 1rem;">
        <h3 style="font-size: 1.15rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          Seleccionar Imagen PNG para Análisis Estadístico
        </h3>

        <div id="dropzone-analysis" class="dropzone">
          <input type="file" id="analysis-file-input" accept="image/png" style="display: none;" />
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔬</div>
          <p style="font-weight: 600; color: var(--text-primary);">Arrastra una imagen PNG o haz clic para subir</p>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
            El backend en Node.js analizará los bytes crudos y calculará las métricas de aleatoriedad
          </p>
        </div>

        <div id="analysis-preview-box" class="image-preview-box" style="display: none;">
          <img id="analysis-preview-img" alt="Imagen en análisis" />
        </div>

        <button id="btn-run-analysis" class="btn btn-primary" style="width: 100%;" disabled>
          🚀 Iniciar Análisis Forense y Chi-Cuadrado
        </button>
      </div>

      <!-- SECCIÓN DE RESULTADOS FORENSES -->
      <div id="analysis-results-section" style="display: none; display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Veredicto General de Sospecha -->
        <div id="verdict-card" class="card">
          <!-- Dinámico -->
        </div>

        <!-- Métricas Matemáticas: Entropía y Chi-Cuadrado -->
        <div class="grid-2">
          <!-- Card de Entropía de Shannon -->
          <div class="card card-glow-cyan" style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <h4 style="font-size: 1.1rem;">Entropía de la Información (Shannon)</h4>
              <span class="badge badge-cyan font-mono">H(X)</span>
            </div>

            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
              Mide la aleatoriedad en el plano de los Bits Menos Significativos (LSB). Un payload cifrado con AES-GCM genera ruido pseudo-aleatorio perfecto que eleva la entropía LSB a valores extremadamente cercanos a <strong>1.000000</strong>.
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
              Algoritmo de Westfeld & Pfitzmann: Compara las frecuencias de los Pares de Valores (2k, 2k+1). La incrustación LSB iguala artificialmente estos pares alrededor de su media aritmética.
            </p>

            <div id="chi-metrics-list" style="display: flex; flex-direction: column; gap: 0.6rem; font-family: var(--font-mono); font-size: 0.85rem;">
              <!-- Se llena dinámicamente -->
            </div>
          </div>
        </div>

        <!-- Resaltado Forense Visual por Franjas -->
        <div class="card card-glow-cyan" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <h4 style="font-size: 1.15rem; display: flex; align-items: center; gap: 0.5rem;">
              🎨 Mapa Visual de Resaltado Forense por Franjas
            </h4>
            <span id="strip-region-badge" class="badge badge-cyan font-mono">Detección por Filas</span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
            Esta vista resalta en <strong>rojo neón traslúcido</strong> las franjas de píxeles exactas donde el análisis estadístico detectó alteración esteganográfica de bits LSB (Entropía $\approx 1.0000$).
          </p>

            <div style="max-width: 100%; overflow: auto; text-align: center; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem; background: rgba(0,0,0,0.3); width: 100%; display: flex; justify-content: center; align-items: center; min-height: 200px;">
              <canvas id="highlight-canvas" style="max-width: 100%; max-height: 280px; width: auto; height: auto; display: block; margin: 0 auto; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); object-fit: contain;"></canvas>
            </div>

            <div id="strip-summary-info" style="width: 100%; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary);">
              <!-- Llenado dinámicamente -->
            </div>
          </div>
        </div>

        <!-- Perfil de Entropía LSB por Franja (Chart) -->
        <div class="card card-glow-purple">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-size: 1.1rem;">Perfil de Entropía LSB por Franja (Análisis Secuencial de Filas)</h4>
            <span class="badge badge-purple font-mono">Umbral = 0.9950</span>
          </div>

          <div style="position: relative; height: 260px; width: 100%;">
            <canvas id="strip-entropy-chart"></canvas>
          </div>
        </div>

        <!-- Gráfico del Histograma de Frecuencias RGB -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
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

  // Elementos DOM
  const dropzoneAnalysis = container.querySelector('#dropzone-analysis');
  const fileInput = container.querySelector('#analysis-file-input');
  const previewBox = container.querySelector('#analysis-preview-box');
  const previewImg = container.querySelector('#analysis-preview-img');
  const btnRunAnalysis = container.querySelector('#btn-run-analysis');

  const resultsSection = container.querySelector('#analysis-results-section');
  const verdictCard = container.querySelector('#verdict-card');
  const entropyMetricsList = container.querySelector('#entropy-metrics-list');
  const chiMetricsList = container.querySelector('#chi-metrics-list');
  const highlightCanvas = container.querySelector('#highlight-canvas');
  const stripSummaryInfo = container.querySelector('#strip-summary-info');
  const stripRegionBadge = container.querySelector('#strip-region-badge');
  const chartCanvas = container.querySelector('#rgb-histogram-chart');
  const stripChartCanvas = container.querySelector('#strip-entropy-chart');

  let currentAnalysisBlob = null;
  let chartInstance = null;
  let stripChartInstance = null;

  // Interacción con Drag & Drop y Selector
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

  function handleSelectedFile(fileOrBlob) {
    currentAnalysisBlob = fileOrBlob;
    const url = URL.createObjectURL(fileOrBlob);
    previewImg.src = url;
    previewBox.style.display = 'flex';
    btnRunAnalysis.disabled = false;
    resultsSection.style.display = 'none';
  }

  // Si se envió un blob desde la Pestaña 1 (StegoTab)
  if (initialImageBlob) {
    handleSelectedFile(initialImageBlob);
  }

  // Ejecutar Análisis Forense
  btnRunAnalysis.addEventListener('click', async () => {
    try {
      btnRunAnalysis.disabled = true;
      btnRunAnalysis.innerHTML = '⏳ Procesando bytes en backend y analizando franjas...';

      const data = await ApiService.analyzeImage(currentAnalysisBlob);

      await renderResults(data);
      resultsSection.style.display = 'flex';
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      alert(`Error en análisis forense: ${err.message}`);
    } finally {
      btnRunAnalysis.disabled = false;
      btnRunAnalysis.innerHTML = '🚀 Iniciar Análisis Forense y Chi-Cuadrado';
    }
  });

  async function renderResults(report) {
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

    // 4. Renderizar Canvas de Resaltado Forense por Franjas
    await renderHighlightCanvas(currentAnalysisBlob, report.stripAnalysis, report.injectedRegion);

    // 5. Renderizar Gráfico de Entropía por Franja
    renderStripEntropyChart(report.stripAnalysis);

    // 6. Renderizar Histograma con Chart.js
    renderHistogramChart(report.histograms);
  }

  async function renderHighlightCanvas(blob, stripData, injectedRegion) {
    if (!blob || !stripData) return;

    const img = new Image();
    const url = URL.createObjectURL(blob);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    highlightCanvas.width = w;
    highlightCanvas.height = h;

    const ctx = highlightCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Renderizar resaltado a nivel de PÍXEL en las franjas sospechosas
    if (stripData && stripData.strips && injectedRegion && injectedRegion.hasInjectedRegion) {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Crear mapa de filas sospechosas
      const suspiciousRows = new Set();
      stripData.strips.forEach((strip) => {
        if (strip.isSuspicious) {
          for (let y = strip.rowStart; y <= strip.rowEnd; y++) {
            suspiciousRows.add(y);
          }
        }
      });

      // Modificar píxeles individualmente en las filas inyectadas
      for (let y = 0; y < h; y++) {
        if (suspiciousRows.has(y)) {
          const rowOffset = y * w * 4;
          for (let x = 0; x < w; x++) {
            const idx = rowOffset + x * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Si el LSB del canal Rojo es 1, resaltar el píxel individual en Rojo Neón
            if ((r & 1) === 1) {
              data[idx] = Math.min(255, r + 160);
              data[idx + 1] = Math.floor(g * 0.25);
              data[idx + 2] = Math.floor(b * 0.25);
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Dibujar recuadro discontinuo sutil para delimitar la región inyectada
      if (injectedRegion.startRow !== null && injectedRegion.endRow !== null) {
        const regionHeight = injectedRegion.endRow - injectedRegion.startRow + 1;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = Math.max(1.5, Math.floor(h / 400));
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(1, injectedRegion.startRow, w - 2, regionHeight);
        ctx.setLineDash([]);
      }
    }

    // Resumen debajo del canvas
    if (injectedRegion && injectedRegion.hasInjectedRegion) {
      stripRegionBadge.className = 'badge badge-rose font-mono';
      stripRegionBadge.textContent = `Inyección: Filas ${injectedRegion.startRow} - ${injectedRegion.endRow}`;

      stripSummaryInfo.innerHTML = `
        <div style="padding: 0.75rem; background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.35); border-radius: 6px; display: flex; flex-direction: column; gap: 0.3rem;">
          <div style="font-weight: bold; color: #f43f5e; display: flex; align-items: center; gap: 0.4rem;">
            ⚠️ INYECCIÓN LSB DETECTADA EN FRANJAS DE FILAS
          </div>
          <div>• Rango afectado: <strong>Filas ${injectedRegion.startRow} a ${injectedRegion.endRow}</strong> (${injectedRegion.totalRows} filas continuas).</div>
          <div>• Cobertura espacial: <strong>${injectedRegion.percentageOfImage}%</strong> del área total de la imagen.</div>
          <div>• Franjas analizadas: <strong>${stripData.suspiciousStripsCount} de ${stripData.totalStrips} franjas</strong> superaron el umbral de entropía LSB (H ≥ 0.995).</div>
        </div>
      `;
    } else {
      stripRegionBadge.className = 'badge badge-emerald font-mono';
      stripRegionBadge.textContent = 'Sin inyección detectada';

      stripSummaryInfo.innerHTML = `
        <div style="padding: 0.75rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 6px; color: #4ade80;">
          ✓ <strong>IMAGEN LIMPIA:</strong> No se detectaron franjas anormales en el análisis de entropía LSB fila por fila.
        </div>
      `;
    }

    URL.revokeObjectURL(url);
  }

  function renderStripEntropyChart(stripData) {
    if (stripChartInstance) {
      stripChartInstance.destroy();
    }

    if (!stripData || !stripData.strips) return;

    const labels = stripData.strips.map(s => `F. ${s.stripIndex} (${s.rowStart}-${s.rowEnd})`);
    const suspicionValues = stripData.strips.map(s => s.suspicionScore || (s.isSuspicious ? 95 : 0));
    const backgroundColors = stripData.strips.map(s => s.isSuspicious ? 'rgba(244, 63, 94, 0.85)' : 'rgba(148, 163, 184, 0.08)');
    const borderColors = stripData.strips.map(s => s.isSuspicious ? '#f43f5e' : 'rgba(148, 163, 184, 0.2)');

    const ctx = stripChartCanvas.getContext('2d');
    stripChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Nivel de Inyección / Sospecha de la Franja (%)',
            data: suspicionValues,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'Franja de Filas (Rango de Píxeles Y)', color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', maxTicksLimit: 12 }
          },
          y: {
            title: { display: true, text: 'Índice de Inyección LSB (0% a 100%)', color: '#94a3b8' },
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { 
              color: '#64748b',
              callback: (value) => `${value}%`
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#00f0ff',
            bodyColor: '#f1f5f9',
            borderColor: 'rgba(0, 240, 255, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const strip = stripData.strips[context.dataIndex];
                return [
                  `Sospecha de Inyección: ${context.parsed.y}%`,
                  `Entropía LSB: ${strip.entropyGlobal}`,
                  `Estado: ${strip.isSuspicious ? '⚠️ FRANJA INYECTADA' : '✓ Limpia'}`
                ];
              }
            }
          }
        }
      }
    });
  }

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

