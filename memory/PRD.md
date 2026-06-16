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

## Backlog
- P0 (item 1 pendiente): Mover `RUTAS_LIST`, `SHIFT_SCHEDULE`, `SHIFT_HOURS` a Supabase + Edge Function para validar `estado` server-side (evita manipulación cliente)
- P0 (item 10 pendiente): RLS estricta sobre `registros` y `rutas_activas`
- P1: Reforzar auth empleado (session token)
- P1: Botón torch/linterna + cambio de cámara en escáner
- P2: Code-splitting del bundle (1MB → chunks)
- P2: i18n (es-MX hardcodeado en `toLocaleDateString`)
- P2: Resolver warnings ESLint `set-state-in-effect` en `EmpresaPortal.jsx` y `QrPrintPage.jsx`
- P3: PNG de logo a mayor resolución (los íconos actuales son trazados del SVG simple)
