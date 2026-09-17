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
│   │       ├── verdict.js                 # Fusión de evidencia
│   │       ├── pool.js                    # Pool de worker_threads
│   │       └── analysis.worker.js         # Worker: decodifica PNG y analiza
│   ├── routes/
│   │   ├── crypto.routes.js               # Cifrado, descifrado y RSA
│   │   └── analyze.routes.js              # Estegoanálisis con decodificación PNG
│   └── tests/                             # 295 pruebas, sin dependencias externas
│       ├── run-all.js                     # Runner agregado (npm test)
│       ├── harness.js                     # Aserciones y medición del event loop
│       ├── benchmark-eventloop.js         # Retardo del bucle bajo carga
│       ├── fixtures/imageFactory.js       # Portadoras e inyectores con verdad conocida
│       ├── statistics.test.js
│       ├── chiSquareAttack.test.js
│       ├── rsAnalysis.test.js
│       ├── samplePairAnalysis.test.js
│       ├── forensics.integration.test.js
│       ├── pool.test.js
│       ├── lsbContainer.test.js
│       ├── webcrypto.interop.test.js
│       └── crypto.test.js
│
├── frontend/
│   ├── index.html                         # Shell SPA con dashboard y navegación
│   └── src/
│       ├── main.js                        # Coordinador de vistas
│       ├── style.css                      # Sistema de diseño en modo oscuro
│       ├── services/
│       │   ├── api.js                     # Cliente REST
│       │   ├── webcrypto.js               # AES-256-GCM y PBKDF2 en el navegador
│       │   ├── lsbContainer.js            # Formato binario y colocación de bits (puro)
│       │   └── stegoEngine.js             # Capa de Canvas sobre el contenedor
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

Todo el proceso ocurre **en el cliente**, con JavaScript puro y la API `<canvas>`: los píxeles y la contraseña nunca salen del navegador.

El formato binario y la colocación de bits viven en `lsbContainer.js`, un módulo sin dependencias del navegador. Esa separación no es cosmética: permite que las pruebas del backend importen y validen **el mismo código que ejecuta el navegador**, en lugar de una reimplementación que podría divergir en silencio.

### A. Formato del contenedor

```
offset  tam  campo
0       4    magic "STG1"
4       1    versión
5       1    flags
6       4    longitud del payload      (big-endian)
10      2    longitud de los metadatos (big-endian)
12      4    CRC-32 de (metadatos || payload)
16      ml   metadatos, JSON UTF-8
16+ml   pl   payload
```

Los `flags` señalan si el payload está cifrado (`0x01`), si es un archivo (`0x02`) y si la colocación es dispersa (`0x04`).

**Por qué el magic y el CRC-32.** La versión anterior sólo guardaba una longitud de 32 bits, y decidía si había mensaje comprobando si esa longitud cabía en la imagen. Eso confunde tres situaciones distintas: *no hay nada*, *hay algo y está corrupto*, y *hay algo y la contraseña es incorrecta*. Una imagen limpia produce bits aleatorios que con frecuencia pasan esa comprobación, y el motor devolvía basura como si fuera un mensaje.

Con el magic la ausencia de contenedor es una respuesta definida (`NO_CONTAINER`), y con el CRC-32 sobre metadatos y payload la corrupción se detecta **sin necesidad de la contraseña** (`CRC_MISMATCH`). El CRC usa el polinomio reflejado `0xEDB88320` de IEEE 802.3, validado contra vectores conocidos.

### B. Máscara a nivel de bits

$$\text{canal}' = (\text{canal} \mathbin{\&} \text{0xFE}) \mathbin{|} \text{bit}$$

Alteración fotométrica máxima de $\pm 1$ sobre 255 niveles, verificada por prueba. Sólo se tocan R, G y B; el canal alfa permanece intacto, también verificado.

Cada muestra transporta 1 bit, así que la capacidad es $\lfloor 3 \cdot W \cdot H / 8 \rfloor$ bytes menos la cabecera y los metadatos.

### C. Colocación: secuencial frente a dispersa

**Secuencial** ocupa un prefijo contiguo desde el primer píxel. Permite detectar el contenedor sin contraseña, pero es exactamente el patrón que el ataque χ² progresivo localiza y mide.

