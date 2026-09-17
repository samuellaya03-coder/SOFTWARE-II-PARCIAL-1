# Laboratorio Web de Criptografía y Esteganografía
> **Ciberseguridad Avanzada & Forense Multimedia — "Modo Difícil"**

Este proyecto es una plataforma académica integral que combina **criptografía moderna autenticada**, **esteganografía espacial LSB directa en navegador** y **estegoanálisis estadístico forense**.

---

## 🏛️ 1. Arquitectura del Monorepo

```SOFTWARE-II-PARCIAL-1/
├── backend/
│   ├── server.js                          # Express, CORS, límites y auditoría
│   ├── services/
│   │   ├── crypto.service.js              # AES-256-GCM, PBKDF2-SHA512, RSA-OAEP 4096
│   │   └── forensics/
│   │       ├── index.js                   # Orquestador del análisis
│   │       ├── statistics.js              # Supervivencia χ² vía gamma incompleta
│   │       ├── samples.js                 # Extracción de planos y flujo de inyección
│   │       ├── chiSquareAttack.js         # χ² progresivo de PoVs con autocalibración
│   │       ├── rsAnalysis.js              # RS Analysis (Fridrich et al.)
│   │       ├── samplePairAnalysis.js      # SPA (Dumitrescu et al.)
│   │       ├── entropy.js                 # Entropía LSB (métrica descriptiva)
│   │       └── verdict.js                 # Fusión de evidencia
│   ├── routes/
│   │   ├── crypto.routes.js               # Cifrado, descifrado y RSA
│   │   └── analyze.routes.js              # Estegoanálisis con decodificación PNG
│   └── tests/                             # 232 pruebas, sin dependencias externas
│       ├── run-all.js                     # Runner agregado (npm test)
│       ├── harness.js                     # Aserciones y salida con exitCode
│       ├── fixtures/imageFactory.js       # Portadoras e inyectores con verdad conocida
│       ├── statistics.test.js
│       ├── chiSquareAttack.test.js
│       ├── rsAnalysis.test.js
│       ├── samplePairAnalysis.test.js
│       ├── forensics.integration.test.js
│       └── crypto.test.js
│
├── frontend/
│   ├── index.html                         # Shell SPA con dashboard y navegación
│   └── src/
│       ├── main.js                        # Coordinador de vistas
│       ├── style.css                      # Sistema de diseño en modo oscuro
│       ├── services/
│       │   ├── api.js                     # Cliente REST
│       │   └── stegoEngine.js             # Motor LSB en Canvas HTML5
│       └── components/
│           ├── StegoTab.js                # Inyección LSB y extracción inversa
│           ├── CryptoTab.js               # AES-256-GCM y RSA-4096
│           └── AnalysisTab.js             # Forense: veredicto, curva χ² e histogramas
│
├── package.json                           # Scripts globales del monorepo
└── README.md                              # Memoria técnica y defensa matemática
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

## 🔬 4. Estegoanálisis Forense

El analizador no emite una alarma binaria: **estima la tasa de inyección**, y cuando puede, **mide la longitud del payload**. Tres estimadores independientes se ejecutan sobre la misma imagen y sus salidas se combinan por fusión de evidencia.

### A. Por qué la entropía de Shannon NO puede ser el discriminante

Este es el error que hunde a casi toda implementación académica de estegoanálisis, y conviene enunciarlo antes que nada.

La entropía del plano de bits LSB se calcula como

$$H(X) = -\sum_{i \in \{0,1\}} P(x_i) \log_2 P(x_i)$$

El razonamiento tentador es: un texto cifrado con AES-GCM es indistinguible de ruido blanco, luego $P(0) \approx P(1) \approx 0.5$, luego $H \to 1$, luego $H > 0.9985$ implica esteganografía.

**La premisa es correcta y la conclusión es falsa.** El error está en asumir que una imagen limpia tiene entropía LSB baja. No la tiene: el ruido de sensor de cualquier cámara real aleatoriza los LSB por sí solo. Medición sobre portadoras de este laboratorio, todas **sin payload alguno**:

| Portadora limpia | $H(\text{LSB})$ global |
|---|---|
| Fotografía con ruido de sensor $\sigma = 2$ | **0.999999** |
| Portadora tras pipeline de cámara (gamma + cuantización) | **0.999942** |
| La misma portadora con un payload al 30% | 0.999996 |

Un umbral de $H > 0.9985$ clasifica las tres como esteganografiadas. **La entropía LSB no aporta información discriminante sobre fotografías reales**, y por eso este sistema la reporta como métrica descriptiva y la excluye explícitamente del veredicto (`entropy.isDiscriminative: false`).

Lo que sí distingue una imagen limpia de una inyectada no es la aleatoriedad del plano LSB, sino **la relación entre ese plano y el resto de la imagen**. Los tres estimadores que siguen atacan precisamente esa relación.

### B. Ataque χ² progresivo sobre Pares de Valores

> Westfeld, A. & Pfitzmann, A. — *Attacks on Steganographic Systems*, Information Hiding 1999.

Sustituir el LSB de una muestra de 8 bits solo puede moverla entre los dos miembros de su **Par de Valores (PoV)**:

$$2k \longleftrightarrow 2k+1, \qquad k = 0 \dots 127$$

Un valor par $2k$ jamás puede convertirse en $2k+2$: queda confinado a su pareja. Por tanto la suma del par es un **invariante de la inyección**:

$$m_k = n_{2k} + n_{2k+1} = \text{constante}$$

Si el payload es un flujo de bits uniforme, cada muestra del área inyectada acaba con LSB 0 o 1 con probabilidad $1/2$. Condicionado al invariante $m_k$, el reparto interno del par sigue una binomial:

$$n_{2k} \sim \mathrm{Bin}(m_k, 1/2)$$

Contrastar esa hipótesis es un test de **1 grado de libertad por par**. Con $E_k = m_k/2$, la suma sobre las dos celdas se simplifica:

$$\chi^2_k = \frac{(n_{2k} - E_k)^2}{E_k} + \frac{(n_{2k+1} - E_k)^2}{E_k} = \frac{(n_{2k} - n_{2k+1})^2}{m_k} \sim \chi^2(1)$$

y sumando los $K$ pares utilizables (aquellos con $E_k \geq 4$, requisito de validez de la aproximación):

$$\chi^2 = \sum_{k} \frac{(n_{2k} - n_{2k+1})^2}{m_k} \sim \chi^2(K) \quad \text{bajo inyección}$$

El estadístico **reducido** $\chi^2/K$ se lee sin depender de $K$:

$$\frac{\chi^2}{K} \approx 1 \implies \text{pares equilibrados} \implies \text{región INYECTADA}$$
$$\frac{\chi^2}{K} \gg 1 \implies \text{pares desequilibrados} \implies \text{región natural LIMPIA}$$

**Sobre la formulación del paper original.** Westfeld y Pfitzmann suman únicamente el miembro par de cada pareja, $\sum_k (n_{2k} - E_k)^2 / E_k$, y lo evalúan contra $K-1$ grados de libertad. Como $n_{2k} - E_k = -(n_{2k+1} - E_k)$, esa suma vale **exactamente la mitad** de la anterior. Comparar un estadístico de magnitud $\approx K/2$ contra una distribución de media $K-1$ produce el célebre $p \approx 1$ que aparece en toda la literatura: no es una propiedad de la esteganografía, es el efecto de una calibración a mitad de escala. El sistema reporta el estadístico correctamente calibrado como valor primario y conserva el $p$ clásico en el campo `westfeldPValue` por fidelidad a la fuente citable.

#### Progresivo, no global

Una inyección secuencial ocupa solo un **prefijo** del flujo de muestras. Un único $\chi^2$ sobre la imagen completa mezcla la región equilibrada con la natural, el desequilibrio del resto domina la suma, y el ataque **no detecta nada**. Medición con un payload al 30% de la capacidad:

| Fracción del flujo analizada | $\chi^2/df$ |
|---|---|
| 0.25 | 0.99 |
| 0.30 | 0.98 |
| **0.35** | **47.89** |
| 0.50 | 494.00 |
| 1.00 | 1759.00 |

El punto de ruptura no solo detecta la inyección: **mide su longitud**. Un pase de refinamiento subdivide el intervalo de la ruptura, porque la rejilla gruesa sola produce un error relativo del −21.8% en un payload del 2%.

#### El límite del método, y cómo se reconoce

El ataque presupone que el histograma de la portadora tiene **desequilibrio natural** entre valores vecinos. Esa suposición es falsa en una clase entera de imágenes, y cuando falla el ataque produce falsos positivos del 100%:

| Portadora | $\chi^2/df$ limpia | $\chi^2/df$ con 30% inyectado |
|---|---|---|
| Ruido de sensor sobre gradiente suave | 1.67 | 1.91 |
| Con gamma 2.2 + cuantización (cámara real) | 944.16 | 1.00 |

En la primera fila el estadístico **no distingue**: el histograma ya es localmente liso, los pares están equilibrados de fábrica. La solución es **autocalibrar contra la propia imagen**: la cola del flujo (último 25%) es la región con menos probabilidad de estar inyectada y sirve de referencia del desequilibrio natural de esa portadora.

- Cola con $\chi^2/df \geq 10$ → la portadora tiene estructura explotable, el ataque es **concluyente**.
- Cola con $\chi^2/df < 10$ → histograma liso, el ataque es ciego y se declara **INCONCLUYENTE** en lugar de inventar un veredicto.

El umbral de 10 está calibrado con casi dos órdenes de magnitud de margen a cada lado (histogramas lisos miden 1.6–4.0; con peine, 660–945).

**Contraste de dos lados.** Bajo inyección real $\chi^2/df \approx 1$ por construcción, así que un prefijo *demasiado* equilibrado es igual de imposible que uno desequilibrado. Sin esa cota inferior, un gradiente sintético con apenas 37 pares utilizables mide $\chi^2/df = 0.10$ y se cuela como payload: $P(\chi^2(37) < 3.8) \sim 10^{-12}$, mucho más equilibrado de lo que cualquier inyección real podría producir. El sistema exige por tanto que la cola izquierda de la distribución supere $10^{-4}$.

### C. RS Analysis — grupos Regulares y Singulares

> Fridrich, J., Goljan, M. & Du, R. — *Reliable Detection of LSB Steganography in Color and Grayscale Images*, ACM Multimedia Workshop 2001.

El $\chi^2$ mira el histograma, y por eso se queda ciego cuando este es liso. RS Analysis ataca desde otro ángulo: **la correlación espacial entre píxeles vecinos**. La observación que lo hace funcionar es asimétrica: en una imagen natural los bits altos de píxeles adyacentes están correlacionados porque el mundo real es suave a escala de píxel, mientras el plano LSB está dominado por ruido.

**Función discriminante** (rugosidad) sobre un grupo $G = (x_1 \dots x_n)$ de píxeles vecinos:

$$f(G) = \sum_{i=1}^{n-1} |x_{i+1} - x_i|$$

**Funciones de volteo:**

$$F_1(x) = x \oplus 1 \qquad F_{-1}(x) = ((x+1) \oplus 1) - 1 \qquad F_0(x) = x$$

$F_1$ es exactamente la operación que realiza la inyección LSB. $F_{-1}$ es su volteo **dual**, desplazado un nivel: aplica la misma perturbación de $\pm 1$ sobre la partición complementaria de los valores. Esa dualidad es la clave del método.

Una **máscara** $M \in \{-1,0,1\}^n$ indica qué volteo aplicar a cada píxel del grupo. Cada grupo se clasifica:

$$\text{REGULAR: } f(F_M(G)) > f(G) \qquad \text{SINGULAR: } f(F_M(G)) < f(G) \qquad \text{INÚTIL: } =$$

En una imagen natural voltear LSB rompe la suavidad, luego $R_M \approx R_{-M} \gg S_M \approx S_{-M}$. Al crecer la tasa $p$, los LSB ya están aleatorizados y el volteo pierde efecto privilegiado: $R_M$ y $S_M$ **convergen** mientras $R_{-M}$ y $S_{-M}$ **divergen**, y en $p=1$ se cumple $R_M = S_M$. Verificado sobre un canal:

| | $R_M$ | $S_M$ | $R_{-M}$ | $S_{-M}$ |
|---|---|---|---|---|
| Limpia | 0.4310 | 0.2839 | 0.4338 | 0.2785 |
| 50% inyectada | 0.3877 | 0.3189 | 0.4726 | 0.2487 |

#### Extrapolación cuadrática

Sea $x$ la fracción de LSB volteados. Una inyección de tasa $p$ sobrescribe $pN$ LSB con bits aleatorios, y como la mitad ya coincidía, solo cambia $x = p/2$. De ahí que la imagen recibida se mida en $x = p/2$; volteando **todos** los LSB se obtiene el segundo punto, en $x = 1 - p/2$. Definiendo

$$d_0 = R_M - S_M, \quad d_{-0} = R_{-M} - S_{-M} \qquad \text{(en } x = p/2\text{)}$$
$$d_1 = R'_M - S'_M, \quad d_{-1} = R'_{-M} - S'_{-M} \qquad \text{(en } x = 1 - p/2\text{)}$$

la raíz de menor módulo de

$$2(d_1 + d_0)x^2 + (d_{-0} - d_{-1} - d_1 - 3d_0)x + (d_0 - d_{-0}) = 0$$

conduce a la estimación

$$p = \frac{x}{x - 1/2}$$

### D. Sample Pair Analysis

> Dumitrescu, S., Wu, X. & Wang, Z. — *Detection of LSB Steganography via Sample Pair Analysis*, IEEE Trans. Signal Processing 2003.

Toma pares de muestras vecinas $(u,v)$ y los clasifica según la paridad de $v$ y el orden entre $u$ y $v$:

$$X = \{(u,v) : (v \text{ par} \wedge u < v) \vee (v \text{ impar} \wedge u > v)\}$$
$$Y = \{(u,v) : (v \text{ par} \wedge u > v) \vee (v \text{ impar} \wedge u < v)\}$$
$$Z = \{(u,v) : u = v\} \qquad W = \{(u,v) \in Y : \lfloor u/2 \rfloor = \lfloor v/2 \rfloor\}$$

$X$, $Y$ y $Z$ particionan el conjunto de pares $P$; $W \subseteq Y$ recoge los pares que difieren **solo en el LSB**. La inyección provoca transiciones entre esas clases con probabilidades conocidas, y la conservación del flujo entre clases cierra la cuadrática

$$\frac{|W| + |Z|}{2}p^2 + (2|X| - |P|)p + (|Y| - |X|) = 0$$

cuya raíz menor es la tasa estimada. SPA es más preciso que RS a tasas bajas porque **no extrapola**: mide directamente sobre la imagen recibida, sin necesitar una segunda medición con todos los LSB volteados.

### E. Exactitud medida de los estimadores

Inyección dispersa sobre portadora de 512×384, tasa conocida por construcción:

| Tasa real | RS estima | error | SPA estima | error |
|---|---|---|---|---|
| 0.00 | 0.0096 | +0.010 | 0.0137 | +0.014 |
| 0.02 | 0.0175 | −0.003 | 0.0251 | +0.005 |
| 0.05 | 0.0475 | −0.003 | 0.0494 | −0.001 |
| 0.20 | 0.1998 | −0.000 | 0.2071 | +0.007 |
| 0.35 | 0.3482 | −0.002 | 0.3689 | +0.019 |
| 0.50 | 0.5075 | +0.008 | 0.5157 | +0.016 |
| 0.75 | 0.7519 | +0.002 | 0.7314 | −0.019 |
| 1.00 | 0.9483 | −0.052 | 0.9326 | −0.067 |

Ambos degradan cerca de la saturación, donde la cuadrática pierde condicionamiento. Con **inyección secuencial** el sesgo es sistemático, y la causa es estructural: ambos métodos modelan una tasa **homogénea**, y un payload secuencial parte el plano en dos regiones heterogéneas.

| Fracción real | 0.05 | 0.15 | 0.25 | 0.30 | 0.35 | 0.50 | 0.60 | 0.70 |
|---|---|---|---|---|---|---|---|---|
| error RS | −0.003 | +0.019 | +0.051 | +0.072 | +0.084 | −0.005 | −0.070 | −0.093 |

El patrón confirma el mecanismo: por debajo de 0.5 sobreestima, por encima subestima, y en 0.5 el sesgo se anula. **Por eso el veredicto toma la longitud del payload del χ² progresivo cuando la inyección es secuencial, y la tasa de RS/SPA cuando es dispersa.**

### F. Fusión de evidencia

Los estimadores no son intercambiables, y el veredicto respeta sus roles:

| | Depende del histograma | Localiza el payload | Robusto a inyección secuencial |
|---|---|---|---|
| χ² progresivo | **sí** (limitante) | **sí**, con gran resolución | sí |
| RS Analysis | no | no | sesgado |
| SPA | no | no | sesgado |

Umbrales calibrados sobre 18 portadoras limpias (múltiples semillas, tamaños, niveles de ruido y pipelines):

| Portadora limpia | RS | SPA | \|RS − SPA\| |
|---|---|---|---|
| Normales ($\sigma \leq 3$, cámara, gradiente) | ≤ 0.035 | ≤ 0.037 | pequeño |
| Ruido de sensor extremo ($\sigma = 10$) | 0.119 | **0.208** | **0.089** |
| Con payload real al 20% | 0.200 | 0.207 | **0.007** |

De ahí los dos criterios:

1. **Suelo de ruido = 0.05.** Cubre el sesgo de toda portadora normal con margen.
2. **Concordancia entre RS y SPA ≤ 0.08.** Con inyección real ambos métodos coinciden dentro de 0.03; el ruido extremo los descuadra en 0.089. Esta prueba es la que evita el falso positivo en imágenes muy ruidosas.

La concordancia se exige **solo** en la vía basada únicamente en la tasa. Cuando el χ² ha localizado un borde, esa preocupación ya está resuelta por una familia de métodos independiente, y además la inyección secuencial descorrelaciona RS y SPA de forma legítima.

**Estados del veredicto:**

| Estado | Condición |
|---|---|
| `LIMPIA` | Ningún estimador aporta evidencia |
| `SOSPECHA` | Tasa sobre el suelo de ruido pero bajo el umbral de detección |
| `EVIDENCIA_INCONSISTENTE` | RS y SPA se contradicen: firma de portadora muy ruidosa, no de payload |
| `INYECCION_DETECTADA` | Tasa ≥ 0.15 con concordancia, **o** el χ² localizó un payload |
| `INYECCION_CONFIRMADA` | Ambas condiciones a la vez: dos familias independientes concuerdan |

Un payload del 2% ilustra la complementariedad: su tasa global queda **por debajo** del umbral de detección, y sin embargo el χ² lo localiza y estima su tamaño con un 9% de error. Ninguno de los tres métodos por separado resuelve todos los casos; juntos sí.

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
   * Sube primero una **fotografía limpia**. El veredicto será `LIMPIA`, y aun así verás que la entropía LSB vale ≈ 0.99999: esa es la prueba visible de que un umbral de entropía habría dado un falso positivo del 95%.
   * Sube ahora la imagen esteganografiada. El veredicto pasa a `INYECCION_CONFIRMADA`, con la tasa de inyección estimada y el tamaño del payload en bytes.
   * Observa la **curva χ²/df**: se mantiene en ≈ 1 a lo largo del prefijo inyectado y se dispara varios órdenes de magnitud justo en el borde del payload. Ese punto de ruptura es la medición de la longitud.
   * Compara el bloque de **estimadores de tasa**: RS y SPA, que no comparten ningún supuesto, coinciden dentro de unas milésimas.
   * Si la portadora tiene histograma liso, el χ² se declarará `INCONCLUYENTE_HISTOGRAMA_LISO` y el veredicto lo sostendrán RS y SPA en solitario. Merece la pena provocar ese caso: demuestra que el sistema conoce los límites de cada método.

---

## ✅ 7. Validación

El proyecto se valida con **232 pruebas** sin dependencias externas. Se ejecutan desde `/backend`:

```bash
npm test                # todas las suites
npm run test:crypto     # solo criptografía
npm run test:forensics  # solo el análisis forense de extremo a extremo
```

| Suite | Pruebas | Qué demuestra |
|---|---|---|
| `statistics.test.js` | 97 | La supervivencia χ² contra su forma cerrada exacta para grados de libertad pares y contra valores críticos tabulados, con precisión relativa de 1e-10 incluso donde $p \sim 10^{-137}$ |
| `chiSquareAttack.test.js` | 24 | Cero falsos positivos, medición de la longitud del payload, la ceguera del χ² global frente al progresivo, y el reconocimiento del límite en histogramas lisos |
| `rsAnalysis.test.js` | 26 | Exactitud del estimador contra tasas conocidas y la geometría del diagrama RS que predice el paper |
| `samplePairAnalysis.test.js` | 26 | Exactitud de SPA y su concordancia con RS, dos métodos sin supuestos compartidos |
| `forensics.integration.test.js` | 31 | Cero falsos positivos sobre 18 portadoras limpias distintas, y detección en los tres regímenes: secuencial, dispersa e histograma liso |
| `crypto.test.js` | 28 | AES-GCM verificado contra AES-CTR desde `IV \|\| 0x00000002`, PBKDF2-SHA512 contra la recurrencia de RFC 8018 implementada a mano, y detección de manipulación en cada campo del paquete |

Las pruebas no comprueban que el código "no se rompa": comprueban que **los estimadores recuperan tasas de inyección que se conocen por construcción**. La fábrica de fixtures (`tests/fixtures/imageFactory.js`) genera portadoras con ruido de sensor, portadoras con pipeline de cámara e inyectores LSB —secuencial y disperso— con tasa exacta, todo determinista a partir de una semilla.

Dos verificaciones merecen mención aparte porque no reutilizan el código que validan:

* **AES-256-GCM contra AES-256-CTR.** La confidencialidad de GCM es CTR con un bloque contador determinado: con IV de 96 bits, $J_0 = IV \,\|\, \texttt{0x00000001}$ y el flujo de clave arranca en $\mathrm{inc}_{32}(J_0)$. Si ambos textos cifrados coinciden, la construcción y el manejo del IV son correctos.
* **PBKDF2-HMAC-SHA512 contra RFC 8018.** Se reimplementa la recurrencia $U_1 = \mathrm{HMAC}(P, S \,\|\, \mathrm{INT}(i))$, $U_j = \mathrm{HMAC}(P, U_{j-1})$, $T_i = U_1 \oplus \dots \oplus U_c$ sobre HMAC directo y se compara con la primitiva de Node.
