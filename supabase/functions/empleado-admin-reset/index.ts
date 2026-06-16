// empleado-admin-reset — Limpia NIP y/o biometría de un empleado.
// Acceso: requiere JWT de Supabase Auth con role=admin en user_metadata.
//
// body: { empleado_id, reset_nip?: bool, reset_webauthn?: bool }

import { handlePreflight, json } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { supabaseAdmin } from '../_shared/rate_limit.ts';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const requireAdmin = async (req: Request) => {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  // Validamos con el cliente anónimo (Supabase Auth GoTrue)
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;
  const role = data.user.user_metadata?.role || data.user.app_metadata?.role;
  if (role !== 'admin') return null;
  return data.user;
};

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  const admin = await requireAdmin(req);
  if (!admin) return json({ error: 'no_autorizado' }, { status: 401 });

  let body: { empleado_id?: string; reset_nip?: boolean; reset_webauthn?: boolean } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const empleadoId = String(body.empleado_id || '').trim();
  if (!empleadoId) return json({ error: 'datos_invalidos' }, { status: 400 });

  const supa = supabaseAdmin();
  const updates: Record<string, unknown> = {};
  if (body.reset_nip) {
    updates.nip = null;
    updates.nip_hash = null;
    updates.nip_failed_attempts = 0;
    updates.nip_locked_until = null;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supa.from('empleados').update(updates).eq('id', empleadoId);
    if (error) return json({ error: 'no_guardado' }, { status: 500 });
  }

  if (body.reset_webauthn) {
    await supa.from('empleado_webauthn_credentials').delete().eq('empleado_id', empleadoId);
    await supa.from('empleados').update({ webauthn_enrolled_at: null }).eq('id', empleadoId);
  }

  return json({ ok: true });
});
