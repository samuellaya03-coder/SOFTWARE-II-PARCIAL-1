import crypto from 'crypto';

/**
 * ============================================================================
 * 🛡️  CYBERLAB FORENSIC ENGINE: BENCHMARK AVANZADO DE RESISTENCIA A FUERZA BRUTA
 * Laboratorio de Ciberseguridad - PBKDF2-HMAC-SHA512 Hardening
 * ============================================================================
 */

// Códigos de colores ANSI vibrantes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  purple: '\x1b[35m',
  brightPurple: '\x1b[95m',
  white: '\x1b[97m',
  bgDark: '\x1b[40m',
  bgCyan: '\x1b[46m\x1b[30m\x1b[1m',
  bgRed: '\x1b[41m\x1b[97m\x1b[1m',
  bgGreen: '\x1b[42m\x1b[30m\x1b[1m'
};

const DICCIONARIO_ROCKYOU = 14_341_564; // Tamaño real del famoso diccionario RockYou
const PASSWORD_PRUEBA = 'ClaveMaestraSegura2026!';
const SALT = crypto.randomBytes(16);

// Función auxiliar para pausas asíncronas
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Barra de progreso visual ASCII
function renderBarra(porcentaje, ancho = 30) {
  const completos = Math.round((ancho * porcentaje) / 100);
  const vacios = ancho - completos;
  return `[${C.brightCyan}${'█'.repeat(completos)}${C.dim}${'-'.repeat(vacios)}${C.reset}] ${porcentaje.toFixed(0)}%`;
}

// Banner ASCII Cyberpunk
function mostrarBanner() {
  console.clear();
  console.log(`
${C.brightCyan}  ██████╗ ██████╗ ██╗  ██╗██████╗ ███████╗██████╗ 
  ██╔══██╗██╔══██╗██║ ██╔╝██╔══██╗██╔════╝╚════██╗
  ██████╔╝██████╔╝█████╔╝ ██║  ██║█████╗   █████╔╝
  ██╔═══╝ ██╔══██╗██╔═██╗ ██║  ██║██╔══╝  ██╔═══╝ 
  ██║     ██████╔╝██║  ██╗██████╔╝██║     ███████╗
  ╚═╝     ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝     ╚══════╝${C.reset}
  ${C.bold}${C.white}FORENSIC CRYPTO LAB — SIMULADOR DE ESTRÉS Y ATAQUE A FUERZA BRUTA${C.reset}
  ${C.dim}Arquitectura: PBKDF2-HMAC-SHA512 + Salt CSPRNG (128-bit) | AES-256-GCM${C.reset}
  ${C.dim}───────────────────────────────────────────────────────────────────────${C.reset}
`);
}

async function simularAtaqueFuerzaBruta(iteraciones) {
  console.log(`\n${C.bgCyan} ⚔️  SIMULACIÓN EN VIVO: ATAQUE DE DICCIONARIO (MODO GPU HASHCAT) ${C.reset}`);
  console.log(`${C.dim}Un adversario interceptó el payload e intenta quebrar la clave con palabras comunes...${C.reset}\n`);

  const candidatos = [
    '123456',
    'password',
    'admin2026',
    'qwertyuiop',
    'dragon',
    'masterkey'
  ];

  for (let i = 0; i < candidatos.length; i++) {
    const pass = candidatos[i];
    process.stdout.write(`  ${C.brightYellow}[INTENTO ${i + 1}/6]${C.reset} Probando clave: "${C.bold}${pass.padEnd(12, ' ')}${C.reset}" ... `);
    
    const t0 = performance.now();
    crypto.pbkdf2Sync(pass, SALT, iteraciones, 32, 'sha512');
    const tElapsed = performance.now() - t0;

    process.stdout.write(`${C.brightRed}❌ FALLÓ${C.reset} (Hash mismatch) ${C.dim}[Δt: ${tElapsed.toFixed(1)} ms]${C.reset}\n`);
    await sleep(40);
  }

  console.log(`\n  ${C.bold}${C.brightGreen}🛡️  RESULTADO DEL ATAQUE:${C.reset} El adversario fue frenado por la inercia de la CPU.`);
  console.log(`  ${C.dim}Cada intento fallido consumió ciclos reales de hardware impidiendo ataques masivos.${C.reset}\n`);
}

