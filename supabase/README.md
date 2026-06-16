# 🔐 Supabase backend — Empleado security & WebAuthn

Backend para el portal de empleado con:
- NIP hasheado con **bcrypt** (server-side)
- **Rate-limit + lockout** por número de empleado
- **JWT firmado** de sesión (8 h)
- **WebAuthn** (Face ID / Touch ID / Windows Hello)
- Edge Functions reemplazan los queries directos del cliente

---

## 📋 Checklist de despliegue (orden importa)

### 1️⃣ Aplicar migración SQL

**Opción A — Dashboard de Supabase (más fácil):**
1. Ve a tu proyecto → **SQL Editor** → **New query**
2. Copia y pega el contenido de `supabase/migrations/20260116_empleado_security.sql`
3. **Run**.

**Opción B — Supabase CLI:**
```bash
supabase db push
# o aplica manualmente:
psql "<connection-string>" -f supabase/migrations/20260116_empleado_security.sql
```

> La migración es **idempotente** (`IF NOT EXISTS`). Puedes correrla varias veces sin romper nada.

### 2️⃣ Configurar variables de entorno (Project secrets)

En Supabase Dashboard → **Project Settings → Edge Functions → Secrets**, añade:

| Variable | Valor de ejemplo | Notas |
|---|---|---|
| `EMPLEADO_JWT_SECRET` | `super-secreto-largo-random-aqui-mínimo-32-chars` | **Genéralo con** `openssl rand -base64 48`. ¡Confidencial! |
| `WEBAUTHN_RP_ID` | `vinoplastic.com` (prod) · `localhost` (dev) | Dominio sin protocolo ni puerto |
| `WEBAUTHN_RP_NAME` | `ViñoPlastic` | Nombre que muestra el navegador |
| `WEBAUTHN_ORIGIN` | `https://vinoplastic.com,http://localhost:5173` | Coma-separado si necesitas varios orígenes (dev + prod) |

> `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles automáticamente en las Edge Functions.

### 3️⃣ Desplegar las 8 Edge Functions

```bash
# Asegúrate de estar logueado y linkeado al proyecto:
supabase login
supabase link --project-ref <tu-project-ref>

# Despliega todo (una vez):
supabase functions deploy empleado-find         --no-verify-jwt
supabase functions deploy empleado-login        --no-verify-jwt
supabase functions deploy empleado-set-nip      --no-verify-jwt
supabase functions deploy empleado-admin-reset
supabase functions deploy webauthn-register-begin   --no-verify-jwt
supabase functions deploy webauthn-register-finish  --no-verify-jwt
supabase functions deploy webauthn-login-begin      --no-verify-jwt
supabase functions deploy webauthn-login-finish     --no-verify-jwt
```

> `--no-verify-jwt` es **obligatorio** para las funciones de empleado/webauthn (validan nuestro JWT propio).
> Para `empleado-admin-reset` **NO uses** `--no-verify-jwt`: requiere el JWT de Supabase Auth con `role=admin` en `user_metadata`.

### 4️⃣ Verificar

```bash
# Test rápido del endpoint find:
curl -X POST "https://<project-ref>.supabase.co/functions/v1/empleado-find" \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{"numero_empleado":"10234"}'
```

Esperado: `{"empleado":{"id":"...","nombre":"...","has_nip":true,"has_webauthn":false}}`.

---

## 🧪 Local dev (sin desplegar)

Si quieres desarrollar localmente las funciones:

```bash
# Crea un archivo .env.local en /app/supabase/functions/
cp supabase/functions/.env.example supabase/functions/.env.local
# Edítalo con tus valores

# Levanta el runtime local:
supabase functions serve --env-file supabase/functions/.env.local
```

El cliente llamará a `http://localhost:54321/functions/v1/<nombre>` automáticamente.

---

## 🔄 Migración de NIPs existentes

Los empleados que ya tenían NIP en texto plano (columna `nip`) **siguen funcionando**: en su próximo login con NIP, la Edge Function detecta el plano, lo hashea automáticamente y lo borra. No hay acción manual requerida.

Después de unas semanas, cuando la mayoría haya migrado, puedes ejecutar:

```sql
-- Limpiar NIPs planos que ya tienen hash equivalente (sanity check)
UPDATE public.empleados SET nip = NULL WHERE nip_hash IS NOT NULL;

-- (Opcional) Eliminar la columna por completo:
ALTER TABLE public.empleados DROP COLUMN nip;
```

---

## 🔒 Hardening recomendado (post-deploy)

1. **Políticas RLS** sobre `empleados`: bloquear `SELECT` directo desde el cliente anónimo (todo el portal pasa por Edge Functions). Tu admin/dashboard usa SERVICE_ROLE_KEY y no se ve afectado.
2. **pg_cron** para limpiar `empleado_login_attempts` y `empleado_webauthn_challenges` > 30 días:
   ```sql
   SELECT cron.schedule('cleanup-empleado-logs', '0 4 * * *', $$
     DELETE FROM public.empleado_login_attempts   WHERE attempted_at < now() - interval '30 days';
     DELETE FROM public.empleado_webauthn_challenges WHERE created_at  < now() - interval '1 day';
   $$);
   ```
3. **Monitoring**: vigila `Edge Function logs` por picos de errores 401/429 (puede indicar ataques).
4. **WEBAUTHN_RP_ID** debe ser el dominio raíz de producción. Cambiarlo después de que los usuarios hayan enrolado **invalida sus credenciales**.

---

## 🆘 Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `EMPLEADO_JWT_SECRET no está configurado` | Falta la env var | Configurar en Edge Functions → Secrets |
| `verificacion_fallida` en WebAuthn | `WEBAUTHN_RP_ID` no coincide con el host | Ajustar a coincidir con el dominio (sin protocolo) |
| `challenge_no_encontrado` | El challenge expiró (>5 min) | El usuario debe reintentar — es normal |
| Edge Function devuelve 500 | Revisar logs en Supabase Dashboard | Probable: `bcryptjs` o `@simplewebauthn` no se descargó |
| Login con biometría no aparece | El navegador no soporta WebAuthn o el dispositivo no tiene autenticador platform | Es lo esperado — el flujo NIP funciona normalmente |
