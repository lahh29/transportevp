// empleado-login — Valida NIP, aplica rate-limit, devuelve JWT de sesión.
// - Verifica bcrypt hash (con migración transparente desde NIP plano legacy)
// - Bloquea tras 5 fallos en 15 min
// - Devuelve token de 8 h + datos mínimos del empleado

import { handlePreflight, json } from '../_shared/cors.ts';
import { supabaseAdmin, checkRateLimit, recordAttempt } from '../_shared/rate_limit.ts';
import { hashNip, verifyNip } from '../_shared/hash.ts';
import { signEmpleadoToken } from '../_shared/jwt.ts';

const LOCKOUT_MINUTES = 15;
const MAX_FAILS_BEFORE_LOCK = 5;

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  let body: { numero_empleado?: string; nip?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const numero = String(body.numero_empleado || '').trim();
  const nip    = String(body.nip || '').trim();
  if (!numero || !/^\d{4,}$/.test(nip)) {
    return json({ error: 'datos_invalidos' }, { status: 400 });
  }

  // Rate-limit
  const limit = await checkRateLimit(numero);
  if (limit.blocked) {
    return json({
      error: 'rate_limited',
      retry_after_minutes: limit.retryAfterMinutes,
    }, { status: 429 });
  }

  const supa = supabaseAdmin();
  const { data: emp, error } = await supa
    .from('empleados')
    .select('id, nombre, turno, foto_url, nip, nip_hash, nip_failed_attempts, nip_locked_until')
    .eq('numero_empleado', numero)
    .maybeSingle();

  if (error || !emp) {
    await recordAttempt(numero, false, req);
    return json({ error: 'credenciales_invalidas' }, { status: 401 });
  }

  // Lockout vigente
  if (emp.nip_locked_until && new Date(emp.nip_locked_until) > new Date()) {
    return json({
      error: 'locked',
      retry_after_minutes: Math.ceil((new Date(emp.nip_locked_until).getTime() - Date.now()) / 60_000),
    }, { status: 423 });
  }

  // Verifica NIP: primero hash, después fallback a legacy plano (con auto-upgrade)
  let valid = false;
  if (emp.nip_hash) {
    valid = await verifyNip(nip, emp.nip_hash);
  } else if (emp.nip && emp.nip === nip) {
    valid = true;
    // Migración transparente: hashea y borra el plano
    const newHash = await hashNip(nip);
    await supa.from('empleados').update({ nip_hash: newHash, nip: null }).eq('id', emp.id);
  }

  if (!valid) {
    await recordAttempt(numero, false, req);
    const fails = (emp.nip_failed_attempts || 0) + 1;
    const updates: Record<string, unknown> = { nip_failed_attempts: fails };
    if (fails >= MAX_FAILS_BEFORE_LOCK) {
      updates.nip_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
      updates.nip_failed_attempts = 0;
    }
    await supa.from('empleados').update(updates).eq('id', emp.id);
    return json({
      error: 'credenciales_invalidas',
      attempts_remaining: Math.max(0, MAX_FAILS_BEFORE_LOCK - fails),
    }, { status: 401 });
  }

  // Éxito: reset contadores + emite token
  await supa.from('empleados').update({
    nip_failed_attempts: 0,
    nip_locked_until: null,
  }).eq('id', emp.id);
  await recordAttempt(numero, true, req);

  const token = await signEmpleadoToken(emp.id, numero);

  return json({
    token,
    empleado: {
      id: emp.id,
      nombre: emp.nombre,
      turno: emp.turno,
      foto_url: emp.foto_url,
    },
  });
});
