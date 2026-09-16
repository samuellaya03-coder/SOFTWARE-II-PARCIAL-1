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

      <!-- SECCIÓN 2: CIFRADO ASIMÉTRICO / HÍBRIDO (RSA-4096 + AES-GCM) -->
      <div class="card space-y-4" style="margin-top: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          <div>
            <h3 style="font-size: 1.25rem;">3. Cifrado Híbrido Asimétrico (RSA-4096 / RSA-OAEP + AES-256-GCM)</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Uso de RSA para encapsular de forma segura la clave de sesión simétrica efímera de 256 bits generada por CSPRNG.
            </p>
          </div>
          <button id="btn-gen-rsa" class="btn btn-secondary">
            ⚡ Generar Par de Claves RSA-4096
          </button>
        </div>

        <div class="grid-2">
          <div>
            <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">
              Clave Pública (Public Key PEM - SPKI):
            </label>
            <textarea id="rsa-public-key" rows="6" readonly class="font-mono" style="font-size: 0.75rem;" placeholder="Haz clic en 'Generar Par de Claves RSA-4096'..."></textarea>
          </div>

          <div>
            <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">
              Clave Privada (Private Key PEM - PKCS#8):
            </label>
            <textarea id="rsa-private-key" rows="6" readonly class="font-mono" style="font-size: 0.75rem;" placeholder="Haz clic en 'Generar Par de Claves RSA-4096'..."></textarea>
          </div>
        </div>

        <!-- Demostración Cifrado Híbrido -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <h4 style="font-size: 1rem; color: var(--accent-purple);">Demostración de Cifrado Híbrido de Sesión</h4>
          <div style="display: flex; gap: 1rem;">
            <input type="text" id="hybrid-message-input" value="Transacción bancaria confidencial aprobada #893712" style="flex: 3;" />
            <button id="btn-run-hybrid" class="btn btn-primary" style="flex: 1;" disabled>
              🔒 Ejecutar Cifrado Híbrido
            </button>
          </div>

          <div id="hybrid-result-box" style="display: none; background: rgba(0,0,0,0.35); padding: 1rem; border-radius: 8px; font-size: 0.85rem;">
            <!-- Se llena dinámicamente -->
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

  // RSA DOM
  const btnGenRsa = container.querySelector('#btn-gen-rsa');
  const rsaPublicKey = container.querySelector('#rsa-public-key');
  const rsaPrivateKey = container.querySelector('#rsa-private-key');
  const hybridMessageInput = container.querySelector('#hybrid-message-input');
  const btnRunHybrid = container.querySelector('#btn-run-hybrid');
  const hybridResultBox = container.querySelector('#hybrid-result-box');

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
      alert(`Error en cifrado: ${err.message}`);
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
      alert('Primero debes generar o ingresar un paquete cifrado en Base64.');
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

      alert('💥 ¡ATAQUE SIMULADO! Se ha modificado 1 bit del texto cifrado.\nAhora haz clic en "Descifrar y Validar" para observar cómo el Authentication Tag de AES-GCM detecta inmediatamente la manipulación.');
    } catch (err) {
      alert(`No se pudo manipular el payload: ${err.message}`);
    }
  });

  // --- Generación de Par RSA-4096 ---
  btnGenRsa.addEventListener('click', async () => {
    try {
      btnGenRsa.disabled = true;
      btnGenRsa.innerHTML = '⏳ Generando par RSA de 4096 bits (CSPRNG)...';

      const keyPair = await ApiService.generateRSAKeys();
      rsaPublicKey.value = keyPair.publicKey;
      rsaPrivateKey.value = keyPair.privateKey;
      btnRunHybrid.disabled = false;
    } catch (err) {
      alert(`Error generando RSA: ${err.message}`);
    } finally {
      btnGenRsa.disabled = false;
      btnGenRsa.innerHTML = '⚡ Generar Par de Claves RSA-4096';
    }
  });

  // --- Ejecución de Cifrado Híbrido ---
  btnRunHybrid.addEventListener('click', async () => {
    try {
      const plaintext = hybridMessageInput.value;
      const pubKey = rsaPublicKey.value;
      const privKey = rsaPrivateKey.value;

      if (!pubKey || !privKey) {
        alert('Debes generar las claves RSA primero.');
        return;
      }

      btnRunHybrid.disabled = true;
      btnRunHybrid.innerHTML = '⏳ Ejecutando Cifrado Híbrido...';

      // 1. Cifrar con clave pública RSA
      const hybridPayload = await ApiService.hybridEncrypt(plaintext, pubKey);

      // 2. Descifrar con clave privada RSA para comprobar el ciclo completo
      const decrypted = await ApiService.hybridDecrypt(hybridPayload, privKey);

      hybridResultBox.style.display = 'block';
      hybridResultBox.innerHTML = `
        <div style="color: var(--accent-emerald); font-weight: 600; margin-bottom: 0.5rem;">
          ✅ Esquema Híbrido Completado Exitosamente
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.35rem; font-family: var(--font-mono); font-size: 0.8rem;">
          <div>• <strong>Clave Simétrica AES Efímera (Cifrada con RSA-OAEP 4096):</strong> ${hybridPayload.encryptedKeyBase64.substring(0, 48)}... (${hybridPayload.encryptedKeyBase64.length} chars)</div>
          <div>• <strong>IV GCM:</strong> ${hybridPayload.ivHex}</div>
          <div>• <strong>AuthTag GCM:</strong> ${hybridPayload.tagHex}</div>
          <div>• <strong>Mensaje Descifrado por Receptor con Clave Privada:</strong> <span style="color: var(--accent-cyan); font-weight: bold;">${decrypted.plaintext}</span></div>
        </div>
      `;
    } catch (err) {
      alert(`Error en cifrado híbrido: ${err.message}`);
    } finally {
      btnRunHybrid.disabled = false;
      btnRunHybrid.innerHTML = '🔒 Ejecutar Cifrado Híbrido';
    }
  });
}
