import React, { useEffect, useState, useRef } from 'react';

/**
 * TypeWriter — efecto máquina de escribir en bucle.
 * Inspirado en `@kokonutui/type-writer` (shadcn registry).
 *
 * Props:
 *  - words: string | string[]   Texto(s) a tipear. Si es array, se rotan en bucle.
 *  - typeSpeed: ms por carácter al escribir (default 80)
 *  - deleteSpeed: ms por carácter al borrar (default 45)
 *  - holdFull: ms con texto completo antes de borrar (default 1400)
 *  - holdEmpty: ms en blanco antes de empezar de nuevo (default 350)
 *  - cursor: bool, default true. Muestra cursor parpadeante "▍"
 *  - cursorChar: string, default '▍'
 *  - as: tag para el wrapper (default 'span')
 *  - className / style: passthrough
 *  - ariaLabel: texto accesible estable (lo lee NVDA/JAWS, no la animación)
 *  - renderChar: (texto) => ReactNode  (opcional) para colorear partes del texto
 *
 * Respeta prefers-reduced-motion: si está activo, muestra el primer texto estático.
 *
 * 100% tokens: el color del cursor toma `currentColor`.
 */
export const TypeWriter = ({
  words,
  typeSpeed = 80,
  deleteSpeed = 45,
  holdFull = 1400,
  holdEmpty = 350,
  cursor = true,
  cursorChar = '▍',
  as: Tag = 'span',
  className,
  style,
  ariaLabel,
  renderChar,
}) => {
  const list = Array.isArray(words) ? words.filter(Boolean) : [words].filter(Boolean);
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (list.length === 0) return undefined;
    if (reducedMotion.current) {
      setText(list[0]);
      return undefined;
    }

    const current = list[idx % list.length];
    let delay;

    if (!deleting && text === current) {
      delay = holdFull;
      const id = setTimeout(() => setDeleting(true), delay);
      return () => clearTimeout(id);
    }

    if (deleting && text === '') {
      delay = holdEmpty;
      const id = setTimeout(() => {
        setDeleting(false);
        setIdx((n) => (n + 1) % list.length);
      }, delay);
      return () => clearTimeout(id);
    }

    delay = deleting ? deleteSpeed : typeSpeed;
    const id = setTimeout(() => {
      setText((prev) =>
        deleting ? current.slice(0, prev.length - 1) : current.slice(0, prev.length + 1),
      );
    }, delay);
    return () => clearTimeout(id);
  }, [text, deleting, idx, list, typeSpeed, deleteSpeed, holdFull, holdEmpty]);

  const stableLabel = ariaLabel ?? (list[0] || '');

  return (
    <Tag
      className={className}
      style={style}
      aria-label={stableLabel}
      data-testid="type-writer"
    >
      <style>{`
        @keyframes vp-tw-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vp-tw-cursor { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
      <span aria-hidden="true">
        {renderChar ? renderChar(text) : text}
      </span>
      {cursor && (
        <span
          className="vp-tw-cursor"
          aria-hidden="true"
          style={{
            display: 'inline-block',
            marginLeft: '0.05em',
            color: 'currentColor',
            animation: 'vp-tw-blink 900ms steps(1) infinite',
            transform: 'translateY(-0.04em)',
          }}
        >
          {cursorChar}
        </span>
      )}
    </Tag>
  );
};
