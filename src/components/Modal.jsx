import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal — diálogo cohesivo, mobile-first, semántico.
 *
 * Características:
 *  - Backdrop con blur, click para cerrar
 *  - Esc para cerrar
 *  - Bloquea scroll del body
 *  - Animación spring de entrada
 *  - Header con título + botón X
 *  - Scroll interno con safe-area-inset-bottom
 *  - role=dialog + aria-modal=true + aria-labelledby
 *
 * Props:
 *  - isOpen, onClose
 *  - title (string)
 *  - children
 *  - size: 'sm' | 'md' | 'lg' (default 'md')
 *  - testId (opcional)
 */
export const Modal = ({ isOpen, onClose, children, title, size = 'md', testId }) => {
  const dialogRef = useRef(null);

  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  // Esc para cerrar + focus inicial
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    // focus al diálogo (para a11y)
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const maxW = size === 'sm' ? 'min(92vw, 22rem)'
             : size === 'lg' ? 'min(96vw, 44rem)'
             : /* md */        'min(94vw, 32rem)';

  const titleId = title ? `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          data-testid={testId || 'modal-backdrop'}
          style={S.backdrop}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ scale: 0.97, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{ ...S.panel, maxWidth: maxW }}
          >
            {title && (
              <header style={S.header}>
                <h2 id={titleId} style={S.title}>{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  data-testid="modal-close-btn"
                  style={S.closeBtn}
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </header>
            )}
            <div style={S.body}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const S = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'var(--backdrop-color)',
    backdropFilter: 'blur(var(--backdrop-blur))',
    WebkitBackdropFilter: 'blur(var(--backdrop-blur))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-base)',
    paddingTop: 'max(var(--spacing-base), env(safe-area-inset-top))',
    paddingBottom: 'max(var(--spacing-base), env(safe-area-inset-bottom))',
    zIndex: 1000,
  },
  panel: {
    width: '100%',
    maxHeight: 'calc(100dvh - var(--spacing-xl))',
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-xl)',
    boxShadow: 'var(--shadow-elevated)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    outline: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-base) var(--spacing-lg)',
    borderBottom: '1px solid var(--color-hairline-soft)',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--typography-title-size)',
    fontWeight: 'var(--typography-title-weight)',
    color: 'var(--color-ink)',
    letterSpacing: 'var(--ls-tight-2)',
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  closeBtn: {
    width: 'var(--button-height-sm)',
    height: 'var(--button-height-sm)',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--color-canvas)',
    color: 'var(--color-ink-muted)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 120ms ease, color 120ms ease',
  },
  body: {
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: 'var(--spacing-lg)',
    flex: 1,
    minHeight: 0,
  },
};
