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
- Build limpio · 1,095 KB → **315 KB gzip** · sin nuevas dependencias

## Backlog
- P1: Reforzar auth empleado (session token)
- P2: Code-splitting del bundle (1MB → chunks)
- P2: Sustituir `MOCK_REGISTROS` por datos reales
- P3: Resolver warnings ESLint en `RegistrosPanel`
