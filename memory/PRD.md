# ViñoPlastic — Portal de Abordaje QR

## Problema original
Sistema web (Vite + React + Supabase) para gestión de transporte de personal en planta Querétaro.
Bugs reportados en esta iteración:
1. Códigos QR no funcionan al escanear (todos salen como "QR Inválido").
2. Admin entra a /chofer (vía link "Historial") y no tiene forma de volver a /empresa.
3. Diseño no es 100% mobile-first / tiene valores hardcodeados.

## Stack
- Frontend: Vite + React 18 + react-router-dom + framer-motion + sonner
- Backend: Supabase (auth + tabla `empleados`, `registros`, `rutas_activas`)
- QR: `html5-qrcode` (lectura) + `qrcode` (generación)

## Roles
- **admin** (`/empresa`): gestiona empleados, carga JSON, genera QRs.
- **chofer** (`/chofer`): selecciona ruta, escanea QRs, ve historial.
- **empleado** (`/empleado/*`): consulta su QR.

## Flujo QR validado end-to-end
1. JSON empleados → `JsonUploadModal` normaliza `"numero empleado"` → `numero_empleado` (string).
2. `QrGenerateModal` genera QR con `JSON.stringify({ numero_empleado })`.
3. `ChoferPortal` parsea el JSON al escanear y busca por `numero_empleado` en Supabase.

## Implementado en esta sesión (Ene 2026)
- Fix QR scan: parsing JSON + lookup por `numero_empleado` + fallback UUID/digits-only.
- Botón "Empresa" en `ChoferPortal` header para admins → vuelve a `/empresa`.
- Mobile-first cleanup: tokens en lugar de #fff/#000/10-14px hardcoded, safe-area, ellipsis en header, tablist a11y en bottom-nav.
- Sanitización de QR Inválido en panel de Registros (muestra `# 4` en vez de JSON crudo).
- `.trim()` defensivo en upload JSON y lookup de escaneo.

## Backlog
- P1: Sustituir MOCK_REGISTROS por sólo datos reales cuando Supabase tenga datos.
- P2: Resolver warnings ESLint `react/no-unstable-nested-components` (Card/Header dentro de RegistrosPanel).
- P2: Code-splitting del bundle (1MB → chunks).
