import { useEffect, useState } from 'react';

/**
 * useReducedMotion — Respeta `prefers-reduced-motion: reduce`.
 * Devuelve `true` si el usuario pidió menos animación.
 * WCAG 2.3.3 (Animation from Interactions).
 */
export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    // Safari <14 usa addListener
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);

  return reduced;
};
