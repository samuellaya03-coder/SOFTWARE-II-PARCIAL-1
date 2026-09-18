# Cambios: `feat/resaltado-inyeccion-lsb` vs `main`

**Rama:** `feat/resaltado-inyeccion-lsb`  
**Base:** `main`  
**Archivos modificados:** 2  
**Líneas agregadas:** ~337 (+122 backend, +225 frontend)

---

## Resumen de los cambios

La rama `main` ya tenía implementados los algoritmos de **Entropía de Shannon** y **Ataque Chi-cuadrado (PoVs)** para detectar esteganografía LSB a nivel global (sobre toda la imagen). Esta rama agrega tres funcionalidades encima de eso, sin modificar la lógica de detección original:

1. **Análisis por franjas horizontales** en el backend
2. **Imagen con resaltado visual** de las zonas inyectadas
3. **Gráfico de perfil de inyección** franja por franja

---

## Cambios por archivo

### `backend/services/stegoanalysis.service.js`

Se agregó el **Motor de Análisis por Franjas Horizontales** (Sliding Strip Analysis).

**¿Qué hace?**  
En lugar de calcular la entropía y el chi-cuadrado sobre toda la imagen de una vez, divide la imagen en franjas horizontales de altura fija y aplica los mismos algoritmos en cada franja por separado.

**¿Para qué sirve?**  
Permite localizar exactamente **en qué filas de píxeles** se encuentra la información inyectada, en vez de solo saber si la imagen tiene o no esteganografía.

**Criterio de detección por franja:**  
Una franja se marca como sospechosa si cumple:
- `sPovRatio < 0.045` → los pares de valores (2k, 2k+1) están artificialmente igualados (señal de inyección LSB)
- `entropíaGlobal >= 0.990` → la aleatoriedad de los bits LSB en esa franja es cuasi-perfecta

**Nuevos campos en la respuesta del API (`/api/analyze/image`):**

```json
"stripAnalysis": {
  "stripHeight": 16,
  "totalStrips": 32,
  "suspiciousStripsCount": 4,
  "strips": [ ... ]
},
"injectedRegion": {
  "hasInjectedRegion": true,
  "startRow": 0,
  "endRow": 63,
  "totalRows": 64,
  "percentageOfImage": 12.5
}
```

---

### `frontend/src/components/AnalysisTab.js`

Se agregaron tres bloques visuales nuevos en la sección de resultados del estegoanálisis:

#### 1. Imagen con resaltado de píxeles inyectados (`renderHighlightCanvas`)

- Muestra la imagen original cargada por el usuario dibujada en un `<canvas>`.
- Los píxeles que pertenecen a **franjas detectadas como sospechosas** y cuyo **LSB del canal Rojo es 1** se resaltan en **rojo neón**.
- Se dibuja un **recuadro discontinuo** alrededor de toda la región inyectada (desde la primera fila afectada hasta la última).
- Debajo del canvas se muestra un resumen textual con el rango de filas afectadas y el porcentaje del área de la imagen comprometida.

#### 2. Gráfico de perfil de inyección por franja (`renderStripEntropyChart`)

- Gráfico de barras (Chart.js) donde el eje X son las franjas de la imagen y el eje Y es el índice de sospecha de inyección (0% a 100%).
- Las barras de franjas **limpias** aparecen en gris transparente.
- Las barras de franjas **sospechosas** aparecen en rojo.
- Al pasar el cursor sobre una barra el tooltip muestra: nivel de sospecha, entropía LSB de la franja y estado.

#### 3. Nuevos elementos del DOM

Se agregaron al HTML del componente:
- `#highlight-canvas` → canvas donde se dibuja la imagen resaltada
- `#strip-summary-info` → texto con el resumen de la región inyectada
- `#strip-region-badge` → badge que indica el rango de filas o "Sin inyección detectada"
- `#strip-entropy-chart` → canvas del gráfico de barras por franja

---

## Lo que NO cambió

- Los algoritmos de Entropía de Shannon y Chi-cuadrado globales son **idénticos** a los de `main`.
- El **veredicto final** (índice de sospecha %) usa exactamente la misma fórmula que `main`, basada en la entropía global.
- El histograma RGB, las métricas de entropía por canal y el diseño general de la página no se tocaron.
- Ningún otro componente (`CryptoTab.js`, `StegoTab.js`, `server.js`, rutas, etc.) fue modificado.
