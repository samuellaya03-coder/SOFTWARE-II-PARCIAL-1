/**
 * SERVICIO DE ASISTENCIA INTELIGENTE (CYBERTUTOR IA)
 * Conecta dinámicamente con Google Gemini 1.5 Flash (cuando hay API Key)
 * o utiliza el motor de conocimiento técnico local en tiempo real como respaldo.
 */

import { CRYPTO_CONFIG } from './crypto.service.js';
import { containsProfanity } from './profanity.service.js';

export class AiService {
  /**
   * Genera el contexto dinámico del código y configuración activa del laboratorio.
   */
  static getLiveSystemContext(activeTab = 'general') {
    return `Eres CyberTutor IA, profesor y tutor experto en ciberseguridad del "Laboratorio Web de Criptografía & Esteganografía (Modo Difícil)".
Contexto del laboratorio:
1. Módulo 1 (Esteganografía LSB en Canvas): Inserción/extracción en canales R, G, B (3 bits/píxel). Canal Alfa intacto (255). Primeros 32 bits codifican la longitud en Big-Endian.
2. Módulo 2 (Cifrado Híbrido & Auditoría): Cifrado simétrico AES-256-GCM con IV de 12 bytes y AuthTag GHASH de 16 bytes. Derivación PBKDF2-HMAC-SHA512 (600,000 iteraciones). Cifrado asimétrico RSA-4096 bits con relleno OAEP (SHA-256 / MGF1).
Consola Forense de Ataques de Eve (27 comandos): challenge-weak (CTF Pollard rho 32-bit), inspect/target, factorize (GNFS 4096 bits), fermat (-n), pollard-p1, ecm, wiener, hastad, coppersmith (LLL lattice), franklin-reiter, common-modulus, batch-gcd, shor (computación cuántica), timing-attack (O(1)), power-analysis (DPA), bellcore (CRT fault injection), entropy (Shannon ~7.99), bleichenbacher, padding-oracle, bit-flipping, nonce-reuse (Joux), inject-fake-key, bruteforce-gcm, mitm, replay, dictionary (RockYou), y motor universal.
3. Módulo 3 (Estegoanálisis Forense): Prueba Chi-cuadrado (χ²) sobre Pares de Valores (PoVs Westfeld & Pfitzmann), Entropía de Shannon H(X).
4. Módulo 4 (Ataques a Imágenes y Planos de Bits): 8 planos de bits (0 a 7), inyección de ruido, detección de manipulación por AuthTag.

Directiva: Responde siempre en español, de forma pedagógica, clara y directa usando Markdown. Explica conceptos con profundidad académica y rigor técnico.`;
  }

  /**
   * Resuelve una consulta con Gemini o el motor local de respaldo.
   * La API Key se lee exclusivamente de las variables de entorno del servidor.
   */
  static async ask({ prompt, activeTab = 'general' }) {
    // 1. Filtro de moderación y convivencia académica (Español e Inglés)
    if (containsProfanity(prompt)) {
      return {
        success: true,
        answer: '⚠️ **Aviso de Convivencia:** CyberTutor IA es un asistente académico de ciberseguridad. Por favor, formula tus consultas con un lenguaje respetuoso y enfocado en los temas del laboratorio.',
        source: 'moderation',
        model: 'CyberTutor Moderación'
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const result = await this.queryGemini(prompt, activeTab, apiKey);
        return {
          success: true,
          answer: result.text,
          source: result.model,
          model: `Google Gemini (${result.model})`
        };
      } catch (err) {
        console.warn(`[AI SERVICE] Fallo llamada a Gemini API (${err.message}). Activando motor local de respaldo.`);
      }
    }

    // Motor local de conocimiento inteligente
    const localAnswer = this.getLocalKnowledgeAnswer(prompt, activeTab);
    return {
      success: true,
      answer: localAnswer,
      source: 'local-tutor',
      model: 'CyberTutor Base de Conocimiento Activa (Offline)'
    };
  }

