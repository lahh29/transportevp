import React, { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useIsMobile } from '../lib/useMediaQuery';

/**
 * Modal — diálogo cohesivo, mobile-first, semántico.
 *
 *  • Focus trap + restore foco previo
 *  • Bottom-sheet en mobile (slide-up), centrado en desktop
 *  • Backdrop con blur, click para cerrar
 *  • Esc para cerrar
 *  • Bloquea scroll del body
 *  • Header con título + botón X
 *  • Scroll interno con safe-area-inset-bottom
 *  • role=dialog + aria-modal=true + aria-labelledby
 */
export const Modal = ({ isOpen, onClose, children, title, size = 'md', testId, variant }) => {
  const focusRef = useFocusTrap(isOpen);
  const mobile = useIsMobile();
  const titleAutoId = useId();
  const titleId = title ? titleAutoId : undefined;

  /* Block body scroll */
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  /* Esc para cerrar */
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const useBottomSheet = (variant === 'sheet') || (mobile && variant !== 'centered');
  const maxW = size === 'sm' ? 'min(92vw, 22rem)'
             : size === 'lg' ? 'min(96vw, 44rem)'
             : 'min(94vw, 32rem)';

  const sheetMotion = useBottomSheet
    ? { initial: { y: '100%', opacity: 1 }, animate: { y: 0, opacity: 1 }, exit: { y: '100%', opacity: 1 } }
    : { initial: { scale: 0.97, opacity: 0, y: 8 }, animate: { scale: 1, opacity: 1, y: 0 }, exit: { scale: 0.97, opacity: 0, y: 8 } };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          data-testid={testId || 'modal-backdrop'}
          style={{ ...S.backdrop, alignItems: useBottomSheet ? 'flex-end' : 'center' }}
        >
          <motion.div
            ref={focusRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            {...sheetMotion}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...S.panel,
              maxWidth: useBottomSheet ? '100%' : maxW,
              width: useBottomSheet ? '100%' : '100%',
              borderRadius: useBottomSheet
                ? 'var(--rounded-xl) var(--rounded-xl) 0 0'
                : 'var(--rounded-xl)',
              maxHeight: useBottomSheet
                ? 'calc(100dvh - var(--spacing-xxl))'
                : 'calc(100dvh - var(--spacing-xl))',
            }}
          >
            {useBottomSheet && (
              <div aria-hidden="true" style={S.grabber} />
            )}
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
                  <X size={18} strokeWidth={2} aria-hidden="true" />
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
    justifyContent: 'center',
    padding: 'var(--spacing-base)',
    paddingTop: 'max(var(--spacing-base), env(safe-area-inset-top))',
    paddingBottom: 'max(var(--spacing-base), env(safe-area-inset-bottom))',
    zIndex: 1000,
  },
  panel: {
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    boxShadow: 'var(--shadow-elevated)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    outline: 'none',
  },
  grabber: {
    width: '2.5rem', height: '4px', borderRadius: 'var(--rounded-pill)',
    background: 'var(--color-hairline-strong)',
    margin: 'var(--spacing-xs) auto 0',
    flexShrink: 0,
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
    width: '2.5rem',
    height: '2.5rem',
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
    paddingBottom: 'max(var(--spacing-lg), env(safe-area-inset-bottom))',
    flex: 1,
    minHeight: 0,
  },
};
