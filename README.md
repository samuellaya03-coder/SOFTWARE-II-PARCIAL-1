# Laboratorio Web de Criptografía y Esteganografía
> **Ciberseguridad Avanzada & Forense Multimedia — "Modo Difícil"**

Este proyecto es una plataforma académica integral que combina **criptografía moderna autenticada**, **esteganografía espacial LSB directa en navegador** y **estegoanálisis estadístico forense**.

---

## 🏛️ 1. Arquitectura del Monorepo

```
c:\MOYA II PARCIAL 1\
├── backend/
│   ├── package.json
│   ├── server.js                      # Servidor Express, CORS, límites y auditoría
│   ├── services/
│   │   ├── crypto.service.js          # AES-256-GCM, PBKDF2-SHA512, RSA-OAEP 4096
│   │   └── stegoanalysis.service.js   # Chi-cuadrado PoVs, Entropía Shannon, Histograma RGB
│   ├── routes/
│   │   ├── crypto.routes.js           # Endpoints de cifrado, descifrado y RSA
│   │   └── analyze.routes.js          # Endpoint de estegoanálisis con decodificación PNG
│   └── test-crypto.js                 # Tests unitarios de integridad y detección de manipulación
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html                     # Shell SPA con dashboard y navegación
│   └── src/
│       ├── main.js                    # Coordinador de vistas y estado del backend
│       ├── style.css                  # Sistema de diseño Cyberpunk / SOC en Dark Mode
│       ├── services/
│       │   ├── api.js                 # Cliente Fetch para API REST del backend
│       │   └── stegoEngine.js         # Motor LSB en Canvas HTML5 (inyección/extracción)
│       └── components/
│           ├── StegoTab.js            # Pestaña 1: Inyección LSB y Extracción Inversa
│           ├── CryptoTab.js           # Pestaña 2: Visualizador AES-256-GCM y RSA-4096
│           └── AnalysisTab.js         # Pestaña 3: Forense (Chi-cuadrado, Shannon, Chart.js)
│
├── package.json                       # Scripts globales del monorepo
└── README.md                          # Memoria técnica y defensa matemática
```

---

## 🛡️ 2. Fundamentos de Ciberseguridad ("Modo Difícil")

En estricto cumplimiento con la directiva contra algoritmos obsoletos o rotos:

### A. Cifrado Simétrico Autenticado (AES-256-GCM)
* **Algoritmo:** `AES-256-GCM` (NIST SP 800-38D).
* **Por qué NO usar ECB o CBC:**
  * `ECB` (Electronic Codebook) preserva patrones de los bloques idénticos (el famoso ataque del pingüino de Tux).
  * `CBC` (Cipher Block Chaining) es vulnerable a ataques de oráculo de relleno (*Padding Oracle Attacks*) si no se acompaña de HMAC-then-decrypt.
* **GCM (Galois/Counter Mode):** Proporciona **Confidencialidad + Integridad + Autenticación** en una sola pasada mediante multiplicación en el campo de Galois $\text{GF}(2^{128})$.
* **Vector de Inicialización (IV):** 12 bytes (96 bits) generados con `crypto.randomBytes()` (CSPRNG). **Nunca se reutiliza un IV con la misma clave**.
* **Authentication Tag:** 16 bytes (128 bits). Cualquier intento de modificar incluso 1 bit del texto cifrado invalida el tag, abortando el descifrado antes de procesar datos espurios.

### B. Derivación de Clave Segura (KDF)
* **Algoritmo:** `PBKDF2-HMAC-SHA512`
* **Iteraciones:** **600,000 iteraciones**, alineado con las recomendaciones vigentes de OWASP para mitigar ataques de fuerza bruta asistidos por hardware masivo (ASICs/GPUs).
* **Salt:** 16 bytes (128 bits) aleatorios por operación, eliminando la efectividad de ataques con Tablas Arcoíris (*Rainbow Tables*).

