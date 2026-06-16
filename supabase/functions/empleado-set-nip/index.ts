// empleado-set-nip — Crea o cambia el NIP de un empleado.
// Modos:
//   A) Primera vez (sin NIP previo): requiere verificación de turno
//      body: { numero_empleado, turno_respuesta, new_nip }
//   B) Cambio (con token): body: { new_nip } + Authorization: Bearer <token>

import { handlePreflight, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/rate_limit.ts';
import { hashNip } from '../_shared/hash.ts';
import { signEmpleadoToken, verifyEmpleadoToken, extractBearer } from '../_shared/jwt.ts';

const WEAK_NIPS = new Set([
  '0000','1111','2222','3333','4444','5555','6666','7777','8888','9999',
  '1234','2345','3456','4567','5678','6789','7890',
  '0987','9876','8765','7654','6543','5432','4321','3210',
]);

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  let body: {
    numero_empleado?: string;
    turno_respuesta?: string;
    new_nip?: string;
  } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const newNip = String(body.new_nip || '').trim();
  if (!/^\d{4}$/.test(newNip)) {
    return json({ error: 'nip_invalido' }, { status: 400 });
  }
  if (WEAK_NIPS.has(newNip)) {
    return json({ error: 'nip_debil' }, { status: 400 });
  }

  const supa = supabaseAdmin();
  const bearer = extractBearer(req);

  let empleadoId: string | null = null;
  let numero: string | null = null;

  if (bearer) {
    /* Modo B: cambio con token */
    const claims = await verifyEmpleadoToken(bearer);
    if (!claims) return json({ error: 'token_invalido' }, { status: 401 });
    empleadoId = claims.sub;
    numero = claims.num;
  } else {
    /* Modo A: primera vez con verificación de turno */
    numero = String(body.numero_empleado || '').trim();
    const turnoResp = String(body.turno_respuesta || '').trim();
    if (!numero || !turnoResp) {
      return json({ error: 'datos_invalidos' }, { status: 400 });
    }

    const { data: emp, error } = await supa
      .from('empleados')
      .select('id, turno, nip_hash, nip')
      .eq('numero_empleado', numero)
      .maybeSingle();

    if (error || !emp) return json({ error: 'no_encontrado' }, { status: 404 });

    // Si ya tiene NIP, NO permitir crear por este flujo
    if (emp.nip_hash || emp.nip) {
      return json({ error: 'nip_ya_existe' }, { status: 409 });
    }

    // Verifica turno
    if (String(emp.turno || '').trim() !== turnoResp) {
      return json({ error: 'verificacion_fallida' }, { status: 401 });
    }

    empleadoId = emp.id;
  }

  const nip_hash = await hashNip(newNip);
  const { error: updErr } = await supa.from('empleados')
    .update({
      nip_hash,
      nip: null,
      nip_failed_attempts: 0,
      nip_locked_until: null,
    })
    .eq('id', empleadoId!);

  if (updErr) return json({ error: 'no_guardado' }, { status: 500 });

  // Devuelve token nuevo para inicio inmediato
  const token = await signEmpleadoToken(empleadoId!, numero!);
  const { data: fresh } = await supa
    .from('empleados')
    .select('id, nombre, turno, foto_url')
    .eq('id', empleadoId!)
    .maybeSingle();

  return json({ token, empleado: fresh });
});
