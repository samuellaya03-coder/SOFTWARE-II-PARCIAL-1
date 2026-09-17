import './style.css';
import { ApiService } from './services/api.js';
import { renderStegoTab } from './components/StegoTab.js';
import { renderCryptoTab } from './components/CryptoTab.js';
import { renderAnalysisTab } from './components/AnalysisTab.js';

const TABS = {
  stego: { button: 'tab-stego-btn', render: renderStegoTab },
  crypto: { button: 'tab-crypto-btn', render: renderCryptoTab },
  analysis: { button: 'tab-analysis-btn', render: renderAnalysisTab }
};

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('tab-content');
  const statusBadge = document.getElementById('backend-status-badge');

  // Imagen que la pestana de esteganografia envia a la de analisis.
  let pendingAnalysisBlob = null;

  /**
   * El backend solo hace falta para la pestana del laboratorio criptografico y
   * para el estegoanalisis; la inyeccion LSB y su cifrado son locales. Aun asi se
   * informa del estado, porque sin backend dos de las tres pestanas quedan a medias.
   */
  async function refreshBackendStatus() {
    try {
      const health = await ApiService.getHealth();
      const workers = health.concurrency?.forensicsWorkers?.size;

      statusBadge.className = 'badge badge-emerald';
      statusBadge.textContent = workers
        ? `BACKEND ONLINE (${workers} workers forenses)`
        : 'BACKEND ONLINE';
    } catch {
      statusBadge.className = 'badge badge-rose';
      statusBadge.textContent = 'BACKEND OFFLINE (ejecuta npm start en /backend)';
    }
  }

  function switchTab(name, extraData = null) {
    for (const [key, tab] of Object.entries(TABS)) {
      document.getElementById(tab.button).classList.toggle('active', key === name);
    }

    content.innerHTML = '';

    if (name === 'stego') {
      renderStegoTab(content, (blob) => {
        pendingAnalysisBlob = blob;
        switchTab('analysis', blob);
      });
      return;
    }

    if (name === 'analysis') {
      const blob = extraData ?? pendingAnalysisBlob;
      pendingAnalysisBlob = null;
      renderAnalysisTab(content, blob);
      return;
    }

    TABS[name].render(content);
  }

  for (const [key, tab] of Object.entries(TABS)) {
    document.getElementById(tab.button).addEventListener('click', () => switchTab(key));
  }

  refreshBackendStatus();
  switchTab('stego');
});
