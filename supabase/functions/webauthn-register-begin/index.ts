// webauthn-register-begin — Genera challenge para registrar credencial biométrica.
// Requiere token de empleado (Bearer). Devuelve `options` para passkeys/Face ID/Touch ID.

import { handlePreflight, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/rate_limit.ts';
import { verifyEmpleadoToken, extractBearer } from '../_shared/jwt.ts';
import { WEBAUTHN_CONFIG } from '../_shared/webauthn_config.ts';
import { generateRegistrationOptions } from 'npm:@simplewebauthn/server@10.0.1';

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  const bearer = extractBearer(req);
  const claims = bearer ? await verifyEmpleadoToken(bearer) : null;
  if (!claims) return json({ error: 'token_invalido' }, { status: 401 });

  const supa = supabaseAdmin();

  // Obtiene empleado + credenciales existentes
  const { data: emp } = await supa
    .from('empleados')
    .select('id, nombre, numero_empleado')
    .eq('id', claims.sub)
    .maybeSingle();
  if (!emp) return json({ error: 'no_encontrado' }, { status: 404 });

  const { data: existing } = await supa
    .from('empleado_webauthn_credentials')
    .select('credential_id, transports')
    .eq('empleado_id', emp.id);

  const excludeCredentials = (existing || []).map((c) => ({
    id: c.credential_id, // base64url string
    type: 'public-key' as const,
    transports: (c.transports || []) as AuthenticatorTransport[],
  }));

  const options = await generateRegistrationOptions({
    rpName: WEBAUTHN_CONFIG.rpName,
    rpID: WEBAUTHN_CONFIG.rpID,
    userID: new TextEncoder().encode(emp.id),
    userName: emp.numero_empleado || emp.id,
    userDisplayName: emp.nombre || 'Empleado',
    attestationType: 'none',
    authenticatorSelection: {
      // Pide passkey "platform" (Face ID / Touch ID / Windows Hello), sin requerirlo
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
    excludeCredentials,
    supportedAlgorithmIDs: [-7, -257], // ES256 + RS256
  });

  // Persistimos el challenge para validarlo en register-finish
  await supa.from('empleado_webauthn_challenges').insert({
    empleado_id: emp.id,
    kind: 'register',
    challenge: options.challenge, // ya viene base64url
  });

  return json({ options });
});
