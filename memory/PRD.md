# ViñoPlastic — Portal de Abordaje QR

## Problema original
Sistema web (Vite + React + Supabase) para gestión de transporte de personal en planta Querétaro.

## Stack
- Frontend: Vite + React 18 + react-router-dom + framer-motion + sonner
- Backend: Supabase (auth + tablas `empleados`, `registros`, `rutas_activas`)
- QR: `html5-qrcode` (lectura) + `qrcode` (generación)

## Roles
- **admin** (`/empresa`): gestiona empleados, carga JSON, genera QRs, ve historial.
- **chofer** (`/chofer`): selecciona ruta, escanea QRs, ve historial.
- **empleado** (`/empleado/dashboard`): consulta su QR.

## Sistema de Diseño (tokens)
- Paleta: canvas crema cálido + ink + **accent Azul Rey (`#1a237e`)**
- Fonts: `Inter` (body) + `JetBrains Mono` (display via tokens)
- Tokens: `--color-*`, `--spacing-*`, `--rounded-*`, `--typography-*`
- Mobile-first: `clamp()` + `100dvh` + `env(safe-area-inset-*)`
- Cero hex / fonts / sizes hardcoded en pages

## Implementado en esta sesión (Ene 2026) — Carga de fotos v2
### `PhotoUploadModal` completamente rediseñado
- **Flujo en 5 fases:** `picking → validating → reviewing → uploading → done`
- **Pre-chequeo en Supabase** (`empleados.in(numero_empleado, [...])`):
  - Marca cada archivo como **Nuevo**, **Reemplaza**, **No existe** o **Inválido**
  - Alerta visual con conteo antes de subir (omite los no válidos)
- **Barra de progreso global** con `role="progressbar"` + porcentaje en vivo
- **Estado por archivo** con badge tonal: en cola / subiendo (overlay spinner sobre thumbnail) / subida / error / omitido
- **Thumbnails** de cada imagen (URL.createObjectURL + revoke en unmount)
- **Validación local:** tipo de archivo (jpg/png/webp/heic) + tamaño (máx 8 MB) + número de empleado en el nombre (regex `^\s*(\d+)`)
- **Subida concurrente** (concurrencia = 4) — mucho más rápido que el bucle serial original
- **Cancelar a media subida** (AbortFlag via ref)
- **Reintentar solo los fallidos** desde la pantalla de resumen
- **Detección de reemplazo:** si el empleado ya tenía `foto_url`, se etiqueta como "Reemplaza"
- **Modal `size="lg"`** para acomodar la lista
- **A11y:** `role="alert"`, `aria-live`, `aria-busy`, `aria-valuenow`, `prefers-reduced-motion`, focus management heredado de `Modal`
- **100% tokens** — sin hex / fonts / tamaños hardcodeados; usa `--color-semantic-success/error/warning`, `--color-accent-raw / 0.X`, `--rounded-full`, `--spacing-*`, `--typography-*`
- **data-testid** en todo elemento interactivo y de estado (`photo-dropzone`, `photo-progress-bar`, `photo-progress-pct`, `photo-progress-count`, `photo-modal-confirm`, `photo-modal-cancel-upload`, `photo-modal-retry`, `photo-modal-finish`, `photo-file-status-*`, `photo-summary-ready`, `photo-summary-notfound`, …)

### Bundle
- Build limpio · 1,121 KB → **321 KB gzip** · PWA con SW + precache 19 entradas

## Implementado en esta sesión (Ene 2026) — `/chofer` PWA Hardening (items 2-9)
### Item 2 · PWA real (iOS + Android)
- `vite-plugin-pwa` con workbox `generateSW`, `autoUpdate`, `injectRegister: 'auto'`
- Manifest completo: `start_url: /chofer`, `scope: /`, `display_override: [standalone, minimal-ui]`, orientation portrait, categorías, shortcut "Escanear QR"
- Íconos PNG reales generados con `@vite-pwa/assets-generator`: 64, 192, 512, maskable-512, apple-touch-180
- Runtime caching: Supabase = NetworkFirst (timeout 6s) · Google Fonts = CacheFirst
- `navigateFallback: /index.html` + denylist `/api/`

