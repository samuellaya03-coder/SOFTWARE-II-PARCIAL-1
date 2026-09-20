import { ApiService } from '../services/api.js';

export class AiAssistant {
  constructor() {
    this.activeTab = 'stego';
    this.isOpen = false;
    this.isSettingsOpen = false;
    this.apiKey = localStorage.getItem('cybertutor_gemini_api_key') || '';
    this.messages = [
      {
        sender: 'ai',
        text: `👋 ¡Hola! Soy **CyberTutor IA**, tu asistente y profesor de ciberseguridad integrado en el laboratorio.

Puedo explicarte cómo funciona cualquier algoritmo, por qué fallan los ataques en tiempo real o resolver dudas teóricas y matemáticas sobre **AES-256-GCM**, **RSA-4096**, **Esteganografía LSB** y **Estegoanálisis Chi-cuadrado**.

💡 *Puedes escribir tu pregunta abajo o hacer clic en cualquiera de las preguntas rápidas recomendadas.*`,
        model: 'CyberTutor'
      }
    ];

    this.promptSuggestions = {
      stego: [
        '¿Cómo funciona la cabecera de 32 bits?',
        '¿Por qué se preserva el canal Alfa (A)?',
        '¿Cómo se calcula la capacidad máxima en LSB?'
      ],
      crypto: [
        '¿Cómo funciona el cifrado híbrido RSA + AES?',
        '¿Qué función cumple el AuthTag en AES-GCM?',
        '¿Para qué sirven el Salt y el IV?'
      ],
      analysis: [
        '¿Qué detecta la prueba Chi-cuadrado?',
        '¿Qué significa la Entropía de Shannon?',
        '¿Qué son los Pares de Valores (PoVs)?'
      ],
      attack: [
        '¿Por qué la imagen atacada genera lluvia visual?',
        '¿Qué es un plano de bits (0 a 7)?',
        '¿Por qué el plano LSB parece ruido puro?'
      ]
    };

    this.init();
  }

  setActiveTab(tabName) {
    this.activeTab = tabName;
    this.renderPills();
    const chip = document.getElementById('cybertutor-context-chip');
    if (chip) {
      const names = {
        stego: '🖼️ Módulo 1: Esteganografía LSB',
        crypto: '🔐 Módulo 2: Criptografía Híbrida',
        analysis: '📊 Módulo 3: Estegoanálisis Forense',
        attack: '💥 Módulo 4: Ataques a Imágenes'
      };
      chip.textContent = names[tabName] || '🛡️ Laboratorio General';
    }
  }

