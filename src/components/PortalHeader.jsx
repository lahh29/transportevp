import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

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
    setTimeout(() => window.location.reload(true), 300);
  };

  return (
    <header
      data-testid="portal-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        minHeight: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-xs) var(--spacing-lg)',
        background: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-hairline-soft)',
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
          padding: 0,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '2px',
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-display)',
            lineHeight: 1.1,
          }}
        >
          Viño<span style={{ color: 'var(--color-accent)' }}>Plastic</span>
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: 'var(--typography-caption-size)',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-muted)',
              lineHeight: 'var(--typography-caption-lh)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
        {extras}

        {showRefresh && (
          <motion.button
            whileTap={{ scale: 0.93 }}
            animate={{ rotate: isRefreshing ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={handleRefresh}
            title="Actualizar aplicación"
            aria-label="Actualizar aplicación"
            data-testid="portal-header-refresh"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgb(var(--color-accent-raw) / 0.08)',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}
          >
            <RefreshCw size={16} />
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          data-testid="portal-header-logout"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgb(var(--color-semantic-error-raw) / 0.08)',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-semantic-error)',
          }}
        >
          <LogOut size={16} />
        </motion.button>
      </div>
    </header>
  );
};