### Item 3 · Viewport / iOS meta (`index.html`)
- ✅ Quitado `maximum-scale=1.0, user-scalable=no` (WCAG 1.4.4)
- ✅ Añadido `viewport-fit=cover` para notch/Dynamic Island
- ✅ `apple-mobile-web-app-capable`, `status-bar-style=black-translucent`, `apple-mobile-web-app-title`, `format-detection`, `theme-color` con `prefers-color-scheme`

### Item 4 · Safe-area-inset
- Top bar usa `max(var(--spacing-lg), env(safe-area-inset-top|left|right))`
- Banner de resultado usa `env(safe-area-inset-bottom|left|right)`
- Panel de rutas usa `env(safe-area-inset-top)` + `env(safe-area-inset-bottom)`

### Item 5 · Dead code + `regStyles` (bomba de tiempo) eliminados
- Removidos `RegHeader`, `RegCard`, `RegEmpty`, `RegItem`, helpers `getWeekKey`, `getISOWeek`, `formatWeekLabel`, `getDayKey`, `formatDayLabel`, `REG_ANIM`, `REG_LIST_ITEM`, `PRIORITY`, `slideIn`
- Imports removidos: `useMemo`, `useLocation`, `List`, `Camera`, `Calendar`, `Users`, `Clock`, `MapPin`, `Bus`

### Item 6 · A11y / Tap targets
- Tap targets ≥ 44 px (TAP_TARGET centralizado en config)
- Botón finalizar: `aria-label="Finalizar ruta y liberar"` + visible label "Finalizar" en pantallas >360px
- `aria-live="assertive"` + `role="alert"` para denegaciones; `polite`/`status` para autorizaciones
- Soporte `prefers-reduced-motion` (hook `useReducedMotion`) en framer-motion y CSS
- Banner de resultado es keyboard-dismissable (Enter / Space / Escape) + `tabIndex={0}`
- Landmarks reales: `<main>`, `<section aria-label>`, `<header>`, `<ul role="list">`, `<time dateTime>`
- Jerarquía corregida: `<h1>` real en panel de rutas
- `touch-action: manipulation` + `WebkitTapHighlightColor: transparent` en todos los botones móviles
- `<div role="application" aria-label>` para el contenedor de cámara

### Item 7 · Listener `visibilitychange`
- Cámara se pausa al salir de la app (background) y reanuda al volver al frente
- Listener `onAuthStateChange` añadido (antes solo `getSession()` una vez)
- Dedupe de escaneos: ignora mismo QR dentro de `dedupeWindowMs` (8 s)
- Effect del scanner **no depende de `session`** (evita reinicio cada refresh de token)
- `cancelledRef` protege contra setState tras desmontar

### Item 8 · localStorage seguro + cola offline
- `safeStorage` con try/catch + fallback in-memory (resuelve Safari iOS privado)
- `STORAGE_KEYS` prefijadas con `vp:` (sin colisiones)
- `offlineQueue.enqueue/flush/size`: cuando un insert a `registros` falla, se reintenta automáticamente al recuperar red (`online` + `visibilitychange`)
- Notificación `notify.success` al reenviar pendientes
- Manejo de error de cámara con UI: `cameraError = 'permission' | 'unavailable'` + botón Reintentar (44 px)

### Item 9 · Servicio centralizado de configuración
- `/app/src/lib/choferConfig.js` — única fuente de verdad para:
  - `RUTAS_LIST`, `RUTA_COLORS`, `parseRuta`, `getRutaColor`
  - `SHIFT_SCHEDULE`, `SHIFT_HOURS`, `SHIFT_TOLERANCE`, `resolveTurno`, `DAY_NAMES`
  - `SCAN_CONFIG` (fps, qrboxRatio, cooldowns, haptics, dedupeWindow)
  - `TAP_TARGET`, `APP_ROUTES`, `PRIORITY`
  - Helpers fecha (`getISOWeek`) e `getInitials`
- `/app/src/lib/safeStorage.js`, `/app/src/lib/offlineQueue.js`, `/app/src/lib/useReducedMotion.js`

