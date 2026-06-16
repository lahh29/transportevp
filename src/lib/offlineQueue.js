/**
 * offlineQueue.js — Cola de inserts para registros cuando no hay red
 * ------------------------------------------------------------------
 * Cuando el chofer pierde conexión, los registros generados por
 * escaneos QR se guardan localmente y se reenvían automáticamente
 * cuando vuelve la conectividad (evento 'online' + visibilitychange).
 *
 * Mantiene la cola acotada a MAX_ITEMS para no llenar storage.
 */
import { safeStorage, STORAGE_KEYS } from './safeStorage';
import { supabase } from './supabaseClient';

const MAX_ITEMS = 500;

const read = () => safeStorage.get(STORAGE_KEYS.offlineQueue, []);
const write = (arr) => safeStorage.set(STORAGE_KEYS.offlineQueue, arr.slice(-MAX_ITEMS));

export const offlineQueue = {
  /** Encola un registro para reintento. */
  enqueue(record) {
    const q = read();
    q.push({ ...record, _queuedAt: Date.now() });
    write(q);
  },

  size() {
    return read().length;
  },

  /**
   * Intenta vaciar la cola contra Supabase. Devuelve { ok, failed }.
   * No lanza: cualquier fallo deja el item en la cola para reintentar.
   */
  async flush() {
    const q = read();
    if (q.length === 0) return { ok: 0, failed: 0 };

    let ok = 0;
    const remaining = [];

    for (const item of q) {
      const { _queuedAt, ...record } = item;
      try {
        const { error } = await supabase.from('registros').insert(record);
        if (error) {
          remaining.push(item);
        } else {
          ok += 1;
        }
      } catch {
        remaining.push(item);
      }
    }

    write(remaining);
    return { ok, failed: remaining.length };
  },

  clear() {
    safeStorage.remove(STORAGE_KEYS.offlineQueue);
  },
};

/**
 * Conecta listeners globales para que la cola se vacíe sola.
 * Devuelve una función para desconectar (cleanup en useEffect).
 */
export const wireOfflineFlush = (onFlush) => {
  const tryFlush = async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const res = await offlineQueue.flush();
    if (res.ok > 0 && typeof onFlush === 'function') onFlush(res);
  };

  const onOnline = () => { tryFlush(); };
  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') tryFlush();
  };

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  // Primer intento al montar (puede haber items de sesiones previas)
  tryFlush();

  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
  };
};
