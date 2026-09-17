/**
 * Entropia de Shannon de los planos LSB.
 *
 *     H(X) = - SUM p(x) log2 p(x)     sobre {0, 1}, maximo 1.0 bits/simbolo
 *
 * IMPORTANTE: esta metrica es DESCRIPTIVA, no discriminante, y el sistema no la
 * usa para decidir. Los LSB de cualquier fotografia con ruido de sensor ya son
 * practicamente aleatorios, asi que H ~ 1.0 tanto en una imagen limpia como en
 * una esteganografiada. Medido sobre una portadora limpia con ruido sigma=2:
 * H = 0.999999, es decir, indistinguible de una inyeccion total.
 *
 * Un umbral del tipo "H > 0.9985 => esteganografia" marca como sospechosa
 * practicamente cualquier foto real. Se conserva el calculo porque es informativo
 * al comparar planos de bits entre si, y porque documentar POR QUE no sirve es
 * parte de sostener el analisis.
 */

/** H(X) binaria a partir de los conteos de ceros y unos. */
function binaryEntropy(zeros, ones) {
  const total = zeros + ones;
  if (total === 0) return 0;

  const p0 = zeros / total;
  const p1 = ones / total;

  let entropy = 0;
  if (p0 > 0) entropy -= p0 * Math.log2(p0);
  if (p1 > 0) entropy -= p1 * Math.log2(p1);
  return entropy;
}

/** Entropia del plano LSB de un flujo de muestras. */
function lsbEntropy(samples) {
  let ones = 0;
  for (let i = 0; i < samples.length; i++) {
    ones += samples[i] & 1;
  }
  return {
    entropy: binaryEntropy(samples.length - ones, ones),
    onesRatio: samples.length > 0 ? ones / samples.length : 0
  };
}

/**
 * Entropia LSB por canal y global.
 * @param {{ red: Uint8Array, green: Uint8Array, blue: Uint8Array }} planes
 */
export function lsbEntropyRgb(planes) {
  const red = lsbEntropy(planes.red);
  const green = lsbEntropy(planes.green);
  const blue = lsbEntropy(planes.blue);

  const totalSamples = planes.red.length + planes.green.length + planes.blue.length;
  const totalOnes =
    red.onesRatio * planes.red.length
    + green.onesRatio * planes.green.length
    + blue.onesRatio * planes.blue.length;

  const global = binaryEntropy(totalSamples - totalOnes, totalOnes);

  return {
    redLsb: Number(red.entropy.toFixed(6)),
    greenLsb: Number(green.entropy.toFixed(6)),
    blueLsb: Number(blue.entropy.toFixed(6)),
    globalLsb: Number(global.toFixed(6)),
    theoreticalMax: 1,
    onesRatio: Number((totalSamples > 0 ? totalOnes / totalSamples : 0).toFixed(6)),
    isDiscriminative: false,
    note:
      'Metrica descriptiva, no usada en el veredicto. Los LSB de cualquier foto con '
      + 'ruido de sensor ya alcanzan H ~ 1.0 sin payload alguno.'
  };
}