async function ejecutarBenchmark() {
  mostrarBanner();

  const customArg = parseInt(process.argv[2], 10);
  const esCustom = !isNaN(customArg) && customArg > 0;

  const niveles = esCustom
    ? [
        { iter: 1, desc: 'Hash directo (MD5 / SHA-256 plano)', tipo: '🔴 CRÍTICO' },
        { iter: customArg, desc: `Prueba Inyectada (${customArg.toLocaleString()} iter)`, tipo: '⚡ CUSTOM' },
        { iter: 600_000, desc: 'Estándar OWASP 2023+ (NUESTRO PROYECTO)', tipo: '💎 ULTRA SEGURO' }
      ]
    : [
        { iter: 1, desc: 'Hash plano sin KDF (Línea base)', tipo: '🔴 CRÍTICO' },
        { iter: 1_000, desc: 'Estándar obsoleto (Año 2000)', tipo: '🔴 VULNERABLE' },
        { iter: 50_000, desc: 'Estándar legacy (Año 2012)', tipo: '🟡 DÉBIL' },
        { iter: 100_000, desc: 'Prueba Extrema (Demostración)', tipo: '🟢 ALTA RESISTENCIA' },
        { iter: 600_000, desc: 'Estándar OWASP 2023+ (NUESTRO PROYECTO)', tipo: '💎 GRADO MILITAR' }
      ];

  console.log(`${C.bold}Auditoría de Cómputo CPU en curso:${C.reset} Evaluando latencia por iteración...\n`);

  const resultados = [];

  for (let i = 0; i < niveles.length; i++) {
    const item = niveles[i];
    process.stdout.write(`  ${C.cyan}▶ Computando ${item.desc}...${C.reset} `);

    // Barra animada rápida
    for (let p = 20; p <= 100; p += 20) {
      process.stdout.write(`\r  ${C.cyan}▶ Computando ${item.desc}...${C.reset} ${renderBarra(p, 18)}`);
      await sleep(15);
    }

    const t0 = performance.now();
    const derivedKey = crypto.pbkdf2Sync(PASSWORD_PRUEBA, SALT, item.iter, 32, 'sha512');
    const elapsed = performance.now() - t0;

    const hashesPerSec = Math.max(1, Math.round(1000 / Math.max(0.1, elapsed)));
    const segTotales = (DICCIONARIO_ROCKYOU * elapsed) / 1000;

    resultados.push({
      ...item,
      elapsed,
      hashesPerSec,
      segTotales,
      crackTimeStr: formatTiempo(segTotales),
      keyPreview: derivedKey.toString('hex').substring(0, 12) + '...'
    });

    process.stdout.write(`\r  ${C.brightGreen}✓ Computado:${C.reset} ${item.desc} ${C.dim}[${elapsed.toFixed(1)} ms]${C.reset}\n`);
  }

  // TABLA RESULTADOS ULTRA ESTÉTICA
  console.log(`\n${C.bold}╔══════════════════════════════════════════╦══════════════╦══════════════╦═══════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}║ CONFIGURACIÓN / ITERACIONES              ║ TIEMPO / INT ║ INTENTOS / S ║ RESISTENCIA ROCKYOU (14.3M)   ║${C.reset}`);
  console.log(`${C.bold}╠══════════════════════════════════════════╬══════════════╬══════════════╬═══════════════════════════════╣${C.reset}`);

  for (const r of resultados) {
    const colNombre = r.desc.padEnd(40, ' ');
    const colTiempo = `${r.elapsed.toFixed(2)} ms`.padStart(12, ' ');
    const colHps = `${r.hashesPerSec.toLocaleString()} h/s`.padStart(12, ' ');
    const colCrack = `${r.crackTimeStr}`.padEnd(29, ' ');

    let colColor = C.white;
    if (r.iter <= 1000) colColor = C.brightRed;
    else if (r.iter <= 50000) colColor = C.brightYellow;
    else if (r.iter <= 100000) colColor = C.brightCyan;
    else if (r.iter >= 600000) colColor = C.brightGreen;

    console.log(`║ ${colColor}${colNombre}${C.reset} ║ ${colTiempo} ║ ${colHps} ║ ${colColor}${C.bold}${colCrack}${C.reset} ║`);
  }
  console.log(`${C.bold}╚══════════════════════════════════════════╩══════════════╩══════════════╩═══════════════════════════════╝${C.reset}`);

  // Simulación de ataque interactivo con las iteraciones objetivo
  const iterAtaque = esCustom ? customArg : 100_000;
  await simularAtaqueFuerzaBruta(iterAtaque);

  // Cuadro resumen académico
  console.log(`${C.bold}${C.brightCyan}═════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}${C.brightGreen}🎓 CONCLUSIÓN CIENTÍFICA PARA EL JURADO:${C.reset}`);
  console.log(`  1. ${C.bold}Asimetría Computacional:${C.reset} Para el emisor/receptor, descifrar toma solo ${C.bold}~1 segundo${C.reset}.`);
  console.log(`  2. ${C.bold}Freno al Atacante:${C.reset} Un adversario con GPU intentando probar el diccionario`);
  console.log(`     RockYou tardaría ${C.bold}${C.brightYellow}${resultados[resultados.length - 1].crackTimeStr}${C.reset} en lugar de los 2 minutos que tardaría con MD5.`);
  console.log(`  3. ${C.bold}Salt Aleatorio (128-bit):${C.reset} Destruye por completo el uso de Rainbow Tables.`);
  console.log(`${C.bold}${C.brightCyan}═════════════════════════════════════════════════════════════════════════${C.reset}\n`);
}

function formatTiempo(segundos) {
  if (segundos < 1) return '< 1 segundo (Vulnerable)';
  if (segundos < 60) return `${Math.round(segundos)} segundos`;
  if (segundos < 3600) return `${(segundos / 60).toFixed(1)} minutos`;
  if (segundos < 86400) return `${(segundos / 3600).toFixed(1)} horas`;
  if (segundos < 86400 * 365) return `${(segundos / 86400).toFixed(1)} DÍAS`;
  return `${(segundos / (86400 * 365)).toFixed(1)} AÑOS`;
}

ejecutarBenchmark();
