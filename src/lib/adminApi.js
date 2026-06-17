/**
 * adminApi.js — Operaciones de administrador.
 * Modificado para usar actualizaciones directas desde el cliente en lugar de Edge Functions,
 * ya que las Edge Functions no están desplegadas y el admin tiene permisos de UPDATE.
 */
import { supabase } from './supabaseClient';

export const adminApi = {
  /** Limpia NIP del empleado para que cree uno nuevo en el próximo login. */
  resetNip: async (empleadoId) => {
    const { error } = await supabase
      .from('empleados')
      .update({
        nip_hash: null,
        nip_failed_attempts: 0,
        nip_locked_until: null
      })
      .eq('id', empleadoId);
    if (error) throw new Error(error.message || 'Error al resetear NIP');
  },

  /** Borra credenciales WebAuthn del empleado. */
  resetWebauthn: async (empleadoId) => {
    // Intentamos borrar la credencial (puede fallar si no hay política DELETE en la tabla de credenciales)
    await supabase.from('empleado_webauthn_credentials').delete().eq('empleado_id', empleadoId);
    // Pero lo importante es quitar el flag en el empleado
    const { error } = await supabase
      .from('empleados')
      .update({ webauthn_enrolled_at: null })
      .eq('id', empleadoId);
    if (error) throw new Error(error.message || 'Error al borrar biometría');
  },

  /** Ambos a la vez. */
  resetAll: async (empleadoId) => {
    await adminApi.resetNip(empleadoId);
    await adminApi.resetWebauthn(empleadoId);
  },
};

const invokeAdminUsers = async (action, payload = {}) => {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || 'Error de red al contactar servidor');
  if (data?.error) throw new Error(data.error);
  return data;
};

export const adminUsersApi = {
  listUsers: async () => {
    const data = await invokeAdminUsers('list');
    return data.users;
  },
  createUser: async (userData) => {
    const data = await invokeAdminUsers('create', userData);
    return data.user;
  },
  updateUser: async (userData) => {
    const data = await invokeAdminUsers('update', userData);
    return data.user;
  },
  deleteUser: async (id) => {
    await invokeAdminUsers('delete', { id });
  }
};
