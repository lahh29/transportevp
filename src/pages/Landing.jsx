import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, User, Truck, ShieldCheck } from 'lucide-react';
import { LogoMockup } from '../components/LogoMockup';
import { TypeWriter } from '../components/TypeWriter';

/* ============================================================
   LANDING — ViñoPlastic
   Minimalista · Mobile-first · 100% design tokens
   ============================================================ */

const ROLES = [
  { id: 'empleado', icon: User,        label: 'Colaborador',    path: '/empleado/login' },
  { id: 'chofer',   icon: Truck,       label: 'Transporte',     path: '/chofer/login'   },
  { id: 'admin',    icon: ShieldCheck, label: 'Administración', path: '/login'          },
];

/* ─── Skeleton ─────────────────────────────────────────────── */
const RoleSkeleton = () => (
  <ul style={S.list} aria-hidden="true">
    {ROLES.map((_, i) => (
      <li key={i} style={S.skeletonItem} />
    ))}
  </ul>
);

/* ─── Role row ─────────────────────────────────────────────── */
const RoleRow = ({ role, onClick, delay }) => {
  const Icon = role.icon;
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <li style={{ animation: `vp-fade-up 420ms ${delay}ms both` }}>
      <button
        type="button"
        onClick={() => onClick(role.path)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        data-testid={`landing-role-${role.id}`}
        aria-label={`Ingresar como ${role.label}`}
        style={{
          ...S.row,
          borderColor: hovered ? 'var(--color-hairline-strong)' : 'var(--color-hairline-soft)',
          background: pressed ? 'var(--color-canvas-soft)' : 'var(--color-surface-card)',
          transform: pressed ? 'scale(0.985)' : 'scale(1)',
        }}
      >
        <span style={{ ...S.iconBox, color: hovered ? 'var(--color-primary)' : 'var(--color-ink)' }} aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>

        <span style={S.label}>{role.label}</span>

        <span style={{ ...S.arrow, color: hovered ? 'var(--color-primary)' : 'var(--color-muted-soft)' }} aria-hidden="true">
          <ArrowUpRight size={16} strokeWidth={1.75} />
        </span>
      </button>
    </li>
  );
};

/* ─── Landing ──────────────────────────────────────────────── */
export const Landing = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <main style={S.page} data-testid="landing-page">
      <style>{`
        @keyframes vp-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes vp-pulse-soft {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <section style={S.container} aria-labelledby="landing-title">

        {/* Brand */}
        <header style={S.brand}>
          <LogoMockup />
          <h1 id="landing-title" style={S.title}>
            <TypeWriter
              words={['ViñoPlastic']}
              typeSpeed={110}
              deleteSpeed={55}
              holdFull={1800}
              holdEmpty={450}
              ariaLabel="ViñoPlastic"
              renderChar={(t) => {
                const split = 4; // "Viño" = 4 chars
                const first = t.slice(0, split);
                const rest = t.slice(split);
                return (
                  <>
                    <span>{first}</span>
                    <span style={{ color: 'var(--color-primary)' }}>{rest}</span>
                  </>
                );
              }}
            />
          </h1>
        </header>

        {/* Acceso */}
        <nav aria-label="Acceso por perfil" style={S.nav}>
          <p style={S.eyebrow}>Acceso</p>
          {ready ? (
            <ul style={S.list}>
              {ROLES.map((r, i) => (
                <RoleRow key={r.id} role={r} onClick={navigate} delay={i * 60} />
              ))}
            </ul>
          ) : (
            <RoleSkeleton />
          )}
        </nav>

        {/* Footer minimalista */}
        <footer style={S.footer}>
          <span>Planta Querétaro</span>
        </footer>
      </section>
    </main>
  );
};

/* ============================================================
   STYLES — 100% design tokens (sin hex, sin px hardcoded fuera de borders)
   ============================================================ */
const S = {
  /* Page */
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
    gap: 'clamp(var(--spacing-xl), 8vw, var(--spacing-xxl))',
  },

  /* Brand */
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(var(--typography-title-md-size), 6vw, var(--typography-display-sm-size))',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)',
    letterSpacing: 'var(--ls-tight-1)',
    lineHeight: 1.1,
  },

  /* Nav */
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  eyebrow: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted-soft)',
    paddingLeft: 'var(--spacing-xxs)',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },

  /* Role row */
  row: {
    width: '100%',
    minHeight: 'var(--nav-height)',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: 'var(--spacing-base)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-lg)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-surface-card)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
    transition: 'border-color 160ms ease, background 160ms ease, transform 120ms ease',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
  },
  iconBox: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'var(--button-height-sm)',
    height: 'var(--button-height-sm)',
    transition: 'color 160ms ease',
  },
  label: {
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
    letterSpacing: 'var(--ls-tight-3)',
  },
  arrow: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 160ms ease, transform 160ms ease',
  },

  /* Skeleton */
  skeletonItem: {
    height: 'var(--nav-height)',
    borderRadius: 'var(--rounded-lg)',
    background: 'var(--color-hairline-soft)',
    animation: 'vp-pulse-soft 1.4s ease-in-out infinite',
  },

  /* Footer */
  footer: {
    textAlign: 'center',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted-soft)',
    letterSpacing: 'var(--ls-wide-1)',
  },
};
