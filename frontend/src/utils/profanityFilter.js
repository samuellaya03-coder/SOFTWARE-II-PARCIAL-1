/**
 * FILTRO DE MODERACIÓN Y DETECCIÓN DE GROSERÍAS (ESPAÑOL / INGLÉS)
 * Normaliza diacríticos, leetspeak y valida límites de palabras (\b)
 * para evitar falsos positivos con términos académicos (computadora, disputa, etc.)
 */

const PROFANITY_WORDS = [
  // --- ESPAÑOL ---
  'puta', 'puto', 'putas', 'putos', 'putita', 'putito', 'puton', 'putona',
  'mierda', 'mierdas', 'mierdoso', 'mierdosa',
  'pendejo', 'pendeja', 'pendejos', 'pendejas', 'pendejada', 'pendejadas',
  'cabron', 'cabrona', 'cabrones', 'cabronas', 'cabronada',
  'idiota', 'idiotas', 'idiotez',
  'imbecil', 'imbeciles', 'imbecilidad',
  'estupido', 'estupida', 'estupidos', 'estupidas', 'estupidez',
  'carajo', 'carajos',
  'cono', 'conos', 'coño', 'coños',
  'chinga', 'chingar', 'chingada', 'chingado', 'chingados', 'chingon', 'chingona',
  'joder', 'jodete', 'jodido', 'jodida',
  'gilipollas', 'gili',
  'perra', 'perras', 'perron',
  'maricon', 'maricones', 'marica', 'maricas',
  'verga', 'vergas', 'vergazo',
  'mamaguevo', 'mamahuevo', 'mamabicho', 'mamadas',
  'culo', 'culos', 'culiao', 'culiado',
  'maldito', 'maldita', 'malditos', 'malditas',
  'bastardo', 'bastarda', 'bastardos', 'bastardas',
  'tarado', 'tarada', 'tarados', 'taradas',
  'zorra', 'zorras',
  'malparido', 'malparida', 'malparidos', 'malparidas',
  'gonorrea', 'gonorreas',
  'carechimba',
  'hdp', 'hijoputa', 'chucha',

  // --- ENGLISH ---
  'fuck', 'fucker', 'fuckers', 'fucking', 'fucked', 'fucks', 'fuckup',
  'shit', 'shits', 'shitty', 'bullshit',
  'bitch', 'bitches', 'bitching',
  'asshole', 'assholes', 'badass',
  'bastard', 'bastards',
  'cunt', 'cunts',
  'dick', 'dicks', 'dickhead', 'dickheads',
  'dumbass', 'dumbasses',
  'motherfucker', 'motherfuckers', 'motherfucking',
  'moron', 'morons',
  'crap', 'crappy',
  'dipshit', 'dipshits',
  'jackass', 'jackasses',
  'slut', 'sluts',
  'whore', 'whores',
  'faggot', 'faggots',
  'nigger', 'nigga', 'niggers', 'niggas'
];

// Frases compuestas comunes
const COMPOUND_PATTERNS = [
  /\bhij[oa]s?\s+de\s+puta\b/i,
  /\bchinga\s+tu\s+madre\b/i,
  /\bme\s+cago\s+en\b/i,
  /\bpiece\s+of\s+shit\b/i,
  /\bson\s+of\s+a?\s*bitch\b/i,
  /\bfuck\s+(you|off|up)\b/i,
  /\bshut\s+the\s+fuck\s+up\b/i
];

/**
 * Normaliza el texto removiendo diacríticos/acentos y caracteres leet comunes
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita acentos (á->a, é->e, etc.)
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's');
}

/**
 * Verifica si el texto contiene palabras o frases groseras en español o inglés
 * @param {string} text 
 * @returns {boolean}
 */
export function containsProfanity(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return false;
  
  const normalized = normalizeText(text);

  // 1. Revisar patrones compuestos
  for (const pattern of COMPOUND_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  // 2. Revisar palabras exactas con delimitador de palabra \b
  const regex = new RegExp(`\\b(${PROFANITY_WORDS.join('|')})\\b`, 'i');
  return regex.test(normalized);
}