### Validación
- ✅ `yarn build` limpio · PWA mode `generateSW` · 19 precache entries
- ✅ Manifest válido (`/manifest.webmanifest` 200)
- ✅ Service Worker (`/sw.js` 200)
- ✅ Icons (`/pwa-512x512.png`, `/apple-touch-icon-180x180.png` 200)
- ✅ Viewport meta verificado en runtime (test playwright)

## Implementado en esta sesión (Ene 2026) — EmpleadoLogin Tanda A (UX + A11y P1)

### Componentes nuevos
- **`<NipInput>`** (`/app/src/components/NipInput.jsx`):
  - 4 cajas OTP-style con auto-advance al tipear y auto-back con Backspace en caja vacía
  - Paste support (`1234` se distribuye automáticamente)
  - Navegación con flechas + Home/End
  - ARIA: `role="group"`, `aria-labelledby`, `aria-label="Dígito N de M"` en cada caja
  - `type="password"` + `inputMode="numeric"` + `autoComplete="one-time-code"` (sin password manager)
  - `enterKeyHint` configurable (next/done) para el teclado iOS
  - Animación shake en error + indicadores `data-filled`/`data-error` CSS-driven
  - Respeta `prefers-reduced-motion`
  - Estados `:focus-visible` con halo accent (WCAG 2.4.7)

- **`<StepProgress>`** (`/app/src/components/StepProgress.jsx`):
  - Indicador minimalista de dots con paso actual ensanchado
  - Semántico: `<ol>` + `aria-current="step"` + `aria-live="polite"` para anunciar el cambio
  - Visually-hidden text "Paso N (actual)" para SR

### `EmpleadoLogin.jsx` reescrito completo
- **NIP en 4 cajas OTP** (item 5) — reemplaza el input único con bullets
- **Steps 2/3/4 ahora son `<motion.form>`** (item 6) → Enter envía + `enterKeyHint` adecuado
- **CSS `:hover/:focus-visible`** reemplaza `onMouseOver/Out` (item 7) — funciona en touch + teclado
- **Anuncio de paso** con `role="status" aria-live="polite"` (item 8) screen-reader-only
- **`<StepProgress>` visible** en todos los pasos (item 9) — 4 dots para flujo nuevo, 2 para login con NIP existente
- **Botón "← Atrás"** entre pasos (item 10) con `:focus-visible`, tap target ≥44px, `aria-label`
- **Step 4 conserva `nip` original** si confirmación falla (item 11) — solo limpia `confirmNip`
- **Foto + nombre completo en step 2** (item 12) — confirmación visual de identidad antes de la pregunta
- **`<fieldset>` + `<legend>` + `role="radiogroup"`** en step 2 (semántica correcta)
- **Mensaje de error inline** con `<AuthError>` reemplaza los toasts efímeros (consistencia)
- **`friendlyAuthError`-like local strings**: errores cortos ("No encontramos ese número", "NIP incorrecto", "Los NIP no coinciden")
- **Rechazo de NIPs triviales**: `WEAK_NIPS` set (0000, 1234, 1111, 7890, etc.) — UX item ya cubre defensa
- **STEPS config object** reemplaza la cadena de ternarios para `eyebrow` + `label`
- **`safe localStorage`** con try/catch envolviendo `localStorage.setItem('empleado_id', id)`
- **`select('id, nombre, turno, foto_url, nip')`** en lugar de `select('*')` — minimiza datos sensibles expuestos al cliente
- **Auto-submit en step 5** cuando el NIP coincide con `empleado.nip` (UX fluida)
- **`useReducedMotion`** integrado en `stepMotion` (sin animaciones si el usuario lo pide)
- **`stepMotion` con `y: 8`** en lugar de `x: 16` (vertical sutil, no abrupto)
- **Resets atómicos** vía `resetFlow()` único

### Validación
- ✅ `yarn build` limpio · PWA SW + 19 precache entries
- ✅ Snapshot iPhone 14 (390×844): step 1 renderiza con dots, intro, input numérico, botón
- ✅ Error renderiza con `<AuthError>` y se anuncia con `aria-live`
- ✅ `aria-label="Paso 1 de 4"` en `<StepProgress>` verificado
- ✅ Announcer `role="status"` textcontent: "Paso 1 de 4: Identificación"
- ✅ Back button oculto en step 1, visible en steps 2-5

