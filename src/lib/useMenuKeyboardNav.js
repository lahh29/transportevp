import { useEffect, useRef } from 'react';

/**
 * useMenuKeyboardNav — Navegación de teclado para menús WAI-ARIA.
 *
 * Conecta:
 *  - ArrowDown/Up para navegar entre items
 *  - Home/End para primero/último
 *  - Escape para cerrar
 *  - Tab para cerrar (sale del menú)
 *
 * Uso:
 *   const containerRef = useMenuKeyboardNav({ isOpen, onClose });
 *   <div ref={containerRef} role="menu">
 *     <button role="menuitem">…</button>
 *   </div>
 */
export const useMenuKeyboardNav = ({ isOpen, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen || !ref.current) return undefined;
    const root = ref.current;

    const items = () => Array.from(root.querySelectorAll('[role="menuitem"]:not([disabled])'));

    // Enfoca el primer item al abrir
    requestAnimationFrame(() => {
      const first = items()[0];
      first?.focus({ preventScroll: true });
    });

    const onKey = (e) => {
      const list = items();
      if (list.length === 0) return;
      const idx = list.indexOf(document.activeElement);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = list[(idx + 1) % list.length];
          next?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = list[(idx - 1 + list.length) % list.length];
          prev?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          list[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          list[list.length - 1]?.focus();
          break;
        }
        case 'Escape':
        case 'Tab': {
          e.preventDefault();
          onClose?.();
          break;
        }
        default: break;
      }
    };

    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return ref;
};
