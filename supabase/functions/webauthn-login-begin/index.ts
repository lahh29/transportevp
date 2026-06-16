// webauthn-login-begin — Genera challenge para autenticación biométrica.
// No requiere token (usuario aún no logeado), pero rate-limita por numero_empleado.

import { handlePreflight, json } from '../_shared/cors.ts';
import { supabaseAdmin, checkRateLimit } from '../_shared/rate_limit.ts';
import { WEBAUTHN_CONFIG } from '../_shared/webauthn_config.ts';
import { generateAuthenticationOptions } from 'npm:@simplewebauthn/server@10.0.1';

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  let body: { numero_empleado?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const numero = String(body.numero_empleado || '').trim();
  if (!numero) return json({ error: 'numero_requerido' }, { status: 400 });

  const limit = await checkRateLimit(numero);
  if (limit.blocked) {
    return json({ error: 'rate_limited', retry_after_minutes: limit.retryAfterMinutes }, { status: 429 });
  }

  const supa = supabaseAdmin();
  const { data: emp } = await supa
    .from('empleados')
    .select('id')
    .eq('numero_empleado', numero)
    .maybeSingle();
  if (!emp) return json({ error: 'no_encontrado' }, { status: 404 });

  const { data: creds } = await supa
    .from('empleado_webauthn_credentials')
    .select('credential_id, transports')
    .eq('empleado_id', emp.id);

  if (!creds || creds.length === 0) {
    return json({ error: 'sin_credenciales' }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: WEBAUTHN_CONFIG.rpID,
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      type: 'public-key' as const,
      transports: (c.transports || []) as AuthenticatorTransport[],
    })),
    userVerification: 'preferred',
  });

  await supa.from('empleado_webauthn_challenges').insert({
    empleado_id: emp.id,
    numero_empleado: numero,
    kind: 'authenticate',
    challenge: options.challenge,
  });

  return json({ options });
});
