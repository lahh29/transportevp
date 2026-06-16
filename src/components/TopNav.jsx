import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Menu, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '../lib/notify';

/* ─── Rutas de navegación ─── */
const NAV_LINKS = [
  { label: 'Historial',  path: '/chofer#registros'  },
  { label: 'Empresa', path: '/empresa' },
];

export const TopNav = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef   = useRef(null);

  /* Cerrar menú al hacer click fuera */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  /* Cerrar menú al cambiar de ruta */
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    notify.bye();
    await supabase.auth.signOut();
    navigate('/');
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = () => {
    setIsRefreshing(true);
    const id = notify.loading('Actualizando aplicación…');
    setTimeout(() => {
      notify.dismiss(id);
      window.location.reload(true);
    }, 300);
  };

  const isActive = (path) => location.pathname === path.split('#')[0];

  /* ── Render ── */
  return (
    <>
      <style>{`
        .topnav-link {
          position: relative;
          font-size: var(--typography-nav-link-size);
          font-weight: var(--typography-nav-link-weight);
          color: var(--color-ink-muted);
          cursor: pointer;
          text-decoration: none;
          padding: var(--spacing-xxs) 0;
          background: none;
          border: none;
          transition: color 120ms ease;
          white-space: nowrap;
        }
        .topnav-link:hover { color: var(--color-ink); }
        .topnav-link.active { color: var(--color-ink); }
        .topnav-link.active::after {
          content: '';
          position: absolute;
          bottom: calc(-1 * var(--spacing-xxs));
          left: 0;
          right: 0;
          height: 0.09375rem;
          background: var(--color-ink);
          border-radius: 0.0625rem;
        }
        @media (min-width: 640px) { .topnav-mobile-only { display: none !important; } }
        @media (max-width: 639px) { .topnav-desktop-only { display: none !important; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <header
        ref={menuRef}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          minHeight: 'var(--nav-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-xs) var(--spacing-lg)',
          background: 'var(--color-canvas-soft)',
          borderBottom: '1px solid var(--color-hairline-soft)',
        }}
      >
        {/* ── Brand ── */}
        <button
          onClick={() => navigate('/empresa')}
          data-testid="topnav-brand"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            textAlign: 'left',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'calc(var(--spacing-xxs) / 2)',
            minWidth: 0, overflow: 'hidden',
          }}
        >
          <span style={{
            fontSize: 'var(--typography-title-size)',
            fontWeight: 'var(--typography-title-weight)',
            letterSpacing: 'var(--ls-tight-2)',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-display)',
            lineHeight: 1.1,
          }}>
            Viño<span style={{ color: 'var(--color-primary)' }}>Plastic</span>
          </span>
          <span style={{
            fontSize: 'var(--typography-caption-size)',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-ink-muted)',
            lineHeight: 'var(--typography-caption-lh)',
          }}>
            Recursos Humanos
          </span>
        </button>

        {/* ── Desktop nav ── */}
        <nav
          className="topnav-desktop-only"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}
        >
          {NAV_LINKS.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`topnav-link${isActive(path) ? ' active' : ''}`}
            >
              {label}
            </button>
          ))}

          {/* Separador */}
          <div style={{ width: '1px', height: 'var(--spacing-base)', background: 'var(--color-hairline-soft)' }} />

          {/* Actualizar */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            animate={{ rotate: isRefreshing ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={handleRefresh}
            title="Actualizar aplicación"
            aria-label="Actualizar aplicación"
            data-testid="topnav-refresh"
            style={{
              width: 'var(--button-height-sm)',
              height: 'var(--button-height-sm)',
              borderRadius: '50%',
              background: 'rgb(var(--color-primary-raw) / 0.08)',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <RefreshCw size={16} />
          </motion.button>

          {/* Logout */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            data-testid="topnav-logout"
            style={{
              width: 'var(--button-height-sm)',
              height: 'var(--button-height-sm)',
              borderRadius: '50%',
              background: 'rgb(var(--color-semantic-error-raw) / 0.08)',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-semantic-error)',
            }}
          >
            <LogOut size={16} />
          </motion.button>
        </nav>

        {/* ── Mobile toggle ── */}
        <motion.button
          className="topnav-mobile-only"
          whileTap={{ scale: 0.93 }}
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 'var(--button-height-sm)',
            height: 'var(--button-height-sm)',
            borderRadius: 'var(--rounded-md)',
            color: 'var(--color-ink)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={menuOpen ? 'x' : 'menu'}
              initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0,   scale: 1   }}
              exit={{    opacity: 0, rotate:  45, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex' }}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </header>

      {/* ── Mobile dropdown ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="topnav-mobile-only"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: 'var(--nav-height)', left: 0, right: 0,
              zIndex: 999,
              background: 'var(--color-canvas-soft)',
              borderBottom: '1px solid var(--color-hairline-soft)',
              padding: 'var(--spacing-xs) var(--spacing-lg) var(--spacing-base)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-soft)'
            }}
          >
            {NAV_LINKS.map(({ label, path }, i) => (
              <motion.button
                key={path}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0  }}
                transition={{ delay: i * 0.04, duration: 0.15 }}
                onClick={() => navigate(path)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', padding: 'var(--spacing-sm) 0',
                  fontSize: 'var(--typography-body-sm-size)',
                  fontWeight: isActive(path) ? 500 : 400,
                  color: isActive(path) ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                  borderBottom: '1px solid var(--color-hairline-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                {label}
                {isActive(path) && (
                  <span style={{
                    width: 'var(--spacing-xs)', height: 'var(--spacing-xs)', borderRadius: '50%',
                    background: 'var(--color-primary)',
                  }} />
                )}
              </motion.button>
            ))}

            <button
              onClick={handleRefresh}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: 'var(--spacing-sm) 0',
                fontSize: 'var(--typography-body-sm-size)', fontWeight: 400,
                color: 'var(--color-ink)',
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                marginTop: 'var(--spacing-xxs)',
                borderBottom: '1px solid var(--color-hairline-soft)',
              }}
            >
              <motion.div animate={{ rotate: isRefreshing ? 180 : 0 }} transition={{ duration: 0.3 }}>
                <RefreshCw size={15} color="var(--color-ink-muted)" />
              </motion.div>
              Actualizar aplicación
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: 'var(--spacing-sm) 0',
                fontSize: 'var(--typography-body-sm-size)', fontWeight: 400,
                color: 'var(--color-semantic-error)',
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                marginTop: 'var(--spacing-xxs)',
              }}
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
