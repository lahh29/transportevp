import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Menu, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '../lib/notify';

/* ─── Rutas de navegación ─── */
const NAV_LINKS = [
  { label: 'Historial',  path: '/historial'  },
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
        .topnav-wrapper {
          position: sticky;
          top: 1rem;
          z-index: 1000;
          margin: 0 auto;
          max-width: 1200px;
          width: calc(100% - 2rem);
        }
        .topnav-link {
          position: relative;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-ink-muted);
          cursor: pointer;
          text-decoration: none;
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          border-radius: 2rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .topnav-link:hover { 
          color: var(--color-ink); 
          background: rgba(0,0,0,0.04);
        }
        .topnav-link.active { 
          color: var(--color-ink); 
          font-weight: 600;
          background: rgba(0,0,0,0.06);
        }
        @media (min-width: 640px) { .topnav-mobile-only { display: none !important; } }
        @media (max-width: 639px) { .topnav-desktop-only { display: none !important; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div className="topnav-wrapper" ref={menuRef}>
        <header
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
            onClick={() => navigate('/empresa')}
            data-testid="topnav-brand"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem',
              textAlign: 'left',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
              minWidth: 0, overflow: 'hidden',
              borderRadius: '0.75rem',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.1,
            }}>
              Viño<span style={{ color: 'var(--color-primary)' }}>Plastic</span>
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              color: 'var(--color-ink-faint)',
              lineHeight: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Recursos Humanos
            </span>
          </button>

          {/* ── Desktop nav ── */}
          <nav
            className="topnav-desktop-only"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
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
            <div style={{ width: '1px', height: '1.25rem', background: 'rgba(0,0,0,0.08)', margin: '0 0.75rem' }} />

            {/* Actualizar */}
            <motion.button
              whileHover={{ scale: 1.05, background: 'rgba(0,0,0,0.05)', color: 'var(--color-ink)' }}
              whileTap={{ scale: 0.95 }}
              animate={{ rotate: isRefreshing ? 180 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              onClick={handleRefresh}
              title="Actualizar aplicación"
              aria-label="Actualizar aplicación"
              data-testid="topnav-refresh"
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-ink-muted)',
              }}
            >
              <RefreshCw size={18} strokeWidth={2} />
            </motion.button>

            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.05, background: 'rgba(207,45,86,0.1)', color: 'var(--color-semantic-error)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              data-testid="topnav-logout"
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-ink-muted)',
              }}
            >
              <LogOut size={18} strokeWidth={2} />
            </motion.button>
          </nav>

          {/* ── Mobile toggle ── */}
          <motion.button
            className="topnav-mobile-only"
            whileHover={{ background: 'rgba(0,0,0,0.05)' }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
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
                {menuOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </header>

        {/* ── Mobile dropdown ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="topnav-mobile-only"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{    opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 0.5rem)',
                left: 0, right: 0,
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                borderRadius: '1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)'
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
                    background: isActive(path) ? 'rgba(0,0,0,0.04)' : 'transparent', 
                    border: 'none', cursor: 'pointer',
                    textAlign: 'left', padding: '0.875rem 1rem',
                    fontSize: '0.9375rem',
                    fontWeight: isActive(path) ? 600 : 500,
                    color: isActive(path) ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                    borderRadius: '0.875rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  {label}
                  {isActive(path) && (
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--color-primary)',
                    }} />
                  )}
                </motion.button>
              ))}

              <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '0.25rem 0' }} />

              <button
                onClick={handleRefresh}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', padding: '0.875rem 1rem',
                  fontSize: '0.9375rem', fontWeight: 500,
                  color: 'var(--color-ink)',
                  borderRadius: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}
              >
                <motion.div animate={{ rotate: isRefreshing ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  <RefreshCw size={16} strokeWidth={2} color="var(--color-ink-muted)" />
                </motion.div>
                Actualizar aplicación
              </button>

              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', padding: '0.875rem 1rem',
                  fontSize: '0.9375rem', fontWeight: 500,
                  color: 'var(--color-semantic-error)',
                  borderRadius: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}
              >
                <LogOut size={16} strokeWidth={2} />
                Cerrar sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