### C. Empaquetado Binario del Payload
El flujo binario resultante del cifrado tiene una estructura con offsets exactos:
$$\Big[\;\text{Salt (16B)}\;\Big|\;\text{IV (12B)}\;\Big|\;\text{AuthTag (16B)}\;\Big|\;\text{Ciphertext ($N$B)}\;\Big]$$
* Longitud mínima del paquete = $16 + 12 + 16 = 44\text{ bytes}$.

### D. Cifrado Asimétrico e Híbrido (RSA-OAEP 4096 bits)
* **Claves:** Módulo de 4096 bits con exponente público $e = 65537$.
* **Relleno:** `RSA-OAEP` (Optimal Asymmetric Encryption Padding) con función hash `SHA-256` y función generadora de máscaras `MGF1-SHA256`.
* **Protección:** Inmune a los ataques de Bleichenbacher sobre `PKCS#1 v1.5`.
* **Esquema Híbrido:** La clave asimétrica RSA cifra únicamente una clave de sesión efímera AES-256 generada por CSPRNG; los datos voluminosos se procesan con AES-256-GCM.

---

## 🎨 3. Motor de Esteganografía LSB en Canvas HTML5

El proceso de inyección y extracción se realiza **100% en el cliente (navegador)** utilizando JavaScript puro y la API `<canvas>`:

1. **Lectura de Píxeles:** La imagen se proyecta en el canvas y se extrae el búfer `ImageData.data` (`Uint8ClampedArray`), compuesto por secuencias de 4 bytes por píxel: `[R, G, B, A, R, G, B, A, ...]`.
2. **Preservación del Canal Alfa:** Solo se alteran los canales **R, G y B**. El canal de transparencia $A$ permanece intacto en `255` para evitar aberraciones visuales.
3. **Protocolo Binario de 32 bits:**
   * **Bytes 0..3 (Cabecera):** Entero de 32 bits (Big-Endian) que define la longitud exacta $L$ en bytes del payload oculto.
   * **Bytes 4..($4+L$):** El cuerpo de datos (texto plano o paquete AES-GCM).
4. **Máscara a Nivel de Bits:**
   $$\text{canal}' = (\text{canal} \ \& \ \text{0xFE}) \ | \ \text{bit}$$
   Esto sustituye el bit menos significativo con una alteración fotométrica máxima de $\pm 1$ sobre 255 niveles (imperceptible para el ojo humano).
5. **Exportación:** Se descarga forzosamente en formato `image/png` sin compresión con pérdida (los formatos JPEG destruirían los LSBs por la cuantización de la DCT).

---

## 🔬 4. Estegoanálisis Forense y Métricas Matemáticas

El módulo de backend analiza el archivo PNG recibido mediante tres técnicas estadísticas:

### A. Entropía de la Información de Shannon
Calculada sobre el plano de bits LSB de la imagen:
$$H(X) = -\sum_{i \in \{0,1\}} P(x_i) \log_2 P(x_i)$$

* En imágenes naturales no manipuladas, los LSBs muestran cierta correlación espacial con las texturas y gradientes luminosos ($H < 0.95$).
* Cuando se inyecta un payload cifrado con **AES-256-GCM**, el texto cifrado es estadísticamente indistinguible de **ruido blanco pseudoaleatorio**. La probabilidad de ceros y unos se polariza exactamente al 50%-50%:
  $$P(0) \approx 0.5, \quad P(1) \approx 0.5 \implies H(X) \to 1.000000\text{ bits/símbolo}$$
* Una entropía $H > 0.9985$ dispara la alerta de esteganografía.

