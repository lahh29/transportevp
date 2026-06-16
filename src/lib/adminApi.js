/**
 * adminApi.js — Wrapper sobre Edge Functions de administrador.
 * Usa el JWT activo de Supabase Auth (admin) en el header automáticamente.
 */
import { supabase } from './supabaseClient';

const invoke = async (fn, body) => {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message || 'Error de red');
  if (data?.error) throw new Error(data.error);
  return data;
};

export const adminApi = {
  /** Limpia NIP del empleado para que cree uno nuevo en el próximo login. */
  resetNip: (empleadoId) =>
    invoke('empleado-admin-reset', { empleado_id: empleadoId, reset_nip: true }),

  /** Borra credenciales WebAuthn del empleado. */
  resetWebauthn: (empleadoId) =>
    invoke('empleado-admin-reset', { empleado_id: empleadoId, reset_webauthn: true }),

  /** Ambos a la vez. */
  resetAll: (empleadoId) =>
    invoke('empleado-admin-reset', {
      empleado_id: empleadoId, reset_nip: true, reset_webauthn: true,
    }),
};
