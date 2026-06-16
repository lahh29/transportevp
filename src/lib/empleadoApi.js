/**
 * empleadoApi.js — Wrapper sobre las Edge Functions de empleado.
 * Usa supabase.functions.invoke (SDK ya cargado).
 */
import { supabase } from './supabaseClient';
import { empleadoSession } from './empleadoSession';

const ERROR_MAP = {
  no_encontrado:         'No encontramos ese número',
  credenciales_invalidas:'NIP incorrecto',
  rate_limited:          'Demasiados intentos. Espera unos minutos.',
  locked:                'Cuenta bloqueada temporalmente',
  verificacion_fallida:  'Respuesta incorrecta',
  nip_invalido:          'El NIP debe ser de 4 dígitos',
  nip_debil:             'Elige un NIP menos predecible',
  nip_ya_existe:         'Ya tienes un NIP. Inicia sesión.',
  sin_credenciales:      'No hay biometría registrada para este número',
  challenge_expirado:    'Sesión expirada. Inténtalo de nuevo.',
  challenge_no_encontrado: 'Sesión expirada. Inténtalo de nuevo.',
  credencial_no_encontrada: 'Credencial no válida',
  datos_invalidos:       'Datos incompletos',
  token_invalido:        'Sesión expirada. Inicia sesión otra vez.',
  no_guardado:           'No se pudo guardar',
};

const friendlyApiError = (code, fallback = 'Algo salió mal') =>
  ERROR_MAP[code] || fallback;

const invoke = async (fn, body, withAuth = false) => {
  const options = { body };
  if (withAuth) {
    const token = empleadoSession.getToken();
    if (token) options.headers = { Authorization: `Bearer ${token}` };
  }
  const { data, error } = await supabase.functions.invoke(fn, options);
  if (error) {
    // Supabase suele meter el body de error en `error.context.body`
    let serverCode;
    let retryAfter;
    try {
      const ctx = error.context && (await error.context.json?.());
      serverCode = ctx?.error;
      retryAfter = ctx?.retry_after_minutes;
    } catch { /* ignore */ }
    let msg;
    if (serverCode) {
      msg = friendlyApiError(serverCode);
    } else if (/edge function|failed to send|not found|fetch/i.test(error.message || '')) {
      msg = 'Servicio no disponible. Inténtalo más tarde.';
    } else {
      msg = error.message || 'Error de red';
    }
    const wrapped = new Error(msg);
    wrapped.code = serverCode || 'network_error';
    wrapped.retryAfterMinutes = retryAfter;
    throw wrapped;
  }
  if (data?.error) {
    const wrapped = new Error(friendlyApiError(data.error));
    wrapped.code = data.error;
    wrapped.retryAfterMinutes = data.retry_after_minutes;
    throw wrapped;
  }
  return data;
};

export const empleadoApi = {
  /** Busca un empleado por número. Devuelve { empleado: { id, nombre, turno, foto_url, has_nip, has_webauthn } } */
  find:   (numero_empleado) =>
    invoke('empleado-find', { numero_empleado }),

  /** Login con NIP. Devuelve { token, empleado }. */
  login:  (numero_empleado, nip) =>
    invoke('empleado-login', { numero_empleado, nip }),

  /** Primera vez (sin token): crea NIP con verificación de turno. */
  setNipPrimerLogin: (numero_empleado, turno_respuesta, new_nip) =>
    invoke('empleado-set-nip', { numero_empleado, turno_respuesta, new_nip }, false),

  /** Cambio con token vigente. */
  changeNip: (new_nip) =>
    invoke('empleado-set-nip', { new_nip }, true),

  /* ── WebAuthn ── */
  webauthnRegisterBegin:  () =>
    invoke('webauthn-register-begin', {}, true),

  webauthnRegisterFinish: (response, device_label) =>
    invoke('webauthn-register-finish', { response, device_label }, true),

  webauthnLoginBegin:  (numero_empleado) =>
    invoke('webauthn-login-begin', { numero_empleado }),

  webauthnLoginFinish: (numero_empleado, response) =>
    invoke('webauthn-login-finish', { numero_empleado, response }),
};

export { friendlyApiError };
