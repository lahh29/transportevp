/**
 * choferConfig.js — Configuración centralizada del Portal de Chofer
 * ------------------------------------------------------------------
 * Toda constante de negocio, color de marca y parámetro de UX vive aquí.
 * NO importar tokens de ChoferPortal.jsx desde otros lados; centralizar
 * cambios futuros (rutas nuevas, ventanas de horario, etc.) en este módulo.
 *
 * Próximo paso (fuera de este PR): mover RUTAS_LIST, SHIFT_SCHEDULE y
 * SHIFT_HOURS a Supabase para poder actualizarlos sin redesplegar la PWA.
 */

/* ── Días (orden estándar JS getDay()) ───────────────────────────── */
export const DAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

/* ── Calendario de turnos ────────────────────────────────────────── */
export const SHIFT_SCHEDULE = {
  '1': ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  '2': ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  '3': ['Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'],
  '4': ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves'],
};

/* ── Ventanas de horario base (start/end en horas locales 0-23) ──── */
export const SHIFT_HOURS = {
  '1': { start: 6,  end: 14 },
  '2': { start: 14, end: 22 },
  '3': { start: 22, end: 6  }, // cruza medianoche
};

/* ── Tolerancia para abordaje (en horas, relativa a inicio/fin) ──── */
export const SHIFT_TOLERANCE = {
  entradaAntes:   2,  // hasta 2 h ANTES del inicio
  entradaDespues: 0,  // Exactamente a la hora de inicio se cierra la entrada
  salidaAntes:    0,  // No se puede escanear salida antes de que termine el turno
  salidaDespuesMin: 20, // hasta 20 min DESPUÉS del fin
};

/**
 * Resuelve el turno real para el turno comodín "4", que rota según día.
 */
export const resolveTurno = (turnoRaw, diaActualStr) => {
  const t = String(turnoRaw);
  if (t !== '4') return t;
  if (diaActualStr === 'Domingo') return '1';
  if (diaActualStr === 'Lunes' || diaActualStr === 'Martes') return '2';
  if (diaActualStr === 'Miércoles' || diaActualStr === 'Jueves') return '3';
  return t;
};

/* ── Rutas (TODO: mover a Supabase) ──────────────────────────────── */
export const RUTAS_LIST = [
  'R1- QUERETARO- PIE DE LA CUESTA',
  'R2- SAN JOSE ITURBIDE',
  'R3- SAN JOSE ITURBIDE 2',
  'R4-SANTA ROSA',
  'R5- QUERETARO-AV. DE LA LUZ',
  'R6- AV. DE LA LUZ - PASEOS QUERETARO',
];

/* ── Turnos canónicos para alta/edición de empleados ─────────────── */
export const TURNOS_OPTIONS = [
  { value: '1', label: 'Turno 1' },
  { value: '2', label: 'Turno 2' },
  { value: '3', label: 'Turno 3' },
  { value: '4', label: 'Turno 4 · rotativo' },
];

/* ── Colonias conocidas (sugerencias para datalist) ──────────────── */
export const COLONIAS_LIST = [
  'AV. DE LA LUZ',
  'AV. PEDREGAL',
  'BUENAVISTA',
  'COREA',
  'FRACC. MONTENEGRO',
  'HDA SANTA ROSA',
  'LA BARRETA',
  'LA LUZ',
  'LA MONJA',
  'MONTENEGRO',
  'OBRERA',
  'OJO DE AGUA',
  'PASEOS QUERETARO',
  'PEÑAFLOR',
  'PIE DE LA CUESTA',
  'PLAZA DEL SOL',
  'PROL. BERNARDO QUINTANA',
  'PUERTO AGUIRRE',
  'PUERTO CARROZA',
  'RINCON OJO DE AGUA',
  'SALITRE',
  'SAN ISIDRO',
  'SAN JOSE ITURBIDE',
  'SANTA CATARINA',
  'SANTA ROSA',
  'TLALOC',
];

/* ── Paleta por ruta — homogeneizada con tokens semánticos ───────── */
export const RUTA_COLORS = {
  R1: { bgRaw: 'var(--color-accent-raw)',   text: 'var(--color-accent)' },
  R2: { bgRaw: '26 35 126',                 text: '#1a237e' },
  R3: { bgRaw: '0 130 120',                 text: '#008278' },
  R4: { bgRaw: '130 0 80',                  text: '#820050' },
  R5: { bgRaw: '200 130 0',                 text: '#a06400' },
  R6: { bgRaw: '40 120 40',                 text: '#287828' },
};

export const getRutaColor = (code) => {
  const c = RUTA_COLORS[code] || RUTA_COLORS.R1;
  return { bg: `rgb(${c.bgRaw} / 0.1)`, text: c.text, raw: c.bgRaw };
};

/**
 * Parsea "R1- QUERETARO- PIE DE LA CUESTA" → { code, desc }.
 */
