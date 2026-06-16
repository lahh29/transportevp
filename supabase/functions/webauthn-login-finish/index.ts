// webauthn-login-finish — Verifica firma biométrica y emite JWT.

import { handlePreflight, json } from '../_shared/cors.ts';
import { supabaseAdmin, recordAttempt } from '../_shared/rate_limit.ts';
import { signEmpleadoToken } from '../_shared/jwt.ts';
import { WEBAUTHN_CONFIG } from '../_shared/webauthn_config.ts';
import { verifyAuthenticationResponse } from 'npm:@simplewebauthn/server@10.0.1';
import type { AuthenticationResponseJSON } from 'npm:@simplewebauthn/server@10.0.1/script/deps/index.d.ts';

const b64UrlToBytes = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  let body: { numero_empleado?: string; response?: AuthenticationResponseJSON } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const numero = String(body.numero_empleado || '').trim();
  if (!numero || !body.response) return json({ error: 'datos_invalidos' }, { status: 400 });

  const supa = supabaseAdmin();

  const { data: emp } = await supa
    .from('empleados')
    .select('id, nombre, turno, foto_url')
    .eq('numero_empleado', numero)
    .maybeSingle();
  if (!emp) {
    await recordAttempt(numero, false, req);
    return json({ error: 'no_encontrado' }, { status: 404 });
  }

  // Challenge más reciente
  const { data: ch } = await supa
    .from('empleado_webauthn_challenges')
    .select('id, challenge, created_at')
    .eq('empleado_id', emp.id)
    .eq('kind', 'authenticate')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ch) return json({ error: 'challenge_no_encontrado' }, { status: 400 });

  const ageSec = (Date.now() - new Date(ch.created_at).getTime()) / 1000;
  if (ageSec > WEBAUTHN_CONFIG.challengeTTLSeconds) {
    return json({ error: 'challenge_expirado' }, { status: 400 });
  }

  const credentialId = body.response.id; // base64url
  const { data: cred } = await supa
    .from('empleado_webauthn_credentials')
    .select('id, credential_id, public_key, counter, transports')
    .eq('empleado_id', emp.id)
    .eq('credential_id', credentialId)
    .maybeSingle();
  if (!cred) {
    await recordAttempt(numero, false, req);
    return json({ error: 'credencial_no_encontrada' }, { status: 404 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: ch.challenge,
      expectedOrigin: WEBAUTHN_CONFIG.origins,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      credential: {
        id: cred.credential_id,
        publicKey: b64UrlToBytes(cred.public_key),
        counter: Number(cred.counter || 0),
        transports: (cred.transports || []) as AuthenticatorTransport[],
      },
      requireUserVerification: false,
    });
  } catch (e) {
    console.error('[webauthn-login-finish] verify error:', e);
    await recordAttempt(numero, false, req);
    return json({ error: 'verificacion_fallida' }, { status: 400 });
  }

  if (!verification.verified) {
    await recordAttempt(numero, false, req);
    return json({ error: 'verificacion_fallida' }, { status: 401 });
  }

  // Actualiza counter (anti-replay) y last_used
  await supa.from('empleado_webauthn_credentials').update({
    counter: verification.authenticationInfo.newCounter,
    last_used_at: new Date().toISOString(),
  }).eq('id', cred.id);

  // Limpia challenges
  await supa.from('empleado_webauthn_challenges')
    .delete()
    .eq('empleado_id', emp.id)
    .eq('kind', 'authenticate');

  await recordAttempt(numero, true, req);
  const token = await signEmpleadoToken(emp.id, numero);

  return json({
    token,
    empleado: { id: emp.id, nombre: emp.nombre, turno: emp.turno, foto_url: emp.foto_url },
  });
});