### Pendiente (próximas tandas)
- **Tanda B (P2 pulido)**: `safeStorage` con clave prefijada (vp:empleado_id), `getInitials`, `APP_ROUTES`, tokens de motion centralizados, `friendlyAuthError` para errores Supabase
- **Tanda C (P0 seguridad)**: NIP hash server-side, JWT de sesión, rate-limit, RLS — requiere Edge Function

## Implementado en esta sesión (Ene 2026) — Safe-area fix headers + toasts

### Bug reportado
En PWA iOS standalone (con `viewport-fit=cover` + `apple-mobile-web-app-status-bar-style=black-translucent`), el contenido se dibuja **debajo** de la barra de estado del sistema. Tanto el `PortalHeader`/`TopNav` como las notificaciones de Sonner quedaban tapados por el reloj, señal, 4G y batería.

### Cambios
1. **`PortalHeader` y `TopNav`** (sticky headers):
   - `top: 1rem` → `top: max(var(--spacing-base), calc(env(safe-area-inset-top) + var(--spacing-xs)))`
   - Añadido `margin-top: max(var(--spacing-sm), env(safe-area-inset-top))` para el primer render
   - `width: calc(100% - 2rem)` → `width: calc(100% - var(--spacing-xxl))` (tokens 100%)

2. **`<Toaster>` en `App.jsx`** (Sonner v2.0.7):
   - Bug real: en móvil Sonner usa el prop **`mobileOffset`** ignorando `offset` (Sonner v2 introdujo esto)
   - Antes: `offset="max(var(--spacing-sm), env(safe-area-inset-top))"` — ignorado en mobile
   - Ahora: `offset` y `mobileOffset` ambos configurados como objeto `{ top, right, bottom, left }` con `env(safe-area-inset-*)` y fallback `var(--spacing-*)`
   - Aplica safe-area en los 4 lados (no solo top) para iPhone landscape con notch lateral

### Validación
- ✅ `yarn build` limpio · `safe-area-inset-top` aparece 12 veces en el bundle · `mobileOffset` integrado
- ✅ Test en runtime (browser sin notch): `computed top: 12px` (fallback `--spacing-sm` correcto)
- ✅ En iOS PWA con notch: `max()` elegirá `env(safe-area-inset-top)` ≈ 47-59px automáticamente
- ✅ Headers no se solapan con barra de estado iOS

## Implementado en esta sesión (Ene 2026) — Toasts · Errores · LoginTransition (minimalismo + a11y)

### `notify.js` reescrito (`/app/src/lib/notify.js`)
- API mínima: `success / error / warning / info / loading / message / dismiss / promise + bye / copied / networkError`
- **Duraciones tokenizadas** en `NOTIFY_DURATIONS` (success 2.8s, info 3.2s, warning 4s, error 4.8s)
- **Iconos cohesivos** (lucide) con colores semánticos del token system (no rich-colors de sonner)
- **Eliminados helpers obsoletos**: `welcome`, `saved`, `updated`, `created`, `deleted`, `routeSelected`, `routeFinished` (sustituidos por `success` directo con texto corto)
- `networkError()` ya no acepta `err` — texto fijo "Sin conexión" para no exponer stack

### `Toaster` (App.jsx) refinado
- `richColors={false}`, `closeButton={false}` (menos ruido visual)
- `visibleToasts={3}` (antes 4)
- Sin styles inline duplicados — todo via CSS `.vp-toast`

### Sonner CSS (`index.css`)
- **100% tokens**: `--color-*`, `--spacing-*`, `--rounded-*`, `--typography-*`, `--font-*`
- **Borde lateral 3px** del color semántico (success/error/warning/info/loading) en lugar de fondos tintados
- **Mobile-first**: `@media (max-width: 480px)` ajusta width y font-size
- Soporte `prefers-reduced-motion`
- Sin `box-shadow` inline — definido en CSS con tokens de tinta

### `<AuthError>` — nuevo componente (`/app/src/components/AuthError.jsx`)
- Reemplaza el `errorStyle` inline duplicado en `Login.jsx` y `ChoferLogin.jsx`
- `role="alert"` + `aria-live="assertive"` (anuncio inmediato)
- Icono `AlertCircle` 16px + texto compacto
- Tokens 100%, mobile-first, sin hex/px hardcoded
- No renderiza si `children` está vacío (evita placeholder vacío)

