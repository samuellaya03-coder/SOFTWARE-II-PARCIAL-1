/**
 * SERVICIO DE ASISTENCIA INTELIGENTE (CYBERTUTOR IA)
 * Conecta dinámicamente con Google Gemini 1.5 Flash (cuando hay API Key)
 * o utiliza el motor de conocimiento técnico local en tiempo real como respaldo.
 */

import { CRYPTO_CONFIG } from './crypto.service.js';

export class AiService {
  /**
   * Genera el contexto dinámico del código y configuración activa del laboratorio.
   */
  static getLiveSystemContext(activeTab = 'general') {
    return `
Eres "CyberTutor IA", el profesor y asistente de ciberseguridad experto integrado en el "Laboratorio Web de Criptografía & Esteganografía (Modo Difícil)".

ESTADO ACTUAL Y CONFIGURACIÓN VIVA DEL CÓDIGO:
1. MÓDULO 1 - ESTEGANOGRAFÍA LSB (Canvas HTML5):
   - Inserción y extracción en el plano de bits menos significativos (LSB) de los canales R, G y B (3 bits por píxel).
   - El canal Alfa (A) se preserva intacto (255) para evitar distorsiones visuales y artefactos del compositor del navegador.
   - Protocolo binario: Los primeros 32 bits codifican la longitud exacta del payload en formato Big-Endian (Uint32).
   - Capacidad teórica máxima: (Ancho × Alto × 3) / 8 bytes.

2. MÓDULO 2 - CRIPTOGRAFÍA HÍBRIDA & AUDITORÍA DE SEGURIDAD:
   - Cifrado Simétrico: AES-256-GCM (NIST SP 800-38D) con IV de 12 bytes (96 bits) generado con CSPRNG (crypto.randomBytes).
   - Autenticación: Authentication Tag (MAC) de 16 bytes (128 bits) calculado mediante GHASH sobre el cuerpo cifrado. Cero tolerancia a manipulación (rechaza bit-flips).
   - Derivación de Claves (KDF): PBKDF2-HMAC-SHA512 con 600,000 iteraciones (superando recomendaciones OWASP 2023) y Salt aleatorio de 16 bytes.
   - Cifrado Asimétrico: RSA-4096 bits con esquema de relleno RSA-OAEP (SHA-256 y función de máscara MGF1-SHA256).
   - Simulación Man-in-the-Middle (Espía / Eve):
     * Eve intercepta el paquete en tránsito e intenta descifrar sin la clave privada de Bob -> Falla por el problema de factorización de números enteros N = p * q de 4096 bits (error de decodificación OAEP de OpenSSL).
     * Eve altera 1 bit en el texto cifrado -> Rechazo inmediato por mismatch del Authentication Tag en AES-GCM (GHASH).

3. MÓDULO 3 - ESTEGOANÁLISIS FORENSE MULTIMEDIA:
   - Prueba Chi-cuadrado (χ²) sobre Pares de Valores (PoVs / Pairs of Values) según Westfeld & Pfitzmann (1999). Compara frecuencias observadas vs esperadas (2k y 2k+1) a lo largo de las muestras.
   - Grados de libertad: k - 1. P-value: probabilidad acumulada de incrustación oculta.
   - Entropía de Shannon: H = - sum(p_i * log2(p_i)), mide el desorden en bits/canal (máximo teórico 8.0). Cifrados AES aumentan la entropía a ~7.99.

4. MÓDULO 4 - ATAQUES A IMÁGENES Y PLANOS DE BITS:
   - Inyección de ruido y alteración bit a bit (bit flips) en planos específicos (0 a 7).
   - Extracción y renderizado de planos LSB cromáticos (proyección de bits puros 0 y 1 a blanco/negro o canales de color).
   - Mapa de calor de diferencias térmicas (Heatmap) para auditar la dispersión de la alteración.

MODO DE RESPUESTA:
- Explica de forma clara, didáctica, precisa y profesional.
- Usa formato Markdown con viñetas, negritas y términos resaltados.
- Si el usuario pregunta sobre cómo funciona algo o por qué falló un ataque, explícale la causa matemática y técnica exacta según el código actual.
- Mantén las respuestas concisas pero con alto rigor técnico.
`;
  }

  /**
   * Resuelve una consulta con Gemini o el motor local de respaldo.
   */
  static async ask({ prompt, activeTab = 'general', customApiKey = null }) {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

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
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-pro-latest'];
    
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const body = {
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
            temperature: 0.4,
            maxOutputTokens: 1200
          }
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return { text, model: modelName };
          }
        } else {
          const errText = await res.text();
          lastError = new Error(`Model ${modelName} returned status ${res.status}: ${errText.substring(0, 200)}`);
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
    return `### 💡 Guía del Laboratorio (Módulo: ${activeTab})

Hola, soy **CyberTutor IA**. He analizado tu pregunta:

* **Modo Actual:** El asistente está respondiendo mediante el **Motor de Conocimiento Local del Laboratorio**.
* **¿Quieres que responda cualquier pregunta libre o creativa?**
  Para activar la IA generativa completa de **Google Gemini 1.5 Flash** (capaz de responder literalmente cualquier duda fuera del banco local), haz clic en el icono **⚙️** arriba a la derecha en este chat e ingresa tu API Key gratuita de *Google AI Studio*.

**Temas que puedes consultarme ahora mismo:**
- *"¿Cuál es la diferencia entre criptografía y esteganografía?"*
- *"¿Por qué usamos PNG y no JPEG?"*
- *"¿Qué es una función Hash y para qué sirve SHA-512?"*
- *"¿Por qué Eve no puede romper RSA-4096?"*
- *"¿Cómo funciona el AuthTag en AES-GCM?"*
- *"¿Qué es un ataque de fuerza bruta y cómo protege PBKDF2?"*
- *"¿Cómo se calcula la capacidad máxima en bytes de una imagen?"*`;
  }
}
