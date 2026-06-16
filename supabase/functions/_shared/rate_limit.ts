// _shared/rate_limit.ts — Rate limit por número de empleado.
// Bloquea tras N intentos fallidos en una ventana de tiempo.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 15;

export const supabaseAdmin = () => createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const checkRateLimit = async (numeroEmpleado: string) => {
  const supa = supabaseAdmin();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count, error } = await supa
    .from('empleado_login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('numero_empleado', numeroEmpleado)
    .eq('success', false)
    .gte('attempted_at', since);

  if (error) {
    console.error('[rate-limit] check failed:', error);
    return { blocked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS };
  }

  const failed = count || 0;
  const blocked = failed >= MAX_FAILED_ATTEMPTS;
  return {
    blocked,
    attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - failed),
    retryAfterMinutes: blocked ? LOCKOUT_MINUTES : 0,
  };
};

export const recordAttempt = async (
  numeroEmpleado: string,
  success: boolean,
  req: Request,
) => {
  const supa = supabaseAdmin();
  await supa.from('empleado_login_attempts').insert({
    numero_empleado: numeroEmpleado,
    success,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
    user_agent: req.headers.get('user-agent'),
  });
};
