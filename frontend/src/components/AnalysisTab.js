import { Chart, registerables } from 'chart.js';
import { ApiService } from '../services/api.js';

Chart.register(...registerables);

/** Presentacion de cada veredicto: color, icono y titular. */
const VERDICT_PRESENTATION = {
  LIMPIA: {
    accent: 'var(--accent-emerald)',
    glow: 'card-glow-emerald',
    badge: 'badge-emerald',
    icon: '✅',
    title: 'Imagen limpia',
    subtitle: 'No hay evidencia estadistica de inyeccion LSB.'
  },
  SOSPECHA: {
    accent: 'var(--accent-amber)',
    glow: '',
    badge: 'badge-amber',
    icon: '⚠️',
    title: 'Sospecha no concluyente',
    subtitle: 'Hay senal por encima del ruido, pero no alcanza el umbral de deteccion.'
  },
  EVIDENCIA_INCONSISTENTE: {
    accent: 'var(--accent-amber)',
    glow: '',
    badge: 'badge-amber',
    icon: '🔀',
    title: 'Evidencia inconsistente',
    subtitle: 'Los estimadores se contradicen: firma tipica de una portadora muy ruidosa.'
  },
  INYECCION_DETECTADA: {
    accent: 'var(--accent-rose)',
    glow: '',
    badge: 'badge-rose',
    icon: '🔴',
    title: 'Inyeccion detectada',
    subtitle: 'La evidencia estadistica es incompatible con una imagen natural.'
  },
  INYECCION_CONFIRMADA: {
    accent: 'var(--accent-rose)',
    glow: '',
    badge: 'badge-rose',
    icon: '🎯',
    title: 'Inyeccion confirmada',
    subtitle: 'Dos familias de metodos independientes concuerdan.'
  }
};

const numberFormat = new Intl.NumberFormat('es-ES');

function formatPercent(value, digits = 2) {
  return value === null || value === undefined ? 'n/d' : `${(value * 100).toFixed(digits)}%`;
}

function formatRate(value) {
  return value === null || value === undefined ? 'n/d' : value.toFixed(4);
}

