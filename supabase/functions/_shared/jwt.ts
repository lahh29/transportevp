// _shared/jwt.ts — Firma y verificación de JWT de sesión empleado
// Usa el secreto `EMPLEADO_JWT_SECRET` (configurar como project secret).
// La vida del token es corta (8 h) para minimizar exposición.

import { create, verify, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const SECRET = Deno.env.get('EMPLEADO_JWT_SECRET') ?? '';
if (!SECRET) {
  console.warn('[empleado-jwt] EMPLEADO_JWT_SECRET no está configurado.');
}

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 h

const keyPromise = crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(SECRET || 'dev-only-not-secure'),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify'],
);

export interface EmpleadoClaims {
  sub: string;          // empleado_id
  num: string;          // numero_empleado
  role: 'empleado';
  iat: number;
  exp: number;
}

export const signEmpleadoToken = async (empleadoId: string, numeroEmpleado: string) => {
  const key = await keyPromise;
  const now = Math.floor(Date.now() / 1000);
  return await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      sub: empleadoId,
      num: numeroEmpleado,
      role: 'empleado',
      iat: now,
      exp: getNumericDate(TOKEN_TTL_SECONDS),
    } satisfies EmpleadoClaims,
    key,
  );
};

export const verifyEmpleadoToken = async (token: string): Promise<EmpleadoClaims | null> => {
  try {
    const key = await keyPromise;
    const payload = await verify(token, key);
    if (!payload || typeof payload !== 'object') return null;
    if ((payload as any).role !== 'empleado') return null;
    return payload as unknown as EmpleadoClaims;
  } catch {
    return null;
  }
};

export const extractBearer = (req: Request): string | null => {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
};
