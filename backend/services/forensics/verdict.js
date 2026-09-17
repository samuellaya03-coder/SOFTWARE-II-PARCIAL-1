/**
 * Fusion de evidencia: convierte las salidas de los tres estimadores en un
 * veredicto unico.
 *
 * Los estimadores no son intercambiables, y el veredicto respeta sus roles:
 *
 *   - RS y SPA miden la TASA de inyeccion. No dependen del histograma y son
 *     robustos, pero no localizan el payload.
 *   - El X2 progresivo LOCALIZA el borde de una inyeccion secuencial con gran
 *     resolucion (detecta payloads del 0.5%), pero es ciego sobre portadoras de
 *     histograma liso.
 *
 * Umbrales calibrados sobre 29 portadoras limpias (multiples semillas, tamanos,
 * niveles de ruido y pipelines):
 *
 *     Portadoras normales (sigma <= 3, camara, gradiente):  RS <= 0.035, SPA <= 0.037
 *     Ruido de sensor extremo (sigma = 10):                 RS 0.119, SPA 0.208
 *
 * De ahi los dos criterios. El suelo de ruido de 0.05 cubre toda portadora normal
 * con margen. Y la CONCORDANCIA entre RS y SPA separa el ruido extremo de un
 * payload real: con inyeccion real los dos metodos coinciden dentro de 0.03
 * (medido: 0.007 al 20%, 0.021 al 35%, 0.008 al 50%), mientras el ruido de
 * sigma=10 los descuadra en 0.089.
 */

/** Tasa por debajo de la cual no hay evidencia: cubre el sesgo de toda portadora normal. */
const NOISE_FLOOR = 0.05;

/** Tasa a partir de la cual la evidencia pasa de sospecha a deteccion. */
const DETECTION_RATE = 0.15;

/** Discordancia maxima entre RS y SPA para considerar la evidencia coherente. */
const MAX_DISAGREEMENT = 0.08;

export const VERDICT_STATUS = {
  CLEAN: 'LIMPIA',
  INCONSISTENT: 'EVIDENCIA_INCONSISTENTE',
  SUSPICIOUS: 'SOSPECHA',
  DETECTED: 'INYECCION_DETECTADA',
  CONFIRMED: 'INYECCION_CONFIRMADA'
};

/**
 * @param {object} input
 * @param {object} input.rs - Resultado de rsAnalysisRgb.
 * @param {object} input.spa - Resultado de samplePairAnalysisRgb.
 * @param {object} input.chiSquare - Resultado de progressiveChiSquareAttack.
 * @param {number} input.totalSamples - Muestras RGB de la imagen.
 */