  /**
   * Consulta a la API oficial de Google Gemini usando los modelos activos disponibles.
   */
  static async queryGemini(prompt, activeTab, apiKey) {
    const systemContext = this.getLiveSystemContext(activeTab);
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemma-4-26b-a4b-it'
    ];
    
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        let body;
        if (modelName.startsWith('gemma')) {
          body = {
            contents: [
              {
                role: 'user',
                parts: [
                  { 
                    text: `${systemContext}\n\n[Pestaña activa del alumno: ${activeTab}]\n\nPregunta del alumno:\n${prompt}\n\nDirectiva: Responde directamente al alumno en español con formato Markdown claro y profesional sin notas de pensamiento.` 
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 4096
            }
          };
        } else {
          body = {
            systemInstruction: {
              parts: [{ text: systemContext }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: `[Pestaña activa del alumno: ${activeTab}]\n\nPregunta del alumno:\n${prompt}` }]
              }
            ],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 4096
            }
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(12000)
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          
          if (candidate?.finishReason === 'SAFETY') {
            return {
              text: '⚠️ La consulta fue detenida por las políticas de seguridad de contenido de la IA. Por favor, reformula tu pregunta con términos técnicos.',
              model: modelName
            };
          }

          const parts = candidate?.content?.parts || [];
          const answerPart = parts.find(p => !p.thought) || parts[parts.length - 1];
          let text = answerPart?.text || parts[0]?.text;

          if (text) {
            // Limpieza de marcadores residuales si existen
            if (text.includes('User Persona:') || text.includes('*   Topic:') || text.includes('*   Role:') || text.includes('*   User:')) {
              const bodyMatch = text.match(/(?:(?:\n\s*#{1,4}\s+[^\n]+)|(?:\n\s*(?:¡Hola|Hola|En el Módulo|El Módulo|Los comandos|Este laboratorio|Para responder)[^\n]+))[\s\S]+/i);
              if (bodyMatch && bodyMatch[0] && bodyMatch[0].trim().length > 30) {
                text = bodyMatch[0].trim();
              }
            } else if (text.includes('Content:')) {
              const contentMatch = text.match(/Content:\s*([\s\S]+?)(?=\n\s*\*+\s*(?:Does it|Concise|Final|Check)|$)/i);
              if (contentMatch && contentMatch[1] && contentMatch[1].trim().length > 10) {
                text = contentMatch[1].trim();
              }
            } else if (/Draft(?:\s*\d+)?(?:\s*\([^)]*\))?\s*:/i.test(text)) {
              const allDrafts = [...text.matchAll(/(?:Draft(?:\s*\d+)?(?:\s*\([^)]*\))?\s*:)\s*([\s\S]+?)(?=\n\s*\*+\s*(?:Draft|Concise|Final|Check|Result|Greeting|Does it)|$)/gi)];
              if (allDrafts.length > 0) {
                const lastDraft = allDrafts[allDrafts.length - 1][1].trim();
                if (lastDraft.length > 10) text = lastDraft;
              }
            }

            if (candidate?.finishReason === 'MAX_TOKENS') {
              text += '\n\n*(Nota: La respuesta alcanzó la extensión máxima del turno. Si deseas continuar profundizando en algún módulo o concepto, por favor indícamelo).*';
            }
            return { text: text.trim(), model: modelName };
          }
        } else {
          const errText = await res.text();
          lastError = new Error(`Model ${modelName} returned status ${res.status}: ${errText.substring(0, 150)}`);
        }
      } catch (netErr) {
        lastError = netErr;
      }
    }