### B. Ataque Chi-cuadrado ($\chi^2$) sobre Pares de Valores (PoVs)
Basado en el algoritmo clásico de **Westfeld & Pfitzmann**:
* Al modificar el LSB, un valor de píxel par $2k$ solo puede transformarse en su vecino impar $2k+1$ y viceversa. Por lo tanto, forman **Pares de Valores (PoVs)**.
* Bajo una inyección aleatoria LSB, las frecuencias observadas $n_{2k}$ y $n_{2k+1}$ tienden a igualarse a su media aritmética teórica:
  $$E_k = \frac{n_{2k} + n_{2k+1}}{2}$$
* El estadístico de prueba se calcula como:
  $$\chi^2 = \sum_{k=0}^{127} \frac{(n_{2k} - E_k)^2}{E_k} \quad (\text{para } E_k > 0)$$
* Con grados de libertad $df = \text{pares con } E_k > 0 - 1$.
* El $p\text{-value}$ se evalúa computando la función gamma incompleta regularizada $Q(s, x) = 1 - P(s, x)$:
  $$p = 1 - \frac{\gamma(df/2, \chi^2/2)}{\Gamma(df/2)}$$

### C. Histogramas de Frecuencia Espectral RGB
Genera la curva de distribución de los 256 niveles de luminosidad para cada canal (R, G, B), graficada en tiempo real mediante **Chart.js**.

---

## 🚀 5. Instrucciones de Instalación y Ejecución

### Prerrequisitos
* Node.js v18+ (probado en v22.14.0)
* Navegador moderno (Chrome, Firefox, Edge, Safari)

### Paso 1: Levantar el Backend (Puerto 3001)
Abre una terminal en la carpeta `/backend`:
```bash
cd backend
npm install
npm start
```
*El servidor confirmará en consola que opera en `http://localhost:3001` en modo de alta seguridad.*

### Paso 2: Levantar el Frontend (Puerto 5173)
Abre una segunda terminal en la carpeta `/frontend`:
```bash
cd frontend
npm install
npm run dev
```
*Abre tu navegador en `http://localhost:5173`.*

---

## 🧪 6. Guía de Demostración para la Defensa

1. **Flujo de Inyección Cripto-Esteganográfica (Pestaña 1):**
   * Carga cualquier imagen portadora (ej. un fondo o fotografía PNG/JPEG).
   * Observa la resolución y capacidad máxima calculada en bytes.
   * Selecciona el modo **Cripto-Esteganografía (AES-256-GCM con PBKDF2)**.
   * Ingresa un mensaje secreto y una contraseña. Observa la barra de capacidad en vivo.
   * Haz clic en **"Ejecutar Inyección LSB en Canvas"**.
   * Descarga la imagen PNG generada. Visualmente es idéntica a la original.

2. **Flujo de Extracción Inversa y Autenticación:**
   * En la misma Pestaña 1, cambia a **"Revelar Información"**.
   * Sube la imagen PNG descargada en el paso anterior.
   * El motor leerá la cabecera de 32 bits y detectará un paquete cifrado `[Salt|IV|Tag|Ciphertext]`.
   * Ingresa la contraseña y haz clic en **"Descifrar y Verificar Autenticidad"**.
   * Verás el mensaje original recuperado.

3. **Demostración de Detección de Manipulación (Pestaña 2):**
   * En el Laboratorio Criptográfico, cifra un texto para ver el desglose en hexadecimal de Salt, IV, Tag y Ciphertext.
   * Haz clic en el botón **"Simular Ataque (Bit-Flip)"**. Esto alterará 1 bit del texto cifrado.
   * Al intentar descifrar, el `Authentication Tag` detectará la alteración y abortará inmediatamente con un error de integridad.

4. **Demostración de Estegoanálisis Forense (Pestaña 3):**
   * Sube primero una imagen limpia: verás que la entropía LSB es menor y el veredicto es `IMAGEN_LIMPIA`.
   * Luego sube la imagen esteganografiada con payload cifrado: observa cómo la entropía LSB se aproxima a `0.999... / 1.000000` y el índice de sospecha sube a `ALTO_RIESGO_ESTEGANOGRAFIA`.
