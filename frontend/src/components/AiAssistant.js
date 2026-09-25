import { ApiService } from '../services/api.js';
import { containsProfanity } from '../utils/profanityFilter.js';

export class AiAssistant {
  constructor() {
    this.activeTab = 'stego';
    this.isOpen = false;
    // Purgar cualquier clave que haya quedado en localStorage para máxima seguridad
    try {
      localStorage.removeItem('cybertutor_gemini_api_key');
    } catch (e) {}
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
        stego: '<span class="micon" aria-hidden="true" style="vertical-align: -0.15em; margin-right: 0.25rem;">image</span> Módulo 1: Esteganografía LSB',
        crypto: '<span class="micon" aria-hidden="true" style="vertical-align: -0.15em; margin-right: 0.25rem;">key</span> Módulo 2: Criptografía Híbrida',
        analysis: '<span class="micon" aria-hidden="true" style="vertical-align: -0.15em; margin-right: 0.25rem;">bar_chart</span> Módulo 3: Estegoanálisis Forense',
        attack: '<span class="micon" aria-hidden="true" style="vertical-align: -0.15em; margin-right: 0.25rem;">broken_image</span> Módulo 4: Ataques a Imágenes'
      };
      chip.innerHTML = names[tabName] || '<span class="micon" aria-hidden="true" style="vertical-align: -0.15em; margin-right: 0.25rem;">shield</span> Laboratorio General';
    }
  }

  init() {
    const root = document.createElement('div');
    root.id = 'cybertutor-widget-root';
    root.innerHTML = `
      <!-- Botón Flotante Launcher -->
      <button id="cybertutor-launcher-btn" class="cybertutor-launcher" type="button" title="Abrir Asistente CyberTutor IA">
        <div class="cybertutor-launcher-pulse"></div>
        <div class="cybertutor-launcher-icon"><span class="micon" aria-hidden="true">smart_toy</span> </div>
        <span class="cybertutor-launcher-text">CyberTutor IA</span>
      </button>

      <!-- Panel Flotante de Chat -->
      <div id="cybertutor-drawer" class="cybertutor-drawer">
        <!-- Header -->
        <div class="cybertutor-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="cybertutor-avatar"><span class="micon" aria-hidden="true">smart_toy</span> </div>
            <div>
              <div style="font-weight: 700; font-size: 1rem; color: #ffffff; display: flex; align-items: center; gap: 0.5rem;">
                CyberTutor IA
                <span class="badge badge-cyan" style="font-size: 0.6875rem; padding: 0.1rem 0.4rem;">ONLINE</span>
              </div>
              <div id="cybertutor-context-chip" style="font-size: 0.75rem; color: var(--accent-cyan); font-family: var(--font-mono); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.15rem;">
                <span class="micon" aria-hidden="true" style="vertical-align: -0.15em;">image</span> Módulo 1: Esteganografía LSB
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="cybertutor-close-btn" class="cybertutor-icon-btn" title="Cerrar Asistente">
              <span class="micon" aria-hidden="true">close</span> 
            </button>
          </div>
        </div>

        <!-- Sugerencias de Preguntas Rápidas -->
        <div class="cybertutor-pills-bar">
          <div style="font-size: 0.6875rem; color: var(--text-muted); font-weight: 600; margin-bottom: 0.25rem;"><span class="micon" aria-hidden="true">lightbulb</span>  PREGUNTAS SUGERIDAS:</div>
          <div id="cybertutor-pills-container" class="cybertutor-pills"></div>
        </div>

        <!-- Contenedor de Mensajes -->
        <div id="cybertutor-messages" class="cybertutor-messages"></div>

        <!-- Banner de advertencia de lenguaje inapropiado -->
        <div id="cybertutor-warning" class="cybertutor-warning-banner" style="display: none;"></div>

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
            <span class="micon" aria-hidden="true">send</span> 
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(root);

    // Eventos
    const launcherBtn = document.getElementById('cybertutor-launcher-btn');
    const closeBtn = document.getElementById('cybertutor-close-btn');
    const form = document.getElementById('cybertutor-form');
    const input = document.getElementById('cybertutor-input');
    const sendBtn = document.getElementById('cybertutor-send-btn');
    const warningEl = document.getElementById('cybertutor-warning');

    launcherBtn.addEventListener('click', () => this.toggleOpen());
    closeBtn.addEventListener('click', () => this.setOpen(false));

    // Validador de moderación en vivo
    const checkProfanity = (val) => {
      const isBad = containsProfanity(val);
      if (isBad) {
        warningEl.innerHTML = '<span class="micon" aria-hidden="true">warning</span>  <strong>Lenguaje no permitido:</strong> Por favor formula tu consulta de forma respetuosa para continuar.';
        warningEl.style.display = 'flex';
        form.classList.add('has-profanity');
        sendBtn.disabled = true;
        sendBtn.title = 'Bloqueado: no se permite lenguaje ofensivo';
      } else {
        warningEl.style.display = 'none';
        form.classList.remove('has-profanity');
        sendBtn.disabled = false;
        sendBtn.title = 'Enviar Mensaje';
      }
      return isBad;
    };

    // Bloqueo en tiempo real al escribir o pegar texto
    input.addEventListener('input', () => {
      checkProfanity(input.value);
    });

    // Bloqueo explícito al presionar la tecla Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (checkProfanity(input.value)) {
          e.preventDefault();
          e.stopPropagation();
          // Sacudida visual de advertencia
          warningEl.style.animation = 'none';
          void warningEl.offsetWidth;
          warningEl.style.animation = 'cybertutor-shake 0.3s ease-in-out';
        }
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      
      // Validación previa al envío
      if (checkProfanity(text)) {
        warningEl.style.animation = 'none';
        void warningEl.offsetWidth;
        warningEl.style.animation = 'cybertutor-shake 0.3s ease-in-out';
        return;
      }

      input.value = '';
      checkProfanity('');
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
        <div class="cybertutor-dots">
          <span></span><span></span><span></span>
        </div>
        <span class="cybertutor-typing-status" id="cybertutor-status-text">CyberTutor IA está analizando tu consulta...</span>
      </div>
    `;
    container.appendChild(typingIndicator);
    this.scrollToBottom();

    // Actualizar mensaje de progreso si toma más de 5 segundos
    const statusTimer = setTimeout(() => {
      const statusEl = document.getElementById('cybertutor-status-text');
      if (statusEl) {
        statusEl.textContent = 'Consultando los modelos de seguridad y redactando la respuesta...';
      }
    }, 5000);

    const statusTimer2 = setTimeout(() => {
      const statusEl = document.getElementById('cybertutor-status-text');
      if (statusEl) {
        statusEl.textContent = 'Sintetizando explicación técnica detallada...';
      }
    }, 12000);

    const sendBtn = document.getElementById('cybertutor-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const result = await ApiService.askAi(text, this.activeTab);
      
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
      clearTimeout(statusTimer);
      clearTimeout(statusTimer2);
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
    safe = safe.replace(/^### (.*$)/gim, '<h4 style="color:var(--accent-cyan); font-size: 1rem; margin: 0.4rem 0 0.3rem;">$1</h4>');
    safe = safe.replace(/^## (.*$)/gim, '<h3 style="color:#ffffff; font-size: 1rem; margin: 0.4rem 0 0.3rem;">$1</h3>');

    // Negrita **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Cursiva *text*
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Código en línea `code`
    safe = safe.replace(/`(.*?)`/g, '<code style="background: var(--bg-inset-strong); padding: 0.15rem 0.35rem; border-radius: 4px; color: #67e8f9; font-family: var(--font-mono); font-size: 0.85em;">$1</code>');

    // Viñetas * item o - item
    safe = safe.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li style="margin-left: 1rem; margin-bottom: 0.25rem;">$1</li>');

    // Bloques de listas <li>
    safe = safe.replace(/(<li.*<\/li>)/gms, '<ul style="margin: 0.4rem 0; padding-left: 0.2rem;">$1</ul>');

    // Saltos de línea
    safe = safe.replace(/\n\n/g, '<div style="height: 0.5rem;"></div>');
    safe = safe.replace(/\n/g, '<br/>');

    return safe;
  }
}