**Dispersa** reparte los bits por toda la imagen mediante una permutación sembrada por la contraseña, generada con un **Fisher-Yates perezoso**: se obtiene el $i$-ésimo elemento de una permutación uniforme usando memoria $O(k)$ en los $k$ bits que realmente se necesitan, en lugar de $O(N)$. Eso importa porque una imagen de 12 MP tiene 36 millones de muestras y materializar la permutación completa costaría 144 MB.

El efecto medido sobre el propio detector del laboratorio:

| Portadora de cámara, 60% de capacidad | χ² progresivo | Tasa estimada (real 60%) |
|---|---|---|
| Secuencial | `INYECCION_SECUENCIAL_LOCALIZADA` | 38.5% (sesgada) |
| **Dispersa** | `SIN_INYECCION_SECUENCIAL` | **62.5%** (exacta) |

El modo disperso **derrota la localización del ataque clásico**: no queda prefijo contiguo que medir. La inyección sigue siendo detectable, pero sólo por RS Analysis y SPA, que no asumen ninguna localización — y resultan *más* precisos, porque la dispersión satisface su supuesto de tasa homogénea, que la inyección secuencial rompe.

Sin la contraseña no se puede ni localizar la cabecera: la extracción falla con `NO_CONTAINER`, no con una lectura de basura.

La semilla se deriva con `SHA-256("lsb-walk-v1:" || contraseña)`, no con PBKDF2. Es deliberado y conviene decirlo con precisión: esta semilla **no protege confidencialidad**, sólo determina el orden de colocación, y debe poder recalcularse en la extracción sin almacenar nada en la imagen. La confidencialidad la aporta íntegramente la capa AES-GCM, que sí usa PBKDF2 con salt aleatorio. La consecuencia asumida es que la misma contraseña produce siempre la misma permutación: es una capa que encarece el estegoanálisis clásico, no un sustituto del cifrado.

### D. Criptografía en el navegador con WebCrypto

La contraseña maestra ya no viaja al servidor. El cliente deriva la clave con `PBKDF2-HMAC-SHA-512` de 600.000 iteraciones y cifra con `AES-256-GCM` mediante `crypto.subtle`, produciendo **exactamente el mismo paquete** `[Salt 16B | IV 12B | Tag 16B | Ciphertext]` que el backend.

Un detalle de formato que hay que tratar explícitamente: WebCrypto devuelve el tag de GCM **concatenado al final** del texto cifrado, mientras el formato del laboratorio lo coloca antes. De ahí el troceado en ambas direcciones.

La interoperabilidad no se da por supuesta: una suite de pruebas cifra con WebCrypto y descifra con el servicio de Node, y al contrario, comparando salt, IV, tag y ciphertext byte a byte. Si los formatos divergieran, el fallo aparecería en las pruebas y no en producción.

### E. Payload de archivos

El enunciado pide ocultar «texto o archivos». Los metadatos del contenedor guardan nombre, tipo MIME y tamaño en JSON, de modo que la extracción reconstruye el archivo con su nombre original y lo ofrece como descarga. El payload es binario arbitrario: cualquier tipo de archivo, hasta el límite de capacidad de la portadora.

### F. Exportación

Se descarga forzosamente en `image/png`. JPEG destruiría los LSB por la cuantización de la DCT, y con ellos el payload completo.

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

### 1. Inyección cripto-esteganográfica (Pestaña 1)

* Carga una imagen portadora. Observa la resolución, las muestras RGB disponibles, la capacidad total y la capacidad útil ya descontada la cabecera de 16 bytes.
* Deja el tipo de payload en **texto**, la protección en **AES-256-GCM** y la colocación en **dispersa**. Escribe un mensaje y una contraseña; la barra de ocupación se actualiza en vivo e incluye los 44 bytes de la cabecera criptográfica.
* Ejecuta la inyección. El botón anuncia primero *«Derivando clave (600.000 iteraciones)»*: eso es PBKDF2-SHA512 corriendo **en el navegador**, no en el servidor. Merece la pena señalarlo — la contraseña no sale del cliente.
* El panel de resultados desglosa el contenedor en cabecera, metadatos y payload, y cuántas muestras se alteraron sobre el total.
* Descarga el PNG. Visualmente es idéntico al original: la alteración máxima es de ±1 nivel sobre 255.

### 2. Ocultar un archivo, no sólo texto

* Cambia el tipo de payload a **archivo** y sube cualquier cosa: un PDF, un ZIP, otra imagen.
* Al extraerlo, el contenedor reconstruye el nombre original y el tipo MIME desde sus metadatos, y lo ofrece como descarga.

### 3. Extracción inversa y autenticación

