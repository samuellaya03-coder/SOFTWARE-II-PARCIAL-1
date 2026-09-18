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

/**
 * El motor estima bytes en cuanto la tasa supera el umbral, aunque el veredicto
 * no sea de deteccion. Anunciarlos como "ocultos" en una portadora ruidosa seria
 * afirmar lo que el propio veredicto niega.
 */
function payloadCaption(verdict) {
  if (verdict.estimatedPayloadBytes === null) return 'sin estimacion de tamano';

  const bytes = numberFormat.format(verdict.estimatedPayloadBytes);
  return verdict.detected
    ? `~${bytes} bytes ocultos`
    : `~${bytes} bytes si la tasa fuera real`;
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

      <div class="card" style="display:flex; flex-direction:column; gap:0.85rem;">
        <div class="estimator-head">
          <h3 class="estimator-title">Archivo bajo inspeccion</h3>
          <span class="badge badge-emerald">PNG sin perdida</span>
        </div>
        <dl id="file-meta" class="meta-grid"></dl>
      </div>

      <div class="grid-3" style="gap:1.25rem;">
        <div class="card" style="display:flex; flex-direction:column; gap:0.7rem;">
          <div class="estimator-head">
            <div>
              <h3 class="estimator-title">1. χ² progresivo</h3>
              <span class="estimator-note">Pares de valores (Westfeld)</span>
            </div>
            <span id="chi-status-badge" class="badge badge-cyan"></span>
          </div>
          <p class="estimator-note">
            Unico metodo que localiza el borde de una inyeccion secuencial. Se autocalibra
            contra la cola del flujo y se declara inconcluyente si el histograma es liso.
          </p>
          <div id="chi-metrics" class="metric-list"></div>
        </div>

        <div class="card" style="display:flex; flex-direction:column; gap:0.7rem;">
          <div class="estimator-head">
            <div>
              <h3 class="estimator-title">2. RS Analysis</h3>
              <span class="estimator-note">Grupos regulares y singulares (Fridrich)</span>
            </div>
            <span id="rs-rate-badge" class="badge badge-purple"></span>
          </div>
          <p class="estimator-note">
            Extrapola la tasa desde dos mediciones: la imagen recibida y la misma con todos
            los LSB volteados. No usa el histograma, asi que ve lo que el χ² no ve.
          </p>
          <div id="rs-metrics" class="metric-list"></div>
        </div>

        <div class="card" style="display:flex; flex-direction:column; gap:0.7rem;">
          <div class="estimator-head">
            <div>
              <h3 class="estimator-title">3. Sample Pair Analysis</h3>
              <span class="estimator-note">Pares de muestras adyacentes (Dumitrescu)</span>
            </div>
            <span id="spa-rate-badge" class="badge badge-emerald"></span>
          </div>
          <p class="estimator-note">
            Mide directamente sobre la imagen recibida, sin extrapolar: por eso es mas
            preciso que RS a tasas bajas. Su acuerdo con RS es la prueba cruzada.
          </p>
          <div id="spa-metrics" class="metric-list"></div>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:1.05rem; margin-bottom:0.35rem;">Curva χ²/df sobre prefijos crecientes</h3>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:1rem;">
          Bajo inyeccion LSB cada par de valores aporta un χ²(1), asi que χ²/df ≈ 1. Donde la
          curva se dispara empieza la region natural de la imagen: ese punto de ruptura es el
          borde del payload. Escala logaritmica.
        </p>
        <div class="chart-box"><canvas id="chi-curve-chart"></canvas></div>
      </div>

      <div class="card">
        <h3 style="font-size:1.05rem; margin-bottom:0.35rem;">Histogramas de frecuencia RGB</h3>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:1rem;">
          La estructura de peine del histograma (picos y huecos alternados) es lo que hace
          explotable el ataque χ². Un histograma liso lo vuelve inaplicable.
        </p>
        <div class="chart-box"><canvas id="rgb-histogram-chart"></canvas></div>
      </div>

      <div class="card">
        <h3 style="font-size:1.05rem; margin-bottom:0.35rem;">Entropia de Shannon de los planos LSB <span class="badge badge-amber" style="margin-left:0.4rem;">fuera del veredicto</span></h3>
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
  const fileMeta = container.querySelector('#file-meta');
  const chiMetrics = container.querySelector('#chi-metrics');
  const chiStatusBadge = container.querySelector('#chi-status-badge');
  const rsMetrics = container.querySelector('#rs-metrics');
  const rsRateBadge = container.querySelector('#rs-rate-badge');
  const spaMetrics = container.querySelector('#spa-metrics');
  const spaRateBadge = container.querySelector('#spa-rate-badge');
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
      renderFileMeta(report);
      renderChiMetrics(report);
      renderRsMetrics(report);
      renderSpaMetrics(report);
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

    const { noiseFloor, detectionRate } = verdict.thresholds;
    const rate = verdict.estimatedRate ?? 0;

    verdictCard.innerHTML = `
      <div class="verdict-banner">
        <div class="verdict-head">
          <div style="display:flex; align-items:center; gap:0.85rem;">
            <div class="verdict-icon">${look.icon}</div>
            <div>
              <h3 style="font-size:1.3rem; color:${look.accent}; margin-bottom:0.15rem;">${look.title}</h3>
              <p style="color:var(--text-secondary); font-size:0.85rem;">${look.subtitle}</p>
            </div>
          </div>
          <span class="badge ${look.badge}" style="display:inline-flex; gap:0.45rem;">
            ${verdict.detected ? `<span class="pulse-dot" style="color:${look.accent};"><span></span><span></span></span>` : ''}
            ${verdict.status}
          </span>
        </div>

        <div>
          <div class="verdict-score">
            <div style="display:flex; align-items:baseline; gap:0.6rem;">
              <span class="verdict-rate" style="color:${look.accent};">${formatPercent(verdict.estimatedRate)}</span>
              <span style="font-size:0.82rem; color:var(--text-secondary);">de las muestras RGB</span>
            </div>
            <span class="font-mono" style="font-size:0.8rem; color:var(--text-muted);">
              ${payloadCaption(verdict)}
            </span>
          </div>

          <div class="threat-meter" style="margin-top:0.6rem;">
            <div class="threat-meter__fill" style="width:${Math.min(100, rate * 100).toFixed(2)}%;"></div>
            <div class="threat-meter__tick" style="left:${(noiseFloor * 100).toFixed(2)}%;"></div>
            <div class="threat-meter__tick" style="left:${(detectionRate * 100).toFixed(2)}%;"></div>
          </div>
          <div class="threat-scale">
            <span>0%</span>
            <span>suelo de ruido ${formatPercent(noiseFloor, 0)}</span>
            <span>deteccion ${formatPercent(detectionRate, 0)}</span>
            <span>100%</span>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.86rem;">
          ${payloadRow}
          ${localizationRow}
          <div style="display:flex; justify-content:space-between; gap:1rem;">
            <span style="color:var(--text-muted);">Capacidad LSB de la portadora</span>
            <span class="font-mono">${numberFormat.format(dimensions.maxPayloadCapacityBytes)} bytes
              <span style="color:var(--text-muted); font-size:0.75rem;">(${dimensions.width}×${dimensions.height})</span>
            </span>
          </div>
        </div>

        <div style="padding-top:1rem; border-top:1px solid var(--border-color);">
          <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.05em;">
            Razonamiento
          </div>
          <ul style="display:flex; flex-direction:column; gap:0.45rem; font-size:0.83rem; color:var(--text-secondary); padding-left:1.1rem;">
            ${verdict.findings.map((finding) => `<li>${finding}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  /** Metadatos del fichero y de la portadora, en la rejilla de dos columnas. */
  function renderFileMeta(report) {
    const { dimensions } = report;
    const file = currentAnalysisBlob;
    const sizeKb = file ? (file.size / 1024).toFixed(1) : null;

    const entries = [
      ['Archivo', file?.name ?? 'imagen recibida de la pestana 1'],
      ['Dimensiones', `${dimensions.width} × ${dimensions.height} px`],
      ['Tamano en disco', sizeKb === null ? 'n/d' : `${numberFormat.format(sizeKb)} KB`],
      ['Muestras RGB', numberFormat.format(dimensions.totalSamples)],
      ['Capacidad LSB', `${numberFormat.format(dimensions.maxPayloadCapacityBytes)} bytes`],
      ['Tiempo de analisis', `${report.elapsedMs} ms en worker`]
    ];

    fileMeta.innerHTML = entries
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join('');
  }

  function renderRsMetrics(report) {
    const rs = report.estimators.rsAnalysis;
    const red = rs.perChannel.red;

    rsRateBadge.textContent = formatPercent(rs.estimatedRate);

    const rows = [
      metricRow('Tasa estimada (RGB)', formatRate(rs.estimatedRate), 'var(--accent-purple)'),
      metricRow('Canales utilizables', `${rs.channelsUsed} de 3`),
      metricRow(
        'Dispersion entre canales',
        formatRate(rs.channelSpread),
        'var(--text-primary)',
        'El motor LSB reparte el payload entre R, G y B: tres mediciones casi independientes de la misma tasa.'
      )
    ];

    // El diagrama RS es la evidencia cruda del metodo: sin inyeccion R_m > R_-m.
    if (red.applicable && red.diagram) {
      rows.push(
        `<div style="border-top:1px solid var(--border-color); margin:0.25rem 0;"></div>`,
        `<div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Diagrama RS del canal rojo</div>`,
        metricRow('R_m / R_−m', `${red.diagram.regularMask.toFixed(4)} / ${red.diagram.regularNegatedMask.toFixed(4)}`, '#fca5a5'),
        metricRow('S_m / S_−m', `${red.diagram.singularMask.toFixed(4)} / ${red.diagram.singularNegatedMask.toFixed(4)}`, 'var(--accent-amber)'),
        metricRow('Grupos analizados', numberFormat.format(red.groupsAnalyzed))
      );
    }

    if (red.applicable && red.unstable) {
      rows.push(`
        <div class="alert-box alert-warning" style="font-size:0.78rem; margin-top:0.5rem;">
          La cuadratica pierde condicionamiento cerca de la saturacion: la extrapolacion
          de este canal se ha descartado del promedio.
        </div>
      `);
    }

    if (!red.applicable) {
      rows.push(`<div class="alert-box alert-warning" style="font-size:0.78rem;">${red.reason}</div>`);
    }

    rsMetrics.innerHTML = rows.join('');
  }

  function renderSpaMetrics(report) {
    const spa = report.estimators.samplePairAnalysis;
    const red = spa.perChannel.red;
    const { evidence, thresholds } = report.verdict;

    spaRateBadge.textContent = formatPercent(spa.estimatedRate);

    const coherenceColor = evidence.coherent ? 'var(--accent-emerald)' : 'var(--accent-amber)';

    const rows = [
      metricRow('Tasa estimada (RGB)', formatRate(spa.estimatedRate), 'var(--accent-emerald)'),
      metricRow('Canales utilizables', `${spa.channelsUsed} de 3`),
      metricRow('Dispersion entre canales', formatRate(spa.channelSpread))
    ];

    if (red.applicable) {
      rows.push(
        metricRow('Pares analizados (rojo)', numberFormat.format(red.pairsAnalyzed)),
        metricRow(
          'Cuadratica a·x² + b·x + c',
          `${red.quadratic.a.toFixed(1)} / ${red.quadratic.b.toFixed(1)} / ${red.quadratic.c.toFixed(1)}`,
          'var(--text-muted)',
          'La raiz menor de esta cuadratica es la tasa estimada, medida sin extrapolar.'
        )
      );
    } else {
      rows.push(`<div class="alert-box alert-warning" style="font-size:0.78rem;">${red.reason}</div>`);
    }

    // La concordancia entre dos metodos sin supuestos compartidos es lo que
    // convierte la sospecha en evidencia: va aqui, no en una tarjeta aparte.
    rows.push(
      `<div style="border-top:1px solid var(--border-color); margin:0.25rem 0;"></div>`,
      metricRow(
        'Discordancia |RS − SPA|',
        formatRate(evidence.disagreement),
        coherenceColor,
        `Coherente si ≤ ${thresholds.maxDisagreement}. Con inyeccion real ambos coinciden; el ruido extremo los descuadra.`
      )
    );

    spaMetrics.innerHTML = rows.join('');
  }

  function renderChiMetrics(report) {
    const chi = report.estimators.chiSquareProgressive;

    chiStatusBadge.className = `badge ${chi.conclusive
      ? (chi.sequentialEmbeddingDetected ? 'badge-rose' : 'badge-emerald')
      : 'badge-amber'}`;
    chiStatusBadge.textContent = chi.status;

    const rows = [
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
