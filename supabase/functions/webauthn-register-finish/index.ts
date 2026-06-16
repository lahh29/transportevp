// webauthn-register-finish — Verifica respuesta del navegador y guarda credencial.

import { handlePreflight, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/rate_limit.ts';
import { verifyEmpleadoToken, extractBearer } from '../_shared/jwt.ts';
import { WEBAUTHN_CONFIG } from '../_shared/webauthn_config.ts';
import { verifyRegistrationResponse } from 'npm:@simplewebauthn/server@10.0.1';
import type { RegistrationResponseJSON } from 'npm:@simplewebauthn/server@10.0.1/script/deps/index.d.ts';

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  const bearer = extractBearer(req);
  const claims = bearer ? await verifyEmpleadoToken(bearer) : null;
  if (!claims) return json({ error: 'token_invalido' }, { status: 401 });

  let body: { response?: RegistrationResponseJSON; device_label?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (!body.response) return json({ error: 'datos_invalidos' }, { status: 400 });

  const supa = supabaseAdmin();

  // Recupera el challenge más reciente
  const { data: ch } = await supa
    .from('empleado_webauthn_challenges')
    .select('id, challenge, created_at')
    .eq('empleado_id', claims.sub)
    .eq('kind', 'register')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ch) return json({ error: 'challenge_no_encontrado' }, { status: 400 });
  const ageSec = (Date.now() - new Date(ch.created_at).getTime()) / 1000;
  if (ageSec > WEBAUTHN_CONFIG.challengeTTLSeconds) {
    return json({ error: 'challenge_expirado' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: ch.challenge,
      expectedOrigin: WEBAUTHN_CONFIG.origins,
      expectedRPID: WEBAUTHN_CONFIG.rpID,
      requireUserVerification: false,
    });
  } catch (e) {
    console.error('[webauthn-register-finish] verify error:', e);
    return json({ error: 'verificacion_fallida' }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return json({ error: 'verificacion_fallida' }, { status: 400 });
  }

  const info = verification.registrationInfo;
  // Convertir Uint8Array → base64url para storage
  const toB64Url = (bytes: Uint8Array) => {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const credentialId = toB64Url(info.credential.id);
  const publicKey = toB64Url(info.credential.publicKey);
  const counter = info.credential.counter;
  const transports = body.response.response.transports || [];

  // Upsert para evitar duplicados si el usuario reintenta
  const { error: insErr } = await supa
    .from('empleado_webauthn_credentials')
    .upsert({
      empleado_id: claims.sub,
      credential_id: credentialId,
      public_key: publicKey,
      counter,
      transports,
      device_label: body.device_label || null,
    }, { onConflict: 'credential_id' });

  if (insErr) {
    console.error('[webauthn-register-finish] insert error:', insErr);
    return json({ error: 'no_guardado' }, { status: 500 });
  }

  await supa.from('empleados')
    .update({ webauthn_enrolled_at: new Date().toISOString() })
    .eq('id', claims.sub);

  // Limpia challenges viejos
  await supa.from('empleado_webauthn_challenges')
    .delete()
    .eq('empleado_id', claims.sub)
    .eq('kind', 'register');

  return json({ ok: true, credential_id: credentialId });
});
