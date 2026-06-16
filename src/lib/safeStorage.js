/**
 * safeStorage.js — Wrapper resiliente sobre localStorage
 * --------------------------------------------------------
 * Safari iOS en modo privado lanza QuotaExceededError al primer
 * setItem; otros navegadores pueden tener localStorage deshabilitado.
 * Esta utilidad garantiza que la app NUNCA crashee por storage.
 *
 * Si localStorage no está disponible, cae a un Map en memoria que
 * vive solo durante la sesión actual de la pestaña.
 */

const memoryStore = new Map();

const hasLocalStorage = (() => {
  try {
    const k = '__vp_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
})();

export const safeStorage = {
  available: hasLocalStorage,

  get(key, fallback = null) {
    try {
      const raw = hasLocalStorage
        ? window.localStorage.getItem(key)
        : memoryStore.get(key) ?? null;
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch {
      return false;
    }
    try {
      if (hasLocalStorage) {
        window.localStorage.setItem(key, serialized);
      } else {
        memoryStore.set(key, serialized);
      }
      return true;
    } catch {
      // Cuota llena o iOS private — guardamos en memoria como respaldo
      memoryStore.set(key, serialized);
      return false;
    }
  },

  remove(key) {
    try {
      if (hasLocalStorage) window.localStorage.removeItem(key);
      memoryStore.delete(key);
      return true;
    } catch {
      return false;
    }
  },

  /** Útil para limpiar todo lo de la app sin tocar otras claves. */
  removeWithPrefix(prefix) {
    if (!hasLocalStorage) {
      [...memoryStore.keys()]
        .filter((k) => k.startsWith(prefix))
        .forEach((k) => memoryStore.delete(k));
      return;
    }
    try {
      const toRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  },
};

/* ── Claves de storage (todas en un solo lugar) ─────────────────── */
export const STORAGE_KEYS = {
  rutasActivas: 'vp:rutas_activas_local',
  qrHistory:    'vp:qr_local_history',
  offlineQueue: 'vp:offline_queue',
  empleadoId:   'vp:empleado_id',
  empleadoToken:'vp:empleado_token',
  webauthnHints:'vp:webauthn_hints', // mapa numero_empleado → bool (sólo UI hint)
};
