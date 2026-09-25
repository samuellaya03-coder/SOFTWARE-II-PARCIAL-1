import './style.css';
import { ApiService } from './services/api.js';
import { renderStegoTab } from './components/StegoTab.js';
import { renderCryptoTab } from './components/CryptoTab.js';
import { renderAnalysisTab } from './components/AnalysisTab.js';
import { renderImageAttackTab } from './components/ImageAttackTab.js';
import { AiAssistant } from './components/AiAssistant.js';
import { ThemeManager } from './utils/themeManager.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar Gestor de Temas (Modo Claro / Modo Oscuro)
  ThemeManager.init();

  const tabStegoBtn = document.getElementById('tab-stego-btn');
  const tabCryptoBtn = document.getElementById('tab-crypto-btn');
  const tabAnalysisBtn = document.getElementById('tab-analysis-btn');
  const tabAttackBtn = document.getElementById('tab-attack-btn');
  const tabContent = document.getElementById('tab-content');
  const backendStatusBadge = document.getElementById('backend-status-badge');

  // Inicializar Asistente Inteligente CyberTutor IA
  const aiAssistant = new AiAssistant();

  let currentTab = 'stego';
  let pendingAnalysisBlob = null;
  let pendingAttackData = null;

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

  // Contenedores DOM persistentes para que no se pierda el progreso al cambiar de pestaña
  const tabPanels = {
    stego: document.createElement('div'),
    crypto: document.createElement('div'),
    analysis: document.createElement('div'),
    attack: document.createElement('div')
  };

  const isRendered = {
    stego: false,
    crypto: false,
    analysis: false,
    attack: false
  };

  tabContent.innerHTML = '';
  Object.entries(tabPanels).forEach(([name, panel]) => {
    panel.id = `panel-${name}`;
    panel.className = 'tab-module-panel';
    panel.style.display = 'none';
    tabContent.appendChild(panel);
  });

  function renderModule(tabName, extraData = null) {
    const panel = tabPanels[tabName];
    if (!panel) return;

    if (tabName === 'stego') {
      renderStegoTab(
        panel,
        (data) => {
          pendingAnalysisBlob = data;
          switchTab('analysis', data);
        },
        (attackData) => {
          pendingAttackData = attackData;
          switchTab('attack', attackData);
        }
      );
    } else if (tabName === 'crypto') {
      renderCryptoTab(panel);
    } else if (tabName === 'analysis') {
      const dataToAnalyze = extraData || pendingAnalysisBlob;
      pendingAnalysisBlob = null;
      renderAnalysisTab(panel, dataToAnalyze);
    } else if (tabName === 'attack') {
      const dataToAttack = extraData || pendingAttackData;
      pendingAttackData = null;
      renderImageAttackTab(panel, dataToAttack);
    }
    isRendered[tabName] = true;
  }

  function switchTab(tabName, extraData = null) {
    currentTab = tabName;

    tabStegoBtn.classList.toggle('active', tabName === 'stego');
    tabCryptoBtn.classList.toggle('active', tabName === 'crypto');
    tabAnalysisBtn.classList.toggle('active', tabName === 'analysis');
    if (tabAttackBtn) tabAttackBtn.classList.toggle('active', tabName === 'attack');

    // Actualizar indicador en la barra superior (Breadcrumb)
    const breadcrumbEl = document.getElementById('active-module-breadcrumb');
    const moduleBreadcrumbTitles = {
      stego: 'MÓDULO 1: ESTEGANOGRAFÍA LSB (CANVAS 32-BIT)',
      crypto: 'MÓDULO 2: CRIPTOGRAFÍA HÍBRIDA & RESISTENCIA',
      analysis: 'MÓDULO 3: ESTEGOANÁLISIS FORENSE PERICIAL',
      attack: 'MÓDULO 4: LABORATORIO DE ATAQUES ADVERSARIOS'
    };
    if (breadcrumbEl) {
      breadcrumbEl.textContent = moduleBreadcrumbTitles[tabName] || tabName.toUpperCase();
    }

    // Cerrar sidebar en pantallas móviles al seleccionar módulo
    const sidebar = document.getElementById('cyber-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    // Notificar al asistente el cambio de módulo para actualizar sugerencias contextuales
    aiAssistant.setActiveTab(tabName);

    // Ocultar todos los paneles y mostrar únicamente el seleccionado (preserva inputs y estados)
    Object.entries(tabPanels).forEach(([name, panel]) => {
      panel.style.display = (name === tabName) ? 'block' : 'none';
    });

    // Renderizar solo la primera vez o si se reciben datos entre módulos
    if (!isRendered[tabName] || extraData) {
      renderModule(tabName, extraData);
    }
  }

  function showGlobalToast(type, title, message, duration = 3500) {
    let container = document.getElementById('global-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `crypto-toast crypto-toast-${type}`;
    const icon = type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : type === 'danger' ? 'error' : 'info';
    toast.innerHTML = `
      <div class="crypto-toast-icon"><span class="micon">${icon}</span></div>
      <div class="crypto-toast-content">
        <div class="crypto-toast-title">${title}</div>
        <div class="crypto-toast-body">${message}</div>
      </div>
      <div class="crypto-toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function resetModule(tabName) {
    const panel = tabPanels[tabName];
    if (!panel) return;
    panel.innerHTML = '';
    isRendered[tabName] = false;
    renderModule(tabName);

    const moduleNames = {
      stego: 'Módulo 1 (Esteganografía LSB)',
      crypto: 'Módulo 2 (Criptografía Híbrida)',
      analysis: 'Módulo 3 (Estegoanálisis Forense)',
      attack: 'Módulo 4 (Ataques a Imágenes)'
    };
    showGlobalToast('warning', 'Módulo Reiniciado', `${moduleNames[tabName] || 'El módulo'} ha vuelto a su estado inicial para probar otra vez.`, 3500);
  }

  // Escuchar solicitudes de reinicio emitidas desde los botones "Reiniciar / Probar otra vez"
  window.addEventListener('cyberlab-reset-module', (e) => {
    const targetModule = e.detail?.module || currentTab;
    resetModule(targetModule);
  });

  tabStegoBtn.addEventListener('click', () => switchTab('stego'));
  tabCryptoBtn.addEventListener('click', () => switchTab('crypto'));
  tabAnalysisBtn.addEventListener('click', () => switchTab('analysis'));
  if (tabAttackBtn) tabAttackBtn.addEventListener('click', () => switchTab('attack'));

  // Mobile drawer toggle & overlay
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebar = document.getElementById('cyber-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    });
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // Quick launch CyberTutor IA desde el sidebar
  const quickAiBtn = document.getElementById('btn-quick-ai-launch');
  if (quickAiBtn) {
    quickAiBtn.addEventListener('click', () => {
      const launcher = document.getElementById('cybertutor-launcher-btn');
      if (launcher) launcher.click();
    });
  }

  // Inicializar en la pestaña de Esteganografía
  switchTab('stego');
});
