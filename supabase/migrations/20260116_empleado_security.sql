-- ============================================================
-- ViñoPlastic — Migración de seguridad para el portal Empleado
-- ============================================================
-- Aplicar en orden. Idempotente (puedes correrla varias veces).
--
-- Cambios:
--  1. empleados: nip_hash + lockout + tolerar legacy 'nip' plano
--  2. empleado_login_attempts: rate-limit por número de empleado
--  3. empleado_webauthn_credentials: credenciales biométricas
-- ============================================================

-- 1. Endurecer tabla `empleados`
ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS nip_hash               text,
  ADD COLUMN IF NOT EXISTS nip_failed_attempts    int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nip_locked_until       timestamptz,
  ADD COLUMN IF NOT EXISTS webauthn_enrolled_at   timestamptz;

-- (Opcional / recomendado tras migrar a hashes)
-- ALTER TABLE public.empleados DROP COLUMN IF EXISTS nip;

-- 2. Tabla de intentos para rate-limit
CREATE TABLE IF NOT EXISTS public.empleado_login_attempts (
  id              bigserial PRIMARY KEY,
  numero_empleado text        NOT NULL,
  success         boolean     NOT NULL DEFAULT false,
  ip              text,
  user_agent      text,
  attempted_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_numero_time
  ON public.empleado_login_attempts (numero_empleado, attempted_at DESC);

-- Limpieza automática de intentos > 30 días (correr periódicamente o vía pg_cron)
-- DELETE FROM public.empleado_login_attempts WHERE attempted_at < now() - interval '30 days';

-- 3. WebAuthn credentials
CREATE TABLE IF NOT EXISTS public.empleado_webauthn_credentials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id     uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  credential_id   text NOT NULL UNIQUE,        -- base64url
  public_key      text NOT NULL,               -- base64url COSE key
  counter         bigint NOT NULL DEFAULT 0,
  transports      text[] DEFAULT '{}',
  device_label    text,                        -- "iPhone de Juan"
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webauthn_empleado
  ON public.empleado_webauthn_credentials (empleado_id);

-- Tabla temporal para challenges WebAuthn (validez 5 min)
CREATE TABLE IF NOT EXISTS public.empleado_webauthn_challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id     uuid REFERENCES public.empleados(id) ON DELETE CASCADE,
  numero_empleado text,
  kind            text NOT NULL CHECK (kind IN ('register', 'authenticate')),
  challenge       text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_lookup
  ON public.empleado_webauthn_challenges (empleado_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_numero
  ON public.empleado_webauthn_challenges (numero_empleado, kind, created_at DESC);

-- ============================================================
-- RLS — Bloquear acceso anónimo a campos sensibles
-- ============================================================
-- Para mayor seguridad, las Edge Functions usan SERVICE_ROLE_KEY y
-- omiten RLS. Esto endurece el cliente anónimo:

ALTER TABLE public.empleados                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleado_login_attempts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleado_webauthn_credentials   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleado_webauthn_challenges    ENABLE ROW LEVEL SECURITY;

-- Política: el cliente anónimo NO ve nada de empleados (todo va por Edge Functions)
-- Si ya tienes una política previa en empleados que el QrPrintPage / admin usa,
-- consérvala. Esta migración no añade DROP POLICY para no romper nada existente.
-- Recomendado: revisar manualmente las políticas existentes después de correr esto.

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
