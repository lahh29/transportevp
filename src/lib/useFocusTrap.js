import { useEffect, useRef } from 'react';

/**
 * useFocusTrap — Atrapa el foco dentro de un contenedor.
 * Restaura el foco al elemento previamente activo al desmontar.
 *
 * Uso:
 *   const ref = useFocusTrap(isOpen);
 *   <div ref={ref}>...</div>
 */
export const useFocusTrap = (active) => {
  const ref = useRef(null);
  const lastFocused = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    lastFocused.current = document.activeElement;

    const root = ref.current;
    if (!root) return undefined;

    const getFocusable = () => Array.from(
      root.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null);

    // Foco inicial al primer elemento (o al contenedor)
    requestAnimationFrame(() => {
      const items = getFocusable();
      (items[0] || root).focus({ preventScroll: true });
    });

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last  = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);

    return () => {
      root.removeEventListener('keydown', onKey);
      // Restaura foco al disparador previo
      const prev = lastFocused.current;
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus({ preventScroll: true }); } catch { /* noop */ }
      }
    };
  }, [active]);

  return ref;
};