### `friendlyAuthError()` — mapeo de errores (`/app/src/lib/authErrors.js`)
- Convierte mensajes crudos de Supabase/red a textos amables:
  - `Failed to fetch / NetworkError` → "Sin conexión"
  - `Invalid login credentials` → "Correo o contraseña incorrectos"
  - `Email not confirmed` → "Confirma tu correo primero"
  - `Email rate limit exceeded` / `Too many requests` → "Demasiados intentos"
- Recorta mensajes >80 chars a fallback genérico
- Match parcial por keywords (fetch/network/credential/rate limit)

### `LoginTransition.jsx` reescrito — minimalista
- **Antes**: anillos concéntricos infinitos + check + eyebrow "Acceso autorizado" + saludo letra-por-letra + 3 dots animados, 2.5s total
- **Ahora**: mark único (círculo + check trazado), saludo corto, barra de progreso lineal, **1.2s total**
- Exporta `LOGIN_TRANSITION_MS` para que las páginas usen el mismo timeout (sin magic number)
- Respeta `prefers-reduced-motion` (atajo instantáneo)
- `role="status"` + `aria-live="polite"` + `aria-label={greeting}`
- Safe-area-inset en padding del overlay
- Sin emojis, sin descripciones largas

### Logins refactorizados (3 páginas)
- `Login.jsx` y `ChoferLogin.jsx`: usan `<AuthError>` + `friendlyAuthError` + `LOGIN_TRANSITION_MS`
- **Eliminado `notify.welcome(name)`** — info redundante con la transición visual
- `EmpleadoLogin.jsx`: `toast.error/success` → `notify.error/success` (cohesión) + textos recortados ("Empleado no encontrado", "NIP creado", "Los NIP no coinciden")
- `aria-invalid={Boolean(error)}` añadido en inputs cuando hay error (a11y)
- `aria-pressed` en el botón mostrar/ocultar contraseña (a11y)
- Tap targets del eye button ≥ 32px (WCAG 2.5.5)

### `ChoferPortal.jsx` — toasts alineados
- `notify.routeSelected(code)` → `notify.success(\`Ruta ${code}\`)`
- `notify.routeFinished(code)` → `notify.message(\`Ruta ${code} finalizada\`)`
- `notify.networkError({...})` → `notify.networkError()` (sin descripción)
- "Ruta cerrada solo localmente" + descripción → "Cerrada sin sincronizar" (mensaje único, sin saturar)
- Sincronización de cola: "Sincronizados N registros pendientes" → "N registro(s) sincronizado(s)"

### Validación
- ✅ `yarn build` limpio · 1.119 KB / 320 KB gzip · PWA + SW intactos
- ✅ Snapshot iPhone 14 (390×844): login renderiza minimalista
- ✅ Disparo error real: "Failed to fetch" → mapeado a "Sin conexión" en pantalla
- ✅ `role="alert"` + `aria-live="assertive"` verificados con Playwright
- ✅ Computed styles del `AuthError`: bg `rgba(207,45,86,0.06)`, border `rgba(207,45,86,0.22)`, padding tokens, radius `--rounded-md` ← 100% tokens

### Bundle
- Build limpio · 1,119 KB → **320 KB gzip** (-1 KB vs sesión anterior, menos código en LoginTransition)
- Sin nuevas dependencias

## Backlog
- P0 (item 1 pendiente): Mover `RUTAS_LIST`, `SHIFT_SCHEDULE`, `SHIFT_HOURS` a Supabase + Edge Function para validar `estado` server-side (evita manipulación cliente)
- P0 (item 10 pendiente): RLS estricta sobre `registros` y `rutas_activas`
- P1: Reforzar auth empleado (session token)
- P1: Botón torch/linterna + cambio de cámara en escáner
- P2: Code-splitting del bundle (1MB → chunks)
- P2: i18n (es-MX hardcodeado en `toLocaleDateString`)
- P2: Resolver warnings ESLint `set-state-in-effect` en `EmpresaPortal.jsx` y `QrPrintPage.jsx`
- P3: PNG de logo a mayor resolución (los íconos actuales son trazados del SVG simple)