  init() {
    const root = document.createElement('div');
    root.id = 'cybertutor-widget-root';
    root.innerHTML = `
      <!-- Botón Flotante Launcher -->
      <button id="cybertutor-launcher-btn" class="cybertutor-launcher" type="button" title="Abrir Asistente CyberTutor IA">
        <div class="cybertutor-launcher-pulse"></div>
        <div class="cybertutor-launcher-icon">🤖</div>
        <span class="cybertutor-launcher-text">CyberTutor IA</span>
      </button>

      <!-- Panel Flotante de Chat -->
      <div id="cybertutor-drawer" class="cybertutor-drawer">
        <!-- Header -->
        <div class="cybertutor-header">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="cybertutor-avatar">🤖</div>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 0.4rem;">
                CyberTutor IA
                <span class="badge badge-cyan" style="font-size: 0.62rem; padding: 0.1rem 0.4rem;">ONLINE</span>
              </div>
              <div id="cybertutor-context-chip" style="font-size: 0.72rem; color: var(--accent-cyan); font-family: var(--font-mono);">
                🖼️ Módulo 1: Esteganografía LSB
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <button id="cybertutor-settings-btn" class="cybertutor-icon-btn" title="Configurar Gemini API Key (Opcional)">
              ⚙️
            </button>
            <button id="cybertutor-close-btn" class="cybertutor-icon-btn" title="Cerrar Asistente">
              ✕
            </button>
          </div>
        </div>

        <!-- Panel de Configuración de API Key (Opcional) -->
        <div id="cybertutor-settings-panel" class="cybertutor-settings" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span style="font-size: 0.8rem; font-weight: 600; color: #ffffff;">🔑 Gemini API Key (Opcional):</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">Gratis en Google AI Studio</span>
          </div>
          <p style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.5rem; line-height: 1.35;">
            Si no ingresas una clave, el asistente responderá usando el motor pedagógico local sin necesidad de internet.
          </p>
          <div style="display: flex; gap: 0.4rem;">
            <input type="password" id="cybertutor-api-key-input" placeholder="AIzaSy..." value="${this.apiKey}" style="font-size: 0.75rem; padding: 0.35rem 0.5rem; flex: 1;" />
            <button id="cybertutor-save-key-btn" class="btn btn-primary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
              Guardar
            </button>
          </div>
        </div>

        <!-- Sugerencias de Preguntas Rápidas -->
        <div class="cybertutor-pills-bar">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; margin-bottom: 0.3rem;">💡 PREGUNTAS SUGERIDAS:</div>
          <div id="cybertutor-pills-container" class="cybertutor-pills"></div>
        </div>

        <!-- Contenedor de Mensajes -->
        <div id="cybertutor-messages" class="cybertutor-messages"></div>

        <!-- Input Bar -->
        <form id="cybertutor-form" class="cybertutor-input-area">
          <input 
            type="text" 
            id="cybertutor-input" 
            placeholder="Escribe una pregunta sobre el laboratorio..." 
            autocomplete="off" 
            required 
          />
          <button type="submit" id="cybertutor-send-btn" class="cybertutor-send-btn" title="Enviar Mensaje">
            ➤
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(root);

    // Eventos
    const launcherBtn = document.getElementById('cybertutor-launcher-btn');
    const closeBtn = document.getElementById('cybertutor-close-btn');
    const settingsBtn = document.getElementById('cybertutor-settings-btn');
    const saveKeyBtn = document.getElementById('cybertutor-save-key-btn');
    const apiKeyInput = document.getElementById('cybertutor-api-key-input');
    const form = document.getElementById('cybertutor-form');

    launcherBtn.addEventListener('click', () => this.toggleOpen());
    closeBtn.addEventListener('click', () => this.setOpen(false));

    settingsBtn.addEventListener('click', () => {
      this.isSettingsOpen = !this.isSettingsOpen;
      const panel = document.getElementById('cybertutor-settings-panel');
      panel.style.display = this.isSettingsOpen ? 'block' : 'none';
    });

    saveKeyBtn.addEventListener('click', () => {
      this.apiKey = apiKeyInput.value.trim();
      localStorage.setItem('cybertutor_gemini_api_key', this.apiKey);
      alert(this.apiKey ? '✅ Gemini API Key guardada correctamente.' : 'ℹ️ Clave eliminada. Se usará el motor local.');
      document.getElementById('cybertutor-settings-panel').style.display = 'none';
      this.isSettingsOpen = false;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('cybertutor-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.handleUserMessage(text);
    });

    this.renderMessages();
    this.renderPills();
  }

  toggleOpen() {
    this.setOpen(!this.isOpen);
  }

  setOpen(open) {
    this.isOpen = open;
    const drawer = document.getElementById('cybertutor-drawer');
    const launcher = document.getElementById('cybertutor-launcher-btn');
    if (drawer) {
      drawer.classList.toggle('open', open);
    }
    if (launcher) {
      launcher.classList.toggle('active', open);
    }
    if (open) {
      setTimeout(() => {
        const input = document.getElementById('cybertutor-input');
        if (input) input.focus();
        this.scrollToBottom();
      }, 150);
    }
  }

  renderPills() {
    const container = document.getElementById('cybertutor-pills-container');
    if (!container) return;
    container.innerHTML = '';
    const suggestions = this.promptSuggestions[this.activeTab] || this.promptSuggestions.stego;

    suggestions.forEach(pillText => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cybertutor-pill';
      btn.textContent = pillText;
      btn.addEventListener('click', () => {
        this.handleUserMessage(pillText);
      });
      container.appendChild(btn);
    });
  }

  renderMessages() {
    const container = document.getElementById('cybertutor-messages');
    if (!container) return;
    container.innerHTML = '';

    this.messages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = `cybertutor-msg cybertutor-msg-${msg.sender}`;
      
      const formattedText = this.formatMarkdown(msg.text);

      let badgeHtml = '';
      if (msg.sender === 'ai' && msg.model) {
        badgeHtml = `<div class="cybertutor-msg-model">${msg.model}</div>`;
      }

      msgDiv.innerHTML = `
        <div class="cybertutor-msg-bubble">
          ${formattedText}
          ${badgeHtml}
        </div>
      `;
      container.appendChild(msgDiv);
    });

    this.scrollToBottom();
  }

  scrollToBottom() {
    const container = document.getElementById('cybertutor-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  async handleUserMessage(text) {
    // Agregar mensaje del usuario
    this.messages.push({ sender: 'user', text });
    this.renderMessages();

    // Agregar indicador de escritura
    const container = document.getElementById('cybertutor-messages');
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'cybertutor-typing';
    typingIndicator.className = 'cybertutor-msg cybertutor-msg-ai';
    typingIndicator.innerHTML = `
      <div class="cybertutor-msg-bubble cybertutor-typing-bubble">
        <span></span><span></span><span></span>
      </div>
    `;
    container.appendChild(typingIndicator);
    this.scrollToBottom();

    const sendBtn = document.getElementById('cybertutor-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const result = await ApiService.askAi(text, this.activeTab, this.apiKey || null);
      
      // Remover indicador
      const typingEl = document.getElementById('cybertutor-typing');
      if (typingEl) typingEl.remove();

      this.messages.push({
        sender: 'ai',
        text: result.answer,
        model: result.model || 'CyberTutor IA'
      });
      this.renderMessages();
    } catch (err) {
      const typingEl = document.getElementById('cybertutor-typing');
      if (typingEl) typingEl.remove();

      this.messages.push({
        sender: 'ai',
        text: `⚠️ Error al consultar el asistente: ${err.message}`,
        model: 'Error de Red'
      });
      this.renderMessages();
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  formatMarkdown(text) {
    if (!text) return '';
    
    // Escapar etiquetas HTML básicas para seguridad
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Encabezados ### Header
    safe = safe.replace(/^### (.*$)/gim, '<h4 style="color:var(--accent-cyan); font-size: 0.95rem; margin: 0.4rem 0 0.3rem;">$1</h4>');
    safe = safe.replace(/^## (.*$)/gim, '<h3 style="color:#ffffff; font-size: 1rem; margin: 0.4rem 0 0.3rem;">$1</h3>');

    // Negrita **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Cursiva *text*
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Código en línea `code`
    safe = safe.replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.4); padding: 0.15rem 0.35rem; border-radius: 4px; color: #67e8f9; font-family: var(--font-mono); font-size: 0.85em;">$1</code>');

    // Viñetas * item o - item
    safe = safe.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li style="margin-left: 1.2rem; margin-bottom: 0.25rem;">$1</li>');

    // Bloques de listas <li>
    safe = safe.replace(/(<li.*<\/li>)/gms, '<ul style="margin: 0.4rem 0; padding-left: 0.2rem;">$1</ul>');

    // Saltos de línea
    safe = safe.replace(/\n\n/g, '<div style="height: 0.5rem;"></div>');
    safe = safe.replace(/\n/g, '<br/>');

    return safe;
  }
}
