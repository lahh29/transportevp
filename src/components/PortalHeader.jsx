import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { notify } from '../lib/notify';
import { TypeWriter } from './TypeWriter';

/**
 * PortalHeader — header sticky cohesivo con TopNav (Empresa).
 *
 * Estructura visual (idéntica a TopNav, sólo cambia el contenido):
 *   [ Viño·Plastic        subtitle ]   [ extras ][ ↻ refresh ][ ⏻ logout ]
 *
 * Diseño compartido entre todos los dashboards (admin / chofer / empleado).
 *
 * Props:
 *  - subtitle      → texto debajo del brand (ej. "Portal Abordaje")
 *  - onBrandClick  → callback al pulsar el brand (default: navegar a "/")
 *  - onLogout      → callback de cierre de sesión (obligatorio)
 *  - extras        → ReactNode con botones adicionales (van ANTES de refresh)
 *  - showRefresh   → bool, default true. Recarga la app con window.location.reload()
 */
export const PortalHeader = ({
  subtitle,
  onBrandClick,
  onLogout,
  extras = null,
  showRefresh = true,
}) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleBrand = () => {
    if (onBrandClick) onBrandClick();
    else navigate('/');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    const id = notify.loading('Actualizando aplicación…');
    setTimeout(() => {
      notify.dismiss(id);
      window.location.reload(true);
    }, 300);
  };

  const handleLogout = () => {
    notify.bye();
    // Pequeño delay para que el toast se muestre antes de la navegación/recarga
    setTimeout(() => { onLogout?.(); }, 120);
  };

  return (
    <>
      <style>{`
        .portal-header-wrapper {
          position: sticky;
          /* Respeta la zona segura iOS (notch / barra de estado en PWA standalone) */
          top: max(var(--spacing-base), calc(env(safe-area-inset-top) + var(--spacing-xs)));
          z-index: 1000;
          margin: 0 auto;
          max-width: 1200px;
          width: calc(100% - var(--spacing-xxl));
          /* Margen superior cuando el header se monta directo en viewport (no scrolleado) */
          margin-top: max(var(--spacing-sm), env(safe-area-inset-top));
        }
      `}</style>
      <div className="portal-header-wrapper">
        <header
          data-testid="portal-header"
          style={{
            minHeight: '4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-sm)',
            padding: '0 1rem',
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          {/* ── Brand ── */}
          <button
            onClick={handleBrand}
            data-testid="portal-header-brand"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
              minWidth: 0,
              flex: 1,
              overflow: 'hidden',
              borderRadius: '0.75rem',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-display)',
                lineHeight: 1.1,
              }}
            >
              <TypeWriter
                words={['ViñoPlastic']}
                typeSpeed={110}
                deleteSpeed={55}
                holdFull={1800}
                holdEmpty={450}
                ariaLabel="ViñoPlastic"
                renderChar={(t) => {
                  const split = 4; // "Viño"
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
            </span>
            {subtitle && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-ink-faint)',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {subtitle}
              </span>
            )}
          </button>

          {/* ── Acciones ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
            {extras}

            {showRefresh && (
              <motion.button
                whileHover={{ scale: 1.05, background: 'rgba(0,0,0,0.05)', color: 'var(--color-ink)' }}
                whileTap={{ scale: 0.95 }}
                animate={{ rotate: isRefreshing ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                onClick={handleRefresh}
                title="Actualizar aplicación"
                aria-label="Actualizar aplicación"
                data-testid="portal-header-refresh"
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-ink-muted)',
                }}
              >
                <RefreshCw size={18} strokeWidth={2} />
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05, background: 'rgba(207,45,86,0.1)', color: 'var(--color-semantic-error)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              data-testid="portal-header-logout"
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-ink-muted)',
              }}
            >
              <LogOut size={18} strokeWidth={2} />
            </motion.button>
          </div>
        </header>
      </div>
    </>
  );
};
