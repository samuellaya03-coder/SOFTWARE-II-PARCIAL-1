import { ApiService } from '../services/api.js';

export function renderCryptoTab(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado de la Pestaña -->
      <div class="card card-glow-cyan" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2 style="font-size: 1.5rem; margin-bottom: 0.25rem;">Laboratorio Criptográfico Avanzado ("Modo Difícil")</h2>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            Cifrado Simétrico Autenticado (AES-256-GCM), KDF Seguro (PBKDF2-SHA512) y Cifrado Asimétrico (RSA-4096).
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span class="badge badge-cyan">AES-256-GCM</span>
          <span class="badge badge-emerald">PBKDF2-SHA512 (600k)</span>
          <span class="badge badge-purple">RSA-OAEP 4096</span>
        </div>
      </div>

      <!-- SECCIÓN 1: CIFRADO SIMÉTRICO AES-256-GCM INTERACTIVO -->
      <div class="grid-2">
        <!-- Columna de Cifrado -->
        <div class="card space-y-4" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <h3 style="font-size: 1.15rem;">1. Cifrado Autenticado (AES-256-GCM)</h3>
            <span class="badge badge-cyan">Confidencialidad + Integridad</span>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Mensaje en Texto Claro (Plaintext):
            </label>
            <textarea id="crypto-plain-input" rows="3" placeholder="Ingresa los datos confidenciales a proteger...">Este es un documento clasificado de seguridad informática.</textarea>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Contraseña Maestra (KDF Password):
            </label>
            <input type="password" id="crypto-pass-input" value="SuperSecretPassword#2026!" placeholder="Contraseña..." />
          </div>

          <button id="btn-run-encrypt" class="btn btn-primary" style="width: 100%;">
            🔒 Cifrar con AES-256-GCM + PBKDF2
          </button>

          <!-- Desglose de Componentes Binarios -->
          <div id="crypto-structure-box" style="display: none; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.6;">
            <p style="color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 600;">
              Estructura Binaria Empaquetada: <span class="font-mono" style="color: var(--accent-cyan);">[ Salt (16B) | IV (12B) | Tag (16B) | Ciphertext ]</span>
            </p>

            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge-purple">Salt (16 Bytes / CSPRNG)</span>
              <div id="hex-salt" class="font-mono" style="word-break: break-all; color: #d8b4fe; font-size: 0.8rem; margin-top: 0.2rem;"></div>
            </div>

            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge-emerald">IV (12 Bytes / 96 bits NIST)</span>
              <div id="hex-iv" class="font-mono" style="word-break: break-all; color: #6ee7b7; font-size: 0.8rem; margin-top: 0.2rem;"></div>
            </div>

            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge-amber">Authentication Tag (16 Bytes / GCM MAC)</span>
              <div id="hex-tag" class="font-mono" style="word-break: break-all; color: #fcd34d; font-size: 0.8rem; margin-top: 0.2rem;"></div>
            </div>

            <div style="margin-bottom: 0.5rem;">
              <span class="badge badge-cyan">Texto Cifrado (Ciphertext)</span>
              <div id="hex-cipher" class="font-mono" style="word-break: break-all; color: #67e8f9; font-size: 0.8rem; margin-top: 0.2rem;"></div>
            </div>

            <div style="margin-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;">
              <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Flujo Binario Completo (Base64):</label>
              <textarea id="packed-base64-output" rows="3" readonly class="font-mono" style="font-size: 0.8rem;"></textarea>
            </div>
          </div>
        </div>

        <!-- Columna de Descifrado & Demostración de Integridad -->
        <div class="card space-y-4" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <h3 style="font-size: 1.15rem;">2. Descifrado y Prueba de Integridad</h3>
            <span class="badge badge-emerald">Verificación de Tag</span>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Paquete Binario Cifrado (Base64):
            </label>
            <textarea id="decrypt-base64-input" rows="3" placeholder="Pega el paquete cifrado en Base64..." class="font-mono"></textarea>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Contraseña de Descifrado:
            </label>
            <input type="password" id="decrypt-pass-input" placeholder="Contraseña..." />
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button id="btn-run-decrypt" class="btn btn-emerald" style="flex: 2;">
              🔓 Descifrar y Validar
            </button>
            <button id="btn-tamper-test" class="btn btn-danger" style="flex: 1;" title="Altera 1 bit del texto cifrado para comprobar cómo el Authentication Tag rechaza el ataque">
              💥 Simular Ataque (Bit-Flip)
            </button>
          </div>

          <!-- Resultado del Descifrado -->
          <div id="decrypt-result-box" style="display: none; display: flex; flex-direction: column; gap: 0.75rem;">
            <div id="decrypt-status-alert" class="alert-box"></div>
            <div>
              <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Texto Plano Descifrado:</label>
              <textarea id="decrypted-plaintext-output" rows="3" readonly class="font-mono"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 3: CIFRADO ASIMÉTRICO / HÍBRIDO (RSA-4096 + AES-GCM) -->
      <div class="card space-y-4" style="margin-top: 1.5rem;">
        <!-- Header con Badges Matemáticos y Explicativos -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem;">
              <h3 style="font-size: 1.25rem;">3. Cifrado Híbrido Asimétrico (RSA-4096 / RSA-OAEP + AES-256-GCM)</h3>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
              Encapsulamiento seguro de clave efímera simétrica con RSA-OAEP y cifrado autenticado de datos con AES-256-GCM.
            </p>
            <div style="display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.5rem;">
              <span class="badge badge-purple" title="Módulo N = p * q de 4096 bits (1234 dígitos decimales)">MÓDULO N (4096 BITS)</span>
              <span class="badge badge-cyan" title="Cuarto primo de Fermat e = 2^16 + 1 = 65537">EXPONENTE e = 65537</span>
              <span class="badge badge-emerald" title="Optimal Asymmetric Encryption Padding con SHA-256 y máscara MGF1">RSA-OAEP (SHA-256 / MGF1)</span>
            </div>
          </div>
          <button id="btn-gen-rsa" class="btn btn-secondary">
            ⚡ Generar Par de Claves RSA-4096
          </button>
        </div>

        <!-- Par de Claves RSA con Botones de Copiar -->
        <div class="grid-2">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">
                Clave Pública (Public Key PEM - SPKI):
              </label>
              <button id="btn-copy-pub" class="btn btn-secondary" style="padding: 0.2rem 0.65rem; font-size: 0.75rem; border-color: rgba(0, 240, 255, 0.3); color: var(--accent-cyan);" title="Copiar clave pública al portapapeles">
                📋 Copiar
              </button>
            </div>
            <textarea id="rsa-public-key" rows="6" readonly class="font-mono" style="font-size: 0.75rem;" placeholder="Haz clic en 'Generar Par de Claves RSA-4096'..."></textarea>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">
                Clave Privada (Private Key PEM - PKCS#8):
              </label>
              <button id="btn-copy-priv" class="btn btn-secondary" style="padding: 0.2rem 0.65rem; font-size: 0.75rem; border-color: rgba(168, 85, 247, 0.3); color: #d8b4fe;" title="Copiar clave privada al portapapeles">
                📋 Copiar
              </button>
            </div>
            <textarea id="rsa-private-key" rows="6" readonly class="font-mono" style="font-size: 0.75rem;" placeholder="Haz clic en 'Generar Par de Claves RSA-4096'..."></textarea>
          </div>
        </div>

        <!-- FLUJO DE COMUNICACIÓN HÍBRIDA: LADO EMISOR (ALICE) VS LADO RECEPTOR (BOB) -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 1.15rem;">
          <div style="margin-bottom: 1rem;">
            <h4 style="font-size: 1.05rem; color: #ffffff; display: flex; align-items: center; gap: 0.4rem;">
              <span>⚖️</span> Flujo de Comunicación Híbrida: Lado Emisor (Alice) vs Lado Receptor (Bob)
            </h4>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Demostración interactiva: Alice cifra con la Clave Pública de Bob; Bob descifra con su Clave Privada secreta.
            </p>
          </div>

          <!-- DIAGRAMA VISUAL INTERACTIVO (INFOGRAFÍA EN VIVO) -->
          <div class="crypto-visual-pipeline">
            <div class="pipeline-stepper">
              <div id="step-1-indicator" class="pipeline-step active">
                <div class="step-number">1</div>
                <span>Generar Par RSA-4096 (Bob)</span>
              </div>
              <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1); margin: 0 0.75rem;"></div>
              <div id="step-2-indicator" class="pipeline-step">
                <div class="step-number">2</div>
                <span>Alice Cifra Sobre Digital</span>
              </div>
              <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1); margin: 0 0.75rem;"></div>
              <div id="step-3-indicator" class="pipeline-step">
                <div class="step-number">3</div>
                <span>Bob Abre con Clave Privada</span>
              </div>
            </div>

            <div class="pipeline-nodes-container">
              <!-- NODO 1: ALICE -->
              <div id="diagram-node-alice" class="pipeline-actor-card">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; color: var(--accent-cyan);">
                    <span style="font-size: 1.25rem;">👩‍💻</span> Alice (Emisor)
                  </div>
                  <span class="badge badge-cyan" style="font-size: 0.65rem;">Origina Mensaje</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                  <div>📝 Mensaje Confidencial</div>
                  <div>➕ Clave Efímera AES-256 (32B)</div>
                </div>
                <div class="key-representation-box" style="background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.25); color: #cffafe;">
                  <span style="font-size: 1.1rem;">🔓</span>
                  <div>
                    <strong style="display: block;">Candado de Bob (Clave Pública)</strong>
                    <span style="font-size: 0.68rem; color: var(--text-muted);">Sella la clave AES dentro del sobre</span>
                  </div>
                </div>
              </div>

              <!-- NODO 2: CANAL / SOBRE DIGITAL -->
              <div class="pipeline-middle-channel">
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                  🌐 Red Pública / Internet
                </div>
                <div class="transit-track">
                  <div id="diagram-transit-pulse" class="transit-track-pulse" style="display: none;"></div>
                </div>
                <div id="diagram-envelope" class="digital-envelope-visual">
                  <div id="diagram-envelope-icon" style="font-size: 1.35rem; margin-bottom: 0.2rem;">📦🔒</div>
                  <strong id="diagram-envelope-title" style="color: #e9d5ff; display: block;">Sobre Digital Blindado</strong>
                  <span id="diagram-envelope-status" style="font-size: 0.68rem; color: var(--text-secondary);">En espera de claves...</span>
                </div>
              </div>

              <!-- NODO 3: BOB -->
              <div id="diagram-node-bob" class="pipeline-actor-card">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700; color: #d8b4fe;">
                    <span style="font-size: 1.25rem;">👨‍💻</span> Bob (Receptor)
                  </div>
                  <span class="badge badge-purple" style="font-size: 0.65rem;">Destino Final</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                  <div>📥 Recibe el paquete por internet</div>
                  <div>🛡️ Valida AuthTag GHASH (128 bits)</div>
                </div>
                <div class="key-representation-box" style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.25); color: #e9d5ff;">
                  <span style="font-size: 1.1rem;">🗝️</span>
                  <div>
                    <strong style="display: block;">Única Llave Secreta (Clave Privada)</strong>
                    <span style="font-size: 0.68rem; color: var(--text-muted);">Solo Bob puede abrir el candado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid-2" style="gap: 1.25rem;">
            <!-- COLUMNA 1: LADO EMISOR (ALICE) -->
            <div style="background: rgba(0, 240, 255, 0.03); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 10px; padding: 1.15rem; display: flex; flex-direction: column; gap: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 240, 255, 0.15); padding-bottom: 0.5rem;">
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.35rem;">
                  <span>📤</span> 1. Lado Emisor (Alice)
                </div>
                <span class="badge badge-cyan" style="font-size: 0.68rem;">Usa Clave Pública</span>
              </div>

              <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; margin: 0;">
                Alice redacta el mensaje confidencial. <strong>No necesita la clave privada</strong>. El sistema genera una clave efímera AES de 256 bits, cifra el mensaje y protege la clave dentro del sobre digital RSA-OAEP.
              </p>

              <div>
                <label style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.3rem;">
                  Mensaje Confidencial de Alice:
                </label>
                <textarea id="hybrid-message-input" rows="2" style="font-size: 0.85rem;">Transacción bancaria confidencial aprobada #893712</textarea>
              </div>

              <button id="btn-alice-encrypt" class="btn btn-primary" style="width: 100%;" disabled>
                🔒 Cifrar y Empaquetar Sobre Digital (Alice)
              </button>

              <!-- Paquete Generado por Alice -->
              <div id="alice-output-box" style="display: none; background: rgba(0,0,0,0.45); padding: 0.85rem; border-radius: 6px; border: 1px solid rgba(0, 240, 255, 0.2); font-family: var(--font-mono); font-size: 0.76rem; line-height: 1.6;">
                <div style="color: var(--accent-cyan); font-weight: 700; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">
                  <span>📦</span> SOBRE DIGITAL TRANSMITIDO POR ALICE:
                </div>
                <div>• <strong>Clave AES Efímera (Cifrada con RSA-OAEP 4096):</strong> <span id="alice-enc-key" style="color: #cffafe; word-break: break-all;">-</span></div>
                <div>• <strong>IV GCM (Nonce 96 bits):</strong> <span id="alice-iv" style="color: var(--accent-cyan);">-</span></div>
                <div>• <strong>Authentication Tag (128 bits):</strong> <span id="alice-tag" style="color: var(--accent-amber);">-</span></div>
                <div>• <strong>Ciphertext (Datos AES-256):</strong> <span id="alice-cipher" style="color: var(--text-muted); word-break: break-all;">-</span></div>
                <div style="margin-top: 0.5rem; color: #a7f3d0; font-size: 0.72rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.4rem;">
                  📡 Paquete en tránsito listo para ser entregado a Bob.
                </div>
              </div>
            </div>

            <!-- COLUMNA 2: LADO RECEPTOR (BOB) -->
            <div style="background: rgba(168, 85, 247, 0.03); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 10px; padding: 1.15rem; display: flex; flex-direction: column; gap: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(168, 85, 247, 0.15); padding-bottom: 0.5rem;">
                <div style="font-weight: 700; font-size: 0.95rem; color: #d8b4fe; display: flex; align-items: center; gap: 0.35rem;">
                  <span>📥</span> 2. Lado Receptor (Bob)
                </div>
                <span class="badge badge-purple" style="font-size: 0.68rem;">Usa Clave Privada</span>
              </div>

              <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; margin: 0;">
                Bob recibe el paquete de la red. Utiliza su <strong>Clave Privada secreta de 4096 bits</strong> para abrir el sobre digital, recuperar la clave simétrica efímera de 256 bits y validar la autenticidad con el AuthTag.
              </p>

              <button id="btn-bob-decrypt" class="btn btn-emerald" style="width: 100%;" disabled>
                🔓 Abrir Sobre Digital y Descifrar (Bob)
              </button>

              <!-- Resultado del Descifrado de Bob -->
              <div id="bob-output-box" style="display: none; background: rgba(0,0,0,0.45); padding: 0.85rem; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.3); font-family: var(--font-mono); font-size: 0.76rem; line-height: 1.6;">
                <div style="color: var(--accent-emerald); font-weight: 700; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">
                  <span>✅</span> DESENCRIPTADO Y VERIFICADO POR BOB:
                </div>
                <div>• <strong>Clave de Sesión AES Recuperada:</strong> <span id="bob-dec-key" style="color: #a7f3d0; word-break: break-all;">-</span></div>
                <div>• <strong>Validación AuthTag (GHASH):</strong> <span style="color: var(--accent-emerald); font-weight: bold;">AUTÉNTICO (128 bits OK)</span></div>
                <div style="margin-top: 0.45rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.45rem;">
                  <span style="color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Texto Plano Final Recuperado:</span>
                  <div id="bob-plaintext" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.45rem 0.75rem; border-radius: 4px; color: #ffffff; font-weight: 700; font-size: 0.88rem;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Elementos DOM
  const plainInput = container.querySelector('#crypto-plain-input');
  const passInput = container.querySelector('#crypto-pass-input');
  const btnRunEncrypt = container.querySelector('#btn-run-encrypt');

  const cryptoStructureBox = container.querySelector('#crypto-structure-box');
  const hexSalt = container.querySelector('#hex-salt');
  const hexIv = container.querySelector('#hex-iv');
  const hexTag = container.querySelector('#hex-tag');
  const hexCipher = container.querySelector('#hex-cipher');
  const packedBase64Output = container.querySelector('#packed-base64-output');

  const decryptBase64Input = container.querySelector('#decrypt-base64-input');
  const decryptPassInput = container.querySelector('#decrypt-pass-input');
  const btnRunDecrypt = container.querySelector('#btn-run-decrypt');
  const btnTamperTest = container.querySelector('#btn-tamper-test');
  const decryptResultBox = container.querySelector('#decrypt-result-box');
  const decryptStatusAlert = container.querySelector('#decrypt-status-alert');
  const decryptedPlaintextOutput = container.querySelector('#decrypted-plaintext-output');

  // RSA & Two-Column Hybrid DOM
  const btnGenRsa = container.querySelector('#btn-gen-rsa');
  const rsaPublicKey = container.querySelector('#rsa-public-key');
  const rsaPrivateKey = container.querySelector('#rsa-private-key');
  const btnCopyPub = container.querySelector('#btn-copy-pub');
  const btnCopyPriv = container.querySelector('#btn-copy-priv');

  const hybridMessageInput = container.querySelector('#hybrid-message-input');
  const btnAliceEncrypt = container.querySelector('#btn-alice-encrypt');
  const aliceOutputBox = container.querySelector('#alice-output-box');
  const aliceEncKey = container.querySelector('#alice-enc-key');
  const aliceIv = container.querySelector('#alice-iv');
  const aliceTag = container.querySelector('#alice-tag');
  const aliceCipher = container.querySelector('#alice-cipher');

  const btnBobDecrypt = container.querySelector('#btn-bob-decrypt');
  const bobOutputBox = container.querySelector('#bob-output-box');
  const bobDecKey = container.querySelector('#bob-dec-key');
  const bobPlaintext = container.querySelector('#bob-plaintext');

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

  // --- Sistema de Notificaciones Toast Modernas (Auto-cierre en 2s) ---
  const showToast = ({ title, message, icon = '💥', type = 'danger', duration = 2000 }) => {
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
      btnRunEncrypt.innerHTML = '⏳ Derivando clave con PBKDF2 (600,000 iter)...';

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
        icon: '❌',
        type: 'danger',
        duration: 2000
      });
    } finally {
      btnRunEncrypt.disabled = false;
      btnRunEncrypt.innerHTML = '🔒 Cifrar con AES-256-GCM + PBKDF2';
    }
  });

  // --- Ejecutar Descifrado Simétrico ---
  btnRunDecrypt.addEventListener('click', async () => {
    try {
      btnRunDecrypt.disabled = true;
      btnRunDecrypt.innerHTML = '⏳ Verificando AuthTag y descifrando...';

      const packedData = decryptBase64Input.value.trim();
      const password = decryptPassInput.value;

      const result = await ApiService.decryptAESGCM(packedData, password);

      decryptResultBox.style.display = 'flex';
      decryptStatusAlert.className = 'alert-box alert-success';
      decryptStatusAlert.innerHTML = `
        <strong>✅ Autenticación GCM Válida:</strong> El mensaje no ha sufrido ninguna modificación ni truncamiento. Se verificaron el Salt (${result.saltHex.substring(0,8)}...), el IV (${result.ivHex.substring(0,8)}...) y el Authentication Tag (${result.tagHex.substring(0,8)}...).
      `;
      decryptedPlaintextOutput.value = result.plaintextUtf8;
    } catch (err) {
      decryptResultBox.style.display = 'flex';
      decryptStatusAlert.className = 'alert-box alert-danger';
      decryptStatusAlert.innerHTML = `
        <strong>❌ Fallo de Verificación Criptográfica:</strong> ${err.message}
      `;
      decryptedPlaintextOutput.value = '';
    } finally {
      btnRunDecrypt.disabled = false;
      btnRunDecrypt.innerHTML = '🔓 Descifrar y Validar';
    }
  });

  // --- Simulación de Ataque / Manipulación (Bit-Flip) ---
  btnTamperTest.addEventListener('click', () => {
    const raw = decryptBase64Input.value.trim();
    if (!raw) {
      showToast({
        title: 'Entrada Requerida',
        message: 'Primero debes generar o ingresar un paquete cifrado en Base64.',
        icon: '⚠️',
        type: 'warning',
        duration: 2000
      });
      return;
    }
    try {
      // Decodificar Base64 a bytes, voltear 1 bit del último byte del texto cifrado y recodificar
      const binaryStr = atob(raw);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      // Invertir el bit menos significativo del último byte
      bytes[bytes.length - 1] ^= 0x01;

      const tamperedStr = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      decryptBase64Input.value = btoa(tamperedStr);

      showToast({
        title: '¡Ataque Inyectado con Éxito!',
        message: 'Se alteró 1 bit del texto cifrado. Haz clic en "Descifrar y Validar" para comprobar cómo el Authentication Tag detecta la manipulación.',
        icon: '💥',
        type: 'danger',
        duration: 2000
      });
    } catch (err) {
      showToast({
        title: 'Error en Manipulación',
        message: `No se pudo manipular el payload: ${err.message}`,
        icon: '❌',
        type: 'danger',
        duration: 2000
      });
    }
  });

  // --- Botones de Copiar al Portapapeles ---
  const setupCopyButton = (btn, textarea, defaultLabel) => {
    btn.addEventListener('click', async () => {
      const val = textarea.value.trim();
      if (!val) return;
      try {
        await navigator.clipboard.writeText(val);
        btn.innerHTML = '✅ ¡Copiado!';
        setTimeout(() => { btn.innerHTML = defaultLabel; }, 2000);
      } catch {
        textarea.select();
        document.execCommand('copy');
        btn.innerHTML = '✅ ¡Copiado!';
        setTimeout(() => { btn.innerHTML = defaultLabel; }, 2000);
      }
    });
  };

  setupCopyButton(btnCopyPub, rsaPublicKey, '📋 Copiar');
  setupCopyButton(btnCopyPriv, rsaPrivateKey, '📋 Copiar');

  // --- Generación de Par RSA-4096 ---
  btnGenRsa.addEventListener('click', async () => {
    try {
      btnGenRsa.disabled = true;
      btnGenRsa.innerHTML = '⏳ Generando par RSA de 4096 bits (CSPRNG)...';

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
        icon: '❌',
        type: 'danger',
        duration: 2500
      });
    } finally {
      btnGenRsa.disabled = false;
      btnGenRsa.innerHTML = '⚡ Generar Par de Claves RSA-4096';
    }
  });

  // --- LADO EMISOR (ALICE): Cifrado Híbrido con Clave Pública ---
  btnAliceEncrypt.addEventListener('click', async () => {
    try {
      const plaintext = hybridMessageInput.value;
      const pubKey = rsaPublicKey.value;

      if (!pubKey) {
        showToast({
          title: 'Clave Requerida',
          message: 'Primero debes generar el par de claves RSA.',
          icon: '⚠️',
          type: 'warning',
          duration: 2000
        });
        return;
      }

      btnAliceEncrypt.disabled = true;
      btnAliceEncrypt.innerHTML = '⏳ Alice cifrando datos con AES y clave con RSA-OAEP...';

      // Alice cifra el mensaje usando la Clave Pública de Bob
      const hybridPayload = await ApiService.hybridEncrypt(plaintext, pubKey);
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

      // Habilitar a Bob para que reciba y descifre
      btnBobDecrypt.disabled = false;
      bobOutputBox.style.display = 'none';
    } catch (err) {
      showToast({
        title: 'Error en Cifrado de Alice',
        message: err.message,
        icon: '❌',
        type: 'danger',
        duration: 2500
      });
    } finally {
      btnAliceEncrypt.disabled = false;
      btnAliceEncrypt.innerHTML = '🔒 Cifrar y Empaquetar Sobre Digital (Alice)';
    }
  });

  // --- LADO RECEPTOR (BOB): Descifrado del Sobre con Clave Privada ---
  btnBobDecrypt.addEventListener('click', async () => {
    if (!currentHybridPayload) {
      showToast({
        title: 'Sobre no Disponible',
        message: 'Alice primero debe cifrar y transmitir el paquete.',
        icon: '⚠️',
        type: 'warning',
        duration: 2000
      });
      return;
    }
    const privKey = rsaPrivateKey.value;
    if (!privKey) {
      showToast({
        title: 'Clave Requerida',
        message: 'Se requiere la clave privada de Bob.',
        icon: '⚠️',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    try {
      btnBobDecrypt.disabled = true;
      btnBobDecrypt.innerHTML = '⏳ Bob abriendo sobre digital con Clave Privada...';

      // Bob abre el sobre digital con su clave privada y descifra con AES-GCM
      const decrypted = await ApiService.hybridDecrypt(currentHybridPayload, privKey);

      bobDecKey.textContent = '256 bits recuperados con éxito vía RSA-OAEP';
      bobPlaintext.textContent = decrypted.plaintext;
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
    } catch (err) {
      showToast({
        title: 'Error en Descifrado de Bob',
        message: err.message,
        icon: '❌',
        type: 'danger',
        duration: 2500
      });
    } finally {
      btnBobDecrypt.disabled = false;
      btnBobDecrypt.innerHTML = '🔓 Abrir Sobre Digital y Descifrar (Bob)';
    }
  });
}


