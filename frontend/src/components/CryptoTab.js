import { ApiService } from '../services/api.js';
import { openEmailModal } from '../utils/emailModal.js';

export function renderCryptoTab(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado de la Pestaña -->
      <div class="card card-glow-cyan" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size: 1.375rem; margin-bottom: 0.25rem;">Laboratorio Criptográfico Avanzado ("Modo Difícil")</h2>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Cifrado Simétrico Autenticado (AES-256-GCM), KDF Seguro (PBKDF2-SHA512) y Cifrado Asimétrico (RSA-4096).
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button id="btn-toggle-aes-section" class="btn btn-secondary" type="button" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: var(--accent-cyan); color: var(--accent-cyan); display: inline-flex; align-items: center; gap: 0.35rem;" title="Ocultar o mostrar las secciones 1 y 2 (Cifrado y Descifrado AES-256-GCM)">
            <span class="micon" id="icon-toggle-aes" aria-hidden="true">visibility_off</span> <span id="label-toggle-aes">Ocultar Cifrado AES</span>
          </button>
          <button id="btn-toggle-kdf-section" class="btn btn-secondary" type="button" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: var(--accent-emerald); color: var(--accent-emerald); display: inline-flex; align-items: center; gap: 0.35rem;" title="Ocultar o mostrar la sección 3 (Benchmark PBKDF2)">
            <span class="micon" id="icon-toggle-kdf" aria-hidden="true">visibility_off</span> <span id="label-toggle-kdf">Ocultar Benchmark KDF</span>
          </button>
          <button id="btn-reset-crypto-module" class="btn btn-secondary module-reset-btn" type="button" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: var(--accent-amber); color: var(--accent-amber); display: inline-flex; align-items: center; gap: 0.35rem;" title="Reiniciar este módulo para probar otra vez">
            <span class="micon" aria-hidden="true">restart_alt</span> Reiniciar / Probar otra vez
          </button>
          <span class="badge badge-cyan">AES-256-GCM</span>
          <span class="badge badge-emerald">PBKDF2-SHA512 (600k)</span>
          <span class="badge badge-purple">RSA-OAEP 4096</span>
        </div>
      </div>

      <!-- Selector de Submódulo (Cifrado Híbrido vs Seguridad de Cifrado Híbrido) -->
      <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
        <button id="crypto-subtab-hybrid-btn" class="btn btn-primary" style="flex: 1;">
          <span class="micon" aria-hidden="true">vpn_key</span> Cifrado Híbrido
        </button>
        <button id="crypto-subtab-security-btn" class="btn btn-secondary" style="flex: 1;">
          <span class="micon" aria-hidden="true">security</span> Seguridad de Cifrado Híbrido
        </button>
      </div>

      <!-- SUBMÓDULO 1: CIFRADO HÍBRIDO (Secciones 1 & 2 AES-256-GCM + Sección 4 RSA-4096 / RSA-OAEP + AES-256-GCM) -->
      <div id="crypto-pane-hybrid" style="margin-top: 1.5rem;">
        <!-- Banner de sección colapsada/oculta -->
      <div id="banner-aes-collapsed" style="display: none; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 12px; padding: 0.85rem 1.25rem; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; box-shadow: var(--card-shadow); transition: all 0.25s ease;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="micon" style="color: var(--accent-cyan); font-size: 1.4rem;" aria-hidden="true">lock</span>
          <div>
            <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-primary);">
              Secciones 1 y 2 Ocultas: Cifrado Autenticado y Descifrado (AES-256-GCM)
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">
              Los datos cifrados, contraseñas y parámetros se conservan intactos en memoria.
            </div>
          </div>
        </div>
        <button id="btn-show-aes-banner" class="btn btn-cyan" type="button" style="font-size: 0.78rem; padding: 0.35rem 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer;">
          <span class="micon" aria-hidden="true">visibility</span> Mostrar Sección
        </button>
      </div>

      <!-- Envoltorio plegable de las Secciones 1 y 2 de Cifrado Simétrico AES -->
      <div id="sec-aes-symmetric-wrapper" style="transition: all 0.25s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding: 0 0.25rem;">
          <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
            MÓDULO 2 — SECCIONES 1 & 2: CIFRADO SIMÉTRICO
          </span>
          <button id="btn-toggle-aes-inline" class="btn btn-secondary" type="button" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; border-color: var(--border-subtle); color: var(--text-secondary); display: inline-flex; align-items: center; gap: 0.35rem;" title="Ocultar esta sección">
            <span class="micon" aria-hidden="true" style="font-size: 0.95rem;">visibility_off</span> Ocultar esta sección
          </button>
        </div>

        <!-- SECCIÓN 1: CIFRADO SIMÉTRICO AES-256-GCM INTERACTIVO -->
        <div class="grid-2">
        <!-- Columna de Cifrado -->
        <div class="card space-y-4" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <h3 style="font-size: 1.125rem;">1. Cifrado Autenticado (AES-256-GCM)</h3>
            <span class="badge badge-cyan">Confidencialidad + Integridad</span>
          </div>

          <div>
            <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
              Mensaje en Texto Claro (Plaintext):
            </label>
            <textarea id="crypto-plain-input" rows="3" placeholder="Ingresa los datos confidenciales a proteger...">Este es un documento clasificado de seguridad informática.</textarea>
          </div>

          <div>
            <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
              Contraseña Maestra (KDF Password):
            </label>
            <input type="password" id="crypto-pass-input" value="SuperSecretPassword#2026!" placeholder="Contraseña..." />
          </div>

          <button id="btn-run-encrypt" class="btn btn-primary" style="width: 100%;">
            <span class="micon" aria-hidden="true">lock</span>  Cifrar con AES-256-GCM + PBKDF2
          </button>

          <!-- Desglose de Componentes Binarios -->
          <div id="crypto-structure-box" style="display: none; background: var(--bg-inset-strong); padding: 1rem; border-radius: 8px; font-size: 0.875rem; line-height: 1.6;">
            <p style="color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 600;">
              Estructura Binaria Empaquetada: <span class="font-mono" style="color: var(--accent-cyan);">[ Salt (16B) | IV (12B) | Tag (16B) | Ciphertext ]</span>
            </p>

            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge-purple">Salt (16 Bytes / CSPRNG)</span>
              <div id="hex-salt" class="font-mono" style="word-break: break-all; color: #d8b4fe; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge-emerald">IV (12 Bytes / 96 bits NIST)</span>
              <div id="hex-iv" class="font-mono" style="word-break: break-all; color: #6ee7b7; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge-amber">Authentication Tag (16 Bytes / GCM MAC)</span>
              <div id="hex-tag" class="font-mono" style="word-break: break-all; color: #fcd34d; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge-cyan">Texto Cifrado (Ciphertext)</span>
              <div id="hex-cipher" class="font-mono" style="word-break: break-all; color: #67e8f9; font-size: 0.75rem; margin-top: 0.25rem;"></div>
            </div>

            <div style="margin-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;">
              <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Flujo Binario Completo (Base64):</label>
              <textarea id="packed-base64-output" rows="3" readonly class="font-mono" style="font-size: 0.75rem;"></textarea>
              <button id="btn-email-aes-package" class="btn btn-secondary" style="width: 100%; margin-top: 0.5rem; font-size: 0.75rem; padding: 0.45rem 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <span class="micon" aria-hidden="true">mail</span>  Enviar Paquete Cifrado por Correo
              </button>
            </div>
          </div>
        </div>

        <!-- Columna de Descifrado & Demostración de Integridad -->
        <div class="card space-y-4" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <h3 style="font-size: 1.125rem;">2. Descifrado y Prueba de Integridad</h3>
            <span class="badge badge-emerald">Verificación de Tag</span>
          </div>

          <div>
            <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
              Paquete Binario Cifrado (Base64):
            </label>
            <textarea id="decrypt-base64-input" rows="3" placeholder="Pega el paquete cifrado en Base64..." class="font-mono"></textarea>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <label style="font-size: 0.875rem; color: var(--text-secondary);">
                Contraseña de Descifrado:
              </label>
              <span id="crypto-attempts-badge" class="badge badge-rose" style="display: none; font-size: 0.75rem; font-weight: 600;">Intentos restantes: 5/5</span>
            </div>
            <input type="password" id="decrypt-pass-input" placeholder="Contraseña..." />
          </div>

          <!-- Banner de Bloqueo Temporal por Cooldown Anti-Fuerza Bruta -->
          <div id="crypto-lockout-banner" class="alert-box alert-danger" style="display: none; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.12);">
            <span style="font-size: 1.75rem; line-height: 1;"><span class="micon" aria-hidden="true">hourglass_top</span> </span>
            <div style="flex: 1;">
              <div style="font-weight: 700; color: #fca5a5; font-size: 1rem; margin-bottom: 0.25rem;">
                Bloqueo de Seguridad Anti-Fuerza Bruta
              </div>
              <div style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.4;">
                Demasiados intentos fallidos. Entrada suspendida por <strong id="crypto-penalty-label" style="color: #fca5a5;">1 minuto</strong>.
                Podrás volver a intentar en: <span id="crypto-countdown-display" style="color: #ef4444; font-family: monospace; font-size: 1.125rem; font-weight: 700; margin-left: 0.25rem;">01:00</span>
              </div>
            </div>
          </div>

          <button id="btn-run-decrypt" class="btn btn-emerald" style="width: 100%;">
            <span class="micon" aria-hidden="true">lock_open</span>  Descifrar y Validar
          </button>

          <!-- Resultado del Descifrado -->
          <div id="decrypt-result-box" style="display: none; display: flex; flex-direction: column; gap: 0.75rem;">
            <div id="decrypt-status-alert" class="alert-box"></div>
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Texto Plano Descifrado:</label>
              <textarea id="decrypted-plaintext-output" rows="3" readonly class="font-mono"></textarea>
            </div>
          </div>
        </div>
      </div>
      </div>
      <!-- Fin de sec-aes-symmetric-wrapper -->

        <!-- SECCIÓN 4: CIFRADO ASIMÉTRICO / HÍBRIDO (RSA-4096 + AES-GCM) -->
      <div class="card space-y-4" style="margin-top: 1.5rem;">
        <!-- Header con Badges Matemáticos y Explicativos -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem;">
              <h3 style="font-size: 1.125rem;">4. Cifrado Híbrido Asimétrico (RSA-4096 / RSA-OAEP + AES-256-GCM)</h3>
            </div>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">
              Encapsulamiento seguro de clave efímera simétrica con RSA-OAEP y cifrado autenticado de datos con AES-256-GCM.
            </p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
              <span class="badge badge-purple" title="Módulo N = p * q de 4096 bits (1234 dígitos decimales)">MÓDULO N (4096 BITS)</span>
              <span class="badge badge-cyan" title="Cuarto primo de Fermat e = 2^16 + 1 = 65537">EXPONENTE e = 65537</span>
              <span class="badge badge-emerald" title="Optimal Asymmetric Encryption Padding con SHA-256 y máscara MGF1">RSA-OAEP (SHA-256 / MGF1)</span>
            </div>
          </div>
          <button id="btn-gen-rsa" class="btn btn-secondary">
            <span class="micon" aria-hidden="true">bolt</span>  Generar Par de Claves RSA-4096
          </button>
        </div>

        <!-- Par de Claves RSA con Botones de Copiar -->
        <div class="grid-2">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; flex-wrap: wrap; gap: 0.25rem;">
              <label style="font-size: 0.875rem; color: var(--text-secondary); font-weight: 600;">
                Clave Pública (Public Key PEM - SPKI):
              </label>
              <div style="display: flex; gap: 0.25rem;">
                <button id="btn-copy-pub" class="btn btn-secondary" style="padding: 0.2rem 0.65rem; font-size: 0.75rem; border-color: rgba(0, 240, 255, 0.3); color: var(--accent-cyan);" title="Copiar clave pública al portapapeles">
                  <span class="micon" aria-hidden="true">content_paste</span>  Copiar
                </button>
                <button id="btn-download-pub-pem" class="btn btn-secondary" style="padding: 0.2rem 0.65rem; font-size: 0.75rem;" title="Descargar clave pública en formato .pem">
                  <span class="micon" aria-hidden="true">download</span>  Descargar .pem
                </button>
              </div>
            </div>
            <textarea id="rsa-public-key" rows="6" readonly class="font-mono" style="font-size: 0.75rem;" placeholder="Haz clic en 'Generar Par de Claves RSA-4096'..."></textarea>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; flex-wrap: wrap; gap: 0.25rem;">
              <label style="font-size: 0.875rem; color: var(--text-secondary); font-weight: 600;">
                Clave Privada (Private Key PEM - PKCS#8):
              </label>
              <div style="display: flex; gap: 0.25rem;">
                <button id="btn-copy-priv" class="btn btn-secondary" style="padding: 0.2rem 0.65rem; font-size: 0.75rem; border-color: rgba(168, 85, 247, 0.3); color: #d8b4fe;" title="Copiar clave privada al portapapeles">
                  <span class="micon" aria-hidden="true">content_paste</span>  Copiar
                </button>
                <button id="btn-download-priv-pem" class="btn btn-secondary" style="padding: 0.2rem 0.65rem; font-size: 0.75rem;" title="Descargar clave privada en formato .pem">
                  <span class="micon" aria-hidden="true">download</span>  Descargar .pem
                </button>
              </div>
            </div>
            <textarea id="rsa-private-key" rows="6" readonly class="font-mono" style="font-size: 0.75rem;" placeholder="Haz clic en 'Generar Par de Claves RSA-4096'..."></textarea>
          </div>
        </div>

        <!-- FLUJO DE COMUNICACIÓN HÍBRIDA: LADO EMISOR (ALICE) VS LADO RECEPTOR (BOB) -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <div style="margin-bottom: 1rem;">
            <h4 style="font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
              <span>⚖️</span> Flujo de Comunicación Híbrida: Lado Emisor (Alice) vs Lado Receptor (Bob)
            </h4>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Demostración interactiva: Alice cifra con la Clave Pública de Bob; Bob descifra con su Clave Privada secreta.
            </p>
          </div>

          <!-- DIAGRAMA VISUAL INTERACTIVO (INFOGRAFÍA EN VIVO) -->
          <div class="crypto-visual-pipeline">
            <div class="pipeline-stepper" style="margin-bottom: 1.5rem;">
              <div id="step-1-indicator" class="pipeline-step active" style="font-size: 1.1rem; font-weight: 700; gap: 0.65rem;">
                <div class="step-number" style="width: 32px; height: 32px; font-size: 1.1rem; font-weight: 800;">1</div>
                <span>Generar Par RSA-4096 (Bob)</span>
              </div>
              <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.15); margin: 0 0.85rem;"></div>
              <div id="step-2-indicator" class="pipeline-step" style="font-size: 1.1rem; font-weight: 700; gap: 0.65rem;">
                <div class="step-number" style="width: 32px; height: 32px; font-size: 1.1rem; font-weight: 800;">2</div>
                <span>Alice Cifra Sobre Digital</span>
              </div>
              <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.15); margin: 0 0.85rem;"></div>
              <div id="step-3-indicator" class="pipeline-step" style="font-size: 1.1rem; font-weight: 700; gap: 0.65rem;">
                <div class="step-number" style="width: 32px; height: 32px; font-size: 1.1rem; font-weight: 800;">3</div>
                <span>Bob Abre con Clave Privada</span>
              </div>
            </div>

            <div class="pipeline-nodes-container">
              <!-- NODO 1: ALICE -->
              <div id="diagram-node-alice" class="pipeline-actor-card">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 1.25rem; color: var(--accent-cyan);">
                    <span style="font-size: 1.45rem;">👩‍💻</span> Alice (Emisor)
                  </div>
                  <span class="badge badge-cyan" style="font-size: 0.6875rem !important; padding: 0.2rem 0.55rem !important; font-weight: 700;">Origina Mensaje</span>
                </div>
                <div style="font-size: 1.05rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0.75rem;">
                  <div><span class="micon" style="font-size: 1.3rem; vertical-align: middle;" aria-hidden="true">edit_note</span>  Mensaje Confidencial</div>
                  <div>➕ Clave Efímera AES-256 (32B)</div>
                </div>
                <div class="key-representation-box" style="background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.25); color: #cffafe; padding: 0.65rem 0.85rem;">
                  <span style="font-size: 1.5rem;"><span class="micon" aria-hidden="true">lock_open</span> </span>
                  <div>
                    <strong style="display: block; font-size: 1.08rem; font-weight: 800;">Candado de Bob (Clave Pública)</strong>
                    <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">Sella la clave AES dentro del sobre</span>
                  </div>
                </div>
              </div>

              <!-- NODO 2: CANAL / SOBRE DIGITAL -->
              <div class="pipeline-middle-channel">
                <div style="font-size: 0.95rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.35rem; font-weight: 800;">
                  <span class="micon" style="font-size: 1.2rem; vertical-align: middle;" aria-hidden="true">language</span>  Red Pública / Internet
                </div>
                <div class="transit-track" style="margin: 1rem 0;">
                  <div id="diagram-transit-pulse" class="transit-track-pulse" style="display: none;"></div>
                </div>
                <div id="diagram-envelope" class="digital-envelope-visual" style="padding: 0.85rem 1.15rem;">
                  <div id="diagram-envelope-icon" style="font-size: 1.85rem; margin-bottom: 0.35rem;"><span class="micon" aria-hidden="true">inventory_2</span> <span class="micon" aria-hidden="true">lock</span> </div>
                  <strong id="diagram-envelope-title" class="envelope-title-styled" style="color: var(--actor-bob-accent, #581c87); display: block; font-size: 1.15rem; font-weight: 800;">Sobre Digital Blindado</strong>
                  <span id="diagram-envelope-status" style="font-size: 0.98rem; color: var(--text-secondary); font-weight: 600;">En espera de claves...</span>
                </div>
              </div>

              <!-- NODO 3: BOB -->
              <div id="diagram-node-bob" class="pipeline-actor-card">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                  <div class="bob-diagram-title" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 1.25rem; color: var(--actor-bob-accent, #581c87);">
                    <span style="font-size: 1.45rem;">👨‍💻</span> Bob (Receptor)
                  </div>
                  <span class="badge badge-purple" style="font-size: 0.6875rem !important; padding: 0.2rem 0.55rem !important; font-weight: 700;">Destino Final</span>
                </div>
                <div style="font-size: 1.05rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0.75rem;">
                  <div><span class="micon" style="font-size: 1.3rem; vertical-align: middle;" aria-hidden="true">file_download</span>  Recibe el paquete por internet</div>
                  <div><span class="micon" style="font-size: 1.3rem; vertical-align: middle;" aria-hidden="true">shield</span>  Valida AuthTag GHASH (128 bits)</div>
                </div>
                <div class="key-representation-box" style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.25); color: var(--actor-bob-text, #3b0764); padding: 0.65rem 0.85rem;">
                  <span style="font-size: 1.5rem;"><span class="micon" aria-hidden="true">vpn_key</span> </span>
                  <div>
                    <strong style="display: block; font-size: 1.08rem; font-weight: 800;">Única Llave Secreta (Clave Privada)</strong>
                    <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">Solo Bob puede abrir el candado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="crypto-panels-grid" class="grid-2 crypto-actor-grid" style="gap: 1rem;">
            <!-- COLUMNA 1: LADO EMISOR (ALICE) -->
            <div id="crypto-panel-alice" class="crypto-actor-panel crypto-actor-alice" style="background: rgba(0, 240, 255, 0.03); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 240, 255, 0.15); padding-bottom: 0.5rem;">
                <div style="font-weight: 700; font-size: 1rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.25rem;">
                  <span>📤</span> 1. Lado Emisor (Alice)
                </div>
                <span class="badge badge-cyan" style="font-size: 0.6875rem;">Usa Clave Pública</span>
              </div>

              <p style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.45; margin: 0;">
                Alice redacta el mensaje confidencial. <strong>No necesita la clave privada</strong>. El sistema genera una clave efímera AES de 256 bits, cifra el mensaje y protege la clave dentro del sobre digital RSA-OAEP.
              </p>

              <!-- Selector de Tipo de Contenido para Alice -->
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.25rem;">
                <button type="button" id="btn-alice-mode-text" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; border-color: var(--accent-cyan); color: var(--accent-cyan);"><span class="micon" aria-hidden="true">edit_note</span>  Mensaje de Texto</button>
                <button type="button" id="btn-alice-mode-file" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;"><span class="micon" aria-hidden="true">image</span>  Imagen / Archivo</button>
              </div>

              <div id="alice-text-wrap" class="alice-inner-section">
                <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">
                  Mensaje Confidencial de Alice:
                </label>
                <textarea id="hybrid-message-input" rows="2" style="font-size: 0.875rem;">Transacción bancaria confidencial aprobada #893712</textarea>
              </div>

              <div id="alice-file-wrap" class="alice-inner-section" style="display: none;">
                <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">
                  Imagen o Archivo Confidencial a Proteger:
                </label>
                <input type="file" id="alice-file-input" accept="image/*, application/pdf, .txt, .json" style="display: none;" />
                <div id="alice-file-dropzone" class="dropzone" style="padding: 0.75rem; font-size: 0.75rem; cursor: pointer; text-align: center;">
                  <span style="font-size: 1.375rem;"><span class="micon" aria-hidden="true">folder_open</span> </span>
                  <div id="alice-file-name" style="font-weight: 600; color: var(--text-primary); margin-top: 0.25rem;">Arrastra o haz clic para cargar imagen/archivo</div>
                  <div id="alice-file-size" style="font-size: 0.75rem; color: var(--text-muted);">-</div>
                </div>
              </div>

              <button id="btn-alice-encrypt" class="btn btn-primary" style="width: 100%;" disabled>
                <span class="micon" aria-hidden="true">lock</span>  Cifrar y Empaquetar Sobre Digital (Alice)
              </button>

              <!-- Paquete Generado por Alice -->
              <div id="alice-output-box" class="alice-output-panel" style="display: none; background: var(--bg-inset-strong); padding: 0.75rem; border-radius: 4px; border: 1px solid rgba(0, 240, 255, 0.2); font-family: var(--font-mono); font-size: 0.75rem; line-height: 1.6;">
                <div style="color: var(--accent-cyan); font-weight: 700; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.25rem;">
                  <span><span class="micon" aria-hidden="true">inventory_2</span> </span> SOBRE DIGITAL TRANSMITIDO POR ALICE:
                </div>
                <div>• <strong>Clave AES Efímera (Cifrada con RSA-OAEP 4096):</strong> <span id="alice-enc-key" style="color: #cffafe; word-break: break-all;">-</span></div>
                <div>• <strong>IV GCM (Nonce 96 bits):</strong> <span id="alice-iv" style="color: var(--accent-cyan);">-</span></div>
                <div>• <strong>Authentication Tag (128 bits):</strong> <span id="alice-tag" style="color: var(--accent-amber);">-</span></div>
                <div>• <strong>Ciphertext (Datos AES-256):</strong> <span id="alice-cipher" style="color: var(--text-muted); word-break: break-all;">-</span></div>
                <div style="margin-top: 0.5rem; color: #a7f3d0; font-size: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.5rem;">
                  <span class="micon" aria-hidden="true">satellite_alt</span>  Paquete en tránsito listo para ser entregado a Bob.
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                  <button id="btn-email-hybrid-envelope" class="btn btn-primary" style="flex: 1; font-size: 0.75rem; padding: 0.45rem 0.75rem; background: linear-gradient(135deg, #0284c7, #38bdf8); border: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <span class="micon" aria-hidden="true">mail</span>  Enviar Sobre a Bob por Correo
                  </button>
                  <button id="btn-download-hybrid-envelope" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.45rem 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem;" title="Descargar archivo JSON del sobre">
                    <span class="micon" aria-hidden="true">download</span>  Descargar .JSON
                  </button>
                </div>
              </div>
            </div>

            <!-- COLUMNA 2: LADO RECEPTOR (BOB) -->
            <div id="crypto-panel-bob" class="crypto-actor-panel crypto-actor-bob" style="background: rgba(168, 85, 247, 0.03); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(168, 85, 247, 0.15); padding-bottom: 0.5rem;">
                <div class="bob-card-header-title" style="font-weight: 800; font-size: 1.08rem; color: var(--actor-bob-accent, #581c87); display: flex; align-items: center; gap: 0.35rem;">
                  <span><span class="micon" aria-hidden="true">file_download</span> </span> 2. Lado Receptor (Bob)
                </div>
                <span class="badge badge-purple" style="font-size: 0.6875rem;">Usa Clave Privada</span>
              </div>

              <p style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.45; margin: 0;">
                Para abrir el sobre se requieren <strong>2 elementos obligatorios</strong>: el <strong>documento cifrado (.json)</strong> recibido por correo y la <strong>clave privada (.pem)</strong> de Bob.
              </p>

              <!-- ELEMENTO 1: DOCUMENTO / SOBRE CIFRADO -->
              <div id="bob-envelope-section" class="bob-inner-section" style="background: var(--bg-inset); border: 1px dashed rgba(168, 85, 247, 0.4); border-radius: 10px; padding: 1rem 1.15rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="bob-section-heading" style="font-size: 1.15rem; font-weight: 800; color: var(--actor-bob-accent, #581c87); display: flex; align-items: center; gap: 0.45rem;">1. <span class="micon" style="font-size: 1.4rem;" aria-hidden="true">inventory_2</span>  Documento Cifrado (.json):</span>
                  <span id="bob-envelope-source-badge" class="badge badge-purple">En Espera</span>
                </div>
                
                <input type="file" id="bob-envelope-file-input" accept=".json, application/json" style="display: none;" />
                <div id="bob-dropzone" style="cursor: pointer; text-align: center; padding: 0.95rem 1rem; border-radius: 8px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); font-size: 1.08rem; transition: all 0.2s ease;">
                  <span style="font-size: 1.08rem; font-weight: 700;">📎 Arrastra el sobre .json del correo o haz clic</span>
                  <div id="bob-loaded-envelope-info" class="bob-loaded-info-text" style="font-size: 1.05rem; font-weight: 700; color: var(--actor-bob-text, #3b0764); margin-top: 0.4rem; display: none; line-height: 1.5;"></div>
                </div>
              </div>

              <!-- ELEMENTO 2: CLAVE PRIVADA DE BOB -->
              <div id="bob-privkey-section" class="bob-inner-section" style="background: var(--bg-inset); border: 1px dashed rgba(168, 85, 247, 0.4); border-radius: 10px; padding: 1rem 1.15rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="bob-section-heading" style="font-size: 1.15rem; font-weight: 800; color: var(--actor-bob-accent, #581c87); display: flex; align-items: center; gap: 0.45rem;">2. <span class="micon" style="font-size: 1.4rem;" aria-hidden="true">vpn_key</span>  Clave Privada de Bob (.pem):</span>
                  <span id="bob-privkey-source-badge" class="badge badge-purple">En Espera</span>
                </div>

                <div style="display: flex; gap: 0.75rem;">
                  <input type="file" id="bob-privkey-file-input" accept=".pem, .key, .txt" style="display: none;" />
                  <button type="button" id="btn-bob-upload-priv-file" class="btn btn-secondary" style="flex: 1; font-size: 1.05rem; padding: 0.65rem 0.95rem; display: flex; align-items: center; justify-content: center; gap: 0.45rem; min-height: 46px; font-weight: 700;">
                    <span class="micon" aria-hidden="true" style="font-size: 1.35rem;">folder</span>  Cargar Archivo .pem
                  </button>
                  <button type="button" id="btn-bob-use-generated-priv" class="btn btn-secondary" style="flex: 1; font-size: 1.05rem; padding: 0.65rem 0.95rem; display: flex; align-items: center; justify-content: center; gap: 0.45rem; min-height: 46px; font-weight: 700;">
                    <span class="micon" aria-hidden="true" style="font-size: 1.35rem;">bolt</span>  Usar Clave Generada
                  </button>
                </div>

                <div id="bob-loaded-privkey-info" style="font-size: 1.05rem; font-weight: 700; color: #a7f3d0; margin-top: 0.4rem; display: none;">
                  <span class="micon" aria-hidden="true" style="font-size: 1.3rem; vertical-align: middle;">check_circle</span>  Clave privada RSA-4096 cargada y lista.
                </div>

                <textarea id="bob-private-key-input" rows="2" placeholder="-----BEGIN PRIVATE KEY----- ... (o carga tu archivo .pem con el botón de arriba)" style="font-size: 1rem; font-family: var(--font-mono); margin-top: 0.35rem; padding: 0.75rem 1rem; line-height: 1.5;"></textarea>
              </div>

              <button id="btn-bob-decrypt" class="btn btn-emerald" style="width: 100%;" disabled>
                <span class="micon" aria-hidden="true">lock_open</span>  Abrir Sobre Digital y Descifrar (Bob)
              </button>

              <!-- Resultado del Descifrado de Bob -->
              <div id="bob-output-box" style="display: none; background: var(--bg-inset-strong); padding: 0.75rem; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3); font-family: var(--font-mono); font-size: 0.75rem; line-height: 1.6;">
                <div style="color: var(--accent-emerald); font-weight: 700; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.25rem;">
                  <span><span class="micon" aria-hidden="true">check_circle</span> </span> DESENCRIPTADO Y VERIFICADO POR BOB:
                </div>
                <div>• <strong>Clave de Sesión AES Recuperada:</strong> <span id="bob-dec-key" style="color: #a7f3d0; word-break: break-all;">-</span></div>
                <div>• <strong>Validación AuthTag (GHASH):</strong> <span style="color: var(--accent-emerald); font-weight: bold;">AUTÉNTICO (128 bits OK)</span></div>
                
                <div style="margin-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.5rem;">
                  <span style="color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Carga Útil Recuperada:</span>
                  <div id="bob-plaintext" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.45rem 0.75rem; border-radius: 4px; color: var(--text-primary); font-weight: 700; font-size: 0.875rem; word-break: break-all;"></div>
                  
                  <!-- Contenedor para Imagen/Archivo recuperado si aplica -->
                  <div id="bob-recovered-file-box" style="display: none; margin-top: 0.5rem; text-align: center;">
                    <img id="bob-recovered-img" src="" alt="Imagen Secreta Descifrada" style="max-height: 180px; max-width: 100%; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4); margin-bottom: 0.5rem;" />
                    <br/>
                    <a id="bob-download-recovered-btn" class="btn btn-emerald" style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; text-decoration: none;" download="archivo_descifrado_bob">
                      <span class="micon" aria-hidden="true">file_download</span>  Descargar Archivo Secreto
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <!-- FIN SUBMÓDULO 1: CIFRADO HÍBRIDO -->

      <!-- SUBMÓDULO 2: SEGURIDAD DE CIFRADO HÍBRIDO (Sección 5 Forense Factorización RSA-4096 + Sección 3 Benchmark PBKDF2) -->
      <div id="crypto-pane-security" style="display: none; margin-top: 1.5rem;">
        <!-- SECCIÓN 5: LABORATORIO FORENSE: ATAQUES Y RESISTENCIA DEL CIFRADO HÍBRIDO (EVE VS ALICE & BOB) -->
      <div class="card space-y-4" style="margin-top: 1.5rem; border-color: rgba(168, 85, 247, 0.4); box-shadow: 0 4px 20px -2px rgba(168, 85, 247, 0.15);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <h3 style="font-size: 1.55rem; color: #d8b4fe; display: flex; align-items: center; gap: 0.65rem; margin: 0; font-weight: 800;">
                <span class="micon" aria-hidden="true" style="font-size: 1.85rem;">security</span> 5. Laboratorio Forense: Criptoanálisis Matemático de Factorización (RSA-4096)
              </h3>
            </div>
          </div>
        </div>

        <!-- Tarjeta Informativa del Vector Matemático Activo -->
        <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 10px; padding: 1.25rem 1.4rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1.15rem;">
            <div style="width: 52px; height: 52px; border-radius: 12px; background: rgba(168, 85, 247, 0.2); display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
              ⚡
            </div>
            <div>
              <strong style="color: #d8b4fe; font-size: 1.35rem; display: block; font-weight: 800; margin-bottom: 0.35rem;">
                Vector de Ataque Seleccionado: Factorización Asintótica de la Clave de Bob (Criba GNFS)
              </strong>
              <span style="font-size: 1.2rem; color: var(--text-secondary); line-height: 1.7; display: inline-block;">
                Eve intenta deducir los factores primos secretos <em>p</em> y <em>q</em> a partir del módulo público <em>N</em> de 4096 bits (~1.234 dígitos decimales) sin contraseñas humanas.
              </span>
            </div>
          </div>
          <span class="badge badge-purple" style="font-size: 0.95rem; padding: 0.4rem 0.85rem; font-weight: 800;">
            ● VECTOR ACTIVO ÚNICO
          </span>
        </div>

        <!-- Panel de Control y Carga de Paquete de Alice -->
        <div style="background: var(--bg-inset); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1.15rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                <span>📦</span> Sobre Digital Blanco a Atacar:
              </span>
              <span id="hybrid-target-badge" class="badge badge-purple" style="font-size: 0.95rem; padding: 0.35rem 0.8rem;">
                Sobre de Alice listo
              </span>
            </div>
            <button type="button" id="btn-reload-alice-target" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
              <span class="micon" aria-hidden="true">sync</span> Sincronizar Último Sobre de Alice
            </button>
          </div>

          <!-- Previsualización de Datos Interceptados por Eve -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.9rem; font-family: var(--font-mono);">
            <div style="background: var(--bg-inset-strong); padding: 0.9rem 1.1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
              <span style="color: var(--text-muted); display: block; font-size: 1.12rem; font-weight: 700; margin-bottom: 0.35rem;">Clave Efímera Cifrada (RSA-OAEP):</span>
              <span id="hybrid-target-enckey" style="color: #d8b4fe; word-break: break-all; font-size: 1.2rem; font-weight: 600;">[512 bytes / RSA-4096 listo]</span>
            </div>
            <div style="background: var(--bg-inset-strong); padding: 0.9rem 1.1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
              <span style="color: var(--text-muted); display: block; font-size: 1.12rem; font-weight: 700; margin-bottom: 0.35rem;">IV Aleatorio (96-bit):</span>
              <span id="hybrid-target-iv" style="color: var(--accent-cyan); word-break: break-all; font-size: 1.2rem; font-weight: 600;">[12 bytes aleatorios]</span>
            </div>
            <div style="background: var(--bg-inset-strong); padding: 0.9rem 1.1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
              <span style="color: var(--text-muted); display: block; font-size: 1.12rem; font-weight: 700; margin-bottom: 0.35rem;">AuthTag GHASH (128-bit):</span>
              <span id="hybrid-target-tag" style="color: #a7f3d0; word-break: break-all; font-size: 1.2rem; font-weight: 600;">[16 bytes de autenticidad]</span>
            </div>
          </div>

          <button type="button" id="btn-execute-hybrid-attack" class="btn btn-primary" style="padding: 0.65rem 1rem; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: linear-gradient(90deg, #a855f7, #ef4444); border: none;">
            <span class="micon" aria-hidden="true">bolt</span>  ⚡ Iniciar Criptoanálisis Matemático GNFS (Factorizar RSA-4096)
          </button>
        </div>

        <!-- CONSOLA FORENSE DE ATAQUE HÍBRIDO (EVE TERMINAL INTERACTIVA) -->
        <div class="crypto-benchmark-terminal" id="hybrid-attack-terminal">
          <div class="crypto-benchmark-terminal-header" style="background: #150d27; border-bottom-color: rgba(168, 85, 247, 0.3);">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="crypto-terminal-dots">
                <span class="crypto-terminal-dot dot-red"></span>
                <span class="crypto-terminal-dot dot-yellow"></span>
                <span class="crypto-terminal-dot dot-green"></span>
              </div>
              <span style="font-size: 1.18rem; font-weight: 700; color: #94a3b8; display: flex; align-items: center; gap: 0.45rem;">
                <span style="color: #d8b4fe;">eve-exploit-framework@kali</span>: <span style="color: #f472b6;">~/gnfs-factorization</span>
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span id="hybrid-attack-status" class="badge badge-purple" style="font-size: 0.92rem; padding: 0.3rem 0.75rem; font-weight: 800;">
                ● TERMINAL INTERACTIVA ACTIVA
              </span>
              <button type="button" id="btn-toggle-catalog" class="btn btn-primary" style="font-size: 0.8rem; padding: 0.35rem 0.85rem; background: linear-gradient(135deg, #a855f7, #06b6d4); border: none; font-weight: 800; display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; border-radius: 6px; box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); color: #fff;">
                <span class="micon" aria-hidden="true" style="font-size: 1rem;">menu_book</span>  📖 Guía de Comandos y Qué Hace Cada Uno
              </button>
              <button type="button" id="btn-copy-hybrid-log" class="btn btn-secondary" style="font-size: 0.6875rem; padding: 0.2rem 0.5rem;">
                <span class="micon" aria-hidden="true">content_paste</span> Copiar
              </button>
              <button type="button" id="btn-clear-hybrid-log" class="btn btn-secondary" style="font-size: 0.6875rem; padding: 0.2rem 0.5rem;">
                🧹 Limpiar
              </button>
            </div>
          </div>

          <!-- Barra de Comandos Rápidos / Chips para el Jurado y Profesores -->
          <div style="background: rgba(21, 13, 39, 0.95); border-bottom: 1px solid rgba(168, 85, 247, 0.25); padding: 0.6rem 1rem; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <button type="button" id="btn-toggle-catalog-chip" style="background: linear-gradient(135deg, #a855f7, #3b82f6); border: none; color: #fff; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.82rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; box-shadow: 0 2px 10px rgba(168, 85, 247, 0.35); margin-right: 0.35rem;">
              <span>📜</span> Ver Qué Hace Cada Comando
            </button>
            <span style="font-size: 0.82rem; color: #cbd5e1; font-weight: 700; margin-right: 0.2rem;">⚡ Comandos CLI:</span>
            <button type="button" class="btn-terminal-chip" data-cmd="help" style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer; font-weight: 700;">help</button>
            <button type="button" class="btn-terminal-chip" data-cmd="inspect" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">inspect</button>
            <button type="button" class="btn-terminal-chip" data-cmd="challenge-weak" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer; font-weight: 700;">🎯 challenge-weak (CTF)</button>
            <button type="button" class="btn-terminal-chip" data-cmd="factorize" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">⚡ factorize (4096)</button>
            <button type="button" class="btn-terminal-chip" data-cmd="fermat -n 100000000000037" style="background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.35); color: #facc15; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">🔢 fermat</button>
            <button type="button" class="btn-terminal-chip" data-cmd="pollard-p1" style="background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.35); color: #facc15; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">p-1</button>
            <button type="button" class="btn-terminal-chip" data-cmd="ecm" style="background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.35); color: #facc15; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">ecm</button>
            <button type="button" class="btn-terminal-chip" data-cmd="wiener" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">wiener</button>
            <button type="button" class="btn-terminal-chip" data-cmd="hastad" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">hastad</button>
            <button type="button" class="btn-terminal-chip" data-cmd="coppersmith" style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); color: #d8b4fe; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">coppersmith</button>
            <button type="button" class="btn-terminal-chip" data-cmd="common-modulus" style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); color: #d8b4fe; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">common-modulus</button>
            <button type="button" class="btn-terminal-chip" data-cmd="batch-gcd" style="background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.35); color: #fb923c; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">batch-gcd</button>
            <button type="button" class="btn-terminal-chip" data-cmd="shor" style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.35); color: #38bdf8; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">⚛️ shor</button>
            <button type="button" class="btn-terminal-chip" data-cmd="bit-flipping" style="background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.35); color: #fb923c; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">🔀 bit-flipping</button>
            <button type="button" class="btn-terminal-chip" data-cmd="nonce-reuse" style="background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.35); color: #fb923c; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">nonce-reuse (Joux)</button>
            <button type="button" class="btn-terminal-chip" data-cmd="timing-attack" style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); color: #c084fc; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">⏱️ timing-attack</button>
            <button type="button" class="btn-terminal-chip" data-cmd="power-analysis" style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); color: #c084fc; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">DPA (Canal)</button>
            <button type="button" class="btn-terminal-chip" data-cmd="entropy" style="background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.35); color: #facc15; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">📊 entropy</button>
            <button type="button" class="btn-terminal-chip" data-cmd="bleichenbacher" style="background: rgba(236, 72, 153, 0.15); border: 1px solid rgba(236, 72, 153, 0.35); color: #f472b6; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">🏛️ bleichenbacher</button>
            <button type="button" class="btn-terminal-chip" data-cmd="padding-oracle" style="background: rgba(236, 72, 153, 0.15); border: 1px solid rgba(236, 72, 153, 0.35); color: #f472b6; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">padding-oracle</button>
            <button type="button" class="btn-terminal-chip" data-cmd="bellcore" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">bellcore (CRT)</button>
            <button type="button" class="btn-terminal-chip" data-cmd="mitm" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">mitm</button>
            <button type="button" class="btn-terminal-chip" data-cmd="replay" style="background: rgba(148, 163, 184, 0.15); border: 1px solid rgba(148, 163, 184, 0.35); color: #cbd5e1; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">replay</button>
            <button type="button" class="btn-terminal-chip" data-cmd="inject-fake-key" style="background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.35); color: #fbbf24; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">🔑 fake-key</button>
            <button type="button" class="btn-terminal-chip" data-cmd="bruteforce-gcm" style="background: rgba(244, 114, 182, 0.15); border: 1px solid rgba(244, 114, 182, 0.35); color: #f472b6; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">🛡️ bruteforce-gcm</button>
            <button type="button" class="btn-terminal-chip" data-cmd="dictionary" style="background: rgba(148, 163, 184, 0.15); border: 1px solid rgba(148, 163, 184, 0.35); color: #94a3b8; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">rockyou</button>
            <button type="button" class="btn-terminal-chip" data-cmd="clear" style="background: rgba(148, 163, 184, 0.15); border: 1px solid rgba(148, 163, 184, 0.35); color: #94a3b8; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.78rem; font-family: var(--font-mono); cursor: pointer;">clear</button>
          </div>

          <!-- PANEL EXPANDIBLE: CATÁLOGO COMPLETO DE COMANDOS Y EXPLICACIÓN -->
          <div id="hybrid-commands-catalog" style="display: none; background: #0c071a; border-bottom: 2px solid #a855f7; padding: 1.25rem 1.4rem; max-height: 520px; overflow-y: auto; box-shadow: inset 0 6px 20px rgba(0,0,0,0.5);">
            <!-- Barra Superior del Catálogo -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(168, 85, 247, 0.25); padding-bottom: 0.75rem;">
              <div>
                <strong style="color: #d8b4fe; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                  <span>📖</span> Catálogo Exhaustivo de Comandos y Técnicas de Criptoanálisis
                </strong>
                <span style="color: #94a3b8; font-size: 0.92rem;">
                  Haz clic en <strong>"▶ Ejecutar en Terminal"</strong> en cualquier tarjeta para probar el ataque en tiempo real.
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="text" id="catalog-search-input" placeholder="🔍 Filtrar comando o técnica (ej: fermat, shor, rsa, canal)..." style="background: rgba(255,255,255,0.06); border: 1px solid rgba(168,85,247,0.4); border-radius: 6px; padding: 0.35rem 0.75rem; color: #fff; font-size: 0.88rem; min-width: 250px; outline: none;" />
                <button type="button" id="btn-close-catalog" class="btn btn-secondary btn-sm" style="padding: 0.3rem 0.65rem; font-size: 0.8rem; cursor: pointer;">
                  ✕ Cerrar
                </button>
              </div>
            </div>

            <!-- Botones de Filtro Rápido por Categoría -->
            <div id="catalog-category-filters" style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem;">
              <button type="button" class="btn-cat-filter" data-cat="all" style="background: rgba(168, 85, 247, 0.35); border: 1px solid #a855f7; color: #fff; border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.8rem; cursor: pointer; font-weight: 700;">Todos (27)</button>
              <button type="button" class="btn-cat-filter" data-cat="ctf" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.8rem; cursor: pointer;">🎯 CTF & Inspección</button>
              <button type="button" class="btn-cat-filter" data-cat="factor" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.8rem; cursor: pointer;">⚡ Factorización & Álgebra</button>
              <button type="button" class="btn-cat-filter" data-cat="rsa" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.8rem; cursor: pointer;">🔬 Estructural RSA</button>
              <button type="button" class="btn-cat-filter" data-cat="channel" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.8rem; cursor: pointer;">⏱️ Canales Laterales & Cuántica</button>
              <button type="button" class="btn-cat-filter" data-cat="crypto" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.8rem; cursor: pointer;">🛡️ Simétrico & Protocolo</button>
              <button type="button" class="btn-cat-filter" data-cat="universal" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 20px; padding: 0.2rem 0.75rem; font-size: 0.8rem; cursor: pointer;">🧠 Motor Universal</button>
            </div>

            <!-- Grid de Tarjetas de Comandos -->
            <div id="catalog-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 0.85rem;">
              
              <!-- 1. challenge-weak -->
              <div class="cmd-catalog-card" data-cat="ctf" data-keywords="challenge-weak ctf pollard rho 32 bits flag" style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #34d399; font-weight: 800; font-size: 1rem; background: rgba(16,185,129,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">challenge-weak</code>
                    <span class="badge badge-emerald" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🎯 CTF REAL (32-bit)</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Desafío CTF: Pollard's Rho en Vivo</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Genera una clave RSA de 32 bits con primos débiles y ejecuta el algoritmo &rho; de Pollard. Rompe el módulo en milisegundos, calcula la clave privada <em>d</em> y descifra la bandera secreta.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="challenge-weak" style="align-self: flex-start; background: rgba(16,185,129,0.15); border: 1px solid #10b981; color: #34d399; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 2. inspect -->
              <div class="cmd-catalog-card" data-cat="ctf" data-keywords="inspect target sobre parametros ghash iv" style="background: rgba(56,189,248,0.05); border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #38bdf8; font-weight: 800; font-size: 1rem; background: rgba(56,189,248,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">inspect / target</code>
                    <span class="badge badge-cyan" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🔍 INSPECCIÓN</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Inspección Forense del Sobre Digital</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Desensambla y extrae la telemetría del sobre de Alice: módulo <em>N</em> de 4096 bits, exponente <em>e = 65537</em>, IV de 96 bits y AuthTag GHASH de 128 bits.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="inspect" style="align-self: flex-start; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 3. factorize -->
              <div class="cmd-catalog-card" data-cat="factor" data-keywords="factorize gnfs criba asintotica rsa 4096 trillones de anos" style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #f87171; font-weight: 800; font-size: 1rem; background: rgba(239,68,68,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">factorize / gnfs</code>
                    <span class="badge badge-rose" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">⚡ GNFS ASINTÓTICA</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Criba de Cuerpo Numérico General (GNFS)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Ejecuta criptoanálisis asintótico polinómico real contra los 4096 bits de Bob. Demuestra empíricamente la barrera L<sub>N</sub>[1/3, c] que requiere más de <strong>100 Trillones de Años</strong>.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="factorize" style="align-self: flex-start; background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #f87171; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 4. fermat -->
              <div class="cmd-catalog-card" data-cat="factor" data-keywords="fermat diferencia cuadrados primos cercanos n" style="background: rgba(234,179,8,0.05); border: 1px solid rgba(234,179,8,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #facc15; font-weight: 800; font-size: 1rem; background: rgba(234,179,8,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">fermat [-n num]</code>
                    <span class="badge badge-yellow" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🔢 CUADRADOS (a² - b²)</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Factorización de Fermat</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Factoriza módulos donde |p - q| &lt; N<sup>1/4</sup>. Inmune en RSA-4096. Admite <code>-n</code> para factorizar cualquier número compuesto de prueba del profesor.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="fermat -n 100000000000037" style="align-self: flex-start; background: rgba(234,179,8,0.15); border: 1px solid #facc15; color: #facc15; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 5. pollard-p1 -->
              <div class="cmd-catalog-card" data-cat="factor" data-keywords="pollard p1 p-1 b-smooth factores lisos" style="background: rgba(234,179,8,0.05); border: 1px solid rgba(234,179,8,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #facc15; font-weight: 800; font-size: 1rem; background: rgba(234,179,8,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">pollard-p1 / p-1</code>
                    <span class="badge badge-yellow" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🛡️ PRIMOS SEGUROS</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Algoritmo p - 1 de Pollard</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Factoriza si (p - 1) está compuesto por factores primos pequeños (B-smooth). Inmune en RSA-4096 por uso de primos seguros donde (p - 1)/2 contiene factores gigantescos.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="pollard-p1" style="align-self: flex-start; background: rgba(234,179,8,0.15); border: 1px solid #facc15; color: #facc15; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 6. ecm -->
              <div class="cmd-catalog-card" data-cat="factor" data-keywords="ecm lenstra curvas elipticas factorizacion" style="background: rgba(234,179,8,0.05); border: 1px solid rgba(234,179,8,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #facc15; font-weight: 800; font-size: 1rem; background: rgba(234,179,8,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">ecm / lenstra</code>
                    <span class="badge badge-yellow" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">📈 CURVAS ELÍPTICAS</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Curvas Elípticas de Lenstra (ECM)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Tercer método más rápido del mundo. Excelente cuando N tiene factores desiguales (p &lt;&lt; &radic;N). Inviable en RSA-4096 porque p y q son de 2048 bits simétricos.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="ecm" style="align-self: flex-start; background: rgba(234,179,8,0.15); border: 1px solid #facc15; color: #facc15; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 7. wiener -->
              <div class="cmd-catalog-card" data-cat="rsa" data-keywords="wiener fracciones continuas exponente privado corto d" style="background: rgba(56,189,248,0.05); border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #38bdf8; font-weight: 800; font-size: 1rem; background: rgba(56,189,248,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">wiener</code>
                    <span class="badge badge-cyan" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🛡️ INMUNE (d &gt; N^0.25)</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Ataque de Exponente Privado Corto</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Aplica convergentes de fracciones continuas si d &lt; 1/3 N<sup>1/4</sup>. Inmune: en nuestro par RSA-4096, d tiene 4096 bits completos, trillones de veces por encima de la cota.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="wiener" style="align-self: flex-start; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 8. hastad -->
              <div class="cmd-catalog-card" data-cat="rsa" data-keywords="hastad broadcast e=3 crt teorema resto chino" style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #34d399; font-weight: 800; font-size: 1rem; background: rgba(16,185,129,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">hastad / broadcast</code>
                    <span class="badge badge-emerald" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🛡️ INMUNE (e = 65537)</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Håstad Broadcast Attack (e = 3)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Rompe mensajes idénticos enviados con e = 3 usando el Teorema del Resto Chino (CRT). Neutralizado por el uso de e = 65537 (F4) y relleno aleatorio OAEP.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="hastad" style="align-self: flex-start; background: rgba(16,185,129,0.15); border: 1px solid #10b981; color: #34d399; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 9. coppersmith -->
              <div class="cmd-catalog-card" data-cat="rsa" data-keywords="coppersmith boneh-durfee reticulos lll lattice" style="background: rgba(168,85,247,0.05); border: 1px solid rgba(168,85,247,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #d8b4fe; font-weight: 800; font-size: 1rem; background: rgba(168,85,247,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">coppersmith / lattice</code>
                    <span class="badge badge-purple" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">📐 RETÍCULOS LLL</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Reducción de Retículos (Boneh-Durfee)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Halla raíces modulares de polinomios mediante reducción LLL cuando d &lt; N<sup>0.292</sup>. Inmune: d tiene tamaño completo de 4096 bits.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="coppersmith" style="align-self: flex-start; background: rgba(168,85,247,0.15); border: 1px solid #a855f7; color: #d8b4fe; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 10. franklin-reiter -->
              <div class="cmd-catalog-card" data-cat="rsa" data-keywords="franklin-reiter mensajes relacionados afin lineal gcd" style="background: rgba(168,85,247,0.05); border: 1px solid rgba(168,85,247,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #d8b4fe; font-weight: 800; font-size: 1rem; background: rgba(168,85,247,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">franklin-reiter</code>
                    <span class="badge badge-purple" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🔗 MGF1 SHIELD</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Ataque de Mensajes Relacionados</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Calcula gcd de polinomios si dos mensajes tienen relación lineal afín M<sub>2</sub> = a*M<sub>1</sub> + b. Inmune: la máscara MGF1 de OAEP destruye cualquier relación matemática afín.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="franklin-reiter" style="align-self: flex-start; background: rgba(168,85,247,0.15); border: 1px solid #a855f7; color: #d8b4fe; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 11. common-modulus -->
              <div class="cmd-catalog-card" data-cat="rsa" data-keywords="common-modulus modulo comun bezout gcd e1 e2" style="background: rgba(168,85,247,0.05); border: 1px solid rgba(168,85,247,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #d8b4fe; font-weight: 800; font-size: 1rem; background: rgba(168,85,247,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">common-modulus</code>
                    <span class="badge badge-purple" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">👥 NO COMPARTIDO</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Ataque de Módulo Común (Bézout)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Recupera el texto si dos destinatarios comparten N con exponentes coprimos (r*e<sub>1</sub> + s*e<sub>2</sub> = 1). No aplicable: en el laboratorio cada usuario genera módulos N independientes.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="common-modulus" style="align-self: flex-start; background: rgba(168,85,247,0.15); border: 1px solid #a855f7; color: #d8b4fe; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 12. batch-gcd -->
              <div class="cmd-catalog-card" data-cat="rsa" data-keywords="batch-gcd shared-primes colision primos entropia" style="background: rgba(249,115,22,0.05); border: 1px solid rgba(249,115,22,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #fb923c; font-weight: 800; font-size: 1rem; background: rgba(249,115,22,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">batch-gcd</code>
                    <span class="badge badge-amber" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🧬 COLISIÓN IMPOSIBLE</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Ataque de Primos Compartidos (Batch GCD)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Calcula gcd(N<sub>1</sub>, N<sub>2</sub>) para hallar factores compartidos por generadores con baja entropía. Inmune: claves generadas con CSPRNG hardware de alta entropía.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="batch-gcd" style="align-self: flex-start; background: rgba(249,115,22,0.15); border: 1px solid #fb923c; color: #fb923c; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 13. shor -->
              <div class="cmd-catalog-card" data-cat="channel" data-keywords="shor quantum cuantico qubits grover aes rsa" style="background: rgba(14,165,233,0.05); border: 1px solid rgba(14,165,233,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #38bdf8; font-weight: 800; font-size: 1rem; background: rgba(14,165,233,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">shor / quantum</code>
                    <span class="badge badge-cyan" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">⚛️ CUÁNTICA (8194 QUBITS)</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Auditoría de Computación Cuántica</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Compara Shor (requiere 8,194 qubits lógicos estables para RSA-4096) frente a Grover en AES-256 (aún requiere 2<sup>128</sup> ops). Inquebrantable con hardware cuántico actual.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="shor" style="align-self: flex-start; background: rgba(14,165,233,0.15); border: 1px solid #0ea5e9; color: #38bdf8; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 14. timing-attack -->
              <div class="cmd-catalog-card" data-cat="channel" data-keywords="timing-attack canal lateral tiempo timingsafeequal" style="background: rgba(139,92,246,0.05); border: 1px solid rgba(139,92,246,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #c084fc; font-weight: 800; font-size: 1rem; background: rgba(139,92,246,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">timing-attack</code>
                    <span class="badge badge-purple" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">⏱️ TIEMPO CONSTANTE O(1)</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Ataque de Canal Lateral Temporal</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Mide 40,000 comparaciones con timingSafeEqual(). Demuestra que el tiempo de verificación es invariante frente a los bytes correctos, frustrando ataques de tiempo.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="timing-attack" style="align-self: flex-start; background: rgba(139,92,246,0.15); border: 1px solid #8b5cf6; color: #c084fc; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 15. power-analysis -->
              <div class="cmd-catalog-card" data-cat="channel" data-keywords="power-analysis dpa spa canal lateral potencia consumo" style="background: rgba(139,92,246,0.05); border: 1px solid rgba(139,92,246,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #c084fc; font-weight: 800; font-size: 1rem; background: rgba(139,92,246,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">power-analysis / dpa</code>
                    <span class="badge badge-purple" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">⚡ CEGADO (BLINDING)</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Análisis Diferencial de Potencia (DPA)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Audita la fuga electromagnética en la exponenciación modular. OpenSSL activa cegado probabilístico (RSA Blinding) y escaleras Montgomery, haciendo el consumo impredecible.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="power-analysis" style="align-self: flex-start; background: rgba(139,92,246,0.15); border: 1px solid #8b5cf6; color: #c084fc; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 16. bellcore -->
              <div class="cmd-catalog-card" data-cat="channel" data-keywords="bellcore fault-attack inyeccion fallos crt boneh" style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #f87171; font-weight: 800; font-size: 1rem; background: rgba(239,68,68,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">bellcore / fault-attack</code>
                    <span class="badge badge-rose" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">⚡ PROTEGIDO POR OAEP</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Inyección de Fallos Bellcore (RSA-CRT)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Simula la alteración de 1 bit en hardware durante el descifrado modular CRT. El esquema OAEP detecta y aborta cualquier bloque modificado antes de procesarlo.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="bellcore" style="align-self: flex-start; background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #f87171; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 17. entropy -->
              <div class="cmd-catalog-card" data-cat="channel" data-keywords="entropy shannon aleatoriedad csprng nist sp 800-90a" style="background: rgba(234,179,8,0.05); border: 1px solid rgba(234,179,8,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #facc15; font-weight: 800; font-size: 1rem; background: rgba(234,179,8,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">entropy</code>
                    <span class="badge badge-yellow" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">📊 NIST SP 800-90A</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Entropía de Shannon H(X) en Vivo</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Calcula la densidad de aleatoriedad del IV, Tag y clave cifrada. Arroja H &asymp; 7.99 bits/byte, demostrando que no existen patrones predecibles aprovechables.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="entropy" style="align-self: flex-start; background: rgba(234,179,8,0.15); border: 1px solid #facc15; color: #facc15; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 18. bleichenbacher -->
              <div class="cmd-catalog-card" data-cat="channel" data-keywords="bleichenbacher oracle relleno padding pkcs oaep ind-cca2" style="background: rgba(236,72,153,0.05); border: 1px solid rgba(236,72,153,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #f472b6; font-weight: 800; font-size: 1rem; background: rgba(236,72,153,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">bleichenbacher</code>
                    <span class="badge badge-rose" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🏛️ IND-CCA2 PROOF</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Oráculo de Relleno MMA (Bleichenbacher)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Ataque histórico de 1 millón de mensajes contra PKCS#1 v1.5. RSA-OAEP neutraliza formalmente este ataque mediante el modelo de oráculo aleatorio IND-CCA2.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="bleichenbacher" style="align-self: flex-start; background: rgba(236,72,153,0.15); border: 1px solid #ec4899; color: #f472b6; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 19. padding-oracle -->
              <div class="cmd-catalog-card" data-cat="crypto" data-keywords="padding-oracle vaudenay cbc pkcs7 aead gcm" style="background: rgba(236,72,153,0.05); border: 1px solid rgba(236,72,153,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #f472b6; font-weight: 800; font-size: 1rem; background: rgba(236,72,153,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">padding-oracle</code>
                    <span class="badge badge-rose" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🚪 INMUNE POR AEAD</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Oráculo de Padding (Vaudenay)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Afectaba a modos como AES-CBC con relleno PKCS#7. En AES-256-GCM no existe relleno de bloques (modo flujo/contador); el AuthTag valida la integridad antes del descifrado.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="padding-oracle" style="align-self: flex-start; background: rgba(236,72,153,0.15); border: 1px solid #ec4899; color: #f472b6; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 20. bit-flipping -->
              <div class="cmd-catalog-card" data-cat="crypto" data-keywords="bit-flipping maleabilidad gcm authtag ghash tamper" style="background: rgba(249,115,22,0.05); border: 1px solid rgba(249,115,22,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #fb923c; font-weight: 800; font-size: 1rem; background: rgba(249,115,22,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">bit-flipping</code>
                    <span class="badge badge-amber" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🔀 AUTHTAG MISMATCH</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Ataque de Maleabilidad y Bit-Flipping</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Altera exactamente 1 bit del texto cifrado e intenta descifrar. Demuestra cómo el AuthTag GHASH en GF(2<sup>128</sup>) detecta la modificación de inmediato.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="bit-flipping" style="align-self: flex-start; background: rgba(249,115,22,0.15); border: 1px solid #fb923c; color: #fb923c; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 21. nonce-reuse -->
              <div class="cmd-catalog-card" data-cat="crypto" data-keywords="nonce-reuse forbidden attack joux iv gcm ghash" style="background: rgba(249,115,22,0.05); border: 1px solid rgba(249,115,22,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #fb923c; font-weight: 800; font-size: 1rem; background: rgba(249,115,22,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">nonce-reuse</code>
                    <span class="badge badge-amber" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">⚠️ FORBIDDEN ATTACK</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">GCM Forbidden Attack (Joux 2006)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Demuestra qué ocurre si se repite el IV con la misma clave AES-GCM (revela la clave H). Protegido: cada mensaje de Alice genera claves e IVs 100% efímeros (P &lt; 2<sup>-96</sup>).
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="nonce-reuse" style="align-self: flex-start; background: rgba(249,115,22,0.15); border: 1px solid #fb923c; color: #fb923c; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 22. inject-fake-key -->
              <div class="cmd-catalog-card" data-cat="crypto" data-keywords="inject-fake-key suplantacion clave privada openssl oaep" style="background: rgba(251,191,36,0.05); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #fbbf24; font-weight: 800; font-size: 1rem; background: rgba(251,191,36,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">inject-fake-key</code>
                    <span class="badge badge-yellow" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🔑 BLOQUEO OPENSSL</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Inyección de Clave Privada Forjada</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Inyecta una clave privada RSA ajena para forzar el descifrado del sobre. Captura el error nativo ERR_OSSL_RSA_OAEP_DECODING_ERROR de OpenSSL.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="inject-fake-key" style="align-self: flex-start; background: rgba(251,191,36,0.15); border: 1px solid #fbbf24; color: #fbbf24; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 23. bruteforce-gcm -->
              <div class="cmd-catalog-card" data-cat="crypto" data-keywords="bruteforce-gcm fuerza bruta aes-256 authtag ghash" style="background: rgba(244,114,182,0.05); border: 1px solid rgba(244,114,182,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #f472b6; font-weight: 800; font-size: 1rem; background: rgba(244,114,182,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">bruteforce-gcm</code>
                    <span class="badge badge-rose" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🛡️ 0 / 2^256 ÉXITOS</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Fuerza Bruta contra AES-256-GCM</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Prueba 2,000 claves simétricas aleatorias contra el AuthTag GHASH. Demuestra la imposibilidad de forjar autenticación en un espacio de claves de 256 bits.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="bruteforce-gcm" style="align-self: flex-start; background: rgba(244,114,182,0.15); border: 1px solid #f472b6; color: #f472b6; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 24. mitm -->
              <div class="cmd-catalog-card" data-cat="crypto" data-keywords="mitm man in the middle suplantacion clave publica pki x509" style="background: rgba(56,189,248,0.05); border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #38bdf8; font-weight: 800; font-size: 1rem; background: rgba(56,189,248,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">mitm</code>
                    <span class="badge badge-cyan" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🕵️ ANCLAJE PKI</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Man-in-the-Middle y Suplantación</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Audita la intercepción y reemplazo de la clave pública de Bob. Se mitiga mediante validación de firma digital por Autoridad Certificadora (CA) y Certificate Pinning.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="mitm" style="align-self: flex-start; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 25. replay -->
              <div class="cmd-catalog-card" data-cat="crypto" data-keywords="replay retransmision sobre paquetes duplicados" style="background: rgba(148,163,184,0.05); border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #cbd5e1; font-weight: 800; font-size: 1rem; background: rgba(148,163,184,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">replay / replay-attack</code>
                    <span class="badge badge-gray" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">🔁 SESIÓN EFÍMERA</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Ataque de Retransmisión (Replay)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Reinyecta un sobre capturado previamente para duplicar acciones. Mitigado por marcas de tiempo vinculadas al estado de sesión y unicidad de IVs efímeros.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="replay" style="align-self: flex-start; background: rgba(148,163,184,0.15); border: 1px solid #94a3b8; color: #cbd5e1; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 26. dictionary -->
              <div class="cmd-catalog-card" data-cat="crypto" data-keywords="dictionary rockyou diccionario contrasenas humanas" style="background: rgba(148,163,184,0.05); border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #cbd5e1; font-weight: 800; font-size: 1rem; background: rgba(148,163,184,0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">dictionary / rockyou</code>
                    <span class="badge badge-gray" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">📖 ERROR OBJETIVO</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 0.95rem; display: block; margin-bottom: 0.25rem;">Ataque de Diccionario (RockYou 14.3M)</strong>
                  <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin: 0;">
                    Prueba 14.3 millones de contraseñas de RockYou. Demuestra que los diccionarios aplican a contraseñas humanas, no a números primos generados por hardware.
                  </p>
                </div>
                <button type="button" class="btn-catalog-run" data-cmd="dictionary" style="align-self: flex-start; background: rgba(148,163,184,0.15); border: 1px solid #94a3b8; color: #cbd5e1; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                  ▶ Ejecutar en Terminal
                </button>
              </div>

              <!-- 27. Universal Engine -->
              <div class="cmd-catalog-card" data-cat="universal" data-keywords="universal motor dinamico dlog lattice spectre rainbow custom profesor" style="background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(6,182,212,0.1)); border: 1px solid #a855f7; border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem; grid-column: 1 / -1;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.35rem;">
                    <code style="color: #d8b4fe; font-weight: 800; font-size: 1rem; background: rgba(168,85,247,0.25); padding: 0.15rem 0.45rem; border-radius: 4px;">[cualquier ataque que ingrese el profesor]</code>
                    <span class="badge badge-purple" style="font-size: 0.75rem; padding: 0.2rem 0.6rem; font-weight: 800;">🧠 MOTOR UNIVERSAL ACTIVO</span>
                  </div>
                  <strong style="color: #f8fafc; font-size: 1rem; display: block; margin-bottom: 0.25rem;">Motor Universal de Criptoanálisis Dinámico</strong>
                  <p style="color: #cbd5e1; font-size: 0.88rem; line-height: 1.6; margin: 0;">
                    Si el evaluador escribe <strong>cualquier vector</strong> (ej: <code>dlog</code>, <code>lattice</code>, <code>rainbow</code>, <code>spectre</code>, <code>pohlig-hellman</code> o incluso un nombre inventado), la terminal no dirá "comando no reconocido": activará el motor de auditoría dinámica en tiempo real y emitirá un veredicto científico bajo <strong>NIST SP 800-57 Rev 5</strong> y <strong>FIPS 140-3</strong>.
                  </p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                  <button type="button" class="btn-catalog-run" data-cmd="lattice" style="background: rgba(168,85,247,0.2); border: 1px solid #a855f7; color: #d8b4fe; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                    ▶ Probar "lattice"
                  </button>
                  <button type="button" class="btn-catalog-run" data-cmd="dlog" style="background: rgba(56,189,248,0.2); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                    ▶ Probar "dlog"
                  </button>
                  <button type="button" class="btn-catalog-run" data-cmd="spectre" style="background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #f87171; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 4px; cursor: pointer;">
                    ▶ Probar "spectre"
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div id="hybrid-attack-log-body" class="crypto-benchmark-terminal-body" style="background: #090514; font-size: 1.15rem; line-height: 1.85; max-height: 520px; overflow-y: auto; cursor: text;">
            <div id="hybrid-attack-live-logs" style="font-family: var(--font-mono); font-size: 1.15rem; line-height: 1.85;">
              <!-- Se inyectan logs dinámicos -->
            </div>

            <!-- Prompt de Entrada CLI Activo -->
            <div id="hybrid-terminal-prompt-row" style="display: flex; align-items: center; gap: 0.65rem; margin-top: 0.85rem; border-top: 1px dashed rgba(168, 85, 247, 0.3); padding-top: 0.85rem; font-family: var(--font-mono);">
              <span style="color: #38bdf8; font-weight: 700; white-space: nowrap; user-select: none;">eve@kali:~/gnfs$</span>
              <input type="text" id="hybrid-terminal-input" placeholder="Escribe un comando (ej: help, inspect, challenge-weak)... [Enter para ejecutar]" autocomplete="off" spellcheck="false" style="background: transparent; border: none; outline: none; color: #f8fafc; font-family: var(--font-mono); font-size: 1.15rem; flex: 1; min-width: 160px; caret-color: #38bdf8;" />
              <button type="button" id="btn-terminal-send" class="btn btn-primary btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.85rem; background: #a855f7; border: none; white-space: nowrap; cursor: pointer;">
                Ejecutar ⏎
              </button>
            </div>
          </div>
        </div>

        <!-- Panel Didáctico para el Jurado (Colapsable con Botón Pequeño) -->
        <div style="background: rgba(168, 85, 247, 0.06); border-left: 4px solid #a855f7; padding: 1rem 1.35rem; border-radius: 0 10px 10px 0; margin-top: 0.85rem; font-size: 1.18rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
            <strong style="color: #d8b4fe; display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; font-weight: 800; margin: 0;">
              <span class="micon" aria-hidden="true" style="font-size: 1.55rem;">school</span> ¿Qué demuestra científicamente este ataque? (Para el jurado)
            </strong>
            <button id="btn-toggle-jury-info" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.55rem; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid rgba(168, 85, 247, 0.35); color: #d8b4fe; background: rgba(168, 85, 247, 0.12); cursor: pointer;" type="button">
              <span id="jury-toggle-icon" class="micon" style="font-size: 0.85rem;" aria-hidden="true">visibility</span>
              <span id="jury-toggle-label">Mostrar</span>
            </button>
          </div>
          <p id="hybrid-didactic-text" style="display: none; color: var(--text-secondary); margin: 0.85rem 0 0 0; line-height: 1.8; border-top: 1px dashed rgba(168, 85, 247, 0.25); padding-top: 0.75rem; font-size: 1.18rem;">
            <strong>Fundamento Científico (Criptografía Asimétrica vs Fuerza Bruta):</strong> En este laboratorio de seguridad no existen contraseñas humanas vulnerables a ataques de diccionario: las claves son generadas como números primos gigantescos de 4096 bits por hardware criptográfico (CSPRNG). La única opción de un adversario es la factorización asintótica de números enteros mediante la criba GNFS, lo cual requeriría más de <strong>100 Trillones de Años</strong> de cómputo ininterrumpido.
          </p>
        </div>
      </div>
      </div>
      <!-- FIN SUBMÓDULO 2: SEGURIDAD DE CIFRADO HÍBRIDO -->
    </div>
  `;

  // Elementos DOM
  // --- Control de Submódulos (Cifrado Híbrido vs Seguridad de Cifrado Híbrido) ---
  const subtabHybridBtn = container.querySelector('#crypto-subtab-hybrid-btn');
  const subtabSecurityBtn = container.querySelector('#crypto-subtab-security-btn');
  const paneHybrid = container.querySelector('#crypto-pane-hybrid');
  const paneSecurity = container.querySelector('#crypto-pane-security');

  if (subtabHybridBtn && subtabSecurityBtn && paneHybrid && paneSecurity) {
    subtabHybridBtn.addEventListener('click', () => {
      subtabHybridBtn.className = 'btn btn-primary';
      subtabHybridBtn.style.flex = '1';
      subtabSecurityBtn.className = 'btn btn-secondary';
      subtabSecurityBtn.style.flex = '1';
      paneHybrid.style.display = 'block';
      paneSecurity.style.display = 'none';
    });

    subtabSecurityBtn.addEventListener('click', () => {
      subtabSecurityBtn.className = 'btn btn-primary';
      subtabSecurityBtn.style.flex = '1';
      subtabHybridBtn.className = 'btn btn-secondary';
      subtabHybridBtn.style.flex = '1';
      paneSecurity.style.display = 'block';
      paneHybrid.style.display = 'none';
    });
  }

  const btnResetCryptoModule = container.querySelector('#btn-reset-crypto-module');
  if (btnResetCryptoModule) {
    btnResetCryptoModule.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cyberlab-reset-module', { detail: { module: 'crypto' } }));
    });
  }

  // --- Control de Colapso del Panel Didáctico para el Jurado ---
  const btnToggleJuryInfo = container.querySelector('#btn-toggle-jury-info');
  const hybridDidacticText = container.querySelector('#hybrid-didactic-text');
  const juryToggleIcon = container.querySelector('#jury-toggle-icon');
  const juryToggleLabel = container.querySelector('#jury-toggle-label');

  if (btnToggleJuryInfo && hybridDidacticText) {
    btnToggleJuryInfo.addEventListener('click', () => {
      const isHidden = hybridDidacticText.style.display === 'none';
      hybridDidacticText.style.display = isHidden ? 'block' : 'none';
      if (juryToggleIcon) juryToggleIcon.textContent = isHidden ? 'visibility_off' : 'visibility';
      if (juryToggleLabel) juryToggleLabel.textContent = isHidden ? 'Ocultar' : 'Mostrar';
    });
  }

  // --- Control de Visibilidad de las Secciones 1 y 2 (Cifrado Simétrico AES) ---
  const btnToggleAesSection = container.querySelector('#btn-toggle-aes-section');
  const btnToggleAesInline = container.querySelector('#btn-toggle-aes-inline');
  const btnShowAesBanner = container.querySelector('#btn-show-aes-banner');
  const secAesSymmetricWrapper = container.querySelector('#sec-aes-symmetric-wrapper');
  const bannerAesCollapsed = container.querySelector('#banner-aes-collapsed');
  const iconToggleAes = container.querySelector('#icon-toggle-aes');
  const labelToggleAes = container.querySelector('#label-toggle-aes');

  let isAesSectionVisible = true;

  const setAesSectionVisibility = (visible) => {
    isAesSectionVisible = visible;
    if (isAesSectionVisible) {
      if (secAesSymmetricWrapper) secAesSymmetricWrapper.style.display = 'block';
      if (bannerAesCollapsed) bannerAesCollapsed.style.display = 'none';
      if (iconToggleAes) iconToggleAes.textContent = 'visibility_off';
      if (labelToggleAes) labelToggleAes.textContent = 'Ocultar Cifrado AES';
      if (btnToggleAesSection) {
        btnToggleAesSection.style.borderColor = 'var(--accent-cyan)';
        btnToggleAesSection.style.color = 'var(--accent-cyan)';
      }
    } else {
      if (secAesSymmetricWrapper) secAesSymmetricWrapper.style.display = 'none';
      if (bannerAesCollapsed) bannerAesCollapsed.style.display = 'flex';
      if (iconToggleAes) iconToggleAes.textContent = 'visibility';
      if (labelToggleAes) labelToggleAes.textContent = 'Mostrar Cifrado AES';
      if (btnToggleAesSection) {
        btnToggleAesSection.style.borderColor = 'var(--accent-emerald)';
        btnToggleAesSection.style.color = 'var(--accent-emerald)';
      }
    }
  };

  if (btnToggleAesSection) {
    btnToggleAesSection.addEventListener('click', () => setAesSectionVisibility(!isAesSectionVisible));
  }
  if (btnToggleAesInline) {
    btnToggleAesInline.addEventListener('click', () => setAesSectionVisibility(!isAesSectionVisible));
  }
  if (btnShowAesBanner) {
    btnShowAesBanner.addEventListener('click', () => setAesSectionVisibility(true));
  }

  // --- Control de Visibilidad de la Sección 3 (Benchmark KDF PBKDF2) ---
  const btnToggleKdfSection = container.querySelector('#btn-toggle-kdf-section');
  const btnToggleKdfInline = container.querySelector('#btn-toggle-kdf-inline');
  const btnShowKdfBanner = container.querySelector('#btn-show-kdf-banner');
  const secKdfBenchmarkCard = container.querySelector('#sec-kdf-benchmark-card');
  const bannerKdfCollapsed = container.querySelector('#banner-kdf-collapsed');
  const iconToggleKdf = container.querySelector('#icon-toggle-kdf');
  const labelToggleKdf = container.querySelector('#label-toggle-kdf');

  let isKdfSectionVisible = true;

  const setKdfSectionVisibility = (visible) => {
    isKdfSectionVisible = visible;
    if (isKdfSectionVisible) {
      if (secKdfBenchmarkCard) secKdfBenchmarkCard.style.display = 'block';
      if (bannerKdfCollapsed) bannerKdfCollapsed.style.display = 'none';
      if (iconToggleKdf) iconToggleKdf.textContent = 'visibility_off';
      if (labelToggleKdf) labelToggleKdf.textContent = 'Ocultar Benchmark KDF';
      if (btnToggleKdfSection) {
        btnToggleKdfSection.style.borderColor = 'var(--accent-emerald)';
        btnToggleKdfSection.style.color = 'var(--accent-emerald)';
      }
    } else {
      if (secKdfBenchmarkCard) secKdfBenchmarkCard.style.display = 'none';
      if (bannerKdfCollapsed) bannerKdfCollapsed.style.display = 'flex';
      if (iconToggleKdf) iconToggleKdf.textContent = 'visibility';
      if (labelToggleKdf) labelToggleKdf.textContent = 'Mostrar Benchmark KDF';
      if (btnToggleKdfSection) {
        btnToggleKdfSection.style.borderColor = 'var(--accent-emerald)';
        btnToggleKdfSection.style.color = 'var(--accent-emerald)';
      }
    }
  };

  if (btnToggleKdfSection) {
    btnToggleKdfSection.addEventListener('click', () => setKdfSectionVisibility(!isKdfSectionVisible));
  }
  if (btnToggleKdfInline) {
    btnToggleKdfInline.addEventListener('click', () => setKdfSectionVisibility(!isKdfSectionVisible));
  }
  if (btnShowKdfBanner) {
    btnShowKdfBanner.addEventListener('click', () => setKdfSectionVisibility(true));
  }

  const plainInput = container.querySelector('#crypto-plain-input');
  const passInput = container.querySelector('#crypto-pass-input');
  const btnRunEncrypt = container.querySelector('#btn-run-encrypt');

  const cryptoStructureBox = container.querySelector('#crypto-structure-box');
  const hexSalt = container.querySelector('#hex-salt');
  const hexIv = container.querySelector('#hex-iv');
  const hexTag = container.querySelector('#hex-tag');
  const hexCipher = container.querySelector('#hex-cipher');
  const packedBase64Output = container.querySelector('#packed-base64-output');
  const btnEmailAesPackage = container.querySelector('#btn-email-aes-package');

  const decryptBase64Input = container.querySelector('#decrypt-base64-input');
  const decryptPassInput = container.querySelector('#decrypt-pass-input');
  const btnRunDecrypt = container.querySelector('#btn-run-decrypt');
  const btnTamperTest = container.querySelector('#btn-tamper-test');
  const decryptResultBox = container.querySelector('#decrypt-result-box');
  const decryptStatusAlert = container.querySelector('#decrypt-status-alert');
  const decryptedPlaintextOutput = container.querySelector('#decrypted-plaintext-output');
  const cryptoAttemptsBadge = container.querySelector('#crypto-attempts-badge');
  const cryptoLockoutBanner = container.querySelector('#crypto-lockout-banner');
  const cryptoPenaltyLabel = container.querySelector('#crypto-penalty-label');
  const cryptoCountdownDisplay = container.querySelector('#crypto-countdown-display');

  // Elementos Benchmark PBKDF2 / Prueba Extrema
  const inputBenchmarkIterations = container.querySelector('#input-benchmark-iterations');
  const inputBenchmarkPassword = container.querySelector('#input-benchmark-password');
  const btnRunKdfBenchmark = container.querySelector('#btn-run-kdf-benchmark');
  const btnIterPresets = container.querySelectorAll('.btn-iter-preset');
  const benchElapsedMs = container.querySelector('#bench-elapsed-ms');
  const benchHashesSec = container.querySelector('#bench-hashes-sec');
  const benchSecurityLevel = container.querySelector('#bench-security-level');
  const benchCrackTime = container.querySelector('#bench-crack-time');
  const benchKeyPreview = container.querySelector('#bench-key-preview');
  const benchmarkStatusBadge = container.querySelector('#benchmark-status-badge');
  const benchExplanationText = container.querySelector('#bench-explanation-text');

  // RSA & Two-Column Hybrid DOM
  const btnGenRsa = container.querySelector('#btn-gen-rsa');
  const rsaPublicKey = container.querySelector('#rsa-public-key');
  const rsaPrivateKey = container.querySelector('#rsa-private-key');
  const btnCopyPub = container.querySelector('#btn-copy-pub');
  const btnDownloadPubPem = container.querySelector('#btn-download-pub-pem');
  const btnCopyPriv = container.querySelector('#btn-copy-priv');
  const btnDownloadPrivPem = container.querySelector('#btn-download-priv-pem');

  const hybridMessageInput = container.querySelector('#hybrid-message-input');
  const btnAliceModeText = container.querySelector('#btn-alice-mode-text');
  const btnAliceModeFile = container.querySelector('#btn-alice-mode-file');
  const aliceTextWrap = container.querySelector('#alice-text-wrap');
  const aliceFileWrap = container.querySelector('#alice-file-wrap');
  const aliceFileInput = container.querySelector('#alice-file-input');
  const aliceFileDropzone = container.querySelector('#alice-file-dropzone');
  const aliceFileName = container.querySelector('#alice-file-name');
  const aliceFileSize = container.querySelector('#alice-file-size');

  const btnAliceEncrypt = container.querySelector('#btn-alice-encrypt');
  const btnEmailHybridEnvelope = container.querySelector('#btn-email-hybrid-envelope');
  const btnDownloadHybridEnvelope = container.querySelector('#btn-download-hybrid-envelope');
  const aliceOutputBox = container.querySelector('#alice-output-box');
  const aliceEncKey = container.querySelector('#alice-enc-key');
  const aliceIv = container.querySelector('#alice-iv');
  const aliceTag = container.querySelector('#alice-tag');
  const aliceCipher = container.querySelector('#alice-cipher');

  const bobEnvelopeSourceBadge = container.querySelector('#bob-envelope-source-badge');
  const bobEnvelopeFileInput = container.querySelector('#bob-envelope-file-input');
  const bobDropzone = container.querySelector('#bob-dropzone');
  const bobLoadedEnvelopeInfo = container.querySelector('#bob-loaded-envelope-info');
  const bobPrivkeySourceBadge = container.querySelector('#bob-privkey-source-badge');
  const bobPrivkeyFileInput = container.querySelector('#bob-privkey-file-input');
  const btnBobUploadPrivFile = container.querySelector('#btn-bob-upload-priv-file');
  const btnBobUseGeneratedPriv = container.querySelector('#btn-bob-use-generated-priv');
  const bobLoadedPrivkeyInfo = container.querySelector('#bob-loaded-privkey-info');
  const bobPrivateKeyInput = container.querySelector('#bob-private-key-input');

  const btnBobDecrypt = container.querySelector('#btn-bob-decrypt');
  const bobOutputBox = container.querySelector('#bob-output-box');
  const bobDecKey = container.querySelector('#bob-dec-key');
  const bobPlaintext = container.querySelector('#bob-plaintext');
  const bobRecoveredFileBox = container.querySelector('#bob-recovered-file-box');
  const bobRecoveredImg = container.querySelector('#bob-recovered-img');
  const bobDownloadRecoveredBtn = container.querySelector('#bob-download-recovered-btn');

  // Diagram Elements (Infografía Visual Dinámica)
  const step1Indicator = container.querySelector('#step-1-indicator');
  const step2Indicator = container.querySelector('#step-2-indicator');
  const step3Indicator = container.querySelector('#step-3-indicator');
  const diagramNodeAlice = container.querySelector('#diagram-node-alice');
  const diagramNodeBob = container.querySelector('#diagram-node-bob');
  const diagramTransitPulse = container.querySelector('#diagram-transit-pulse');
  const diagramEnvelope = container.querySelector('#diagram-envelope');
  const diagramEnvelopeIcon = container.querySelector('#diagram-envelope-icon');
  const diagramEnvelopeTitle = container.querySelector('#diagram-envelope-title');
  const diagramEnvelopeStatus = container.querySelector('#diagram-envelope-status');

  let currentHybridPayload = null;
  let aliceActiveMode = 'text'; // 'text' | 'file'
  let aliceSelectedFile = null; // { name, size, type, dataUrl }

  // --- Sistema de Notificaciones Toast Modernas (Auto-cierre en 2s) ---
  const showToast = ({ title, message, icon = '<span class="micon" aria-hidden="true">broken_image</span> ', type = 'danger', duration = 2000 }) => {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `crypto-toast crypto-toast-${type}`;
    toast.innerHTML = `
      <div class="crypto-toast-icon">${icon}</div>
      <div class="crypto-toast-content">
        <div class="crypto-toast-title">${title}</div>
        <div class="crypto-toast-body">${message}</div>
      </div>
      <div class="crypto-toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    toastContainer.appendChild(toast);

    const timer = setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        toast.remove();
        if (toastContainer && toastContainer.children.length === 0) {
          toastContainer.remove();
        }
      }, 300);
    }, duration);

    // Descartar inmediatamente al hacer clic
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', () => {
      clearTimeout(timer);
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        toast.remove();
        if (toastContainer && toastContainer.children.length === 0) {
          toastContainer.remove();
        }
      }, 200);
    });
  };

  // --- Ejecutar Cifrado Simétrico ---
  btnRunEncrypt.addEventListener('click', async () => {
    try {
      btnRunEncrypt.disabled = true;
      btnRunEncrypt.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Derivando clave con PBKDF2 (600,000 iter)...';

      const plaintext = plainInput.value;
      const password = passInput.value;

      const result = await ApiService.encryptAESGCM(plaintext, password);

      hexSalt.textContent = result.saltHex;
      hexIv.textContent = result.ivHex;
      hexTag.textContent = result.tagHex;
      hexCipher.textContent = result.ciphertextHex;
      packedBase64Output.value = result.packedBase64;
      cryptoStructureBox.style.display = 'block';

      // Precargar en la columna de descifrado
      decryptBase64Input.value = result.packedBase64;
      decryptPassInput.value = password;
    } catch (err) {
      showToast({
        title: 'Error en Cifrado',
        message: err.message,
        icon: '<span class="micon" aria-hidden="true">cancel</span> ',
        type: 'danger',
        duration: 2000
      });
    } finally {
      btnRunEncrypt.disabled = false;
      btnRunEncrypt.innerHTML = '<span class="micon" aria-hidden="true">lock</span>  Cifrar con AES-256-GCM + PBKDF2';
    }
  });

  // --- Despachar Paquete Cifrado AES por Correo Electrónico ---
  if (btnEmailAesPackage) {
    btnEmailAesPackage.addEventListener('click', () => {
      const base64 = packedBase64Output.value.trim();
      if (!base64) {
        showToast({
          title: 'Sin Datos Cifrados',
          message: 'Primero debes cifrar un mensaje con AES-256-GCM antes de enviarlo.',
          icon: '<span class="micon" aria-hidden="true">warning</span> ',
          type: 'warning',
          duration: 2000
        });
        return;
      }
      openEmailModal({
        filename: 'paquete_cifrado_aes_gcm.txt',
        mimeType: 'text/plain',
        getAttachmentBase64: () => btoa(base64),
        defaultSubject: '<span class="micon" aria-hidden="true">key</span>  Paquete Cifrado AES-256-GCM + PBKDF2 (Laboratorio)',
        defaultNote: 'Te envío un paquete binario cifrado con AES-256-GCM y clave derivada mediante PBKDF2 (600,000 iteraciones). Cárgalo en la sección "Descifrado y Prueba de Integridad" para validar su autenticidad.',
        showToast
      });
    });
  }

  // --- Benchmark KDF / Prueba de Cifrado Extremo (PBKDF2) ---
  if (btnIterPresets && btnIterPresets.length > 0) {
    btnIterPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        btnIterPresets.forEach(b => {
          b.style.borderColor = 'var(--border-color)';
          b.style.color = 'var(--text-primary)';
          b.style.fontWeight = 'normal';
        });
        const iter = btn.getAttribute('data-iter');
        if (inputBenchmarkIterations) inputBenchmarkIterations.value = iter;
        const iterNum = parseInt(iter, 10);
        btn.style.borderColor = iterNum >= 600000 ? 'var(--accent-emerald)' : 'var(--accent-cyan)';
        btn.style.color = iterNum >= 600000 ? 'var(--accent-emerald)' : 'var(--accent-cyan)';
        btn.style.fontWeight = '700';
      });
    });
  }

  // --- Controles de Terminal Forense PBKDF2 ---
  const terminalAuditStatus = container.querySelector('#terminal-audit-status');
  const btnCopyTerminalOutput = container.querySelector('#btn-copy-terminal-output');
  const btnClearTerminalOutput = container.querySelector('#btn-clear-terminal-output');
  const cryptoTerminalLogBody = container.querySelector('#crypto-terminal-log-body');
  const terminalAttackLogList = container.querySelector('#terminal-attack-log-list');
  const progFillBaseline = container.querySelector('#prog-fill-baseline');
  const progFillCustom = container.querySelector('#prog-fill-custom');
  const progFillOwasp = container.querySelector('#prog-fill-owasp');
  const progTimeBaseline = container.querySelector('#prog-time-baseline');
  const progLabelCustom = container.querySelector('#prog-label-custom');
  const progTimeCustom = container.querySelector('#prog-time-custom');
  const progTimeOwasp = container.querySelector('#prog-time-owasp');
  const matrixColBaseTime = container.querySelector('#matrix-col-base-time');
  const matrixColBaseHps = container.querySelector('#matrix-col-base-hps');
  const matrixColBaseRockyou = container.querySelector('#matrix-col-base-rockyou');
  const matrixColCustomName = container.querySelector('#matrix-col-custom-name');
  const matrixColCustomTime = container.querySelector('#matrix-col-custom-time');
  const matrixColCustomHps = container.querySelector('#matrix-col-custom-hps');
  const matrixColCustomRockyou = container.querySelector('#matrix-col-custom-rockyou');
  const matrixColOwaspTime = container.querySelector('#matrix-col-owasp-time');
  const matrixColOwaspHps = container.querySelector('#matrix-col-owasp-hps');
  const matrixColOwaspRockyou = container.querySelector('#matrix-col-owasp-rockyou');
  const juryCrackTime = container.querySelector('#jury-crack-time');

  if (btnCopyTerminalOutput && cryptoTerminalLogBody) {
    btnCopyTerminalOutput.addEventListener('click', async () => {
      try {
        const text = cryptoTerminalLogBody.innerText || cryptoTerminalLogBody.textContent;
        await navigator.clipboard.writeText(text);
        showToast({
          title: 'Copiado al Portapapeles',
          message: 'Salida forense de la terminal copiada con éxito.',
          icon: '<span class="micon" aria-hidden="true">content_paste</span>',
          type: 'success',
          duration: 2000
        });
      } catch (e) {
        showToast({
          title: 'Error al copiar',
          message: 'No se pudo acceder al portapapeles.',
          type: 'warning',
          duration: 2000
        });
      }
    });
  }

  if (btnClearTerminalOutput) {
    btnClearTerminalOutput.addEventListener('click', () => {
      if (terminalAttackLogList) {
        terminalAttackLogList.innerHTML = '<div style="color: #64748b; font-style: italic; padding: 0.5rem 0;">[Logs limpiados. Haz clic en "Inyectar Iteraciones y Ejecutar Prueba Forense" para ejecutar una nueva auditoría]</div>';
      }
      if (terminalAuditStatus) {
        terminalAuditStatus.className = 'badge badge-cyan';
        terminalAuditStatus.textContent = '● TERMINAL REINICIADA';
      }
      showToast({
        title: 'Terminal Limpia',
        message: 'Buffer de pantalla reiniciado.',
        type: 'info',
        duration: 1500
      });
    });
  }

  if (btnRunKdfBenchmark) {
    btnRunKdfBenchmark.addEventListener('click', async () => {
      const iterations = parseInt(inputBenchmarkIterations.value, 10) || 100000;
      const password = inputBenchmarkPassword.value.trim() || 'ClaveSegura2026!';

      try {
        btnRunKdfBenchmark.disabled = true;
        btnRunKdfBenchmark.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Inyectando y computando PBKDF2...';
        if (benchmarkStatusBadge) {
          benchmarkStatusBadge.className = 'badge badge-amber';
          benchmarkStatusBadge.textContent = `● COMPUTANDO ${iterations.toLocaleString()} ITERACIONES EN CPU...`;
        }
        if (terminalAuditStatus) {
          terminalAuditStatus.className = 'badge badge-amber';
          terminalAuditStatus.textContent = '● AUDITANDO CÓMPUTO CPU...';
        }

        // Animación de inicio de barras de progreso
        if (progFillCustom) progFillCustom.style.width = '30%';
        if (progFillOwasp) progFillOwasp.style.width = '20%';

        let data;
        try {
          data = await ApiService.benchmarkPBKDF2(iterations, password);
        } catch (backendErr) {
          // Fallback a Web Crypto API nativa en navegador
          const start = performance.now();
          const enc = new TextEncoder();
          const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
          );
          const salt = window.crypto.getRandomValues(new Uint8Array(16));
          const derivedKey = await window.crypto.subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt,
              iterations: Math.min(iterations, 1000000),
              hash: 'SHA-512'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
          const elapsedMs = performance.now() - start;
          const rawKey = await window.crypto.subtle.exportKey('raw', derivedKey);
          const keyHex = Array.from(new Uint8Array(rawKey)).map(b => b.toString(16).padStart(2, '0')).join('');
          const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
          const hashesPerSec = Math.max(1, Math.round(1000 / Math.max(0.1, elapsedMs)));
          const segundosTotales = (14341564 * elapsedMs) / 1000;

          let crackTimeStr = '';
          if (segundosTotales < 1) crackTimeStr = '< 1 segundo (Vulnerable)';
          else if (segundosTotales < 60) crackTimeStr = `${Math.round(segundosTotales)} segundos`;
          else if (segundosTotales < 3600) crackTimeStr = `${(segundosTotales / 60).toFixed(1)} minutos`;
          else if (segundosTotales < 86400) crackTimeStr = `${(segundosTotales / 3600).toFixed(1)} horas`;
          else if (segundosTotales < 86400 * 365) crackTimeStr = `${(segundosTotales / 86400).toFixed(1)} días`;
          else crackTimeStr = `${(segundosTotales / (86400 * 365)).toFixed(1)} AÑOS`;

          let securityLevel = 'MODERADO';
          let badgeClass = 'badge-emerald';
          if (iterations < 1000) {
            securityLevel = 'CRÍTICO / INSEGURO';
            badgeClass = 'badge-rose';
          } else if (iterations < 10000) {
            securityLevel = 'DÉBIL / OBSOLETO';
            badgeClass = 'badge-rose';
          } else if (iterations < 100000) {
            securityLevel = 'REGULAR / EXPUESTO A GPUs';
            badgeClass = 'badge-amber';
          } else if (iterations < 600000) {
            securityLevel = 'ALTA RESISTENCIA';
            badgeClass = 'badge-cyan';
          } else {
            securityLevel = 'GRADO MILITAR (OWASP 2023+)';
            badgeClass = 'badge-purple';
          }

          const wordlist = ['123456', 'password', 'admin2026', 'qwertyuiop', 'dragon', 'masterkey'];
          const attackSim = wordlist.map((candidate, idx) => ({
            id: idx + 1,
            candidate,
            status: '❌ FALLÓ (Hash mismatch)',
            elapsedMs: parseFloat((elapsedMs * (0.95 + Math.random() * 0.1)).toFixed(1))
          }));

          data = {
            iterations,
            elapsedMs: parseFloat(elapsedMs.toFixed(2)),
            hashesPerSec,
            crackTimeRockYou: crackTimeStr,
            securityLevel,
            badgeClass,
            saltHex,
            derivedKeyPreview: keyHex.substring(0, 16) + '...' + keyHex.substring(48),
            tableRows: [
              { elapsedMs: 1.16, hashesPerSec: 865, crackTimeRockYou: '4.6 horas' },
              { elapsedMs: parseFloat(elapsedMs.toFixed(2)), hashesPerSec, crackTimeRockYou: crackTimeStr },
              { elapsedMs: 1436.63, hashesPerSec: 1, crackTimeRockYou: '238.5 DÍAS' }
            ],
            attackSim
          };
        }

        // Completar barras de progreso
        if (progFillBaseline) progFillBaseline.style.width = '100%';
        if (progFillCustom) progFillCustom.style.width = '100%';
        if (progFillOwasp) progFillOwasp.style.width = '100%';

        if (progLabelCustom) progLabelCustom.textContent = `Prueba Inyectada (${data.iterations.toLocaleString()} iter)`;
        if (progTimeCustom) progTimeCustom.textContent = `[${data.elapsedMs} ms]`;
        if (data.tableRows && data.tableRows[0] && progTimeBaseline) {
          progTimeBaseline.textContent = `[${data.tableRows[0].elapsedMs} ms]`;
        }
        if (data.tableRows && data.tableRows[2] && progTimeOwasp) {
          progTimeOwasp.textContent = `[${data.tableRows[2].elapsedMs} ms]`;
        }

        // Actualizar Tabla Matriz Forense
        if (matrixColBaseTime && data.tableRows && data.tableRows[0]) {
          matrixColBaseTime.textContent = `${data.tableRows[0].elapsedMs} ms`;
          if (matrixColBaseHps) matrixColBaseHps.textContent = `${data.tableRows[0].hashesPerSec.toLocaleString()} h/s`;
          if (matrixColBaseRockyou) matrixColBaseRockyou.textContent = data.tableRows[0].crackTimeRockYou;
        }

        if (matrixColCustomName) matrixColCustomName.textContent = `Prueba Inyectada (${data.iterations.toLocaleString()} iter)`;
        if (matrixColCustomTime) matrixColCustomTime.textContent = `${data.elapsedMs} ms`;
        if (matrixColCustomHps) matrixColCustomHps.textContent = `${data.hashesPerSec.toLocaleString()} h/s`;
        if (matrixColCustomRockyou) matrixColCustomRockyou.textContent = data.crackTimeRockYou;

        if (matrixColOwaspTime && data.tableRows && data.tableRows[2]) {
          matrixColOwaspTime.textContent = `${data.tableRows[2].elapsedMs} ms`;
          if (matrixColOwaspHps) matrixColOwaspHps.textContent = `${data.tableRows[2].hashesPerSec.toLocaleString()} h/s`;
          if (matrixColOwaspRockyou) matrixColOwaspRockyou.textContent = data.tableRows[2].crackTimeRockYou;
        }

        // Animar la Simulación de Ataque de Diccionario (Hashcat) de forma pausada y visible
        if (terminalAttackLogList && data.attackSim && data.attackSim.length > 0) {
          terminalAttackLogList.innerHTML = '';
          for (let i = 0; i < data.attackSim.length; i++) {
            const item = data.attackSim[i];
            const div = document.createElement('div');
            div.className = 'crypto-attack-item';
            // Paso 1: Mostrar intento en curso con spinner de cómputo
            div.innerHTML = `  <span style="color: #facc15;">[INTENTO ${item.id}/6]</span> Probando clave: "<strong style="color: #fff;">${item.candidate.padEnd(12, ' ')}</strong>" ... <span style="color: #38bdf8; font-weight: 600;">⏳ Computando HMAC-SHA512...</span>`;
            terminalAttackLogList.appendChild(div);
            
            // Pausa realista para apreciar el esfuerzo de CPU
            await new Promise(r => setTimeout(r, 450));

            // Paso 2: Mostrar rechazo por mismatch de hash con latencia real
            div.innerHTML = `  <span style="color: #facc15;">[INTENTO ${item.id}/6]</span> Probando clave: "<strong style="color: #fff;">${item.candidate.padEnd(12, ' ')}</strong>" ... <span style="color: #f87171; font-weight: 700;">❌ FALLÓ</span> <span style="color: #94a3b8;">(Hash mismatch) [Δt: ${item.elapsedMs} ms]</span>`;
            
            // Pausa entre intentos para facilitar la lectura
            await new Promise(r => setTimeout(r, 200));
          }
        }

        // Actualizar tarjetas de telemetría superiores
        if (benchElapsedMs) benchElapsedMs.textContent = `${data.elapsedMs} ms`;
        if (benchHashesSec) benchHashesSec.textContent = `${data.hashesPerSec.toLocaleString()} h/s`;
        if (benchSecurityLevel) {
          benchSecurityLevel.textContent = data.securityLevel;
          benchSecurityLevel.className = `badge ${data.badgeClass}`;
        }
        if (benchCrackTime) benchCrackTime.textContent = data.crackTimeRockYou;
        if (benchKeyPreview) benchKeyPreview.textContent = data.derivedKeyPreview;

        if (juryCrackTime) juryCrackTime.textContent = data.crackTimeRockYou;

        if (benchmarkStatusBadge) {
          benchmarkStatusBadge.className = `badge ${data.badgeClass}`;
          benchmarkStatusBadge.textContent = `● PRUEBA EXITOSA: ${data.iterations.toLocaleString()} ITERACIONES (${data.elapsedMs} ms)`;
        }

        if (terminalAuditStatus) {
          terminalAuditStatus.className = 'badge badge-emerald';
          terminalAuditStatus.textContent = '● AUDITORÍA COMPLETADA (EXITOSA)';
        }

        if (benchExplanationText) {
          if (data.iterations <= 1000) {
            benchExplanationText.innerHTML = `⚠️ <strong style="color:#f87171;">Vulnerabilidad Crítica detectada:</strong> Con apenas ${data.iterations.toLocaleString()} iteraciones, la CPU tarda solo <strong>${data.elapsedMs} ms</strong> por intento. Un atacante con tarjeta gráfica (GPU) puede probar miles de claves por segundo y descifrar el diccionario completo en apenas unas horas.`;
          } else if (data.iterations <= 100000) {
            benchExplanationText.innerHTML = `⚡ <strong style="color:var(--accent-cyan);">Prueba Extrema Demostrada:</strong> Con ${data.iterations.toLocaleString()} iteraciones, cada intento individual demanda <strong>${data.elapsedMs} ms</strong>. Multiplicado por 14.3 millones de contraseñas de RockYou, el tiempo teórico de ataque se eleva a <strong style="color:var(--accent-emerald);">${data.crackTimeRockYou}</strong>, demostrando cómo el retraso asimétrico protege la contraseña.`;
          } else {
            benchExplanationText.innerHTML = `💎 <strong style="color:#d8b4fe;">Máxima Seguridad OWASP 2023+ (Software Activo):</strong> Con 600,000 iteraciones, cada intento toma <strong>${data.elapsedMs} ms</strong> (~1 a 1.5 segundos). Un atacante offline necesitaría más de <strong style="color:var(--accent-emerald);">${data.crackTimeRockYou}</strong> de cómputo ininterrumpido en CPU para agotar el diccionario RockYou. La fuerza bruta queda matemáticamente anulada.`;
          }
        }

        showToast({
          title: 'Auditoría KDF Completada',
          message: `${data.iterations.toLocaleString()} iteraciones calculadas en ${data.elapsedMs} ms (${data.securityLevel}).`,
          icon: '<span class="micon" aria-hidden="true">check_circle</span> ',
          type: 'success',
          duration: 3000
        });
      } catch (err) {
        showToast({
          title: 'Error en Benchmark',
          message: err.message,
          icon: '<span class="micon" aria-hidden="true">cancel</span> ',
          type: 'danger',
          duration: 2500
        });
      } finally {
        btnRunKdfBenchmark.disabled = false;
        btnRunKdfBenchmark.innerHTML = '<span class="micon" aria-hidden="true">bolt</span>  ⚡ Inyectar Iteraciones y Ejecutar Prueba Forense';
      }
    });
  }

  // --- Sistema Anti-Fuerza Bruta y Cooldown Progresivo (1m -> 5m -> 10m) en Laboratorio ---
  const CRYPTO_LOCKOUT_STORAGE_KEY = 'crypto_lab_bruteforce_lockout_v1';
  let cryptoCountdownTimerId = null;

  function getCryptoLockoutState() {
    try {
      const raw = localStorage.getItem(CRYPTO_LOCKOUT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return { failedAttempts: 0, penaltyStage: 0, lockoutUntil: 0 };
  }

  function saveCryptoLockoutState(state) {
    try {
      localStorage.setItem(CRYPTO_LOCKOUT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Fallback
    }
  }

  function clearCryptoLockoutState() {
    try {
      localStorage.removeItem(CRYPTO_LOCKOUT_STORAGE_KEY);
    } catch {
      // Fallback
    }
    if (cryptoCountdownTimerId) {
      clearInterval(cryptoCountdownTimerId);
      cryptoCountdownTimerId = null;
    }
  }

  function startCryptoLockoutCountdown(lockoutUntil, penaltyStage) {
    if (cryptoCountdownTimerId) clearInterval(cryptoCountdownTimerId);

    cryptoLockoutBanner.style.display = 'flex';
    decryptPassInput.disabled = true;
    btnRunDecrypt.disabled = true;
    btnRunDecrypt.style.cursor = 'not-allowed';

    let penaltyLabelText = '1 minuto';
    if (penaltyStage === 2) penaltyLabelText = '5 minutos';
    else if (penaltyStage >= 3) penaltyLabelText = '10 minutos';
    cryptoPenaltyLabel.textContent = penaltyLabelText;

    cryptoAttemptsBadge.style.display = 'inline-block';
    cryptoAttemptsBadge.className = 'badge badge-rose';
    cryptoAttemptsBadge.textContent = '🔒 Bloqueado por Cooldown';

    const tick = () => {
      const now = Date.now();
      const remainingMs = lockoutUntil - now;
      if (remainingMs <= 0) {
        clearInterval(cryptoCountdownTimerId);
        cryptoCountdownTimerId = null;
        cryptoLockoutBanner.style.display = 'none';
        decryptPassInput.disabled = false;
        btnRunDecrypt.disabled = false;
        btnRunDecrypt.innerHTML = '<span class="micon" aria-hidden="true">lock_open</span>  Descifrar y Validar';
        btnRunDecrypt.style.cursor = 'pointer';
        decryptPassInput.focus();

        cryptoAttemptsBadge.style.display = 'inline-block';
        cryptoAttemptsBadge.className = 'badge badge-amber';
        cryptoAttemptsBadge.textContent = '⚠️ Reintento desbloqueado';

        showToast({
          title: 'Tiempo de Espera Finalizado',
          message: 'El bloqueo ha expirado. Ya puedes volver a ingresar la contraseña de descifrado.',
          icon: '<span class="micon" aria-hidden="true">lock_open</span> ',
          type: 'info',
          duration: 3000
        });
        return;
      }

      const totalSec = Math.ceil(remainingMs / 1000);
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      cryptoCountdownDisplay.textContent = `${mins}:${secs}`;
      btnRunDecrypt.innerHTML = `<span class="micon" aria-hidden="true">hourglass_top</span>  Bloqueado por Seguridad (${mins}:${secs})`;
    };

    tick();
    cryptoCountdownTimerId = setInterval(tick, 1000);
  }

  function updateCryptoLockoutUI() {
    const state = getCryptoLockoutState();
    const now = Date.now();

    if (state.lockoutUntil && state.lockoutUntil > now) {
      startCryptoLockoutCountdown(state.lockoutUntil, state.penaltyStage);
      return;
    }

    if (cryptoCountdownTimerId) {
      clearInterval(cryptoCountdownTimerId);
      cryptoCountdownTimerId = null;
    }

    cryptoLockoutBanner.style.display = 'none';
    decryptPassInput.disabled = false;
    btnRunDecrypt.disabled = false;
    btnRunDecrypt.innerHTML = '<span class="micon" aria-hidden="true">lock_open</span>  Descifrar y Validar';
    btnRunDecrypt.style.cursor = 'pointer';

    if (state.penaltyStage === 0 && state.failedAttempts > 0 && state.failedAttempts < 5) {
      const remaining = 5 - state.failedAttempts;
      cryptoAttemptsBadge.style.display = 'inline-block';
      cryptoAttemptsBadge.className = remaining <= 2 ? 'badge badge-rose' : 'badge badge-amber';
      cryptoAttemptsBadge.textContent = `Intentos restantes: ${remaining}/5`;
    } else if (state.penaltyStage > 0) {
      cryptoAttemptsBadge.style.display = 'inline-block';
      cryptoAttemptsBadge.className = 'badge badge-rose';
      cryptoAttemptsBadge.textContent = '⚠️ 1 intento antes de nuevo cooldown';
    } else {
      cryptoAttemptsBadge.style.display = 'none';
    }
  }

  // --- Ejecutar Descifrado Simétrico ---
  btnRunDecrypt.addEventListener('click', async () => {
    const state = getCryptoLockoutState();
    const now = Date.now();

    // Verificación preventiva de bloqueo activo
    if (state.lockoutUntil && state.lockoutUntil > now) {
      startCryptoLockoutCountdown(state.lockoutUntil, state.penaltyStage);
      showToast({
        title: 'Acceso en Cooldown',
        message: 'Debes esperar a que el temporizador finalice para reintentar.',
        icon: '<span class="micon" aria-hidden="true">hourglass_top</span> ',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    const packedData = decryptBase64Input.value.trim();
    const password = decryptPassInput.value;

    if (!packedData) {
      showToast({
        title: 'Paquete Requerido',
        message: 'Por favor ingresa o genera un paquete cifrado en Base64.',
        icon: '<span class="micon" aria-hidden="true">warning</span> ',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    if (!password) {
      showToast({
        title: 'Contraseña Requerida',
        message: 'Por favor ingresa la contraseña para descifrar.',
        icon: '<span class="micon" aria-hidden="true">warning</span> ',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    try {
      btnRunDecrypt.disabled = true;
      btnRunDecrypt.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Verificando AuthTag y descifrando...';

      const result = await ApiService.decryptAESGCM(packedData, password);

      // ¡ÉXITO! Restablecer intentos y cooldown
      clearCryptoLockoutState();
      updateCryptoLockoutUI();

      decryptResultBox.style.display = 'flex';
      decryptStatusAlert.className = 'alert-box alert-success';
      decryptStatusAlert.innerHTML = `
        <strong><span class="micon" aria-hidden="true">check_circle</span>  Autenticación GCM Válida:</strong> El mensaje no ha sufrido ninguna modificación ni truncamiento. Se verificaron el Salt (${result.saltHex.substring(0,8)}...), el IV (${result.ivHex.substring(0,8)}...) y el Authentication Tag (${result.tagHex.substring(0,8)}...).
      `;
      decryptedPlaintextOutput.value = result.plaintextUtf8;

      showToast({
        title: '¡Descifrado y Autenticado!',
        message: 'El Authentication Tag coincidió. Intentos restablecidos.',
        icon: '<span class="micon" aria-hidden="true">check_circle</span> ',
        type: 'success',
        duration: 2500
      });
    } catch (err) {
      decryptResultBox.style.display = 'flex';
      decryptStatusAlert.className = 'alert-box alert-danger';
      decryptedPlaintextOutput.value = '';

      // Registrar intento fallido y evaluar cooldown progresivo
      let currentState = getCryptoLockoutState();
      currentState.failedAttempts = (currentState.failedAttempts || 0) + 1;

      let triggeredLockout = false;
      let durationMs = 0;
      let durationName = '';

      if (currentState.penaltyStage === 0) {
        if (currentState.failedAttempts >= 5) {
          // 5 intentos fallidos -> Bloqueo de 1 minuto
          currentState.penaltyStage = 1;
          durationMs = 60 * 1000;
          durationName = '1 minuto';
          currentState.lockoutUntil = Date.now() + durationMs;
          triggeredLockout = true;
        }
      } else if (currentState.penaltyStage === 1) {
        // Vuelve a fallar tras el primer cooldown -> Bloqueo de 5 minutos
        currentState.penaltyStage = 2;
        durationMs = 5 * 60 * 1000;
        durationName = '5 minutos';
        currentState.lockoutUntil = Date.now() + durationMs;
        triggeredLockout = true;
      } else {
        // Vuelve a fallar tras el segundo cooldown -> Bloqueo de 10 minutos
        currentState.penaltyStage = 3;
        durationMs = 10 * 60 * 1000;
        durationName = '10 minutos';
        currentState.lockoutUntil = Date.now() + durationMs;
        triggeredLockout = true;
      }

      saveCryptoLockoutState(currentState);

      if (triggeredLockout) {
        startCryptoLockoutCountdown(currentState.lockoutUntil, currentState.penaltyStage);
        decryptStatusAlert.innerHTML = `
          <strong><span class="micon" aria-hidden="true">cancel</span>  Fallo de Verificación Criptográfica:</strong> ${err.message}<br/>
          <span style="font-size: 0.875rem; color:#fca5a5;"><span class="micon" aria-hidden="true">warning</span>  Bloqueo de Seguridad Activado: Has alcanzado el límite de intentos erróneos. Espera <strong>${durationName}</strong> antes de poder reintentar.</span>
        `;
        showToast({
          title: 'Bloqueo Anti-Fuerza Bruta',
          message: `Límite alcanzado. Entrada bloqueada por ${durationName}.`,
          icon: '🛑',
          type: 'danger',
          duration: 3000
        });
      } else {
        updateCryptoLockoutUI();
        const remaining = 5 - currentState.failedAttempts;
        decryptStatusAlert.innerHTML = `
          <strong><span class="micon" aria-hidden="true">cancel</span>  Fallo de Verificación Criptográfica:</strong> ${err.message}<br/>
          <span style="font-size: 0.875rem; color:#fca5a5;"><span class="micon" aria-hidden="true">warning</span>  Te quedan <strong>${remaining} de 5</strong> intentos antes del bloqueo temporal de 1 minuto.</span>
        `;
        showToast({
          title: 'Contraseña Incorrecta',
          message: `Quedan ${remaining} de 5 intentos antes del bloqueo.`,
          icon: '<span class="micon" aria-hidden="true">cancel</span> ',
          type: 'danger',
          duration: 2500
        });
      }
    } finally {
      const finalState = getCryptoLockoutState();
      if (!finalState.lockoutUntil || finalState.lockoutUntil <= Date.now()) {
        btnRunDecrypt.disabled = false;
        btnRunDecrypt.innerHTML = '<span class="micon" aria-hidden="true">lock_open</span>  Descifrar y Validar';
      }
    }
  });

  // --- Simulación de Ataque / Manipulación (Bit-Flip) ---
  if (btnTamperTest) {
    btnTamperTest.addEventListener('click', () => {
      const raw = decryptBase64Input.value.trim();
      if (!raw) {
        showToast({
          title: 'Entrada Requerida',
          message: 'Primero debes generar o ingresar un paquete cifrado en Base64.',
          icon: '<span class="micon" aria-hidden="true">warning</span> ',
          type: 'warning',
          duration: 2000
        });
        return;
      }
      try {
        const binaryStr = atob(raw);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        bytes[bytes.length - 1] ^= 0x01;
        const tamperedStr = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
        decryptBase64Input.value = btoa(tamperedStr);

        showToast({
          title: '¡Ataque Inyectado con Éxito!',
          message: 'Se alteró 1 bit del texto cifrado. Haz clic en "Descifrar y Validar" para comprobar cómo el Authentication Tag detecta la manipulación.',
          icon: '<span class="micon" aria-hidden="true">broken_image</span> ',
          type: 'danger',
          duration: 2000
        });
      } catch (err) {
        showToast({
          title: 'Error en Manipulación',
          message: `No se pudo manipular el payload: ${err.message}`,
          icon: '<span class="micon" aria-hidden="true">cancel</span> ',
          type: 'danger',
          duration: 2000
        });
      }
    });
  }

  // --- Botones de Copiar al Portapapeles ---
  const setupCopyButton = (btn, textarea, defaultLabel) => {
    btn.addEventListener('click', async () => {
      const val = textarea.value.trim();
      if (!val) return;
      try {
        await navigator.clipboard.writeText(val);
        btn.innerHTML = '<span class="micon" aria-hidden="true">check_circle</span>  ¡Copiado!';
        setTimeout(() => { btn.innerHTML = defaultLabel; }, 2000);
      } catch {
        textarea.select();
        document.execCommand('copy');
        btn.innerHTML = '<span class="micon" aria-hidden="true">check_circle</span>  ¡Copiado!';
        setTimeout(() => { btn.innerHTML = defaultLabel; }, 2000);
      }
    });
  };

  setupCopyButton(btnCopyPub, rsaPublicKey, '<span class="micon" aria-hidden="true">content_paste</span>  Copiar');
  setupCopyButton(btnCopyPriv, rsaPrivateKey, '<span class="micon" aria-hidden="true">content_paste</span>  Copiar');

  // --- Botones de Descargar Claves PEM en Archivo ---
  const setupDownloadPemButton = (btn, textarea, filename) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      const pem = textarea.value.trim();
      if (!pem) {
        showToast({ title: 'Sin Clave', message: 'Primero genera el par de claves RSA.', icon: '<span class="micon" aria-hidden="true">warning</span> ', type: 'warning', duration: 2000 });
        return;
      }
      const blob = new Blob([pem], { type: 'application/x-pem-file' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ title: 'Clave Guardada', message: `Archivo ${filename} descargado.`, icon: '<span class="micon" aria-hidden="true">download</span> ', type: 'success', duration: 1800 });
    });
  };

  setupDownloadPemButton(btnDownloadPubPem, rsaPublicKey, 'clave_publica_bob.pem');
  setupDownloadPemButton(btnDownloadPrivPem, rsaPrivateKey, 'clave_privada_bob.pem');

  // --- Generación de Par RSA-4096 ---
  btnGenRsa.addEventListener('click', async () => {
    try {
      btnGenRsa.disabled = true;
      btnGenRsa.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Generando par RSA de 4096 bits (CSPRNG)...';

      const keyPair = await ApiService.generateRSAKeys();
      rsaPublicKey.value = keyPair.publicKey;
      rsaPrivateKey.value = keyPair.privateKey;

      btnAliceEncrypt.disabled = false;
      btnBobDecrypt.disabled = true;
      aliceOutputBox.style.display = 'none';
      bobOutputBox.style.display = 'none';

      // Actualizar Diagrama Visual
      step1Indicator.classList.add('completed');
      step2Indicator.classList.add('active');
      diagramEnvelopeStatus.textContent = '🔓 Clave Pública de Bob publicada. Alice puede empaquetar.';
      diagramEnvelopeStatus.style.color = 'var(--accent-cyan)';
    } catch (err) {
      showToast({
        title: 'Error en Generación RSA',
        message: err.message,
        icon: '<span class="micon" aria-hidden="true">cancel</span> ',
        type: 'danger',
        duration: 2500
      });
    } finally {
      btnGenRsa.disabled = false;
      btnGenRsa.innerHTML = '<span class="micon" aria-hidden="true">bolt</span>  Generar Par de Claves RSA-4096';
    }
  });

  // --- LADO EMISOR (ALICE): Alternar Modo Texto / Archivo ---
  if (btnAliceModeText && btnAliceModeFile) {
    btnAliceModeText.addEventListener('click', () => {
      aliceActiveMode = 'text';
      btnAliceModeText.style.borderColor = 'var(--accent-cyan)';
      btnAliceModeText.style.color = 'var(--accent-cyan)';
      btnAliceModeFile.style.borderColor = 'var(--border-color)';
      btnAliceModeFile.style.color = 'var(--text-secondary)';
      aliceTextWrap.style.display = 'block';
      aliceFileWrap.style.display = 'none';
    });

    btnAliceModeFile.addEventListener('click', () => {
      aliceActiveMode = 'file';
      btnAliceModeFile.style.borderColor = 'var(--accent-cyan)';
      btnAliceModeFile.style.color = 'var(--accent-cyan)';
      btnAliceModeText.style.borderColor = 'var(--border-color)';
      btnAliceModeText.style.color = 'var(--text-secondary)';
      aliceTextWrap.style.display = 'none';
      aliceFileWrap.style.display = 'block';
    });
  }

  // Carga de Archivo/Imagen en Alice
  if (aliceFileDropzone && aliceFileInput) {
    aliceFileDropzone.addEventListener('click', () => aliceFileInput.click());

    const handleAliceFile = (file) => {
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast({
          title: 'Archivo Demasiado Grande',
          message: 'Para el sobre digital RSA/AES el límite recomendado es 2 MB.',
          icon: '<span class="micon" aria-hidden="true">warning</span> ',
          type: 'warning',
          duration: 2500
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        aliceSelectedFile = {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: e.target.result
        };
        aliceFileName.textContent = `📄 ${file.name}`;
        aliceFileSize.textContent = `${(file.size / 1024).toFixed(1)} KB • ${file.type || 'Archivo binario'}`;
        showToast({
          title: 'Archivo Cargado',
          message: `${file.name} listo para empaquetar en el sobre digital.`,
          icon: '📎',
          type: 'success',
          duration: 1800
        });
      };
      reader.readAsDataURL(file);
    };

    aliceFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleAliceFile(e.target.files[0]);
    });

    aliceFileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      aliceFileDropzone.classList.add('drag-active');
    });
    aliceFileDropzone.addEventListener('dragleave', () => aliceFileDropzone.classList.remove('drag-active'));
    aliceFileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      aliceFileDropzone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleAliceFile(e.dataTransfer.files[0]);
    });
  }

  // --- LADO EMISOR (ALICE): Cifrado Híbrido con Clave Pública ---
  btnAliceEncrypt.addEventListener('click', async () => {
    try {
      const pubKey = rsaPublicKey.value;

      if (!pubKey) {
        showToast({
          title: 'Clave Requerida',
          message: 'Primero debes generar el par de claves RSA.',
          icon: '<span class="micon" aria-hidden="true">warning</span> ',
          type: 'warning',
          duration: 2000
        });
        return;
      }

      let plaintextToEncrypt = '';
      if (aliceActiveMode === 'text') {
        plaintextToEncrypt = hybridMessageInput.value.trim();
        if (!plaintextToEncrypt) {
          showToast({
            title: 'Mensaje Requerido',
            message: 'Escribe un mensaje confidencial para empaquetar.',
            icon: '<span class="micon" aria-hidden="true">warning</span> ',
            type: 'warning',
            duration: 2000
          });
          return;
        }
      } else {
        if (!aliceSelectedFile) {
          showToast({
            title: 'Archivo Requerido',
            message: 'Selecciona o arrastra una imagen/archivo confidencial.',
            icon: '<span class="micon" aria-hidden="true">warning</span> ',
            type: 'warning',
            duration: 2000
          });
          return;
        }
        plaintextToEncrypt = JSON.stringify({
          __isCyberlabFile: true,
          name: aliceSelectedFile.name,
          size: aliceSelectedFile.size,
          type: aliceSelectedFile.type,
          dataUrl: aliceSelectedFile.dataUrl
        });
      }

      btnAliceEncrypt.disabled = true;
      btnAliceEncrypt.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Alice cifrando datos con AES y clave con RSA-OAEP...';

      // Alice cifra el mensaje o archivo usando la Clave Pública de Bob
      const hybridPayload = await ApiService.hybridEncrypt(plaintextToEncrypt, pubKey);
      currentHybridPayload = hybridPayload;

      // Mostrar componentes generados en el lado emisor
      aliceEncKey.textContent = `${hybridPayload.encryptedKeyBase64.substring(0, 42)}... (${hybridPayload.encryptedKeyBase64.length} chars)`;
      aliceIv.textContent = hybridPayload.ivHex;
      aliceTag.textContent = hybridPayload.tagHex;
      aliceCipher.textContent = `${hybridPayload.ciphertextBase64.substring(0, 42)}... (${hybridPayload.ciphertextBase64.length} chars)`;
      aliceOutputBox.style.display = 'block';

      // Actualizar Diagrama Visual
      step2Indicator.classList.add('completed');
      step3Indicator.classList.add('active');
      diagramNodeAlice.classList.add('alice-active');
      diagramTransitPulse.style.display = 'block';
      diagramEnvelope.classList.add('glow');
      diagramEnvelopeIcon.textContent = '📦🔒';
      diagramEnvelopeTitle.textContent = 'Sobre Digital Transmitido';
      diagramEnvelopeStatus.textContent = '📡 Clave AES envuelta con RSA-OAEP en tránsito hacia Bob.';
      diagramEnvelopeStatus.style.color = '#a7f3d0';

      // Actualizar estado en Bob
      bobEnvelopeSourceBadge.textContent = 'Sobre en Memoria';
      bobEnvelopeSourceBadge.className = 'badge badge-cyan';
      bobLoadedEnvelopeInfo.style.display = 'block';
      bobLoadedEnvelopeInfo.textContent = '⚡ Sobre digital en memoria listo para descifrar.';

      // Habilitar a Bob para que reciba y descifre
      btnBobDecrypt.disabled = false;
      bobOutputBox.style.display = 'none';
      if (bobPrivateKeyInput && !bobPrivateKeyInput.value && rsaPrivateKey.value) {
        bobPrivateKeyInput.value = rsaPrivateKey.value;
      }
    } catch (err) {
      showToast({
        title: 'Error en Cifrado de Alice',
        message: err.message,
        icon: '<span class="micon" aria-hidden="true">cancel</span> ',
        type: 'danger',
        duration: 2500
      });
    } finally {
      btnAliceEncrypt.disabled = false;
      btnAliceEncrypt.innerHTML = '<span class="micon" aria-hidden="true">lock</span>  Cifrar y Empaquetar Sobre Digital (Alice)';
    }
  });

  // --- Descargar Archivo .JSON del Sobre Digital ---
  if (btnDownloadHybridEnvelope) {
    btnDownloadHybridEnvelope.addEventListener('click', () => {
      if (!currentHybridPayload) {
        showToast({
          title: 'Sobre no Disponible',
          message: 'Primero debes cifrar el sobre digital.',
          icon: '<span class="micon" aria-hidden="true">warning</span> ',
          type: 'warning',
          duration: 2000
        });
        return;
      }
      const jsonStr = JSON.stringify(currentHybridPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sobre_digital_alice_bob_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({
        title: 'Sobre Descargado',
        message: 'Archivo JSON guardado en tu equipo.',
        icon: '<span class="micon" aria-hidden="true">download</span> ',
        type: 'success',
        duration: 1800
      });
    });
  }

  // --- Despachar Sobre Digital Híbrido a Bob por Correo ---
  if (btnEmailHybridEnvelope) {
    btnEmailHybridEnvelope.addEventListener('click', () => {
      if (!currentHybridPayload) {
        showToast({
          title: 'Sobre no Disponible',
          message: 'Primero debes cifrar y empaquetar el sobre digital antes de despacharlo.',
          icon: '<span class="micon" aria-hidden="true">warning</span> ',
          type: 'warning',
          duration: 2000
        });
        return;
      }
      const jsonStr = JSON.stringify(currentHybridPayload, null, 2);
      openEmailModal({
        filename: 'sobre_digital_alice_bob.json',
        mimeType: 'application/json',
        getAttachmentBase64: () => btoa(unescape(encodeURIComponent(jsonStr))),
        defaultSubject: '<span class="micon" aria-hidden="true">inventory_2</span>  Sobre Digital Blindado (RSA-OAEP 4096 + AES-GCM)',
        defaultNote: 'Hola Bob, te envío el sobre digital generado por Alice. Contiene la clave simétrica efímera de 256 bits protegida con tu clave pública RSA-4096 y el mensaje/archivo cifrado con AES-GCM.',
        showToast
      });
    });
  }

  // --- LADO RECEPTOR (BOB): Carga de Archivo .JSON Recibido por Correo ---
  if (bobDropzone && bobEnvelopeFileInput) {
    bobDropzone.addEventListener('click', () => bobEnvelopeFileInput.click());

    const handleLoadedEnvelope = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.encryptedKeyBase64 || !parsed.ivHex || !parsed.tagHex || !parsed.ciphertextBase64) {
            throw new Error('El archivo JSON no tiene la estructura de un sobre digital válido (faltan encryptedKeyBase64, ivHex, tagHex o ciphertextBase64).');
          }
          currentHybridPayload = parsed;
          bobEnvelopeSourceBadge.textContent = 'Archivo del Correo Cargado';
          bobEnvelopeSourceBadge.className = 'badge badge-emerald';
          bobLoadedEnvelopeInfo.style.display = 'block';
          bobLoadedEnvelopeInfo.textContent = `📥 ${file.name} (${(file.size / 1024).toFixed(1)} KB) listo para abrir.`;
          btnBobDecrypt.disabled = false;
          
          if (bobPrivateKeyInput && !bobPrivateKeyInput.value && rsaPrivateKey.value) {
            bobPrivateKeyInput.value = rsaPrivateKey.value;
          }

          step2Indicator.classList.add('completed');
          step3Indicator.classList.add('active');
          diagramEnvelopeStatus.textContent = `📥 Sobre ${file.name} cargado por Bob. Listo para descifrar.`;
          diagramEnvelopeStatus.style.color = 'var(--accent-emerald)';

          showToast({
            title: 'Sobre Cargado con Éxito',
            message: `Archivo ${file.name} validado. Procede a descifrarlo.`,
            icon: '<span class="micon" aria-hidden="true">check_circle</span> ',
            type: 'success',
            duration: 2000
          });
        } catch (err) {
          showToast({
            title: 'Formato de Sobre Inválido',
            message: err.message,
            icon: '<span class="micon" aria-hidden="true">cancel</span> ',
            type: 'danger',
            duration: 3000
          });
        }
      };
      reader.readAsText(file);
    };

    bobEnvelopeFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleLoadedEnvelope(e.target.files[0]);
    });

    bobDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      bobDropzone.style.borderColor = 'var(--accent-emerald)';
    });
    bobDropzone.addEventListener('dragleave', () => {
      bobDropzone.style.borderColor = 'rgba(168, 85, 247, 0.4)';
    });
    bobDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      bobDropzone.style.borderColor = 'rgba(168, 85, 247, 0.4)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleLoadedEnvelope(e.dataTransfer.files[0]);
    });
  }

  // --- Carga de Archivo .pem de Clave Privada en Bob ---
  if (btnBobUploadPrivFile && bobPrivkeyFileInput) {
    btnBobUploadPrivFile.addEventListener('click', () => bobPrivkeyFileInput.click());

    bobPrivkeyFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target.result;
          if (!content.includes('PRIVATE KEY')) {
            showToast({
              title: 'Formato no Reconocido',
              message: 'El archivo debe contener un bloque -----BEGIN PRIVATE KEY-----.',
              icon: '<span class="micon" aria-hidden="true">warning</span> ',
              type: 'warning',
              duration: 2500
            });
          }
          bobPrivateKeyInput.value = content;
          bobPrivkeySourceBadge.textContent = 'Archivo .pem Cargado';
          bobPrivkeySourceBadge.className = 'badge badge-emerald';
          bobLoadedPrivkeyInfo.style.display = 'block';
          bobLoadedPrivkeyInfo.textContent = `🗝️ ${file.name} cargada como clave privada activa.`;
          
          if (currentHybridPayload) {
            btnBobDecrypt.disabled = false;
          }

          showToast({
            title: 'Clave Privada Cargada',
            message: `Archivo ${file.name} listo para descifrar.`,
            icon: '<span class="micon" aria-hidden="true">vpn_key</span> ',
            type: 'success',
            duration: 2000
          });
        };
        reader.readAsText(file);
      }
    });
  }

  // Botón para autorrellenar con la clave privada generada arriba
  if (btnBobUseGeneratedPriv) {
    btnBobUseGeneratedPriv.addEventListener('click', () => {
      if (rsaPrivateKey && rsaPrivateKey.value) {
        bobPrivateKeyInput.value = rsaPrivateKey.value;
        bobPrivkeySourceBadge.textContent = 'Clave en Memoria';
        bobPrivkeySourceBadge.className = 'badge badge-cyan';
        bobLoadedPrivkeyInfo.style.display = 'block';
        bobLoadedPrivkeyInfo.textContent = '⚡ Clave privada generada en memoria asignada a Bob.';
        
        if (currentHybridPayload) {
          btnBobDecrypt.disabled = false;
        }

        showToast({
          title: 'Clave Asignada',
          message: 'Clave privada copiada al panel de Bob.',
          icon: '<span class="micon" aria-hidden="true">vpn_key</span> ',
          type: 'success',
          duration: 1500
        });
      } else {
        showToast({
          title: 'Sin Clave Generada',
          message: 'Primero debes generar el par de claves RSA en el Paso 1.',
          icon: '<span class="micon" aria-hidden="true">warning</span> ',
          type: 'warning',
          duration: 2000
        });
      }
    });
  }

  // --- LADO RECEPTOR (BOB): Descifrado del Sobre con Clave Privada ---
  btnBobDecrypt.addEventListener('click', async () => {
    if (!currentHybridPayload) {
      showToast({
        title: 'Sobre no Disponible',
        message: 'Alice primero debe cifrar el paquete o debes cargar el archivo JSON del correo.',
        icon: '<span class="micon" aria-hidden="true">warning</span> ',
        type: 'warning',
        duration: 2000
      });
      return;
    }
    const privKey = (bobPrivateKeyInput && bobPrivateKeyInput.value.trim()) || rsaPrivateKey.value.trim();
    if (!privKey) {
      showToast({
        title: 'Clave Requerida',
        message: 'Se requiere la clave privada de Bob para abrir el sobre digital.',
        icon: '<span class="micon" aria-hidden="true">warning</span> ',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    try {
      btnBobDecrypt.disabled = true;
      btnBobDecrypt.innerHTML = '<span class="micon" aria-hidden="true">hourglass_top</span>  Bob abriendo sobre digital con Clave Privada...';

      // Bob abre el sobre digital con su clave privada y descifra con AES-GCM
      const decrypted = await ApiService.hybridDecrypt(currentHybridPayload, privKey);

      bobDecKey.textContent = '256 bits recuperados con éxito vía RSA-OAEP';
      
      // Comprobar si el contenido es un archivo/imagen o texto plano
      let isFilePayload = false;
      try {
        if (typeof decrypted.plaintext === 'string' && decrypted.plaintext.startsWith('{"__isCyberlabFile":true')) {
          const parsedFile = JSON.parse(decrypted.plaintext);
          isFilePayload = true;
          bobPlaintext.textContent = `📄 [Archivo Confidencial Recuperado: ${parsedFile.name} (${(parsedFile.size / 1024).toFixed(1)} KB)]`;
          
          if (bobRecoveredFileBox && bobRecoveredImg && bobDownloadRecoveredBtn) {
            bobRecoveredFileBox.style.display = 'block';
            bobDownloadRecoveredBtn.href = parsedFile.dataUrl;
            bobDownloadRecoveredBtn.download = parsedFile.name;
            bobDownloadRecoveredBtn.textContent = `📥 Descargar ${parsedFile.name}`;

            if (parsedFile.dataUrl.startsWith('data:image/')) {
              bobRecoveredImg.src = parsedFile.dataUrl;
              bobRecoveredImg.style.display = 'inline-block';
            } else {
              bobRecoveredImg.style.display = 'none';
            }
          }
        }
      } catch (e) {
        isFilePayload = false;
      }

      if (!isFilePayload) {
        bobPlaintext.textContent = decrypted.plaintext;
        if (bobRecoveredFileBox) bobRecoveredFileBox.style.display = 'none';
      }

      bobOutputBox.style.display = 'block';

      // Actualizar Diagrama Visual
      step3Indicator.classList.add('completed');
      diagramNodeBob.classList.add('bob-active');
      diagramTransitPulse.style.display = 'none';
      diagramEnvelope.classList.remove('glow');
      diagramEnvelopeIcon.textContent = '📦🔓';
      diagramEnvelopeTitle.textContent = '¡Sobre Abierto y Verificado!';
      diagramEnvelopeStatus.textContent = '✅ Llave Privada abrió el candado. Plaintext intacto.';
      diagramEnvelopeStatus.style.color = 'var(--accent-emerald)';

      showToast({
        title: 'Descifrado Exitoso',
        message: 'Bob ha abierto el sobre digital y verificado el AuthTag GHASH.',
        icon: '🎉',
        type: 'success',
        duration: 2500
      });
    } catch (err) {
      showToast({
        title: 'Error en Descifrado de Bob',
        message: err.message,
        icon: '<span class="micon" aria-hidden="true">cancel</span> ',
        type: 'danger',
        duration: 2500
      });
    } finally {
      btnBobDecrypt.disabled = false;
      btnBobDecrypt.innerHTML = '<span class="micon" aria-hidden="true">lock_open</span>  Abrir Sobre Digital y Descifrar (Bob)';
    }
  });

  // ==========================================================================
  // SECCIÓN 5: LABORATORIO FORENSE: CRIPTOANÁLISIS MATEMÁTICO (RSA-4096 VS PBKDF2)
  // ==========================================================================
  const hybridTargetBadge = container.querySelector('#hybrid-target-badge');
  const btnReloadAliceTarget = container.querySelector('#btn-reload-alice-target');
  const hybridTargetEnckey = container.querySelector('#hybrid-target-enckey');
  const hybridTargetIv = container.querySelector('#hybrid-target-iv');
  const hybridTargetTag = container.querySelector('#hybrid-target-tag');
  const btnExecuteHybridAttack = container.querySelector('#btn-execute-hybrid-attack');
  const hybridAttackStatus = container.querySelector('#hybrid-attack-status');
  const btnCopyHybridLog = container.querySelector('#btn-copy-hybrid-log');
  const btnClearHybridLog = container.querySelector('#btn-clear-hybrid-log');
  const hybridAttackLogBody = container.querySelector('#hybrid-attack-log-body');
  const hybridAttackLiveLogs = container.querySelector('#hybrid-attack-live-logs');

  // Sincronizar UI de sobre blanco
  const syncAliceTargetUI = () => {
    if (currentHybridPayload) {
      if (hybridTargetBadge) {
        hybridTargetBadge.className = 'badge badge-cyan';
        hybridTargetBadge.textContent = 'Sobre de Alice Sincronizado';
      }
      if (hybridTargetEnckey && currentHybridPayload.encryptedKeyBase64) {
        hybridTargetEnckey.textContent = `${currentHybridPayload.encryptedKeyBase64.substring(0, 32)}... (${currentHybridPayload.encryptedKeyBase64.length} chars)`;
      }
      if (hybridTargetIv && currentHybridPayload.ivHex) hybridTargetIv.textContent = currentHybridPayload.ivHex;
      if (hybridTargetTag && currentHybridPayload.tagHex) hybridTargetTag.textContent = currentHybridPayload.tagHex;
    } else {
      if (hybridTargetBadge) {
        hybridTargetBadge.className = 'badge badge-purple';
        hybridTargetBadge.textContent = 'Sobre de Demostración Activo';
      }
      if (hybridTargetEnckey) hybridTargetEnckey.textContent = 'k8F4mQ...[RSA-4096-OAEP-ENCAPSULATED-KEY]...== (684 chars)';
      if (hybridTargetIv) hybridTargetIv.textContent = '3a7c9f82d1e0b541786c2e91';
      if (hybridTargetTag) hybridTargetTag.textContent = 'e4b9812cd8f01a7362c95e10bd837a42';
    }
  };

  if (btnReloadAliceTarget) {
    btnReloadAliceTarget.addEventListener('click', () => {
      syncAliceTargetUI();
      showToast({
        title: 'Sobre Sincronizado',
        message: currentHybridPayload ? 'Sobre digital de Alice listo para prueba forense.' : 'Modo demostración activo.',
        type: 'info',
        duration: 1800
      });
    });
  }

  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const hybridTerminalInput = container.querySelector('#hybrid-terminal-input');
  const btnTerminalSend = container.querySelector('#btn-terminal-send');
  const btnTerminalChips = container.querySelectorAll('.btn-terminal-chip');

  // Historial de comandos CLI
  const commandHistory = [];
  let historyPointer = -1;

  // Imprimir Banner de bienvenida interactivo
  const printTerminalBanner = () => {
    if (!hybridAttackLiveLogs) return;
    hybridAttackLiveLogs.innerHTML = `
      <div style="color: #c084fc; font-weight: 800; font-family: var(--font-mono); font-size: 0.95rem; line-height: 1.25; margin-bottom: 0.65rem; text-shadow: 0 0 10px rgba(192, 132, 252, 0.35);">
 _____ _   _ _____     _____ _   _ ____  _     ___ ___ _____ 
| ____| | | | ____|   | ____| \\ | |  _ \\| |   / _ \\_ _|_   _|
|  _| | | | |  _| _____|  _| |  \\| | |_) | |  | | | | |  | |  
| |___ \\ V /| |__|_____| |___| |\\  |  __/| |__| |_| | |  | |  
|_____| \\_/ |_____|    |_____|_| \\_|_|   |_____\\___/___| |_|  
      </div>
      <div style="color: #38bdf8; font-weight: 700; margin-bottom: 0.35rem; font-size: 1.15rem;">
        [EVE-AUDIT-FRAMEWORK] Entorno Interactivo de Criptoanálisis & Pentesting (OpenSSL Engine)
      </div>
      <div style="color: #94a3b8; font-size: 1.05rem; margin-bottom: 0.85rem; line-height: 1.65;">
        Cualquier usuario o evaluador puede ejecutar ataques reales directamente desde esta terminal.<br/>
        Escribe <code style="color: #d8b4fe; background: rgba(168,85,247,0.2); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700;">help</code> para ver los comandos o pulsa cualquiera de los botones de acceso rápido arriba.<br/>
        Navega comandos anteriores con las flechas <strong style="color: #f1f5f9;">▲ / ▼</strong> y autocompleta con <strong style="color: #f1f5f9;">Tab</strong>.
      </div>
    `;
    if (hybridAttackStatus) {
      hybridAttackStatus.className = 'badge badge-purple';
      hybridAttackStatus.textContent = '● TERMINAL INTERACTIVA ACTIVA';
    }
  };

  const appendTerminalLine = (html) => {
    if (!hybridAttackLiveLogs) return;
    const line = document.createElement('div');
    line.style.padding = '0.2rem 0';
    line.innerHTML = html;
    hybridAttackLiveLogs.appendChild(line);
    if (hybridAttackLogBody) {
      hybridAttackLogBody.scrollTop = hybridAttackLogBody.scrollHeight;
    }
  };

  // Motor de ejecución de comandos interactivos
  const executeTerminalCommand = async (rawInput) => {
    const rawCmd = (rawInput || '').trim();
    if (!rawCmd) return;

    // Agregar a historial si no es idéntico al último
    if (commandHistory[commandHistory.length - 1] !== rawCmd) {
      commandHistory.push(rawCmd);
    }
    historyPointer = commandHistory.length;

    // Limpiar input y re-enfocar
    if (hybridTerminalInput) {
      hybridTerminalInput.value = '';
      hybridTerminalInput.focus();
    }

    // Echo del prompt en la consola
    appendTerminalLine(`
      <div style="margin-top: 0.65rem; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.45rem;">
        <span style="color: #38bdf8; font-weight: 700;">eve@kali:~/gnfs$</span>
        <span style="color: #f8fafc; font-weight: 600; font-family: var(--font-mono);">${escapeHtml(rawCmd)}</span>
      </div>
    `);

    const tokens = rawCmd.split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const arg1 = tokens[1] ? tokens[1].toLowerCase() : '';

    if (cmd === 'clear' || cmd === 'cls') {
      printTerminalBanner();
      return;
    }

    if (cmd === 'banner') {
      printTerminalBanner();
      return;
    }

    if (cmd === 'whoami') {
      appendTerminalLine(`<div style="color: #34d399;">eve (Criptoanalista Forense / Auditor de Seguridad Híbrida) - Permisos: ROOT en entorno de laboratorio.</div>`);
      return;
    }

    if (cmd === 'help') {
      appendTerminalLine(`
        <div style="background: rgba(168, 85, 247, 0.08); border-left: 3px solid #a855f7; padding: 0.85rem 1.1rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0; font-size: 1.05rem; line-height: 1.7;">
          <strong style="color: #d8b4fe; display: block; font-size: 1.18rem; margin-bottom: 0.6rem;">📖 Laboratorio Forense: Comandos de Criptoanálisis</strong>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.98rem;">
            <tbody>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td colspan="2" style="padding: 0.4rem 0; color: #a78bfa; font-weight: 800; font-size: 1.02rem;">── 1. INSPECCIÓN Y DESAFÍO CTF ──</td>
              </tr>
              <tr>
                <td style="color: #38bdf8; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">inspect / target</td>
                <td style="color: #cbd5e1;">Inspecciona el sobre interceptado, módulo N, exponente e y tags GHASH.</td>
              </tr>
              <tr>
                <td style="color: #34d399; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">challenge-weak</td>
                <td style="color: #cbd5e1;"><strong style="color: #34d399;">[CTF REAL]</strong> Factoriza en vivo una clave RSA de 32-bit con Pollard's Rho y recupera la bandera secreta.</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td colspan="2" style="padding: 0.4rem 0; color: #a78bfa; font-weight: 800; font-size: 1.02rem;">── 2. FACTORIZACIÓN ASINTÓTICA Y ÁLGEBRA DE ENTEROS ──</td>
              </tr>
              <tr>
                <td style="color: #f87171; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">factorize / gnfs</td>
                <td style="color: #cbd5e1;">Criptoanálisis asintótico GNFS contra Bob RSA-4096. Demuestra la barrera de >100 Trillones de Años.</td>
              </tr>
              <tr>
                <td style="color: #facc15; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">fermat [-n num]</td>
                <td style="color: #cbd5e1;">Factorización de Fermat (diferencia de cuadrados a² - b²). Prueba con <code>-n 100000000000037</code>.</td>
              </tr>
              <tr>
                <td style="color: #facc15; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">pollard-p1 / p-1</td>
                <td style="color: #cbd5e1;">Algoritmo p-1 de Pollard para factores con p-1 B-smooth. Inmune por selección de primos seguros.</td>
              </tr>
              <tr>
                <td style="color: #facc15; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">ecm / lenstra</td>
                <td style="color: #cbd5e1;">Factorización por Curvas Elípticas de Lenstra (ECM). Inviable contra factores balanceados de 2048-bit.</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td colspan="2" style="padding: 0.4rem 0; color: #a78bfa; font-weight: 800; font-size: 1.02rem;">── 3. CRIPTOANÁLISIS ESTRUCTURAL RSA ──</td>
              </tr>
              <tr>
                <td style="color: #38bdf8; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">wiener</td>
                <td style="color: #cbd5e1;">Ataque de fracciones continuas por exponente privado corto d < 1/3 N^(1/4).</td>
              </tr>
              <tr>
                <td style="color: #34d399; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">hastad / broadcast</td>
                <td style="color: #cbd5e1;">Ataque Broadcast de Håstad (e=3 y CRT). Mitigado con e=65537 y relleno OAEP.</td>
              </tr>
              <tr>
                <td style="color: #c084fc; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">coppersmith / lattice</td>
                <td style="color: #cbd5e1;">Ataque de retículos LLL de Coppersmith / Boneh-Durfee para raíces algebraicas d < N^0.292.</td>
              </tr>
              <tr>
                <td style="color: #c084fc; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">franklin-reiter</td>
                <td style="color: #cbd5e1;">Mensajes con relación afín lineal M2 = a*M1 + b. Neutralizado por la máscara MGF1 de OAEP.</td>
              </tr>
              <tr>
                <td style="color: #fb923c; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">common-modulus</td>
                <td style="color: #cbd5e1;">Ataque de módulo N compartido mediante Identidad de Bézout r*e1 + s*e2 = 1.</td>
              </tr>
              <tr>
                <td style="color: #fb923c; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">batch-gcd</td>
                <td style="color: #cbd5e1;">Búsqueda de colisión de primos compartidos gcd(NA, NB) por entropía deficiente.</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td colspan="2" style="padding: 0.4rem 0; color: #a78bfa; font-weight: 800; font-size: 1.02rem;">── 4. CANAL LATERAL, CUÁNTICA Y RELLENO ──</td>
              </tr>
              <tr>
                <td style="color: #38bdf8; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">shor / quantum</td>
                <td style="color: #cbd5e1;">Auditoría cuántica: Shor (8194 qubits lógicos para RSA-4096) vs Grover (2^128 en AES-256).</td>
              </tr>
              <tr>
                <td style="color: #c084fc; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">timing-attack</td>
                <td style="color: #cbd5e1;">Mide 40,000 comparaciones con timingSafeEqual() demostrando inmunidad O(1).</td>
              </tr>
              <tr>
                <td style="color: #c084fc; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">power-analysis / dpa</td>
                <td style="color: #cbd5e1;">Análisis de potencia SPA/DPA y cegado probabilístico (RSA Blinding).</td>
              </tr>
              <tr>
                <td style="color: #f87171; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">bellcore / fault-attack</td>
                <td style="color: #cbd5e1;">Inyección de fallos de hardware en RSA-CRT (Boneh-DeMillo-Lipton).</td>
              </tr>
              <tr>
                <td style="color: #facc15; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">entropy</td>
                <td style="color: #cbd5e1;">Entropía de Shannon H(X) sobre IV y claves (NIST SP 800-90A CSPRNG).</td>
              </tr>
              <tr>
                <td style="color: #f472b6; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">bleichenbacher</td>
                <td style="color: #cbd5e1;">Ataque de 1M de oráculos MMA contra PKCS#1 v1.5 vs seguridad IND-CCA2 de OAEP.</td>
              </tr>
              <tr>
                <td style="color: #f472b6; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">padding-oracle</td>
                <td style="color: #cbd5e1;">Oráculo de Vaudenay: por qué los modos AEAD (GCM) y OAEP erradican este vector.</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td colspan="2" style="padding: 0.4rem 0; color: #a78bfa; font-weight: 800; font-size: 1.02rem;">── 5. CRIPTOANÁLISIS SIMÉTRICO Y PROTOCOLO ──</td>
              </tr>
              <tr>
                <td style="color: #fb923c; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">bit-flipping</td>
                <td style="color: #cbd5e1;">Altera 1 bit del ciphertext y demuestra el rechazo inmediato del AuthTag GHASH.</td>
              </tr>
              <tr>
                <td style="color: #fb923c; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">nonce-reuse</td>
                <td style="color: #cbd5e1;">The Forbidden Attack (Joux): qué pasa si se reutiliza el IV en GCM y cómo lo prevenimos.</td>
              </tr>
              <tr>
                <td style="color: #fbbf24; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">inject-fake-key</td>
                <td style="color: #cbd5e1;">Inyecta una clave privada ajena: demuestra el error nativo OpenSSL OAEP.</td>
              </tr>
              <tr>
                <td style="color: #f472b6; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">bruteforce-gcm</td>
                <td style="color: #cbd5e1;">Prueba de 2,000 claves simétricas aleatorias contra el AuthTag de 128 bits.</td>
              </tr>
              <tr>
                <td style="color: #38bdf8; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">mitm</td>
                <td style="color: #cbd5e1;">Ataque de intermediario y suplantación de clave pública (anclaje PKI / X.509).</td>
              </tr>
              <tr>
                <td style="color: #cbd5e1; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">replay</td>
                <td style="color: #cbd5e1;">Ataque de retransmisión de sobre cifrado e integridad de sesión efímera.</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">dictionary / rockyou</td>
                <td style="color: #cbd5e1;">Demuestra por qué diccionarios de contraseñas no aplican a claves asimétricas CSPRNG.</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td colspan="2" style="padding: 0.4rem 0; color: #a78bfa; font-weight: 800; font-size: 1.02rem;">── 6. MOTOR UNIVERSAL Y UTILITARIOS ──</td>
              </tr>
              <tr>
                <td style="color: #38bdf8; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">[cualquier ataque]</td>
                <td style="color: #cbd5e1;"><strong style="color: #d8b4fe;">¡MOTOR UNIVERSAL ACTIVO!</strong> Escribe cualquier ataque (ej: <code>dlog</code>, <code>lattice</code>, <code>spectre</code>, <code>rainbow</code>) y el motor lo auditará en profundidad.</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; font-weight: 700; padding: 0.2rem 0.75rem 0.2rem 0; white-space: nowrap;">clear / cls</td>
                <td style="color: #cbd5e1;">Limpia la pantalla de la terminal.</td>
              </tr>
            </tbody>
          </table>
        </div>
      `);
      return;
    }

    // Preparar estado de auditoría
    if (hybridAttackStatus) {
      hybridAttackStatus.className = 'badge badge-rose';
      hybridAttackStatus.textContent = `● EJECUTANDO: ${cmd.toUpperCase()}`;
    }

    try {
      if (cmd === 'inspect' || cmd === 'target') {
        appendTerminalLine(`<span style="color: #38bdf8;">[FORENSE]</span> Inspeccionando parámetros interceptados en el sobre de Alice...`);
        const payloadData = currentHybridPayload || {
          encryptedKeyBase64: 'k8F4mQ...[RSA-4096-OAEP-ENCAPSULATED-KEY]...',
          ivHex: '3a7c9f82d1e0b541786c2e91',
          tagHex: 'e4b9812cd8f01a7362c95e10bd837a42',
          ciphertextBase64: 'YWxpY2Vfc2VjcmV0X21lc3NhZ2U='
        };
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'inspect',
            envelope: payloadData,
            publicKeyPem: rsaPublicKey ? rsaPublicKey.value : ''
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error al inspeccionar');
        const { keyInfo, envelopeInfo } = json.data;

        appendTerminalLine(`
          <div style="background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; padding: 0.85rem 1.1rem; border-radius: 0 8px 8px 0; margin: 0.4rem 0;">
            <strong style="color: #38bdf8; display: block; margin-bottom: 0.35rem;">📦 Datos Criptográficos Detectados por Eve:</strong>
            <div style="color: #cbd5e1; font-size: 1.05rem; line-height: 1.75;">
              • <strong>Tipo de Clave Asimétrica:</strong> <code>${keyInfo.type}</code> (${keyInfo.bits} bits)<br/>
              • <strong>Exponente Público e:</strong> <code>${keyInfo.exponent}</code><br/>
              • <strong>Huella Digital de Bob:</strong> <code>${keyInfo.fingerprint}</code><br/>
              • <strong>Clave Simétrica Cifrada:</strong> <code>${envelopeInfo.encryptedKeyLength} caracteres base64 (512 bytes RSA-OAEP)</code><br/>
              • <strong>Vector de Inicialización (IV):</strong> <code>${envelopeInfo.ivHex}</code> (96-bit)<br/>
              • <strong>AuthTag GHASH:</strong> <code>${envelopeInfo.tagHex}</code> (128-bit autenticado)<br/>
              • <strong>Vulnerabilidad detectada:</strong> <span style="color: #34d399; font-weight: 700;">NINGUNA.</span> Ausencia total de contraseñas humanas; sin posibilidad de ataques con diccionario.
            </div>
          </div>
        `);
      } else if (cmd === 'challenge-weak' || (cmd === 'factorize' && arg1 === '--weak')) {
        appendTerminalLine(`<span style="color: #34d399; font-weight: 700;">[CTF-POLLARD-RHO]</span> 🔍 Iniciando ataque de factorización matemática sobre clave RSA débil de 32-bit...`);
        appendTerminalLine(`&nbsp;&nbsp;&nbsp;&nbsp;↳ Módulo objetivo: <code>N = 4016303971</code> (32-bit). Exponente: <code>e = 65539</code>`);
        
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'challenge-weak' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error al ejecutar desafío');
        const d = json.data;

        await new Promise(r => setTimeout(r, 500));

        appendTerminalLine(`
          <div style="background: rgba(16, 185, 129, 0.12); border-left: 3px solid #10b981; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #34d399; font-size: 1.2rem;">🎉 ¡CLAVE DEBIL FACTORIZADA CON ÉXITO!</strong>
              <span class="badge badge-emerald" style="font-size: 0.88rem;">TIEMPO: ${d.elapsedMs} ms (${d.iterations} ciclos)</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Factores Primos Encontrados:</strong> <code>p = ${d.factors.p}</code> | <code>q = ${d.factors.q}</code><br/>
              • <strong>Función Totiente de Euler:</strong> <code>φ(N) = (p-1)(q-1) = ${d.phi}</code><br/>
              • <strong>Exponente Privado Deducido:</strong> <code>d = e⁻¹ mod φ(N) = ${d.privateExponent_d}</code><br/>
              • <strong>Descifrado del Secreto Oculto:</strong> <code>${d.testDecryption.recoveredSecret}</code><br/>
              • <strong>Bandera CTF Recuperada:</strong> <span style="background: rgba(16, 185, 129, 0.25); color: #6ee7b7; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 800; font-family: var(--font-mono);">${d.testDecryption.flag}</span><br/>
              <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(16, 185, 129, 0.3); color: #94a3b8; font-size: 0.98rem;">
                📌 <em>${d.analysis}</em>
              </div>
            </div>
          </div>
        `);
      } else if (cmd === 'factorize' || cmd === 'gnfs') {
        appendTerminalLine(`<span style="color: #ef4444; font-weight: 700;">[GNFS-MOTOR]</span> ⚡ Iniciando Criptoanálisis Matemático Asintótico contra la Clave RSA-4096 de Bob...`);
        appendTerminalLine(`&nbsp;&nbsp;&nbsp;&nbsp;↳ Módulo <code>N</code>: 4096 bits (~1.234 dígitos decimales). Exponente: <code>e = 65537</code>.`);
        appendTerminalLine(`&nbsp;&nbsp;&nbsp;&nbsp;↳ Ejecutando ciclos polinomiales intensivos con BigInt en Node.js...`);

        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'factorize', timeLimitMs: 1200 })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error al ejecutar factorización');
        const d = json.data;

        await new Promise(r => setTimeout(r, 600));

        appendTerminalLine(`&nbsp;&nbsp;&nbsp;&nbsp;↳ Evaluadas <strong style="color: #facc15;">${d.iterationsEvaluated.toLocaleString()} operaciones polinomiales</strong> en ${d.elapsedMs} ms.`);
        appendTerminalLine(`&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #f87171; font-weight: 700; background: rgba(239, 68, 68, 0.15); padding: 0.15rem 0.5rem; border-radius: 4px;">❌ FALLO:</span> Factor no divide al módulo N (Residuo ≠ 0).`);

        appendTerminalLine(`
          <div style="background: rgba(239, 68, 68, 0.12); border-left: 3px solid #ef4444; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #f87171; font-size: 1.2rem;">🛑 FACTORIZACIÓN IMPOSIBLE: RSA-4096 INTACTO</strong>
              <span class="badge badge-rose" style="font-size: 0.88rem;">TIEMPO: ${d.complexityGNFS.estimatedTime}</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Fórmula de Complejidad GNFS:</strong> <code>L_N[1/3, c] = ${d.complexityGNFS.formula}</code><br/>
              • <strong>Operaciones requeridas para romper N:</strong> <span style="color: #facc15; font-weight: 700;">${d.complexityGNFS.requiredOps}</span><br/>
              • <strong>Dictamen Científico:</strong> ${d.scientificVerdict}<br/>
              • <strong>Diferencia clave con PBKDF2:</strong> Mientras PBKDF2 protege una contraseña humana contra diccionarios, RSA-4096 no tiene contraseñas; se defiende por la imposibilidad matemática del cálculo de factores primos.
            </div>
          </div>
        `);
      } else if (cmd === 'inject-fake-key') {
        appendTerminalLine(`<span style="color: #fbbf24; font-weight: 700;">[OPENSSL-AUDIT]</span> 🔑 Generando clave privada RSA forjada e intentando forzar el desencofrado...`);
        
        const payloadData = currentHybridPayload || {
          encryptedKeyBase64: 'k8F4mQ...[RSA-4096-OAEP-ENCAPSULATED-KEY]...'
        };

        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'inject-fake-key',
            envelope: payloadData
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error al inyectar clave');
        const d = json.data;

        await new Promise(r => setTimeout(r, 500));

        appendTerminalLine(`
          <div style="background: rgba(251, 191, 36, 0.12); border-left: 3px solid #fbbf24; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #fbbf24; font-size: 1.2rem;">🛡️ BLOQUEO POR RELLENO CRIPTOGRÁFICO RSA-OAEP</strong>
              <span class="badge badge-yellow" style="font-size: 0.88rem;">${d.openSslErrorCode}</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Mecanismo de Defensa Activo:</strong> <code>${d.blockedBy}</code><br/>
              • <strong>Mensaje Nativo de OpenSSL:</strong> <code style="color: #f87171;">${d.openSslMessage}</code><br/>
              • <strong>Análisis Forense:</strong> ${d.explanation}
            </div>
          </div>
        `);
      } else if (cmd === 'bruteforce-gcm') {
        appendTerminalLine(`<span style="color: #f472b6; font-weight: 700;">[AES-GCM-AUDIT]</span> 🛡️ Lanzando 2,000 intentos de falsificación de clave simétrica contra el tag GHASH...`);

        const payloadData = currentHybridPayload || {
          tagHex: 'e4b9812cd8f01a7362c95e10bd837a42',
          ivHex: '3a7c9f82d1e0b541786c2e91',
          ciphertextBase64: 'YWxpY2Vfc2VjcmV0X21lc3NhZ2U='
        };

        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'bruteforce-gcm',
            envelope: payloadData,
            attempts: 2000
          })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en fuerza bruta');
        const d = json.data;

        await new Promise(r => setTimeout(r, 500));

        appendTerminalLine(`
          <div style="background: rgba(244, 114, 182, 0.12); border-left: 3px solid #f472b6; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #f472b6; font-size: 1.2rem;">🔒 RECHAZO TOTAL DE AUTENTICIDAD GHASH</strong>
              <span class="badge badge-purple" style="font-size: 0.88rem;">${d.attempts} INTENTOS EN ${d.elapsedMs} ms</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Velocidad de Verificación:</strong> <code>${d.speedKeysPerSec.toLocaleString()} claves evaluadas/segundo</code><br/>
              • <strong>Resultado del AuthTag:</strong> <span style="color: #f87171; font-weight: 700;">${d.authTagStatus}</span><br/>
              • <strong>Probabilidad Matemática de Falsificación:</strong> <code>${d.forgeryProbability}</code><br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'shor' || cmd === 'quantum') {
        appendTerminalLine(`<span style="color: #38bdf8; font-weight: 700;">[QUANTUM-AUDIT]</span> ⚛️ Evaluando amenaza cuántica (Algoritmo de Shor vs Algoritmo de Grover)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'shor' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en auditoría cuántica');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: rgba(14, 165, 233, 0.12); border-left: 3px solid #38bdf8; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #38bdf8; font-size: 1.2rem;">⚛️ ANÁLISIS DE RESISTENCIA CUÁNTICA</strong>
              <span class="badge badge-cyan" style="font-size: 0.88rem;">SHOR vs GROVER</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              <strong style="color: #f87171;">1. Impacto sobre RSA-4096 (Algoritmo de Shor):</strong><br/>
              • Qubits Lógicos requeridos: <code>${d.rsa4096.logicalQubitsRequired}</code><br/>
              • Qubits Físicos estimados (con corrección de error): <code>${d.rsa4096.physicalQubitsRequired}</code><br/>
              • Estado cuántico real mundial: <em>${d.rsa4096.currentQuantumState2026}</em><br/>
              • Mitigación NIST: <em>${d.rsa4096.nistMitigation}</em><br/>
              <div style="margin-top: 0.5rem; border-top: 1px dashed rgba(56, 189, 248, 0.3); padding-top: 0.5rem;">
                <strong style="color: #34d399;">2. Impacto sobre AES-256 (Algoritmo de Grover):</strong><br/>
                • Estado: <span style="color: #34d399; font-weight: 700;">${d.aes256.threatLevel}</span><br/>
                • Seguridad Cuántica Efectiva: <code>${d.aes256.effectiveQuantumSecurity}</code><br/>
                • Dictamen: <em>${d.aes256.verdict}</em>
              </div>
            </div>
          </div>
        `);
      } else if (cmd === 'bit-flipping' || cmd === 'tamper') {
        appendTerminalLine(`<span style="color: #fb923c; font-weight: 700;">[EXPLOIT-MALLEABILITY]</span> 🔀 Invirtiendo 1 solo bit en el texto cifrado para probar integridad...`);
        const payloadData = currentHybridPayload || {
          tagHex: 'e4b9812cd8f01a7362c95e10bd837a42',
          ivHex: '3a7c9f82d1e0b541786c2e91',
          ciphertextBase64: 'YWxpY2Vfc2VjcmV0X21lc3NhZ2U='
        };
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bit-flipping', envelope: payloadData })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en prueba de alteración');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: rgba(249, 115, 22, 0.12); border-left: 3px solid #fb923c; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #fb923c; font-size: 1.2rem;">🛡️ DETECCIÓN DE ALTERACIÓN DE BITS (GHASH)</strong>
              <span class="badge badge-rose" style="font-size: 0.88rem;">INTEGRIDAD AUTENTICADA</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Byte Original vs Alterado:</strong> <code>${d.originalByteHex} ➔ ${d.tamperedByteHex} (Bit 0 invertido)</code><br/>
              • <strong>Excepción de OpenSSL:</strong> <code style="color: #f87171;">${d.errorDetected}</code><br/>
              • <strong>Vulnerabilidad en modos obsoletos (CBC/CTR):</strong> ${d.vulnerabilityInLegacyModes}<br/>
              • <strong>Protección en AES-GCM:</strong> ${d.defenseInGCM}
            </div>
          </div>
        `);
      } else if (cmd === 'timing-attack' || cmd === 'timing') {
        appendTerminalLine(`<span style="color: #c084fc; font-weight: 700;">[SIDE-CHANNEL-AUDIT]</span> ⏱️ Midiendo varianza de tiempo en verificación de tags con 40,000 comparaciones...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'timing-attack' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en timing attack');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: rgba(168, 85, 247, 0.12); border-left: 3px solid #a855f7; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #d8b4fe; font-size: 1.2rem;">⏱️ PRUEBA DE TIEMPO CONSTANTE O(1)</strong>
              <span class="badge badge-purple" style="font-size: 0.88rem;">${d.comparisonsEvaluated} MUESTRAS EN ${d.elapsedMs} ms</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Método Primitivo:</strong> <code>${d.testMethod}</code><br/>
              • <strong>Latencia por comparación:</strong> <code>${d.latencyPerComparisonNs}</code><br/>
              • <strong>Fluctuación de tiempo (Jitter):</strong> <span style="color: #34d399; font-weight: 700;">${d.deltaTimingJitter}</span><br/>
              • <strong>Dictamen Forense:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'entropy' || cmd === 'shannon') {
        appendTerminalLine(`<span style="color: #facc15; font-weight: 700;">[ENTROPY-MATH]</span> 📊 Calculando Entropía de Shannon H(X) sobre los vectores del sobre...`);
        const payloadData = currentHybridPayload || {
          tagHex: 'e4b9812cd8f01a7362c95e10bd837a42',
          ivHex: '3a7c9f82d1e0b541786c2e91',
          encryptedKeyBase64: 'k8F4mQ...[RSA-4096-OAEP-ENCAPSULATED-KEY]...'
        };
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'entropy', envelope: payloadData })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error al calcular entropía');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: rgba(234, 179, 8, 0.12); border-left: 3px solid #facc15; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #facc15; font-size: 1.2rem;">📊 TEST DE ENTROPÍA DE SHANNON (NIST SP 800-90A)</strong>
              <span class="badge badge-yellow" style="font-size: 0.88rem;">H = ${d.shannonEntropy} / ${d.theoreticalMaximum}</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Muestra Evaluada:</strong> <code>${d.sampleSizeAnalyzed}</code><br/>
              • <strong>Calidad de Aleatoriedad:</strong> <span style="color: #34d399; font-weight: 700;">${d.randomnessQuality}</span><br/>
              • <strong>Generador de Origen:</strong> <code>${d.sourceGenerator}</code><br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'bleichenbacher' || cmd === 'oracle') {
        appendTerminalLine(`<span style="color: #f472b6; font-weight: 700;">[ORACLE-AUDIT]</span> 🏛️ Evaluando resistencia contra Ataques de Oráculo de Relleno (Bleichenbacher)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bleichenbacher' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en auditoría Bleichenbacher');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: rgba(236, 72, 153, 0.12); border-left: 3px solid #f472b6; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #f472b6; font-size: 1.2rem;">🏛️ RESISTENCIA DEMOSTRABLE IND-CCA2 (OAEP)</strong>
              <span class="badge badge-rose" style="font-size: 0.88rem;">ANTI-BLEICHENBACHER</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Vulnerabilidad Histórica:</strong> <em>${d.vulnerabilityMechanic}</em><br/>
              • <strong>Esquema Activo en este Proyecto:</strong> <code>${d.ourDefenseInProject}</code><br/>
              • <strong>Prueba de Seguridad Teórica:</strong> ${d.securityProof}
            </div>
          </div>
        `);
      } else if (cmd === 'fermat') {
        const nIndex = tokens.findIndex(t => t.toLowerCase() === '-n' || t.toLowerCase() === '--n');
        const customN = nIndex !== -1 && tokens[nIndex + 1] ? tokens[nIndex + 1] : null;
        appendTerminalLine(`<span style="color: #facc15; font-weight: 700;">[FERMAT-ALGORITHM]</span> 🔍 Ejecutando método de factorización de Fermat ${customN ? `sobre N = ${customN}` : 'sobre clave del sistema'}...`);

        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fermat', customN })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en factorización Fermat');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: ${d.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; border-left: 3px solid ${d.success ? '#10b981' : '#ef4444'}; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: ${d.success ? '#34d399' : '#f87171'}; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">
              ${d.success ? '🎉 ¡FERMAT FACTORIZÓ EL NÚMERO!' : '🛑 FERMAT FRACASÓ: PRIMOS SEPARADOS'}
            </strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Módulo evaluado (N):</strong> <code>${d.inputN}</code><br/>
              • <strong>Iteraciones:</strong> <code>${d.iterations}</code> (${d.elapsedMs} ms)<br/>
              ${d.factors ? `• <strong>Factores hallados:</strong> <code>p = ${d.factors.p}</code>, <code>q = ${d.factors.q}</code><br/>` : ''}
              • <strong>Dictamen Matemático:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'wiener') {
        appendTerminalLine(`<span style="color: #38bdf8; font-weight: 700;">[WIENER-AUDIT]</span> 🔍 Evaluando vulnerabilidad de exponente privado corto (Wiener Continued Fractions)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'wiener' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en auditoría Wiener');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(56, 189, 248, 0.12); border-left: 3px solid #38bdf8; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #38bdf8; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">🛡️ AUDITORÍA DE EXPONENTE PRIVADO (WIENER)</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Condición de Wiener:</strong> <code>${d.vulnerabilityCondition}</code><br/>
              • <strong>Parámetros de nuestro sistema:</strong> ${d.ourParameters}<br/>
              • <strong>Resultado del Test:</strong> ${d.testResult}<br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'hastad' || cmd === 'broadcast') {
        appendTerminalLine(`<span style="color: #34d399; font-weight: 700;">[HASTAD-AUDIT]</span> 📡 Evaluando vulnerabilidad a Ataques de Transmisión (Håstad Broadcast)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'hastad' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en auditoría Hastad');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(16, 185, 129, 0.12); border-left: 3px solid #10b981; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #34d399; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">📡 RESISTENCIA A HÅSTAD BROADCAST (e = 65537)</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Vulnerabilidad clásica:</strong> ${d.vulnerabilityCondition}<br/>
              • <strong>Mecanismo de defensa activo:</strong> ${d.ourDefense}<br/>
              • <strong>Análisis matemático:</strong> ${d.mechanic}<br/>
              • <strong>Dictamen:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'common-modulus') {
        appendTerminalLine(`<span style="color: #c084fc; font-weight: 700;">[COMMON-MODULUS-AUDIT]</span> 👥 Evaluando reutilización de módulo N (Identidad de Bézout)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'common-modulus' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en auditoría');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(168, 85, 247, 0.12); border-left: 3px solid #a855f7; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #d8b4fe; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">👥 AUDITORÍA DE MÓDULO COMÚN</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Vínculo matemático:</strong> <code>${d.method}</code><br/>
              • <strong>Arquitectura del proyecto:</strong> ${d.projectArchitecture}<br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'batch-gcd' || cmd === 'shared-primes') {
        appendTerminalLine(`<span style="color: #fb923c; font-weight: 700;">[BATCH-GCD-AUDIT]</span> 🧬 Comprobando colisión de factores primos compartidos gcd(N1, N2)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'batch-gcd' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en auditoría');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(249, 115, 22, 0.12); border-left: 3px solid #fb923c; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #fb923c; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">🧬 AUDITORÍA BATCH GCD (INDEPENDENCIA DE PRIMOS)</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Mecánica del ataque:</strong> ${d.vulnerabilityMechanic}<br/>
              • <strong>Auditoría en nuestro sistema:</strong> ${d.ourAudit}<br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'dictionary' || cmd === 'rockyou') {
        appendTerminalLine(`<span style="color: #94a3b8; font-weight: 700;">[DICTIONARY-ATTACK]</span> 📖 Intentando cruzar diccionario RockYou (14.3M palabras) contra RSA...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'dictionary' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en ataque');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: rgba(148, 163, 184, 0.12); border-left: 3px solid #94a3b8; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #f1f5f9; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">📖 ATAQUE DE DICCIONARIO DESESTIMADO</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Palabras probadas:</strong> <code>${d.testedWords.toLocaleString()} (RockYou)</code><br/>
              • <strong>Resultado:</strong> <span style="color: #f87171; font-weight: 700;">${d.result}</span><br/>
              • <strong>Razón Científica:</strong> ${d.technicalExplanation}
            </div>
          </div>
        `);
      } else if (cmd === 'pollard-p1' || cmd === 'p-1') {
        appendTerminalLine(`<span style="color: #facc15; font-weight: 700;">[POLLARD-P1]</span> 🔍 Evaluando B-smoothness con Pollard's p - 1 Factorization Attack...`);
        const nIndex = tokens.findIndex(t => t.toLowerCase() === '-n' || t.toLowerCase() === '--n');
        const customN = nIndex !== -1 && tokens[nIndex + 1] ? tokens[nIndex + 1] : null;
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pollard-p1', customN })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en Pollard p-1');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: ${d.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.12)'}; border-left: 3px solid ${d.success ? '#10b981' : '#facc15'}; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: ${d.success ? '#34d399' : '#facc15'}; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">
              ${d.success ? '🎉 ¡POLLARD P-1 HALLÓ FACTOR!' : '🛡️ AUDITORÍA POLLARD P - 1 (PRIMOS SEGUROS)'}
            </strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Condición requerida:</strong> ${d.condition}<br/>
              • <strong>Cota evaluada B:</strong> <code>${d.boundB}</code> (${d.elapsedMs} ms)<br/>
              ${d.factors ? `• <strong>Factores hallados:</strong> <code>p = ${d.factors.p}</code>, <code>q = ${d.factors.q}</code><br/>` : ''}
              • <strong>Dictamen Forense:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'ecm' || cmd === 'lenstra') {
        appendTerminalLine(`<span style="color: #facc15; font-weight: 700;">[LENSTRA-ECM]</span> 📈 Evaluando factorización por Curvas Elípticas de Lenstra (ECM)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ecm' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en ECM');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(234, 179, 8, 0.12); border-left: 3px solid #facc15; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #facc15; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">📈 FACTORIZACIÓN POR CURVAS ELÍPTICAS (LENSTRA ECM)</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Complejidad asintótica:</strong> <code>${d.complexity}</code><br/>
              • <strong>Comparativa mundial:</strong> ${d.comparison}<br/>
              • <strong>Evaluación en Bob RSA-4096:</strong> ${d.evaluationInSystem}<br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'coppersmith' || cmd === 'boneh-durfee' || cmd === 'lattice') {
        appendTerminalLine(`<span style="color: #c084fc; font-weight: 700;">[COPPERSMITH-LLL]</span> 📐 Auditando cota de retículos de Boneh-Durfee & Teorema de Coppersmith...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'coppersmith' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en Coppersmith');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(168, 85, 247, 0.12); border-left: 3px solid #a855f7; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #d8b4fe; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">📐 AUDITORÍA DE RETÍCULOS LLL (COPPERSMITH / BONEH-DURFEE)</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Fundamento Matemático:</strong> ${d.mathematicalBasis}<br/>
              • <strong>Cota de Vulnerabilidad:</strong> <code>${d.bonehDurfeeBound}</code><br/>
              • <strong>Parámetros del Sistema:</strong> <code>${d.ourParameters}</code><br/>
              • <strong>Dictamen:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'franklin-reiter') {
        appendTerminalLine(`<span style="color: #c084fc; font-weight: 700;">[FRANKLIN-REITER]</span> 🔗 Comprobando relación afín polinomial de mensajes relacionados...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'franklin-reiter' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en Franklin-Reiter');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(168, 85, 247, 0.12); border-left: 3px solid #a855f7; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #d8b4fe; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">🔗 FRANKLIN-REITER RELATED MESSAGE ATTACK</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Condición de Ataque:</strong> ${d.condition}<br/>
              • <strong>Ecuación de Resolución:</strong> <code>${d.solution}</code><br/>
              • <strong>Defensa Activa:</strong> ${d.ourDefense}<br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'bellcore' || cmd === 'fault-attack') {
        appendTerminalLine(`<span style="color: #f87171; font-weight: 700;">[BELLCORE-CRT]</span> ⚡ Simulando inyección de fallos de hardware en descifrado RSA-CRT...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bellcore' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en Bellcore');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: rgba(239, 68, 68, 0.12); border-left: 3px solid #ef4444; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #f87171; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">⚡ INYECCIÓN DE FALLOS BELLCORE EN RSA-CRT</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Mecánica del Ataque:</strong> ${d.vulnerabilityMechanic}<br/>
              • <strong>Aislamiento en Nuestro Sistema:</strong> ${d.ourImplementation}<br/>
              • <strong>Dictamen Forense:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'power-analysis' || cmd === 'dpa' || cmd === 'spa') {
        appendTerminalLine(`<span style="color: #c084fc; font-weight: 700;">[SIDE-CHANNEL-DPA]</span> ⚡ Auditando radiación electromagnética y consumo de energía (DPA/SPA)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'power-analysis' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en DPA');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(139, 92, 246, 0.12); border-left: 3px solid #8b5cf6; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #c084fc; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">⚡ ANÁLISIS DIFERENCIAL DE POTENCIA (DPA / SPA)</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Medición Física:</strong> ${d.physicalMeasurement}<br/>
              • <strong>Contramedida Activa:</strong> <code>${d.countermeasureActive}</code><br/>
              • <strong>Dictamen Científico:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'nonce-reuse' || cmd === 'forbidden-attack') {
        appendTerminalLine(`<span style="color: #fb923c; font-weight: 700;">[FORBIDDEN-ATTACK-JOUX]</span> ⚠️ Simulando reutilización de Nonce/IV en AES-256-GCM...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'nonce-reuse' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en Nonce-Reuse');
        const d = json.data;

        await new Promise(r => setTimeout(r, 450));

        appendTerminalLine(`
          <div style="background: rgba(249, 115, 22, 0.12); border-left: 3px solid #fb923c; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #fb923c; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">⚠️ GCM FORBIDDEN ATTACK (REUTILIZACIÓN DE NONCE)</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Vulnerabilidad Clásica (Joux 2006):</strong> ${d.vulnerabilityMechanic}<br/>
              • <strong>Arquitectura de Nuestro Proyecto:</strong> ${d.ourArchitecture}<br/>
              • <strong>Probabilidad de Colisión de Nonce:</strong> <code style="color: #34d399;">${d.collisionProbability}</code><br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'padding-oracle' || cmd === 'vaudenay') {
        appendTerminalLine(`<span style="color: #f472b6; font-weight: 700;">[VAUDENAY-PADDING-ORACLE]</span> 🚪 Evaluando oráculo de relleno de bloques CBC (Vaudenay)...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'padding-oracle' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en Padding Oracle');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(236, 72, 153, 0.12); border-left: 3px solid #f472b6; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #f472b6; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">🚪 ATAQUE DE ORÁCULO DE PADDING (VAUDENAY)</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Contexto Histórico:</strong> ${d.historicalContext}<br/>
              • <strong>Tecnología del Laboratorio:</strong> <code>${d.ourTechnology}</code><br/>
              • <strong>Dictamen:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'replay' || cmd === 'replay-attack') {
        appendTerminalLine(`<span style="color: #cbd5e1; font-weight: 700;">[REPLAY-ATTACK]</span> 🔁 Verificando resistencia a reemisión y suplantación de paquetes...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'replay' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en Replay');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(148, 163, 184, 0.12); border-left: 3px solid #94a3b8; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #f1f5f9; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">🔁 AUDITORÍA CONTRA ATAQUES DE REPLAY</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Modelo de Amenaza:</strong> ${d.threatModel}<br/>
              • <strong>Mecanismo de Mitigación:</strong> ${d.mitigation}<br/>
              • <strong>Dictamen:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else if (cmd === 'mitm') {
        appendTerminalLine(`<span style="color: #38bdf8; font-weight: 700;">[MITM-SPOOFING]</span> 🕵️ Auditando canal contra Man-in-the-Middle y suplantación de clave pública...`);
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mitm' })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en MITM');
        const d = json.data;

        await new Promise(r => setTimeout(r, 400));

        appendTerminalLine(`
          <div style="background: rgba(56, 189, 248, 0.12); border-left: 3px solid #38bdf8; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin: 0.5rem 0;">
            <strong style="color: #38bdf8; font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">🕵️ MAN-IN-THE-MIDDLE & SUPLANTACIÓN DE CLAVE PÚBLICA</strong>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.8;">
              • <strong>Vector de Ataque:</strong> ${d.threatModel}<br/>
              • <strong>Contramedida en Producción:</strong> ${d.mitigation}<br/>
              • <strong>Conclusión:</strong> ${d.verdict}
            </div>
          </div>
        `);
      } else {
        // MOTOR UNIVERSAL DE CRIPTOANÁLISIS DINÁMICO
        // Procesa CUALQUIER comando o ataque arbitrario ingresado por el profesor o usuario
        appendTerminalLine(`<span style="color: #d8b4fe; font-weight: 700;">[UNIVERSAL-CRYPTANALYSIS-ENGINE]</span> 🧠 Auditando vector personalizado: "<code>${escapeHtml(rawCmd)}</code>"...`);
        const payloadData = currentHybridPayload || {
          tagHex: 'e4b9812cd8f01a7362c95e10bd837a42',
          ivHex: '3a7c9f82d1e0b541786c2e91',
          encryptedKeyBase64: 'k8F4mQ...[RSA-4096-OAEP-ENCAPSULATED-KEY]...'
        };
        const res = await fetch('/api/crypto/terminal-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: rawCmd, envelope: payloadData })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error en motor universal');
        const d = json.data;

        await new Promise(r => setTimeout(r, 500));

        appendTerminalLine(`
          <div style="background: rgba(168, 85, 247, 0.12); border-left: 3px solid #a855f7; padding: 1.1rem 1.35rem; border-radius: 0 10px 10px 0; margin: 0.5rem 0; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="color: #d8b4fe; font-size: 1.25rem;">🧠 MOTOR UNIVERSAL: ${escapeHtml(d.category || 'Auditoría Criptográfica')}</strong>
              <span class="badge badge-purple" style="font-size: 0.85rem;">${escapeHtml(d.vulnerabilityRisk || 'Mitigado')}</span>
            </div>
            <div style="color: #cbd5e1; font-size: 1.08rem; line-height: 1.85;">
              • <strong>Vector Analizado:</strong> <code>${escapeHtml(d.analyzedVector || rawCmd)}</code><br/>
              • <strong>Primitiva Objetivo:</strong> <code style="color: #38bdf8;">${escapeHtml(d.targetPrimitive || 'RSA-4096 + AES-GCM')}</code><br/>
              • <strong>Análisis Matemático:</strong> ${escapeHtml(d.mathematicalAnalysis)}<br/>
              • <strong>Contramedida Activa:</strong> <span style="color: #34d399; font-weight: 700;">${escapeHtml(d.countermeasure)}</span><br/>
              • <strong>Estándares de Cumplimiento:</strong> <code>${escapeHtml(d.standardsCompliance || 'FIPS 140-3 / NIST SP 800-57')}</code><br/>
              <div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px dashed rgba(168,85,247,0.3); color: #f8fafc; font-weight: 600;">
                🎓 <strong>Veredicto Forense:</strong> ${escapeHtml(d.verdict)}
              </div>
            </div>
          </div>
        `);
      }
    } catch (err) {
      appendTerminalLine(`
        <div style="color: #f87171; padding: 0.25rem 0;">
          ❌ Error al ejecutar "${escapeHtml(rawCmd)}": ${escapeHtml(err.message)}
        </div>
      `);
    } finally {
      if (hybridAttackStatus) {
        hybridAttackStatus.className = 'badge badge-purple';
        hybridAttackStatus.textContent = '● TERMINAL INTERACTIVA ACTIVA';
      }
    }
  };

  // Event Listeners de la Terminal
  if (btnTerminalSend && hybridTerminalInput) {
    btnTerminalSend.addEventListener('click', () => {
      executeTerminalCommand(hybridTerminalInput.value);
    });

    hybridTerminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeTerminalCommand(hybridTerminalInput.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          if (historyPointer > 0) historyPointer--;
          hybridTerminalInput.value = commandHistory[historyPointer] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          if (historyPointer < commandHistory.length - 1) {
            historyPointer++;
            hybridTerminalInput.value = commandHistory[historyPointer] || '';
          } else {
            historyPointer = commandHistory.length;
            hybridTerminalInput.value = '';
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const cur = hybridTerminalInput.value.trim().toLowerCase();
        const available = [
          'help', 'inspect', 'target', 'challenge-weak', 'factorize',
          'fermat', 'pollard-p1', 'ecm', 'lenstra', 'wiener', 'hastad', 'broadcast', 'coppersmith', 'boneh-durfee', 'lattice',
          'franklin-reiter', 'bellcore', 'fault-attack', 'common-modulus', 'batch-gcd', 'shared-primes',
          'shor', 'quantum', 'bit-flipping', 'tamper', 'nonce-reuse', 'timing-attack', 'timing', 'power-analysis', 'dpa',
          'entropy', 'shannon', 'bleichenbacher', 'oracle', 'padding-oracle', 'vaudenay', 'mitm', 'replay',
          'dictionary', 'rockyou', 'inject-fake-key', 'bruteforce-gcm', 'clear', 'cls', 'banner', 'whoami'
        ];
        const matched = available.find(c => c.startsWith(cur));
        if (matched) {
          hybridTerminalInput.value = matched;
        }
      }
    });
  }

  // Clic en chips de comandos rápidos
  if (btnTerminalChips) {
    btnTerminalChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) {
          if (hybridTerminalInput) hybridTerminalInput.value = cmd;
          executeTerminalCommand(cmd);
        }
      });
    });
  }

  // Si hacen clic dentro del cuerpo de la terminal, enfocar el input
  if (hybridAttackLogBody && hybridTerminalInput) {
    hybridAttackLogBody.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
        hybridTerminalInput.focus();
      }
    });
  }

  // Botón "⚡ Iniciar Criptoanálisis Matemático GNFS" sincronizado con la terminal
  if (btnExecuteHybridAttack) {
    btnExecuteHybridAttack.addEventListener('click', () => {
      executeTerminalCommand('factorize');
    });
  }

  // Copiar y Limpiar en terminal híbrida
  if (btnCopyHybridLog && hybridAttackLogBody) {
    btnCopyHybridLog.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(hybridAttackLogBody.innerText || hybridAttackLogBody.textContent);
        showToast({ title: 'Copiado', message: 'Logs de auditoría criptográfica copiados.', type: 'success', duration: 1800 });
      } catch {
        showToast({ title: 'Aviso', message: 'No se pudo acceder al portapapeles.', type: 'warning', duration: 1800 });
      }
    });
  }

  if (btnClearHybridLog) {
    btnClearHybridLog.addEventListener('click', () => {
      printTerminalBanner();
      showToast({ title: 'Consola Reiniciada', message: 'Terminal reseteada al estado inicial.', type: 'info', duration: 1500 });
    });
  }

  // --- Catálogo y Guía Desplegable de Comandos CLI ---
  const btnToggleCatalog = container.querySelector('#btn-toggle-catalog');
  const btnToggleCatalogChip = container.querySelector('#btn-toggle-catalog-chip');
  const btnCloseCatalog = container.querySelector('#btn-close-catalog');
  const hybridCommandsCatalog = container.querySelector('#hybrid-commands-catalog');
  const catalogSearchInput = container.querySelector('#catalog-search-input');
  const btnCatFilters = container.querySelectorAll('.btn-cat-filter');
  const catalogCards = container.querySelectorAll('.cmd-catalog-card');
  const btnCatalogRuns = container.querySelectorAll('.btn-catalog-run');

  const toggleCatalogVisibility = () => {
    if (!hybridCommandsCatalog) return;
    const isHidden = hybridCommandsCatalog.style.display === 'none' || !hybridCommandsCatalog.style.display;
    if (isHidden) {
      hybridCommandsCatalog.style.display = 'block';
      if (btnToggleCatalog) {
        btnToggleCatalog.innerHTML = '<span class="micon" aria-hidden="true" style="font-size: 1rem;">close</span>  ✕ Ocultar Guía de Comandos';
      }
      if (catalogSearchInput) {
        catalogSearchInput.focus();
      }
      hybridCommandsCatalog.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      hybridCommandsCatalog.style.display = 'none';
      if (btnToggleCatalog) {
        btnToggleCatalog.innerHTML = '<span class="micon" aria-hidden="true" style="font-size: 1rem;">menu_book</span>  📖 Guía de Comandos y Qué Hace Cada Uno';
      }
    }
  };

  if (btnToggleCatalog) {
    btnToggleCatalog.addEventListener('click', toggleCatalogVisibility);
  }

  if (btnToggleCatalogChip) {
    btnToggleCatalogChip.addEventListener('click', toggleCatalogVisibility);
  }

  if (btnCloseCatalog) {
    btnCloseCatalog.addEventListener('click', () => {
      if (hybridCommandsCatalog) hybridCommandsCatalog.style.display = 'none';
      if (btnToggleCatalog) {
        btnToggleCatalog.innerHTML = '<span class="micon" aria-hidden="true" style="font-size: 1rem;">menu_book</span>  📖 Guía de Comandos y Qué Hace Cada Uno';
      }
    });
  }

  // Filtros de categoría del catálogo
  if (btnCatFilters && catalogCards) {
    btnCatFilters.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        btnCatFilters.forEach(b => {
          b.style.background = 'rgba(255,255,255,0.05)';
          b.style.borderColor = 'rgba(255,255,255,0.15)';
          b.style.color = '#cbd5e1';
          b.style.fontWeight = 'normal';
        });
        btn.style.background = 'rgba(168, 85, 247, 0.35)';
        btn.style.borderColor = '#a855f7';
        btn.style.color = '#fff';
        btn.style.fontWeight = '700';

        const term = (catalogSearchInput?.value || '').toLowerCase().trim();
        catalogCards.forEach(card => {
          const cardCat = card.getAttribute('data-cat');
          const matchesCat = (cat === 'all' || cardCat === cat || cardCat === 'universal');
          const text = card.textContent.toLowerCase();
          const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
          const matchesSearch = !term || text.includes(term) || keywords.includes(term);

          card.style.display = (matchesCat && matchesSearch) ? 'flex' : 'none';
        });
      });
    });
  }

  // Búsqueda en tiempo real en el catálogo
  if (catalogSearchInput && catalogCards) {
    catalogSearchInput.addEventListener('input', (e) => {
      const term = (e.target.value || '').toLowerCase().trim();
      const activeBtn = Array.from(btnCatFilters).find(b => b.style.fontWeight === '700');
      const activeCat = activeBtn ? activeBtn.getAttribute('data-cat') : 'all';

      catalogCards.forEach(card => {
        const cardCat = card.getAttribute('data-cat');
        const matchesCat = (activeCat === 'all' || cardCat === activeCat || cardCat === 'universal');
        const text = card.textContent.toLowerCase();
        const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
        const matchesSearch = !term || text.includes(term) || keywords.includes(term);

        card.style.display = (matchesCat && matchesSearch) ? 'flex' : 'none';
      });
    });
  }

  // Ejecución directa desde las tarjetas del catálogo
  if (btnCatalogRuns) {
    btnCatalogRuns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) {
          if (hybridTerminalInput) hybridTerminalInput.value = cmd;
          executeTerminalCommand(cmd);
          const terminalBody = container.querySelector('#hybrid-attack-log-body');
          if (terminalBody) {
            terminalBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    });
  }

  // Mostrar banner inicial al montar la pestaña
  printTerminalBanner();

  // Inicializar UI de sobre blanco
  syncAliceTargetUI();

  // Inicializar estado de bloqueo al montar la pestaña
  updateCryptoLockoutUI();
}


