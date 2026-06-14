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
- Paleta: canvas crema cálido (`#f8f7f4`) + ink (`#26251e`) + **accent Azul Rey (`#1a237e`)** corporativo
- Fonts: `Inter` (body) + `JetBrains Mono` (display via tokens)
- Tokens unificados: `--color-*`, `--spacing-*`, `--rounded-*`, `--typography-*`
- Mobile-first: `clamp()` + `100dvh` + `env(safe-area-inset-*)` en todos los layouts
- Cero hex codes / fonts / sizes hardcoded en pages

## Componentes compartidos
- `PortalHeader` — header sticky cohesivo (admin/chofer/empleado)
- `AuthShell` — layout común de logins
- `AuthField` — input semántico con icono + suffix
- `AuthButton` — CTA primario con loading state
- `TopNav` — header de Empresa con nav links + actions
- `LogoMockup` — marca con SVG + wordmark VIÑO · PLASTIC

## Implementado en esta sesión (Ene 2026)
### Bug fixes
- Fix QR scan: parseo JSON + lookup por `numero_empleado` (raíz del bug)
- Sanitización de QR Inválido en panel Registros (`# 4` en lugar de JSON crudo)
- Caché PWA verificado (no era regresión)

### Mejoras de funcionalidad
- Botón "Empresa" en ChoferPortal sólo para admins
- Avisos del scanner mejorados: duración por severidad, vibración háptica, barra countdown, tap-cerrar
- Registros ordenados por prioridad (`rechazado_ruta` → `rechazado_qr` → `fuera_horario` → `dia_descanso` → `autorizado`)
- Turnos con anomalías arriba; chip `N ⚠` en cabeceras

### Cohesión visual (rediseños completos)
- **Landing** rediseñada minimalista (3 roles en list rows con flecha)
- **Login admin / ChoferLogin / EmpleadoLogin** refactorizados con `AuthShell` (-67%, -52% líneas)
- **EmpleadoLogin** mantiene flujo NIP multi-step (5 pasos) cohesivo
- **EmpresaPortal** TopNav unificado con tokens y mismo branding
- **ChoferPortal** header con PortalHeader, bottom-nav con tokens y a11y
- **EmpleadoDashboard** rediseñado: avatar + identidad + StatTiles + QR + banner — todo tokens
- **LogoMockup** ahora muestra VIÑO·PLASTIC (no solo PLASTIC)
- **Cambio de paleta** naranja → azul rey corporativo `#1a237e`
- **logo.svg** del PWA actualizado a degradado azul

### Calidad técnica
- Bundle: 1027 KB → 300 KB gzip
- 100% `data-testid` en interactivos
- ARIA: `aria-label`, `aria-busy`, `aria-required`, `role=alert/list/status`, `aria-labelledby`
- `prefers-reduced-motion` respetado en toda la app
- Build limpio sin errores

## Vulnerabilidad conocida (P1 — para próxima iteración)
- `/empleado/dashboard` sólo protege con `localStorage.empleado_id` (sin token de sesión)
- Solución acordada: Opción A (session token + validación contra BD), aplazada a próxima iteración

## Backlog
- P1: Reforzar auth empleado (Opción A — session token)
- P2: Sustituir `MOCK_REGISTROS` por datos reales cuando Supabase tenga volumen
- P2: Code-splitting del bundle (1MB → chunks)
- P2: Toggle "Solo ver anomalías" en panel de Registros
- P3: Resolver warnings ESLint `react/no-unstable-nested-components` en `RegistrosPanel`