* Cambia a **«Revelar información»** y sube el PNG generado.
* Sin contraseña y con inyección dispersa, el motor responde `NO_CONTAINER`: sin la semilla no se puede ni localizar la cabecera. Es el resultado correcto, no un fallo.
* Introduce la contraseña. El motor localiza el magic `STG1`, verifica el CRC-32, detecta el flag de cifrado y descifra verificando el tag GCM.
* **Prueba el caso interesante:** cambia un solo carácter de la contraseña. El error es de integridad, no de relleno, y no distingue entre contraseña incorrecta y manipulación — eso es deliberado, porque un mensaje más específico sería un oráculo para el atacante.

### 4. Detección de manipulación (Pestaña 2)

* Cifra un texto para ver el desglose hexadecimal de Salt, IV, Tag y Ciphertext.
* Pulsa **«Simular ataque (bit-flip)»**: altera 1 bit del texto cifrado.
* Al descifrar, el tag de autenticación de 16 bytes detecta la alteración y aborta antes de procesar un solo byte espurio.

### 5. Estegoanálisis forense (Pestaña 3)

* Sube primero una **fotografía limpia**. El veredicto será `LIMPIA`, y aun así la entropía LSB valdrá ≈ 0.99999: la prueba visible de que un umbral de entropía habría dado un falso positivo del 95%.
* Sube ahora una imagen esteganografiada **en modo secuencial**. El veredicto pasa a `INYECCION_CONFIRMADA`, con la tasa estimada y el tamaño del payload.
* Observa la **curva χ²/df**: se mantiene en ≈ 1 a lo largo del prefijo inyectado y se dispara varios órdenes de magnitud justo en el borde. Ese punto de ruptura *mide* la longitud del payload.
* Compara el bloque de **estimadores de tasa**: RS y SPA, que no comparten ningún supuesto, coinciden dentro de unas milésimas.

### 6. El remate: el motor disperso contra el propio detector

* Repite la inyección con la misma imagen y el mismo payload, pero en **modo disperso**, y analízala.
* El χ² pasa a `SIN_INYECCION_SECUENCIAL` y la localización desaparece: no queda prefijo contiguo que medir. El ataque clásico de 1999 ha sido derrotado.
* Y sin embargo el veredicto sigue siendo de detección, sostenido por RS Analysis y SPA. Más aún: su estimación de la tasa es **más precisa** que en el caso secuencial, porque la dispersión satisface el supuesto de tasa homogénea que la inyección secuencial rompe.
* Si además usas una portadora de histograma liso, el χ² se declarará `INCONCLUYENTE_HISTOGRAMA_LISO`. Provocar ese caso demuestra que el sistema conoce los límites de cada método en lugar de fingir certeza.

### 7. Concurrencia

* Ejecuta `npm run benchmark` en `/backend`. Muestra el retardo del event loop bajo carga concurrente, con el antes y el después documentados en la sección 7.
* Con el servidor en marcha, `GET /api/health` reporta el estado del pool de workers.

---

## ⚡ 7. Concurrencia: nada intensivo en el event loop

Node ejecuta JavaScript en un solo hilo. Una operación síncrona costosa no ralentiza sólo su propia petición: **congela el servidor entero**, incluido el health check. El proyecto lo mide en lugar de suponerlo, sondeando `/api/health` cada 25 ms mientras corre la carga:

```bash
cd backend
npm run benchmark
```

| Endpoint | `health` p99 antes | después | factor |
|---|---|---|---|
| `POST /api/crypto/encrypt` | **2559 ms** | **24 ms** | 106× |
| `GET /api/crypto/rsa/keygen` | **1527 ms** | **2.2 ms** | 694× |
| `POST /api/analyze/image` | **330 ms** | **25 ms** | 13× |

Con 12 peticiones simultáneas a `/encrypt`, sólo 2 de las ~100 sondas esperadas lograban pasar: el bucle estaba ocupado en `pbkdf2Sync` y ninguna otra petición avanzaba. Ahora pasan entre 25 y 41.

La solución usa **dos mecanismos distintos según la naturaleza del trabajo**, y la distinción es el punto interesante:

**OpenSSL sabe trabajar fuera del hilo principal.** El KDF y la generación de claves pasan a `crypto.pbkdf2` y `crypto.generateKeyPair`, que delegan a la threadpool de libuv. `publicEncrypt` y `privateDecrypt` siguen siendo síncronos a propósito: su coste está acotado (decenas de microsegundos y unos pocos milisegundos respectivamente), al contrario que la búsqueda probabilista de primos, que no tiene techo garantizado.

