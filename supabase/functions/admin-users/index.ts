// admin-users — Gestiona usuarios de Supabase Auth (crear, editar, eliminar, listar)
// Acceso: requiere JWT de Supabase Auth con role=admin en user_metadata.
//
// Usa método POST siempre para evitar problemas con las políticas CORS actuales.
//
// body: { action: 'list' | 'create' | 'update' | 'delete', ...payload }

import { handlePreflight, json } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { supabaseAdmin } from '../_shared/rate_limit.ts';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const requireAdmin = async (req: Request) => {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw new Error('Cabecera Authorization no encontrada o no es Bearer');
  
  const token = auth.slice(7);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  
  const { data, error } = await userClient.auth.getUser(token);
  if (error) throw new Error(`Error auth.getUser: ${error.message}`);
  if (!data?.user) throw new Error('No se encontró el usuario en token');
  
  const role = data.user.user_metadata?.role || data.user.app_metadata?.role;
  if (role !== 'admin') throw new Error(`El rol del usuario no es admin, es: ${role}`);
  
  return data.user;
};

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' });

  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err: any) {
    return json({ error: err.message });
  }

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }); }

  const supaAdmin = supabaseAdmin();
  const action = body.action;

  try {
    if (action === 'list') {
      const { data, error } = await supaAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      // Filtramos la información para devolver lo esencial
      const users = data.users.map(u => ({
        id: u.id,
        email: u.email,
        nombre: u.user_metadata?.nombre || '',
        role: u.user_metadata?.role || 'usuario',
        created_at: u.created_at,
      }));
      return json({ users });
    }

    if (action === 'create') {
      const { email, password, nombre, role } = body;
      if (!email || !password || !nombre) throw new Error("Email, contraseña y nombre son requeridos");
      
      const { data, error } = await supaAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre, role: role || 'chofer' }
      });
      if (error) throw error;
      return json({ user: data.user });
    }

    if (action === 'update') {
      const { id, email, password, nombre, role } = body;
      if (!id) throw new Error("ID de usuario requerido");
      
      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      
      if (nombre !== undefined || role !== undefined) {
         // Obtener metadata actual para no sobreescribir otros datos si los hubiera
         const { data: userRecord, error: fetchErr } = await supaAdmin.auth.admin.getUserById(id);
         if (fetchErr) throw fetchErr;
         const currentMeta = userRecord.user?.user_metadata || {};
         updateData.user_metadata = { 
            ...currentMeta, 
            ...(nombre !== undefined && { nombre }), 
            ...(role !== undefined && { role }) 
         };
      }

      const { data, error } = await supaAdmin.auth.admin.updateUserById(id, updateData);
      if (error) throw error;
      return json({ user: data.user });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) throw new Error("ID de usuario requerido");
      // Evitar que el admin se borre a sí mismo
      if (id === admin.id) throw new Error("No puedes eliminar tu propia cuenta");
      
      const { error } = await supaAdmin.auth.admin.deleteUser(id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: 'accion_desconocida' });

  } catch (err: any) {
    console.error('[admin-users] Error:', err);
    return json({ error: err.message });
  }
});
