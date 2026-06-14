/**
 * MAPA_TURNOS — Tabla de equivalencias entre la "clave de turno"
 * almacenada en Supabase y el turno real que el empleado tiene.
 *
 * Las claves 6, 7, 13, 16, 26, 30, 31, 35, 36 son códigos internos
 * de Recursos Humanos que en realidad corresponden a los turnos 1-4.
 */
export const MAPA_TURNOS = {
  '1': '1', '2': '2', '3': '3', '4': '4',
  '6': '2', '7': '2', '13': '2', '16': '3',
  '26': '1', '30': '2', '31': '2', '35': '1', '36': '2',
};

/** Lista canónica de turnos reales que ve el usuario final. */
export const TURNOS_REALES = ['1', '2', '3', '4'];

/**
 * Normaliza la clave de turno cruda al turno real (1/2/3/4).
 * Si la clave no está mapeada, devuelve el valor original (string)
 * o '—' si está vacío/null.
 */
export const normalizeTurno = (raw) => {
  if (raw === null || raw === undefined) return '—';
  const key = String(raw).trim();
  if (!key) return '—';
  return MAPA_TURNOS[key] || key;
};