**La decodificación PNG y los estimadores son JavaScript puro** y no pueden usar esa threadpool, así que van a un pool de `worker_threads`. El worker recibe el PNG crudo —descomprimirlo es también trabajo intensivo— y el búfer se **transfiere** en lugar de copiarse. Un worker que muere rechaza su trabajo en curso y se sustituye; los trabajos colgados caducan.

El estado del pool se expone en `/api/health`.

---

## ✅ 8. Validación

El proyecto se valida con **295 pruebas** sin dependencias externas. Se ejecutan desde `/backend`:

```bash
npm test                # todas las suites
npm run test:crypto     # criptografía
npm run test:forensics  # análisis forense de extremo a extremo
npm run test:pool       # pool de workers
npm run benchmark       # retardo del event loop bajo carga
```

| Suite | Pruebas | Qué demuestra |
|---|---|---|
| `statistics.test.js` | 97 | La supervivencia χ² contra su forma cerrada exacta para grados de libertad pares y contra valores críticos tabulados, con precisión relativa de 1e-10 incluso donde $p \sim 10^{-137}$ |
| `chiSquareAttack.test.js` | 24 | Cero falsos positivos, medición de la longitud del payload, la ceguera del χ² global frente al progresivo, y el reconocimiento del límite en histogramas lisos |
| `rsAnalysis.test.js` | 26 | Exactitud del estimador contra tasas conocidas y la geometría del diagrama RS que predice el paper |
| `samplePairAnalysis.test.js` | 26 | Exactitud de SPA y su concordancia con RS, dos métodos sin supuestos compartidos |
| `forensics.integration.test.js` | 36 | Cero falsos positivos sobre 18 portadoras limpias, detección en los tres regímenes, y el caso adversarial: el motor disperso contra el propio detector |
| `pool.test.js` | 11 | Reparto entre workers, cola, propagación de errores, caducidad, integridad del búfer del llamante, y ausencia de bloqueo |
| `lsbContainer.test.js` | 27 | El formato del contenedor, el CRC-32 contra vectores conocidos, la permutación sin repeticiones, y los viajes de ida y vuelta de texto y archivos |
| `webcrypto.interop.test.js` | 19 | Que lo cifrado en el navegador se descifra en el servidor y al contrario, comparando salt, IV, tag y ciphertext byte a byte |
| `crypto.test.js` | 29 | AES-GCM verificado contra AES-CTR, PBKDF2-SHA512 contra RFC 8018, detección de manipulación en cada campo, y ausencia de bloqueo del event loop |

Las pruebas no comprueban que el código «no se rompa»: comprueban que **los estimadores recuperan tasas de inyección conocidas por construcción**. La fábrica de fixtures genera portadoras con ruido de sensor, portadoras con pipeline de cámara e inyectores LSB con tasa exacta, todo determinista a partir de una semilla.

### Verificaciones que no reutilizan el código que validan

* **AES-256-GCM contra AES-256-CTR.** La confidencialidad de GCM es CTR con un bloque contador determinado: con IV de 96 bits, $J_0 = IV \,\|\, \texttt{0x00000001}$ y el flujo de clave arranca en $\mathrm{inc}_{32}(J_0)$. Si ambos textos cifrados coinciden, la construcción y el manejo del IV son correctos.
* **PBKDF2-HMAC-SHA512 contra RFC 8018.** Se reimplementa la recurrencia $U_1 = \mathrm{HMAC}(P, S \,\|\, \mathrm{INT}(i))$, $U_j = \mathrm{HMAC}(P, U_{j-1})$, $T_i = U_1 \oplus \dots \oplus U_c$ sobre HMAC directo.
* **CRC-32 contra vectores publicados.** `""`, `"a"`, `"abc"` y `"123456789"`.
* **El contenedor LSB se valida importando el módulo del frontend**, no una réplica: las pruebas ejercitan el mismo código que corre en el navegador.

### Medición del bloqueo del event loop

El arnés incluye `measureEventLoopBlocking`, que mide el **hueco máximo entre ticks** de un temporizador de intervalo fijo. La métrica importa: contar ticks confunde «el bucle estaba bloqueado» con «el trabajo terminó rápido», mientras el hueco máximo mide exactamente la duración del bloqueo y es independiente de cuánto durase la carga.
