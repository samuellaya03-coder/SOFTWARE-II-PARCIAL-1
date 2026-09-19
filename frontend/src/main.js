import './style.css';
import { ApiService } from './services/api.js';
import { renderStegoTab } from './components/StegoTab.js';
import { renderCryptoTab } from './components/CryptoTab.js';
import { renderAnalysisTab } from './components/AnalysisTab.js';

document.addEventListener('DOMContentLoaded', async () => {
  const tabStegoBtn = document.getElementById('tab-stego-btn');
  const tabCryptoBtn = document.getElementById('tab-crypto-btn');
  const tabAnalysisBtn = document.getElementById('tab-analysis-btn');
  const tabContent = document.getElementById('tab-content');
  const backendStatusBadge = document.getElementById('backend-status-badge');

  let currentTab = 'stego';
  let pendingAnalysisBlob = null;

  // Verificar conexión con el backend
  async function checkBackendStatus() {
    try {
      const health = await ApiService.getHealth();
      backendStatusBadge.className = 'badge badge-emerald';
      backendStatusBadge.innerHTML = '● BACKEND ONLINE (AES-GCM / 600k PBKDF2)';
    } catch {
      backendStatusBadge.className = 'badge badge-rose';
      backendStatusBadge.innerHTML = '● BACKEND OFFLINE (Ejecuta: npm start en /backend)';
    }
  }

  checkBackendStatus();

  function switchTab(tabName, extraData = null) {
    currentTab = tabName;

    tabStegoBtn.classList.toggle('active', tabName === 'stego');
    tabCryptoBtn.classList.toggle('active', tabName === 'crypto');
    tabAnalysisBtn.classList.toggle('active', tabName === 'analysis');

    tabContent.innerHTML = '';

    if (tabName === 'stego') {
      renderStegoTab(tabContent, (data) => {
        pendingAnalysisBlob = data;
        switchTab('analysis', data);
      });
    } else if (tabName === 'crypto') {
      renderCryptoTab(tabContent);
    } else if (tabName === 'analysis') {
      const dataToAnalyze = extraData || pendingAnalysisBlob;
      pendingAnalysisBlob = null;
      renderAnalysisTab(tabContent, dataToAnalyze);
    }
  }

  tabStegoBtn.addEventListener('click', () => switchTab('stego'));
  tabCryptoBtn.addEventListener('click', () => switchTab('crypto'));
  tabAnalysisBtn.addEventListener('click', () => switchTab('analysis'));

  // Inicializar en la pestaña de Esteganografía
  switchTab('stego');
});