    throw lastError || new Error('No se pudo obtener respuesta de ningún modelo de Gemini.');
  }

  /**
   * Motor de conocimiento técnico local que garantiza respuestas pedagógicas siempre.
   */
  static getLocalKnowledgeAnswer(prompt, activeTab) {
    const p = prompt.toLowerCase();

    // 0. Explicación de los Comandos de Ataque del Módulo 2 (Eve Terminal)
    if (
      p.includes('comando') || 
      p.includes('comandos') || 
      p.includes('comadno') || 
      p.includes('comadnos') || 
      p.includes('terminal') || 
      p.includes('eve') || 
      p.includes('exploit') ||
      ((p.includes('modulo 2') || p.includes('módulo 2') || p.includes('modulo2') || activeTab === 'crypto') && 
       (p.includes('ataque') || p.includes('com') || p.includes('explica') || p.includes('que son') || p.includes('cuales son') || p.includes('lista')))
    ) {
      return `### ⚡ Comandos Forenses de Criptoanálisis (Módulo 2: Eve Exploit Framework)

El Módulo 2 cuenta con una **Consola Interactiva de Eve** equipada con **27 comandos forenses reales** agrupados en 6 categorías para auditar la seguridad del sobre digital híbrido (RSA-4096 + AES-256-GCM):

---

#### 1. 🎯 Desafíos CTF e Inspección
* **\`challenge-weak\`**: Genera un par RSA débil de 32 bits y ejecuta el algoritmo $\\rho$ de Pollard en tiempo real para factorizar el módulo y descifrar la bandera en milisegundos.
* **\`inspect\`** / **\`target\`**: Desensambla y extrae la telemetría del sobre de Alice: módulo $N$ (4096 bits), exponente $e=65537$, IV (96 bits) y AuthTag GHASH (128 bits).

#### 2. ⚡ Factorización Asintótica & Álgebra
* **\`factorize\`** / **\`gnfs\`**: Ejecuta la Criba de Cuerpo Numérico General (GNFS) contra RSA-4096. Demuestra empíricamente la barrera asintótica $L_N[1/3, c]$ que exige más de **100 Trillones de Años**.
* **\`fermat [-n num]\`**: Criptoanálisis por diferencia de cuadrados ($a^2 - b^2$). Inmune en RSA-4096 porque $|p - q| \\approx 10^{616}$. Admite \`-n\` para factorizar números de prueba del evaluador.
* **\`pollard-p1\`**: Algoritmo $p-1$ de Pollard (efectivo si $p-1$ es liso). Neutralizado por uso de primos seguros.
* **\`ecm\`**: Curvas Elípticas de Lenstra (ECM). Inviable cuando los factores $p$ y $q$ son simétricos de 2048 bits.

#### 3. 🔬 Criptoanálisis Estructural RSA
* **\`wiener\`**: Intenta deducir la clave privada si $d < \\frac{1}{3}N^{1/4}$. Inmune ($d$ tiene 4096 bits completos).
* **\`hastad\`**: Ataque de difusión con $e=3$. Inmune por uso de $e=65537$ y relleno probabilístico OAEP.
* **\`coppersmith\`** / **\`lattice\`**: Búsqueda de raíces modulares mediante reducción de retículos LLL (Boneh-Durfee).
* **\`franklin-reiter\`**: Ataque contra mensajes relacionados linealmente ($M_2 = aM_1 + b$). Inmune: la máscara MGF1 destruye cualquier relación afín.
* **\`common-modulus\`**: Recuperación por teorema de Bézout si se comparte $N$. Inaplicable (módulos únicos por usuario).
* **\`batch-gcd\`**: Búsqueda de primos compartidos entre módulos por baja entropía. Inmune: generación con CSPRNG hardware.

#### 4. ⏱️ Canales Laterales & Cuántica
* **\`shor\`**: Auditoría de computación cuántica (requiere 8,194 qubits lógicos estables para RSA-4096 vs Grover en AES-256).
* **\`timing-attack\`**: Mide 40,000 comparaciones con \`timingSafeEqual()\` demostrando tiempo constante $O(1)$ sin fuga temporal.
* **\`power-analysis\`** / **\`dpa\`**: Análisis diferencial de potencia electromagnética. Inmune por cegado criptográfico (RSA Blinding).
* **\`bellcore\`**: Inyección de fallos de hardware en el descifrado modular CRT. Neutralizado por validación previa de OAEP.
* **\`entropy\`**: Mide la entropía de Shannon $H(X)$ sobre el IV y Tag ($H \\approx 7.99$ bits/byte, máxima aleatoriedad).

#### 5. 🛡️ Criptoanálisis Simétrico & Protocolo
* **\`bleichenbacher\`**: Oráculo de relleno MMA de 1 millón de mensajes contra PKCS#1 v1.5. Inmune: OAEP ofrece seguridad probada IND-CCA2.
* **\`padding-oracle\`**: Ataque de Vaudenay contra modos CBC con PKCS#7. Inaplicable: AES-GCM es modo flujo sin relleno de bloques.
* **\`bit-flipping\`**: Modifica 1 bit del texto cifrado e intenta descifrar. Demuestra el rechazo instantáneo por AuthTag GHASH en $\\text{GF}(2^{128})$.
* **\`nonce-reuse\`**: Forbidden Attack de Joux si se repite el IV. Protegido: IVs y claves efímeras únicas por sesión ($P < 2^{-96}$).
* **\`inject-fake-key\`**: Inyecta una clave privada forjada y captura el error nativo de OpenSSL (\`ERR_OSSL_RSA_OAEP_DECODING_ERROR\`).
* **\`bruteforce-gcm\`**: Prueba 2,000 claves contra AES-256 demostrando la imposibilidad práctica ($2^{256}$ combinaciones).
* **\`mitm\`**: Simulación de intercepción Man-in-the-Middle y suplantación de clave pública.
* **\`replay\`**: Intento de retransmisión de paquetes capturados previamente.
* **\`dictionary\`**: Ataque de diccionario RockYou (14.3M contraseñas). Inútil contra claves generadas por CSPRNG.

#### 6. 🧠 Motor Universal Dinámico
* Cualquier comando o vector personalizado introducido por el profesor (ej: \`dlog\`, \`spectre\`, \`rainbow\`) es analizado dinámicamente bajo estándares **NIST SP 800-57 Rev 5** y **FIPS 140-3**.`;
    }

    // 0. Explicación combinada de los Módulos 3 y 4
    if ((p.includes('modulo 3') || p.includes('módulo 3')) && (p.includes('modulo 4') || p.includes('módulo 4') || p.includes('4'))) {
      return `### 🔬 Explicación Integral: Módulos 3 y 4 del Laboratorio

Ambos módulos representan la perspectiva del **analista forense multimedia** y del **atacante de señales**:

---

#### 📊 MÓDULO 3: ESTEGOANÁLISIS FORENSE MULTIMEDIA
Este módulo investiga si una imagen transporta datos secretos sin necesidad de conocer la contraseña:

1. **Prueba Chi-cuadrado (χ²) sobre Pares de Valores (PoVs):**
   * **Fundamento:** Desarrollada por Westfeld & Pfitzmann (1999). En imágenes naturales, los valores de color adyacentes ($2k$ y $2k+1$) tienen frecuencias desiguales.
   * **Detección:** La incrustación LSB sustituye bits aleatoriamente con probabilidad del 50%, lo que **nivela artificialmente** las frecuencias observadas ($f_{2k} \\approx f_{2k+1}$).
   * **Cálculo:** $\\chi^2 = \\sum \\frac{(O_i - E_i)^2}{E_i}$ con $k-1$ grados de libertad. Si el **P-value resultante es $\\approx 1.0$ (100%)**, el sistema confirma matemáticamente la presencia de esteganografía.

2. **Entropía de la Información de Shannon ($H$):**
   * Mide la aleatoriedad en bits por canal: $H = -\\sum p_i \\log_2(p_i)$ (máximo 8.0).
   * Una imagen natural suele tener entropía entre 4.5 y 7.2.
   * Cuando se incrusta un paquete protegido con **AES-256-GCM**, la entropía del plano LSB sube drásticamente a **~7.99**, delatando la huella estadística de cifrado militar.

---

#### 💥 MÓDULO 4: ATAQUES A IMÁGENES Y PLANOS DE BITS
Este módulo somete la imagen portadora a perturbaciones deliberadas para auditar la resistencia de la carga útil:

1. **Descomposición en 8 Planos de Bits (0 al 7):**
   * Cada píxel almacena 8 bits por canal (R, G, B).
   * **Plano 7 (MSB):** Define la forma, brillo y siluetas esenciales de la imagen.
   * **Plano 0 (LSB):** Parece ruido blanco puro; aquí es donde se almacena el mensaje oculto de forma imperceptible.

2. **Ataque de Ruido y Bit-Flips:**
   * Al invertir bits intencionalmente en planos bajos (bit 0), el mensaje se corrompe al instante y **AES-256-GCM rechaza el descifrado** porque el **Authentication Tag (GHASH)** ya no coincide.
   * Si se alteran planos altos (5 a 7), se observa una **lluvia visual (ruido tipo sal y pimienta)** severa en la pantalla.

3. **Mapa de Calor Diferencial (Heatmap):**
   * Compara píxel por píxel la imagen original frente a la imagen manipulada ($|P_{\\text{orig}} - P_{\\text{atacada}}|$) y proyecta un gradiente cromático (azul = intacto, rojo = máxima alteración) para localizar exactamente dónde se concentró el daño.`;
    }

    // 0.1 Solo Módulo 3
    if (p.includes('modulo 3') || p.includes('módulo 3')) {
      return `### 📊 MÓDULO 3: ESTEGOANÁLISIS FORENSE MULTIMEDIA

Este módulo implementa herramientas matemáticas para detectar esteganografía LSB:

1. **Test Chi-cuadrado (χ²) de Pares de Valores (PoVs):**
   * Compara las frecuencias observadas vs esperadas de parejas de color ($2k, 2k+1$).
   * La incrustación LSB empareja estadísticamente estos valores.
   * Un **P-value cercano a 1.0** indica con alta certeza que la imagen contiene información incrustada.

2. **Entropía de Shannon:**
   * Evalúa la dispersión de información ($H = -\\sum p_i \\log_2 p_i$).
   * El texto cifrado con **AES-256-GCM** exhibe máxima entropía (**~7.99**), lo que resalta como una anomalía estadística en canales naturales.`;
    }

    // 0.2 Solo Módulo 4
    if (p.includes('modulo 4') || p.includes('módulo 4') || p.includes('plano de bit') || p.includes('planos de bit') || p.includes('lluvia visual')) {
      return `### 💥 MÓDULO 4: ATAQUES A IMÁGENES Y PLANOS DE BITS

Este módulo permite auditar la vulnerabilidad física de los bits en la imagen:

1. **Planos de Bits (0 al 7):**
   * Aísla las 8 capas binarias de cada píxel. El plano 0 es el LSB (ruido pseudoaleatorio imperceptible) y el plano 7 es el MSB (contornos visuales dominantes).

2. **Inyección de Ruido (Bit-Flips):**
   * Demuestra el principio de integridad criptográfica: modificar aunque sea un solo bit en el plano LSB hace que el descifrado falle inmediatamente por el **Authentication Tag** de AES-GCM.
   * En planos altos, genera distorsión visual perceptible ("lluvia de píxeles").

3. **Heatmap Forense:**
   * Renderiza un mapa térmico comparativo para visualizar la propagación de la alteración en el lienzo.`;
    }

    if (p.includes('eve') || p.includes('mitm') || p.includes('intercep') || p.includes('man in the middle') || p.includes('ataque') && p.includes('rsa')) {
      return `### 🕵️ Ataque Man-in-the-Middle y la Barrera de Factorización RSA

En nuestro laboratorio, la simulación de ataque demuestra dos defensas criptográficas fundamentales:

1. **¿Por qué Eve no puede descifrar la clave AES?**
   * El sobre digital contiene la clave efímera AES de 256 bits protegida con la clave pública de Bob usando **RSA-OAEP de 4096 bits**.
   * Para romperlo sin la clave privada de Bob ($d$), Eve tendría que resolver el **Problema de Factorización de Enteros**: descomponer el módulo compuesto $N = p \\cdot q$ (de 1234 dígitos decimales) en sus dos primos secretos.
   * Con supercomputadoras clásicas actuales, factorizar $N$ tomaría más tiempo que la edad del universo. Al intentar descifrar con una clave no coincidente, OpenSSL genera el error matemático \`oaep decoding error\` porque el padding pseudoaleatorio falla la verificación.

2. **¿Qué ocurre si Eve altera el texto cifrado?**
   * Si Eve modifica aunque sea **1 solo bit** en tránsito, Bob usa su clave privada para recuperar la clave AES, pero el motor **AES-256-GCM** calcula el Authentication Tag mediante la función universal **GHASH**.
   * El Tag no coincide con los 128 bits esperados, arrojando \`Unsupported state or unable to authenticate data\`. Bob destruye el paquete de inmediato sin aceptar órdenes corruptas.`;
    }

    if (p.includes('authtag') || p.includes('tag') || p.includes('gcm') || p.includes('ghash') || p.includes('integridad')) {
      return `### 🛡️ Authentication Tag en AES-256-GCM (Integridad Autenticada)

* **¿Qué es el AuthTag?**
  Es una firma de autenticación de **16 bytes (128 bits)** generada por el modo **GCM (Galois/Counter Mode)** al terminar de cifrar los datos.
* **¿Cómo se calcula?**
  Utiliza una multiplicación polinomial en el campo de Galois $\\text{GF}(2^{128})$ llamada función **GHASH**, combinada con el valor cifrado del primer bloque del contador (J0).
* **¿Por qué es superior a modos clásicos como CBC?**
  * Modos antiguos como CBC o CTR solo ofrecen **confidencialidad** (no puedes leer el mensaje, pero si un atacante cambia bits, el descifrado simplemente se descalabra sin avisar).
  * **AES-GCM provee Cifrado Autenticado (AEAD)**: cualquier modificación en el texto cifrado, el IV o los datos adicionales asociados produce un fallo instantáneo y rechaza el mensaje completo.`;
    }

    if (p.includes('salt') || p.includes('iv') || p.includes('pbkdf2') || p.includes('kdf') || p.includes('600')) {
      return `### 🔑 Funciones de Salt, IV y PBKDF2-HMAC-SHA512

En el empaquetado binario de nuestro laboratorio $[\\text{Salt } (16B) \\mid \\text{IV } (12B) \\mid \\text{Tag } (16B) \\mid \\text{Ciphertext}]$, cada componente cumple un rol crítico:

* **Salt (16 Bytes / 128 bits):**
  Es un valor aleatorio de alta entropía (CSPRNG) que se combina con la contraseña del usuario. Evita ataques con **Tablas Rainbow** y precomputación de hashes; dos usuarios con la misma contraseña tendrán claves derivadas completamente distintas.
* **PBKDF2-HMAC-SHA512 con 600,000 iteraciones:**
  Ralentiza deliberadamente la derivación de clave para volver prohibitivos los ataques de fuerza bruta por GPU o ASIC (siguiendo estándares recomendados por OWASP).
* **IV (Initialization Vector - 12 Bytes / 96 bits):**
  Exigido por NIST SP 800-38D para el modo GCM. Garantiza que cifrar el mismo texto dos veces con la misma clave genere textos cifrados totalmente diferentes. **Nunca debe reutilizarse un IV con la misma clave.**`;
    }

    if (p.includes('32') || p.includes('cabecera') || p.includes('header') || p.includes('big-endian') || p.includes('longitud')) {
      return `### 📦 Cabecera de 32 Bits en Esteganografía LSB

Para que el receptor sepa cuántos bytes de información oculta hay en la imagen, el protocolo utiliza una **cabecera de 32 bits en formato Big-Endian**:

1. **Estructura:**
   * Un número entero de 32 bits sin signo (\`Uint32\`) almacena el tamaño exacto del payload en bytes (permite payloads de hasta $2^{32}-1$ bytes).
   * Al ser Big-Endian, el byte más significativo se coloca primero.
2. **Incrustación en Canvas:**
   * Como cada píxel almacena 3 bits (1 en R, 1 en G, 1 en B), los 32 bits de la cabecera ocupan exactamente $\\lceil 32 / 3 \\rceil = 11$ píxeles.
3. **¿Por qué es indispensable?**
   * Sin esta cabecera, el extractor no sabría cuándo detenerse y extraería ruido o ceros indefinidamente a lo largo de toda la imagen.`;
    }

    if (p.includes('lsb') || p.includes('esteganograf') || p.includes('alpha') || p.includes('alfa') || p.includes('canvas')) {
      return `### 🖼️ Esteganografía LSB (Least Significant Bit)

* **¿Cómo funciona?**
  Sustituye el bit menos significativo (el bit 0) de los valores de color (0 a 255) por los bits de nuestro mensaje secreto.
* **Impacto Visual:**
  Cambiar el bit menos significativo varía el canal de color como máximo en $\\pm 1$ nivel (por ejemplo, de 180 a 181). El ojo humano es fisiológicamente incapaz de detectar una diferencia de color tan minúscula.
* **¿Por qué preservamos el canal Alfa (A = 255)?**
  Si alteráramos el canal de opacidad Alfa, muchos motores de renderizado de Canvas aplicarían composiciones de transparencia o premultiplicación alfa (\`premultipliedAlpha\`), corrompiendo irreversiblemente los bits ocultos al guardar o exportar como PNG.`;
    }

    if (p.includes('chi') || p.includes('cuadrado') || p.includes('pov') || p.includes('westfeld') || p.includes('estegoanálisis') || p.includes('forense')) {
      return `### 📊 Estegoanálisis Forense: Test Chi-cuadrado (χ²)

Desarrollado por **Westfeld & Pfitzmann (1999)** para detectar inserciones LSB secuenciales:

* **Principio de Pares de Valores (PoVs):**
  En una imagen natural sin modificar, la frecuencia de valores pares ($2k$) e impares ($2k+1$) de color difiere por las características de la escena.
* **Efecto de la Incrustación LSB:**
  Al inyectar bits aleatorios (como texto cifrado), los valores $2k$ y $2k+1$ se intercambian uniformemente con probabilidad $0.5$, provocando que sus frecuencias tiendan a igualarse ($f_{2k} \\approx f_{2k+1}$).
* **Cálculo de $\\chi^2$:**
  $\\chi^2 = \\sum \\frac{(O_i - E_i)^2}{E_i}$ donde la frecuencia esperada es $E_i = \\frac{f_{2k} + f_{2k+1}}{2}$.
* **P-value:**
  Si el p-value es cercano a 1.0 (100%), la prueba confirma matemáticamente la presencia de datos esteganográficos ocultos.`;
    }

    if (p.includes('shannon') || p.includes('entrop') || p.includes('desorden')) {
      return `### 📈 Entropía de Shannon en Análisis de Imágenes

La **Entropía de la Información** de Claude Shannon mide el grado de incertidumbre o aleatoriedad en una distribución de bytes:

$$H = -\\sum_{i=0}^{255} p_i \\log_2(p_i)$$

* **Escala:** Para imágenes de 8 bits por canal, la entropía varía entre $0$ (imagen totalmente uniforme de un solo color) y $8.0$ (distribución de máxima aleatoriedad uniforme).
* **Firma de Criptografía:**
  Un texto plano en español tiene entropía moderada (~4.5 a 5.2). Sin embargo, un mensaje cifrado con **AES-256-GCM** posee entropía pseudoaleatoria casi perfecta (~7.99 bits).
* **Detección:** Cuando se incrusta un paquete cifrado en una imagen, la entropía del plano LSB se eleva abruptamente hacia ~8.0.`;
    }

    // --- NUEVOS TEMAS EXPANDIDOS DE CIBERSEGURIDAD Y MULTIMEDIA ---

    if (p.includes('diferencia') && (p.includes('esteganograf') || p.includes('criptograf')) || p.includes('cripto vs stego') || p.includes('criptografia o esteganografia')) {
      return `### ⚔️ Criptografía vs Esteganografía: ¿Cuál es la diferencia?

Aunque ambas disciplinas buscan proteger la información, tienen objetivos y filosofías radicalmente distintas:

1. **Criptografía (Ocultar el SIGNIFICADO):**
   * **Objetivo:** Hacer que el mensaje sea ininteligible para cualquiera que no posea la clave de descifrado.
   * **Visibilidad:** El adversario sabe que hay una comunicación secreta porque ve un texto cifrado incomprensible (ruido o galimatías en Base64).
   * **Riesgo:** Llama la atención y puede despertar sospechas o censura en la red.

2. **Esteganografía (Ocultar la EXISTENCIA):**
   * **Objetivo:** Ocultar el hecho de que siquiera existe una comunicación.
   * **Visibilidad:** El mensaje secreto se camufla dentro de un archivo portador inocente (como una foto PNG). Un espía solo ve una imagen común.
   * **Riesgo:** Si un analista forense aplica estegoanálisis (como Chi-cuadrado), los datos ocultos pueden ser detectados.

💡 **La Mejor Práctica (Lo que hace este laboratorio):**
Combinar ambas técnicas: **primero cifrar** con AES-256-GCM y **luego incrustar** con Esteganografía LSB. Si descubren la imagen, no pueden descifrar el mensaje; y si no descubren la imagen, ni siquiera sabrán que existía.`;
    }

    if (p.includes('jpg') || p.includes('jpeg') || p.includes('formato') || p.includes('compresion') || p.includes('png')) {
      return `### 🖼️ ¿Por qué usamos formato PNG y NO JPEG?

* **PNG (Compresión sin pérdida - Lossless):**
  Utiliza el algoritmo DEFLATE (LZ77 + Huffman). Guarda los valores RGB de cada píxel de forma **100% exacta y fiel**. Si guardamos un bit \`1\` en el LSB de un píxel azul, ese \`1\` permanecerá idéntico para siempre.
* **JPEG (Compresión con pérdida - Lossy):**
  JPEG divide la imagen en bloques de $8 \\times 8$ y aplica la Transformada Discreta del Coseno (DCT), descartando altas frecuencias que el ojo no percibe. Al cuantificar los coeficientes DCT, **los bits menos significativos (LSB) se destruyen o reescriben**, corrompiendo irreversiblemente cualquier mensaje esteganográfico espacial.
* **Conclusión:** La esteganografía espacial de sustitución LSB requiere obligatoriamente formatos sin pérdida (PNG, BMP, TIFF).`;
    }

    if (p.includes('hash') || p.includes('sha') || p.includes('md5') || p.includes('resumen')) {
      return `### 🔒 Funciones Hash Criptográficas (SHA-256, SHA-512)

Una función hash criptográfica es un algoritmo unidireccional que transforma cualquier cantidad de datos en una cadena de longitud fija:

1. **Propiedades Fundamentales:**
   * **Determinismo:** La misma entrada produce siempre exactamente el mismo hash.
   * **Efecto Avalancha:** Cambiar 1 solo bit en la entrada altera más del 50% de los bits del hash resultante.
   * **Resistencia a Preimagen (Unidireccional):** Dado un hash $h$, es computacionalmente imposible calcular la entrada $m$ tal que $\\text{hash}(m) = h$.
   * **Resistencia a Colisiones:** Es computacionalmente inviable encontrar dos entradas distintas $m_1 \\neq m_2$ con el mismo hash.
2. **Uso en el Laboratorio:**
   * Usamos **SHA-512** dentro del KDF (PBKDF2) para derivar claves criptográficas robustas a partir de contraseñas.`;
    }

    if (p.includes('fuerza bruta') || p.includes('brute') || p.includes('rainbow') || p.includes('diccionario') || p.includes('gpu')) {
      return `### ⚡ Ataques de Fuerza Bruta, Tablas Rainbow y Defensa con PBKDF2

* **¿Cómo ataca un adversario una contraseña?**
  * **Fuerza Bruta:** Prueba todas las combinaciones posibles de caracteres ($A-Z, 0-9, \\dots$). Una GPU moderna (como una RTX 4090) puede probar miles de millones de hashes MD5 o SHA-1 por segundo.
  * **Tablas Rainbow:** Son bases de datos gigantescas con contraseñas comunes y sus hashes precalculados para búsqueda instantánea ($O(1)$).
* **¿Cómo lo neutraliza nuestro laboratorio?**
  1. **Salt de 16 Bytes (CSPRNG):** Invalida cualquier Tabla Rainbow precalculada porque cada contraseña se hashea con un número aleatorio único.
  2. **600,000 Iteraciones de PBKDF2:** Cada intento tarda ~1.5 segundos en la CPU. Probar un millón de contraseñas ya no toma minutos, sino semanas o meses, haciendo el ataque inviable económicamente.`;
    }

    if (p.includes('publica') || p.includes('privada') || p.includes('asim') || p.includes('simetrico') || p.includes('diferencia entre aes y rsa')) {
      return `### 🔑 Criptografía Simétrica (AES) vs Asimétrica (RSA)

* **Criptografía Simétrica (ej. AES-256):**
  * Usa **la misma clave** para cifrar y descifrar.
  * **Ventaja:** Es extremadamente rápida y eficiente; ideal para grandes volúmenes de datos o imágenes.
  * **Desafío:** ¿Cómo le envías la clave secreta al destinatario sin que un espía la intercepte en el camino?
* **Criptografía Asimétrica (ej. RSA-4096):**
  * Usa un par matemático de claves:
    * **Clave Pública:** La conoce todo el mundo; se usa para cifrar.
    * **Clave Privada:** La guarda celosamente Bob; es la única que puede descifrar.
  * **Ventaja:** Resuelve el problema del intercambio de claves en canales inseguros.
  * **Desventaja:** Es muy lenta y no puede cifrar mensajes más grandes que el tamaño de su clave.
* **La Solución Híbrida (Nuestro Módulo 2):**
  Usamos RSA únicamente para encapsular la clave efímera simétrica de 256 bits (Sobre Digital), y luego usamos AES-256-GCM para cifrar el mensaje completo a máxima velocidad.`;
    }

    if (p.includes('capacidad') || p.includes('tamano maximo') || p.includes('cuanto cabe') || p.includes('limite')) {
      return `### 📐 Capacidad Máxima de Almacenamiento en Esteganografía LSB

En nuestro protocolo de Canvas:
* Cada píxel tiene 4 canales: Rojo (R), Verde (G), Azul (B) y Alfa (A).
* Incrustamos **1 bit** en R, **1 bit** en G y **1 bit** en B $\\rightarrow$ **3 bits por píxel** (el canal Alfa no se altera).

$$\\text{Capacidad Total en Bytes} = \\frac{\\text{Ancho} \\times \\text{Alto} \\times 3}{8} - 4 \\text{ bytes (cabecera)}$$

* **Ejemplo Práctico:**
  * Para una imagen de $800 \\times 600$ píxeles:
  * Total de píxeles = $480,000$.
  * Total de bits = $480,000 \\times 3 = 1,440,000\\text{ bits}$.
  * En Bytes = $1,440,000 / 8 = 180,000\\text{ Bytes } (\\approx 175.7\\text{ KB})$.
  * Restando los 4 bytes de cabecera, puedes incrustar hasta **175.7 Kilobytes** de datos cifrados sin que se note ningún cambio visual.`;
    }

    if (p.includes('xor') || p.includes('bit') || p.includes('operacion') || p.includes('binario')) {
      return `### ⚙️ Operaciones a Nivel de Bits (Bitwise) en el Laboratorio

Nuestro motor utiliza operadores binarios directos en JavaScript para máxima velocidad en Canvas:
* **MÁSCARA LSB (\`& 0xFE\`):** Limpia el bit menos significativo poniéndolo en \`0\`.
  * Ejemplo: \`185 & 0xFE\` = \`184\`.
* **INSERCIÓN OR (\`| bit\`):** Inyecta el bit del mensaje secreto (0 o 1).
  * Ejemplo: \`184 | 1\` = \`185\`.
* **EXTRACCIÓN AND (\`& 0x01\`):** Lee únicamente el bit menos significativo.
  * Si el valor es impar $\\rightarrow$ el bit es \`1\`. Si es par $\\rightarrow$ el bit es \`0\`.
* **XOR (\`^\`):** Se utiliza en la simulación de manipulación (Tamper) para invertir un bit específico: \`byte ^ 0x01\`.`;
    }

    // Respuesta contextual por defecto
    return `### 🤖 CyberTutor IA — Asistente de Ciberseguridad

¡Hola! He recibido tu consulta: *"**${prompt.replace(/[<>]/g, '')}**"*

Como tutor experto del **Laboratorio Web de Criptografía & Esteganografía**, puedo explicarte en detalle cualquiera de las áreas del proyecto:

* **Módulo 1 — Esteganografía LSB en Canvas:** Inserción y extracción imperceptible bit a bit en canales R, G y B (3 bits/píxel) preservando el canal Alfa.
* **Módulo 2 — Cifrado Híbrido (AES-256-GCM + RSA-OAEP 4096):** Sobre digital con autenticación GHASH (128 bits) y derivación anti-fuerza bruta PBKDF2 (600,000 iteraciones).
* **Consola Forense de Eve (27 Comandos):** Pruebas de factorización asintótica GNFS, Fermat, Pollard $\\rho$ (CTF 32-bit), ECM, retículos LLL de Coppersmith, canales laterales de tiempo $O(1)$ y resistencia cuántica (Shor vs Grover).
* **Módulo 3 — Estegoanálisis Forense:** Prueba Chi-cuadrado sobre Pares de Valores (PoVs de Westfeld & Pfitzmann) y Entropía de Shannon en tiempo real.
* **Módulo 4 — Ataques a Imágenes:** Análisis en 8 planos de bits, simulación de alteración bit a bit y mapas de calor (Heatmaps).

¿Sobre cuál de estos temas o comandos te gustaría profundizar?`;
  }
}
