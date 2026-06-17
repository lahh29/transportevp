import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LogoMockup } from './LogoMockup';

/**
 * AuthShell — Layout cohesivo para las páginas de login (admin / chofer / empleado).
 *
 *  ┌─────────────────────┐
 *  │   [Logo]            │
 *  │   Viño·Plastic      │
 *  │                     │
 *  │   ACCESO            │   ← eyebrow
 *  │                     │
 *  │  ┌───────────────┐  │
 *  │  │  children     │  │   ← Card con el form
 *  │  └───────────────┘  │
 *  │                     │
 *  │   ← Inicio          │   ← back link
 *  └─────────────────────┘
 *
 * Props:
 *  - eyebrow: string corto sobre el card (ej. "ADMINISTRACIÓN")
 *  - children: contenido del card (form, multi-step, etc.)
 *  - showBack: bool, default true. Muestra el link "Volver al inicio"
 *  - hideBrand: bool, default true. Oculta el logo + nombre de marca (vista limpia/minimalista)
 *  - testId: opcional. data-testid del contenedor
 */
export const AuthShell = ({ eyebrow, children, showBack = true, hideBrand = true, testId }) => {
  const navigate = useNavigate();

  return (
    <main style={S.page} data-testid={testId}>
      <style>{`
        @keyframes vp-auth-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <section style={S.container} aria-labelledby="auth-brand">

        {/* Brand */}
        {!hideBrand && (
          <header style={S.brand}>
            <LogoMockup />
            <h1 id="auth-brand" style={S.brandName}>
              Viño<span style={{ color: 'var(--color-primary)' }}>Plastic</span>
            </h1>
          </header>
        )}

        {/* Eyebrow opcional */}
        {eyebrow && (
          <p style={S.eyebrow} role="doc-subtitle">
            {eyebrow}
          </p>
        )}

        {/* Card */}
        <div style={S.card}>
          {children}
        </div>

        {/* Volver */}
        {showBack && (
          <button
            type="button"
            onClick={() => navigate('/')}
            data-testid="auth-back-btn"
            style={S.backBtn}
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            Inicio
          </button>
        )}
      </section>
    </main>
  );
};

/* ============================================================
   STYLES — 100% tokens, mobile-first, sin hex ni px hardcoded
   ============================================================ */
const S = {
  page: {
    minHeight: '100dvh',
    background: 'var(--color-canvas)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(var(--spacing-lg), 6vw, var(--spacing-xxl)) var(--spacing-base)',
    paddingTop: 'max(clamp(var(--spacing-lg), 6vw, var(--spacing-xxl)), env(safe-area-inset-top))',
    paddingBottom: 'max(clamp(var(--spacing-lg), 6vw, var(--spacing-xxl)), env(safe-area-inset-bottom))',
  },
  container: {
    width: '100%',
    maxWidth: 'min(92vw, 22rem)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(var(--spacing-lg), 5vw, var(--spacing-xl))',
    animation: 'vp-auth-rise 320ms ease-out both',
  },

  /* Brand */
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    textAlign: 'center',
  },
  brandName: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(var(--typography-title-md-size), 5.5vw, var(--typography-display-sm-size))',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)',
    letterSpacing: 'var(--ls-tight-1)',
    lineHeight: 1.1,
  },

  /* Eyebrow */
  eyebrow: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted-soft)',
  },

  /* Card */
  card: {
    width: '100%',
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-xl)',
    padding: 'clamp(var(--spacing-lg), 6vw, var(--spacing-xl)) clamp(var(--spacing-base), 5vw, var(--spacing-lg))',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-base)',
    boxShadow: '0 1px 0 var(--color-hairline-soft)',
  },

  /* Back */
  backBtn: {
    background: 'none',
    border: 'none',
    padding: 'var(--spacing-xxs) var(--spacing-xs)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-ink-muted)',
    transition: 'color 120ms ease',
  },
};
