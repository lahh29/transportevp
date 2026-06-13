import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Truck, ShieldCheck, MapPin, ChevronRight } from 'lucide-react';
import { LogoMockup } from '../components/LogoMockup';

/* ============================================================
   LANDING — Transporte ViñoPlastic
   Mobile-first · Design tokens · Accesibilidad · Skeleton
   ============================================================ */

const ROLES = [
  {
    id: 'empleado',
    icon: User,
    title: 'Soy empleado',
    subtitle: 'Accede a tu pase digital y ruta',
    path: '/empleado/login',
    ariaDescribedBy: 'desc-empleado',
  },
  {
    id: 'chofer',
    icon: Truck,
    title: 'Soy chofer',
    subtitle: 'Portal de operadores',
    path: '/login',
    ariaDescribedBy: 'desc-chofer',
  },
  {
    id: 'admin',
    icon: ShieldCheck,
    title: 'Administración',
    subtitle: 'Recursos humanos y logística',
    path: '/login',
    ariaDescribedBy: 'desc-admin',
  },
];

/* ---------- Skeleton ---------- */
function NavSkeleton() {
  return (
    <ul style={styles.navList} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} style={styles.skeletonItem} />
      ))}
    </ul>
  );
}

/* ---------- Nav item ---------- */
function NavButton({ role, onClick }) {
  const Icon = role.icon;
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(role.path)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        aria-describedby={role.ariaDescribedBy}
        style={{
          ...styles.navBtn,
          ...(hovered ? styles.navBtnHover : {}),
          ...(pressed ? styles.navBtnActive : {}),
        }}
      >
        <div style={styles.iconBox} aria-hidden="true">
          <Icon size={20} strokeWidth={1.75} />
        </div>

        <div style={styles.textBox}>
          <span style={styles.navTitle}>{role.title}</span>
          <span id={role.ariaDescribedBy} style={styles.navSubtitle}>
            {role.subtitle}
          </span>
        </div>

        <ChevronRight
          size={16}
          strokeWidth={1.75}
          style={styles.chevron}
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

/* ---------- Landing ---------- */
export const Landing = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  /* Simula carga de sesión / config inicial */
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <main style={styles.page}>
      {/* Screen-reader heading */}
      <h2 className="sr-only" style={styles.srOnly}>
        Portal de acceso — Transporte ViñoPlastic
      </h2>

      <div style={styles.container}>

        {/* Brand */}
        <header style={styles.brand}>
          <LogoMockup />
          <div style={styles.brandText}>
            <h1 style={styles.brandName}>Transporte ViñoPlastic</h1>
          </div>
        </header>

        {/* Navigation */}
        <nav aria-label="Acceso por perfil">
          {ready ? (
            <ul style={styles.navList}>
              {ROLES.map((role) => (
                <NavButton key={role.id} role={role} onClick={navigate} />
              ))}
            </ul>
          ) : (
            <NavSkeleton />
          )}
        </nav>

        {/* Footer */}
        {ready && (
          <footer style={styles.footerNote}>
            <p>v0.1 Beta Release</p>
          </footer>
        )}

      </div>
    </main>
  );
};

/* ============================================================
   STYLES — todos los valores via design tokens
   ============================================================ */
const styles = {
  /* ---- Visually hidden (accesibilidad) ---- */
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  },

  /* ---- Page ---- */
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(var(--spacing-lg), 5vw, var(--spacing-xxl)) var(--spacing-base)',
    background: 'var(--color-canvas)',
  },

  /* ---- Container ---- */
  container: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xl)',
  },

  /* ---- Brand header ---- */
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-base)',
    textAlign: 'center',
  },
  brandIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    borderRadius: '18px',
    background: 'var(--color-surface-strong)',
    color: 'var(--color-ink)',
    flexShrink: 0,
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xxs)',
  },
  brandName: {
    fontSize: 'var(--typography-title-md-size)',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)',
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
  },
  brandTagline: {
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* ---- Nav list ---- */
  navList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },

  /* ---- Nav button ---- */
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-base)',
    width: '100%',
    minHeight: '64px',
    padding: 'var(--spacing-base)',
    borderRadius: 'var(--rounded-xl)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-surface-card)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
    WebkitTapHighlightColor: 'transparent',
    /* Focus accesible por CSS global (.btn:focus-visible) */
    outline: 'none',
  },
  navBtnHover: {
    borderColor: 'var(--color-hairline-strong)',
    background: 'var(--color-canvas-soft)',
  },
  navBtnActive: {
    transform: 'scale(0.98)',
  },

  /* ---- Icon box ---- */
  iconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: 'var(--rounded-lg)',
    background: 'var(--color-surface-strong)',
    color: 'var(--color-ink)',
    flexShrink: 0,
  },

  /* ---- Text ---- */
  textBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  navTitle: {
    fontSize: 'var(--typography-title-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
    lineHeight: 'var(--typography-title-sm-lh)',
  },
  navSubtitle: {
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* ---- Chevron ---- */
  chevron: {
    color: 'var(--color-muted-soft)',
    flexShrink: 0,
  },

  /* ---- Skeleton ---- */
  skeletonItem: {
    height: '72px',
    borderRadius: 'var(--rounded-xl)',
    background: 'var(--color-surface-strong)',
    border: '1px solid var(--color-hairline-soft)',
    animation: 'vp-pulse 1.4s ease-in-out infinite',
    marginBottom: 'var(--spacing-sm)',
  },

  /* ---- Footer ---- */
  footerNote: {
    textAlign: 'center',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted-soft)',
    lineHeight: 'var(--typography-caption-lh)',
  },
};
