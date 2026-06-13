import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path.split('#')[0];

  /* ── Render ── */
  return (
    <>
      <style>{`
        .topnav-link {
          position: relative;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-muted);
          cursor: pointer;
          text-decoration: none;
          padding: 4px 0;
          background: none;
          border: none;
          transition: color 0.15s;
          white-space: nowrap;
        }
        .topnav-link:hover { color: var(--color-ink); }
        .topnav-link.active { color: var(--color-ink); }
        .topnav-link.active::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0; right: 0;
          height: 1.5px;
          background: var(--color-ink);
          border-radius: 1px;
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
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'var(--color-canvas)',
          borderBottom: '1px solid var(--color-hairline-soft)',
        }}
      >
        {/* ── Brand ── */}
        <button
          onClick={() => navigate('/empresa')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
          }}
        >
          Viño<span style={{ color: 'var(--color-accent)' }}>Plastic</span>
        </button>

        {/* ── Desktop nav ── */}
        <nav
          className="topnav-desktop-only"
          style={{ display: 'flex', alignItems: 'center', gap: '28px' }}
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
          <div style={{ width: '1px', height: '16px', background: 'var(--color-hairline-soft)' }} />

          {/* Logout */}
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
              display: 'flex', alignItems: 'center',
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
            width: '36px', height: '36px', borderRadius: '8px',
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
              top: '56px', left: 0, right: 0,
              zIndex: 999,
              background: 'var(--color-canvas)',
              borderBottom: '1px solid var(--color-hairline-soft)',
              padding: '8px 24px 16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
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
                  textAlign: 'left', padding: '12px 0',
                  fontSize: '14px', fontWeight: isActive(path) ? 500 : 400,
                  color: isActive(path) ? 'var(--color-ink)' : 'var(--color-muted)',
                  borderBottom: '1px solid var(--color-hairline-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                {label}
                {isActive(path) && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--color-accent)',
                  }} />
                )}
              </motion.button>
            ))}

            <button
              onClick={handleLogout}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: '12px 0',
                fontSize: '14px', fontWeight: 400,
                color: 'var(--color-semantic-error)',
                display: 'flex', alignItems: 'center', gap: '8px',
                marginTop: '4px',
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
