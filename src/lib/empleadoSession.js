/**
 * empleadoSession.js — Gestión del JWT del empleado en cliente.
 * Usa safeStorage (resiliente a iOS modo privado).
 */
import { safeStorage, STORAGE_KEYS } from './safeStorage';

const TOKEN_KEY = STORAGE_KEYS.empleadoToken;
const ID_KEY    = STORAGE_KEYS.empleadoId;

/** Decodifica payload de un JWT (sin verificar — solo para leer exp/sub). */
const decode = (token) => {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(
      [...json].map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    ));
  } catch {
    return null;
  }
};

export const empleadoSession = {
  setToken(token, empleado) {
    safeStorage.set(TOKEN_KEY, token);
    if (empleado?.id) safeStorage.set(ID_KEY, empleado.id);
  },

  getToken() {
    const token = safeStorage.get(TOKEN_KEY, null);
    if (!token) return null;
    const payload = decode(token);
    if (!payload || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) {
      this.clear();
      return null;
    }
    return token;
  },

  getEmpleadoId() {
    const token = this.getToken();
    if (!token) return null;
    const payload = decode(token);
    return payload?.sub || safeStorage.get(ID_KEY, null);
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  clear() {
    safeStorage.remove(TOKEN_KEY);
    safeStorage.remove(ID_KEY);
  },
};

/** WebAuthn UI hints (recuerda si un número tiene biometría enrolada para mostrar botón). */
export const webauthnHints = {
  set(numero, value = true) {
    const map = safeStorage.get(STORAGE_KEYS.webauthnHints, {});
    map[numero] = value;
    safeStorage.set(STORAGE_KEYS.webauthnHints, map);
  },
  has(numero) {
    const map = safeStorage.get(STORAGE_KEYS.webauthnHints, {});
    return Boolean(map[numero]);
  },
  clear(numero) {
    const map = safeStorage.get(STORAGE_KEYS.webauthnHints, {});
    delete map[numero];
    safeStorage.set(STORAGE_KEYS.webauthnHints, map);
  },
};