export function buildVerdict({ rs, spa, chiSquare, totalSamples }) {
  const rsRate = rs.estimatedRate;
  const spaRate = spa.estimatedRate;

  const rates = [rsRate, spaRate].filter((rate) => rate !== null);
  const consensusRate = rates.length > 0
    ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length
    : null;

  const disagreement = rsRate !== null && spaRate !== null
    ? Math.abs(rsRate - spaRate)
    : null;
  const coherent = disagreement === null || disagreement <= MAX_DISAGREEMENT;

  const localized = chiSquare.conclusive === true && chiSquare.sequentialEmbeddingDetected === true;
  const rateEvidence = consensusRate !== null && consensusRate >= NOISE_FLOOR;
  const strongRate = consensusRate !== null && consensusRate >= DETECTION_RATE;

  const findings = [];
  let status;

  // La coherencia entre RS y SPA es un guardia contra falsos positivos por ruido
  // extremo, y solo se exige en la via basada unicamente en la tasa. Cuando el X2
  // ha localizado un borde, esa preocupacion ya esta resuelta por una familia de
  // metodos independiente, y ademas una inyeccion secuencial descorrelaciona RS y
  // SPA de forma legitima: ambos asumen tasa homogenea y se sesgan de distinta
  // manera (medido al 75% secuencial: RS 0.535, SPA 0.454, discordancia 0.080).
  if (localized && strongRate) {
    status = VERDICT_STATUS.CONFIRMED;
    findings.push(
      `RS y SPA estiman una tasa de inyeccion del ${(consensusRate * 100).toFixed(1)}%.`,
      `El X2 progresivo localiza el borde del payload en la fraccion `
      + `${chiSquare.embeddedFraction.toFixed(4)} del flujo.`,
      'Dos familias de metodos independientes concuerdan: la evidencia es concluyente.'
    );
    if (!coherent) {
      findings.push(
        `La discordancia entre RS y SPA (${disagreement.toFixed(3)}) es la esperable en una `
        + 'inyeccion secuencial, que rompe el supuesto de tasa homogenea de ambos metodos.'
      );
    }
  } else if (localized) {
    status = VERDICT_STATUS.DETECTED;
    findings.push(
      `El X2 progresivo localiza una region equilibrada en el prefijo hasta la fraccion `
      + `${chiSquare.embeddedFraction.toFixed(4)}, incompatible con una imagen natural.`
    );
    if (!rateEvidence) {
      findings.push(
        'La tasa global queda bajo el suelo de ruido, lo que es consistente con un payload '
        + 'pequeno y secuencial: ocupa poca fraccion de la imagen pero deja una firma nitida.'
      );
    }
  } else if (strongRate && coherent) {
    status = VERDICT_STATUS.DETECTED;
    findings.push(
      `RS y SPA coinciden en una tasa del ${(consensusRate * 100).toFixed(1)}% `
      + `(discordancia ${disagreement === null ? 'n/d' : disagreement.toFixed(3)}), `
      + `muy por encima del suelo de ruido de ${NOISE_FLOOR}.`
    );
    if (chiSquare.conclusive === false) {
      findings.push(`El X2 no puede corroborar: ${chiSquare.status}.`);
    } else {
      findings.push(
        'El X2 no localiza un prefijo equilibrado, lo que apunta a inyeccion dispersa '
        + 'en lugar de secuencial.'
      );
    }
  } else if (rateEvidence && !coherent) {
    status = VERDICT_STATUS.INCONSISTENT;
    findings.push(
      `RS estima ${rsRate.toFixed(4)} y SPA estima ${spaRate.toFixed(4)}: una discordancia de `
      + `${disagreement.toFixed(3)} supera el maximo de ${MAX_DISAGREEMENT}.`,
      'Con inyeccion real ambos metodos coinciden. Esta divergencia es la firma de una '
      + 'portadora con ruido de sensor extremo o textura muy agresiva, no de un payload.'
    );
  } else if (rateEvidence) {
    status = VERDICT_STATUS.SUSPICIOUS;
    findings.push(
      `La tasa estimada (${(consensusRate * 100).toFixed(1)}%) supera el suelo de ruido pero `
      + `no alcanza el umbral de deteccion del ${(DETECTION_RATE * 100).toFixed(0)}%.`,
      'Compatible tanto con un payload muy pequeno como con una portadora ruidosa.'
    );
  } else {
    status = VERDICT_STATUS.CLEAN;
    findings.push(
      `RS y SPA estiman una tasa de inyeccion de ${consensusRate === null ? 'n/d' : (consensusRate * 100).toFixed(2) + '%'}, `
      + 'dentro del sesgo propio de los estimadores sobre imagenes limpias.'
    );
    if (chiSquare.conclusive) {
      findings.push('El X2 progresivo no encuentra ningun prefijo con pares equilibrados.');
    } else {
      findings.push(`El X2 no es aplicable a esta portadora: ${chiSquare.status}.`);
    }
  }

  // La estimacion en bytes se toma del X2 cuando localizo el payload, porque ahi
  // mide la longitud directamente; RS y SPA se sesgan con inyeccion secuencial.
  let estimatedPayloadBytes = null;
  let payloadSource = null;

  if (localized) {
    estimatedPayloadBytes = chiSquare.estimatedEmbeddedBytes;
    payloadSource = 'X2_PROGRESIVO';
  } else if (strongRate) {
    estimatedPayloadBytes = Math.floor((consensusRate * totalSamples) / 8);
    payloadSource = 'TASA_RS_SPA';
  }

  const detected = status === VERDICT_STATUS.DETECTED || status === VERDICT_STATUS.CONFIRMED;

  return {
    status,
    detected,
    estimatedRate: consensusRate === null ? null : Number(consensusRate.toFixed(6)),
    estimatedPayloadBytes,
    payloadSource,
    localization: localized
      ? {
        embeddedFraction: chiSquare.embeddedFraction,
        estimatedBytes: chiSquare.estimatedEmbeddedBytes
      }
      : null,
    evidence: {
      rsRate,
      spaRate,
      disagreement: disagreement === null ? null : Number(disagreement.toFixed(6)),
      coherent,
      chiSquareStatus: chiSquare.status,
      chiSquareConclusive: chiSquare.conclusive === true
    },
    thresholds: {
      noiseFloor: NOISE_FLOOR,
      detectionRate: DETECTION_RATE,
      maxDisagreement: MAX_DISAGREEMENT
    },
    findings
  };
}
