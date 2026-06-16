// empleado-find — Busca empleado por número, devuelve datos mínimos.
// NUNCA devuelve nip_hash. Sólo: id, nombre, turno, foto_url, has_nip, has_webauthn.
// Rate-limited para prevenir enumeración.

import { handlePreflight, json } from '../_shared/cors.ts';
import { supabaseAdmin, checkRateLimit, recordAttempt } from '../_shared/rate_limit.ts';

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  let body: { numero_empleado?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const numero = String(body.numero_empleado || '').trim();
  if (!numero) return json({ error: 'numero_requerido' }, { status: 400 });

  // Rate-limit: cuenta intentos fallidos previos (no agresivo en este endpoint)
  const limit = await checkRateLimit(numero);
  if (limit.blocked) {
    return json({
      error: 'rate_limited',
      retry_after_minutes: limit.retryAfterMinutes,
    }, { status: 429 });
  }

  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from('empleados')
    .select('id, nombre, turno, foto_url, nip_hash, nip, nip_locked_until')
    .eq('numero_empleado', numero)
    .maybeSingle();

  if (error || !data) {
    await recordAttempt(numero, false, req);
    return json({ error: 'no_encontrado' }, { status: 404 });
  }

  // Lockout activo
  if (data.nip_locked_until && new Date(data.nip_locked_until) > new Date()) {
    return json({
      error: 'locked',
      retry_after_minutes: Math.ceil((new Date(data.nip_locked_until).getTime() - Date.now()) / 60_000),
    }, { status: 423 });
  }

  // ¿Tiene WebAuthn enrolado?
  const { count: webauthnCount } = await supa
    .from('empleado_webauthn_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('empleado_id', data.id);

  const has_nip = Boolean(data.nip_hash || data.nip); // soporta legacy plaintext
  const has_webauthn = (webauthnCount || 0) > 0;

  return json({
    empleado: {
      id: data.id,
      nombre: data.nombre,
      turno: data.turno,
      foto_url: data.foto_url,
      has_nip,
      has_webauthn,
    },
  });
});