/** Fila de metrica con etiqueta a la izquierda y valor monoespaciado a la derecha. */
function metricRow(label, value, color = 'var(--text-primary)', hint = null) {
  return `
    <div style="display:flex; justify-content:space-between; align-items:baseline; gap:1rem;">
      <span style="color: var(--text-muted);">${label}</span>
      <span class="font-mono" style="color:${color}; text-align:right;">${value}</span>
    </div>
    ${hint ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:-0.35rem;">${hint}</div>` : ''}
  `;
}

export function renderAnalysisTab(container, initialImageBlob = null) {
  container.innerHTML = `
    <div class="card card-glow-cyan" style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
      <div>
        <h2 style="font-size:1.5rem; margin-bottom:0.25rem;">Estegoanalisis Forense</h2>
        <p style="color:var(--text-secondary); font-size:0.875rem;">
          Tres estimadores independientes y un veredicto por fusion de evidencia.
        </p>
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <span class="badge badge-cyan">χ² progresivo</span>
        <span class="badge badge-purple">RS Analysis</span>
        <span class="badge badge-emerald">Sample Pair Analysis</span>
      </div>
    </div>

    <div class="card" style="margin-top:1.5rem; display:flex; flex-direction:column; gap:1rem;">
      <h3 style="font-size:1.15rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
        Imagen bajo analisis
      </h3>

      <div id="dropzone-analysis" class="dropzone">
        <input type="file" id="analysis-file-input" accept="image/png" style="display:none;" />
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔬</div>
        <p style="font-weight:600; color:var(--text-primary);">Arrastra un PNG o haz clic para seleccionarlo</p>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
          Solo formatos sin perdida: la cuantizacion DCT de JPEG destruye los LSB
        </p>
      </div>

      <div id="analysis-preview-box" class="image-preview-box" style="display:none;">
        <img id="analysis-preview-img" alt="Imagen en analisis" />
      </div>

      <button id="btn-run-analysis" class="btn btn-primary" style="width:100%;" disabled>
        🚀 Ejecutar analisis forense
      </button>
    </div>

    <div id="analysis-results-section" style="display:none; flex-direction:column; gap:1.5rem; margin-top:1.5rem;">

      <div id="verdict-card" class="card"></div>

      <div class="grid-2" style="gap:1.5rem;">
        <div class="card" style="display:flex; flex-direction:column; gap:0.6rem;">
          <h3 style="font-size:1.05rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
            Estimadores de tasa de inyeccion
          </h3>
          <p style="font-size:0.76rem; color:var(--text-muted); margin:0;">
            RS y SPA explotan correlacion espacial, no el histograma, asi que funcionan en
            portadoras donde el χ² es ciego. No localizan el payload.
          </p>
          <div id="rate-metrics" class="font-mono" style="display:flex; flex-direction:column; gap:0.55rem; font-size:0.83rem;"></div>
        </div>

        <div class="card" style="display:flex; flex-direction:column; gap:0.6rem;">
          <h3 style="font-size:1.05rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
            Ataque χ² progresivo
          </h3>
          <p style="font-size:0.76rem; color:var(--text-muted); margin:0;">
            Localiza el borde de una inyeccion secuencial. Se autocalibra contra la cola del
            flujo y se declara inconcluyente si el histograma es demasiado liso.
          </p>
          <div id="chi-metrics" class="font-mono" style="display:flex; flex-direction:column; gap:0.55rem; font-size:0.83rem;"></div>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:1.05rem; margin-bottom:0.35rem;">Curva χ²/df sobre prefijos crecientes</h3>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:1rem;">
          Bajo inyeccion LSB cada par de valores aporta un χ²(1), asi que χ²/df ≈ 1. Donde la
          curva se dispara empieza la region natural de la imagen: ese punto de ruptura es el
          borde del payload. Escala logaritmica.
        </p>
        <div style="height:300px;"><canvas id="chi-curve-chart"></canvas></div>
      </div>

      <div class="card">
        <h3 style="font-size:1.05rem; margin-bottom:0.35rem;">Histogramas de frecuencia RGB</h3>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:1rem;">
          La estructura de peine del histograma (picos y huecos alternados) es lo que hace
          explotable el ataque χ². Un histograma liso lo vuelve inaplicable.
        </p>
        <div style="height:300px;"><canvas id="rgb-histogram-chart"></canvas></div>
      </div>

      <div class="card">
        <h3 style="font-size:1.05rem; margin-bottom:0.35rem;">Entropia de Shannon de los planos LSB</h3>
        <div id="entropy-block" style="display:flex; flex-direction:column; gap:0.75rem;"></div>
      </div>
    </div>
  `;

  const dropzone = container.querySelector('#dropzone-analysis');
  const fileInput = container.querySelector('#analysis-file-input');
  const previewBox = container.querySelector('#analysis-preview-box');
  const previewImg = container.querySelector('#analysis-preview-img');
  const btnRunAnalysis = container.querySelector('#btn-run-analysis');

  const resultsSection = container.querySelector('#analysis-results-section');
  const verdictCard = container.querySelector('#verdict-card');
  const rateMetrics = container.querySelector('#rate-metrics');
  const chiMetrics = container.querySelector('#chi-metrics');
  const entropyBlock = container.querySelector('#entropy-block');

  let currentAnalysisBlob = null;
  let previewUrl = null;
  let histogramChart = null;
  let chiCurveChart = null;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    if (event.dataTransfer.files.length > 0) selectFile(event.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) selectFile(event.target.files[0]);
  });

  function selectFile(fileOrBlob) {
    currentAnalysisBlob = fileOrBlob;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(fileOrBlob);

    previewImg.src = previewUrl;
    previewBox.style.display = 'flex';
    btnRunAnalysis.disabled = false;
    resultsSection.style.display = 'none';
  }

  if (initialImageBlob) selectFile(initialImageBlob);

  btnRunAnalysis.addEventListener('click', async () => {
    try {
      btnRunAnalysis.disabled = true;
      btnRunAnalysis.innerHTML = '⏳ Ejecutando χ² progresivo, RS y SPA...';

      const report = await ApiService.analyzeImage(currentAnalysisBlob);

      renderVerdict(report);
      renderRateMetrics(report);
      renderChiMetrics(report);
      renderEntropy(report);
      renderChiCurveChart(report.estimators.chiSquareProgressive);
      renderHistogramChart(report.histograms);

      resultsSection.style.display = 'flex';
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      alert(`Error en el analisis forense: ${error.message}`);
    } finally {
      btnRunAnalysis.disabled = false;
      btnRunAnalysis.innerHTML = '🚀 Ejecutar analisis forense';
    }
  });

  function renderVerdict(report) {
    const { verdict, dimensions } = report;
    const look = VERDICT_PRESENTATION[verdict.status] ?? VERDICT_PRESENTATION.SOSPECHA;

    verdictCard.className = `card ${look.glow}`;
    verdictCard.style.borderColor = look.accent;

    const localizationRow = verdict.localization
      ? `
        <div style="display:flex; justify-content:space-between; gap:1rem;">
          <span style="color:var(--text-muted);">Borde del payload</span>
          <span class="font-mono">fraccion ${verdict.localization.embeddedFraction.toFixed(4)} del flujo</span>
        </div>`
      : '';

    const payloadRow = verdict.estimatedPayloadBytes !== null
      ? `
        <div style="display:flex; justify-content:space-between; gap:1rem;">
          <span style="color:var(--text-muted);">Payload estimado</span>
          <span class="font-mono" style="color:${look.accent};">
            ${numberFormat.format(verdict.estimatedPayloadBytes)} bytes
            <span style="color:var(--text-muted); font-size:0.75rem;">(${verdict.payloadSource})</span>
          </span>
        </div>`
      : '';

    verdictCard.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:1rem; flex-wrap:wrap; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:0.85rem;">
          <div style="font-size:2.5rem; line-height:1;">${look.icon}</div>
          <div>
            <h3 style="font-size:1.4rem; color:${look.accent}; margin-bottom:0.15rem;">${look.title}</h3>
            <p style="color:var(--text-secondary); font-size:0.85rem;">${look.subtitle}</p>
          </div>
        </div>
        <span class="badge ${look.badge}">${verdict.status}</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1.25rem; font-size:0.86rem;">
        <div style="display:flex; justify-content:space-between; gap:1rem;">
          <span style="color:var(--text-muted);">Tasa de inyeccion estimada</span>
          <span class="font-mono" style="color:${look.accent}; font-size:1rem;">
            ${formatPercent(verdict.estimatedRate)}
          </span>
        </div>
        ${payloadRow}
        ${localizationRow}
        <div style="display:flex; justify-content:space-between; gap:1rem;">
          <span style="color:var(--text-muted);">Capacidad LSB de la portadora</span>
          <span class="font-mono">${numberFormat.format(dimensions.maxPayloadCapacityBytes)} bytes
            <span style="color:var(--text-muted); font-size:0.75rem;">(${dimensions.width}×${dimensions.height})</span>
          </span>
        </div>
      </div>

      <div style="margin-top:1.25rem; padding-top:1rem; border-top:1px solid var(--border-color);">
        <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.05em;">
          Razonamiento
        </div>
        <ul style="display:flex; flex-direction:column; gap:0.45rem; font-size:0.83rem; color:var(--text-secondary); padding-left:1.1rem;">
          ${verdict.findings.map((finding) => `<li>${finding}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  function renderRateMetrics(report) {
    const { rsAnalysis, samplePairAnalysis } = report.estimators;
    const { evidence, thresholds } = report.verdict;

    const coherenceColor = evidence.coherent ? 'var(--accent-emerald)' : 'var(--accent-amber)';

    rateMetrics.innerHTML = [
      metricRow('RS Analysis (RGB)', formatRate(rsAnalysis.estimatedRate), 'var(--accent-purple)'),
      metricRow('Dispersion entre canales', formatRate(rsAnalysis.channelSpread)),
      metricRow('Sample Pair Analysis (RGB)', formatRate(samplePairAnalysis.estimatedRate), 'var(--accent-emerald)'),
      metricRow('Dispersion entre canales', formatRate(samplePairAnalysis.channelSpread)),
      `<div style="border-top:1px solid var(--border-color); margin:0.25rem 0;"></div>`,
      metricRow(
        'Discordancia |RS − SPA|',
        formatRate(evidence.disagreement),
        coherenceColor,
        `Coherente si ≤ ${thresholds.maxDisagreement}. Con inyeccion real ambos coinciden; el ruido extremo los descuadra.`
      ),
      metricRow('Suelo de ruido', thresholds.noiseFloor.toFixed(2)),
      metricRow('Umbral de deteccion', thresholds.detectionRate.toFixed(2))
    ].join('');
  }

  function renderChiMetrics(report) {
    const chi = report.estimators.chiSquareProgressive;

    const statusColor = chi.conclusive
      ? (chi.sequentialEmbeddingDetected ? 'var(--accent-rose)' : 'var(--accent-emerald)')
      : 'var(--accent-amber)';

    const rows = [
      metricRow('Estado', chi.status, statusColor),
      metricRow(
        'χ²/df de la cola (calibracion)',
        chi.tailReducedChiSquare === null ? 'n/d' : chi.tailReducedChiSquare.toFixed(3),
        'var(--accent-cyan)',
        'Desequilibrio natural de la portadora. Por debajo de 10 el ataque es inaplicable.'
      ),
      metricRow(
        'χ²/df global',
        chi.globalReducedChiSquare === null ? 'n/d' : chi.globalReducedChiSquare.toFixed(3),
        'var(--text-primary)',
        'Calculado sobre la imagen completa: es el valor que un ataque no progresivo veria.'
      ),
      metricRow('p-value global', chi.globalPValue === null ? 'n/d' : chi.globalPValue.toExponential(3)),
      metricRow(
        'p-value clasico de Westfeld',
        chi.westfeldGlobalPValue === null ? 'n/d' : chi.westfeldGlobalPValue.toFixed(6),
        'var(--text-muted)',
        'Formulacion literal del paper de 1999, que evalua medio estadistico contra df−1.'
      )
    ];

    if (chi.conclusive && chi.sequentialEmbeddingDetected) {
      rows.push(
        `<div style="border-top:1px solid var(--border-color); margin:0.25rem 0;"></div>`,
        metricRow('Fraccion inyectada', chi.embeddedFraction.toFixed(6), 'var(--accent-rose)'),
        metricRow('Muestras inyectadas', numberFormat.format(chi.embeddedSamples)),
        metricRow('Bytes estimados', numberFormat.format(chi.estimatedEmbeddedBytes), 'var(--accent-rose)')
      );
    }

    if (!chi.conclusive) {
      rows.push(`
        <div class="alert-box alert-warning" style="font-size:0.78rem; margin-top:0.5rem;">
          ${chi.reason}
        </div>
      `);
    }

    chiMetrics.innerHTML = rows.join('');
  }

  function renderEntropy(report) {
    const { entropy } = report;

    entropyBlock.innerHTML = `
      <div class="alert-box alert-info" style="font-size:0.8rem;">
        <div>
          <strong>Metrica descriptiva, excluida del veredicto.</strong>
          Los LSB de cualquier fotografia con ruido de sensor ya alcanzan H ≈ 1.0 sin payload
          alguno, asi que un umbral sobre la entropia marca como sospechosa practicamente
          cualquier foto real. Se muestra porque saber <em>por que</em> no sirve es parte del analisis.
        </div>
      </div>
      <div class="font-mono" style="display:flex; flex-direction:column; gap:0.55rem; font-size:0.83rem;">
        ${metricRow('H(LSB) canal R', entropy.redLsb.toFixed(6), '#fca5a5')}
        ${metricRow('H(LSB) canal G', entropy.greenLsb.toFixed(6), '#86efac')}
        ${metricRow('H(LSB) canal B', entropy.blueLsb.toFixed(6), '#93c5fd')}
        ${metricRow('H(LSB) global', entropy.globalLsb.toFixed(6), 'var(--accent-cyan)')}
        ${metricRow('Proporcion de unos', entropy.onesRatio.toFixed(6), 'var(--text-primary)', 'Bajo inyeccion tiende a 0.5 exacto.')}
        ${metricRow('Maximo teorico', entropy.theoreticalMax.toFixed(6), 'var(--text-muted)')}
      </div>
    `;
  }

  function renderChiCurveChart(chi) {
    const canvas = container.querySelector('#chi-curve-chart');
    if (chiCurveChart) chiCurveChart.destroy();

    const points = chi.curve.filter((point) => point.valid && point.reducedChiSquare !== null);

    chiCurveChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: points.map((point) => (point.fraction * 100).toFixed(1)),
        datasets: [
          {
            label: 'χ²/df del prefijo',
            // El eje logaritmico no admite 0, asi que se acota por abajo.
            data: points.map((point) => Math.max(point.reducedChiSquare, 1e-3)),
            borderColor: '#00f0ff',
            backgroundColor: 'rgba(0, 240, 255, 0.12)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.1
          },
          {
            label: 'Umbral de equilibrio',
            data: points.map(() => chi.balanceThreshold),
            borderColor: '#fb7185',
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            type: 'logarithmic',
            title: { display: true, text: 'χ²/df (log)', color: '#94a3b8' },
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.12)' }
          },
          x: {
            title: { display: true, text: '% del flujo de muestras analizado', color: '#94a3b8' },
            ticks: { color: '#94a3b8', maxTicksLimit: 14 },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { labels: { color: '#e2e8f0', boxWidth: 12 } },
          tooltip: {
            callbacks: {
              title: (items) => `Prefijo: ${items[0].label}% del flujo`,
              label: (item) => {
                if (item.datasetIndex === 1) return `Umbral: ${chi.balanceThreshold}`;
                const point = points[item.dataIndex];
                return [
                  `χ²/df = ${point.reducedChiSquare.toFixed(4)}`,
                  `χ² = ${point.chiSquare} con df = ${point.degreesOfFreedom}`,
                  `pares utilizables = ${point.usablePairs}`
                ];
              }
            }
          }
        }
      }
    });
  }

  function renderHistogramChart(histograms) {
    const canvas = container.querySelector('#rgb-histogram-chart');
    if (histogramChart) histogramChart.destroy();

    const levels = Array.from({ length: 256 }, (_, index) => index);

    histogramChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: levels,
        datasets: [
          { label: 'Rojo', data: histograms.red, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)' },
          { label: 'Verde', data: histograms.green, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)' },
          { label: 'Azul', data: histograms.blue, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.1)' }
        ].map((dataset) => ({ ...dataset, borderWidth: 1.2, pointRadius: 0, fill: true, tension: 0 }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            title: { display: true, text: 'Frecuencia', color: '#94a3b8' },
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.12)' }
          },
          x: {
            title: { display: true, text: 'Nivel de intensidad (0-255)', color: '#94a3b8' },
            ticks: { color: '#94a3b8', maxTicksLimit: 17 },
            grid: { display: false }
          }
        },
        plugins: { legend: { labels: { color: '#e2e8f0', boxWidth: 12 } } }
      }
    });
  }
}