export const parseRuta = (ruta) => {
  if (!ruta || ruta === 'Sin ruta') return { code: '?', desc: ruta || 'Sin ruta' };
  const match = String(ruta).match(/^(R\d+)[-\s]+(.+)$/i);
  if (!match) return { code: '?', desc: ruta };
  const desc = match[2].replace(/-/g, ' - ').replace(/\s{2,}/g, ' ').trim();
  return { code: match[1].toUpperCase(), desc };
};

/* ── Parámetros del escáner (UX / batería) ───────────────────────── */
export const SCAN_CONFIG = {
  fps: 15,                 // 15 fps con BarcodeDetector nativo: lectura rápida sin afectar batería
  qrboxRatio: 0.7,         // proporción de la caja sobre min(w,h) — un poco mayor para capturar mejor el QR
  scanCooldownMs: {        // tiempo que persiste el banner antes de re-escanear
    success: 4000,
    warning: 6000,
    error:   6500,
  },
  // Evita escaneos repetidos del mismo QR en ventana corta
  dedupeWindowMs: 8000,
  // Vibración háptica (no se invoca si el usuario tiene reduced-motion)
  haptics: {
    success: 60,
    warning: [60, 80, 60],
    error:   [120, 80, 120, 80, 120],
  },
};

/* ── Tap targets accesibles (WCAG 2.5.5 / iOS HIG / Material) ────── */
export const TAP_TARGET = {
  min: 44, // px — mínimo absoluto
  cozy: 48,
};

/* ── Prioridad de anomalías (para ordenar listas) ────────────────── */
export const PRIORITY = {
  rechazado_ruta: 1,
  rechazado_qr:   2,
  fuera_horario:  3,
  dia_descanso:   4,
  autorizado:     5,
};

/* ── Rutas de navegación de la app ───────────────────────────────── */
export const APP_ROUTES = {
  landing:  '/',
  login:    '/login',
  chofer:   '/chofer',
  choferLogin: '/chofer/login',
  empresa:  '/empresa',
  configuracion: '/empresa/configuracion',
  empleadoLogin: '/empleado/login',
  empleadoDashboard: '/empleado/dashboard',
};

/* ── Tokens de motion (centralizados para todas las animaciones) ─ */
export const MOTION = {
  /** Easing estándar — equivalente a CSS cubic-bezier(.22,1,.36,1) "ease-out-expo soft" */
  ease: [0.22, 1, 0.36, 1],
  /** Duraciones (segundos para framer, ms multiplicado donde aplique) */
  duration: {
    instant: 0.12,
    fast:    0.18,
    base:    0.22,
    slow:    0.32,
  },
  /** Desplazamientos para slides */
  offset: {
    sm: 8,
    md: 16,
  },
};

/* ── Helpers de fecha ────────────────────────────────────────────── */
export const getISOWeek = (dateOrStr) => {
  const d = new Date(dateOrStr instanceof Date ? dateOrStr : dateOrStr + 'T12:00:00');
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
};

export const getInitials = (nombre) => {
  if (!nombre) return '?';
  const parts = String(nombre).trim().split(/\s+/);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** Primer nombre — seguro ante null/undefined. */
export const getFirstName = (nombre) => {
  if (!nombre) return '';
  return String(nombre).trim().split(/\s+/)[0] || '';
};

/** Convierte "APELLIDOS NOMBRES" → "Apellidos Nombres" respetando partículas frecuentes
 *  en español (de, del, la, las, los, y) que se mantienen en minúscula. */
export const toTitleCase = (input) => {
  if (!input) return '';
  const lowers = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'dos']);
  return String(input)
    .toLocaleLowerCase('es-MX')
    .split(/\s+/)
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && lowers.has(w)) return w;
      // Soporta nombres con guion: "Maria-Jose"
      return w
        .split('-')
        .map((p) => (p ? p.charAt(0).toLocaleUpperCase('es-MX') + p.slice(1) : p))
        .join('-');
    })
    .join(' ');
};

/** Split nombre completo en { apellidos, nombres } siguiendo convención "APE APE NOM". */
export const splitName = (fullName) => {
  if (!fullName) return { apellidos: '', nombres: '' };
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length <= 1) return { apellidos: parts.join(' '), nombres: '' };
  if (parts.length === 2) return { apellidos: parts[0], nombres: parts[1] };
  return { apellidos: parts.slice(0, 2).join(' '), nombres: parts.slice(2).join(' ') };
};

/** Pluraliza una palabra simple según el conteo. */
export const plural = (n, singular, pluralForm) => {
  const word = n === 1 ? singular : (pluralForm ?? `${singular}s`);
  return `${n} ${word}`;
};

/** Tamaño de página por defecto en /empresa. */
export const EMPRESA_PAGE_SIZE = 12;
