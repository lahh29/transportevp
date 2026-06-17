import React from 'react';

/**
 * IconButton — botón cuadrado/circular para acciones de icono únicas.
 * Cohesivo con el design system: 100 % tokens, sin valores hardcodeados.
 *
 * Props
 *  - icon: ReactNode (ej. <Edit2 size={15} />)
 *  - variant: 'default' | 'danger'
 *  - size: 'sm' | 'md' (default md)
 *  - shape: 'square' | 'circle' (default square)
 *  - label: string — accesibilidad (aria-label/title)
 *  - testId: string
 *  - resto: props nativos de <button>
 */
export const IconButton = ({
  icon,
  variant = 'default',
  size = 'md',
  shape = 'square',
  label,
  testId,
  className = '',
  style = {},
  ...rest
}) => {
  const dim = size === 'sm' ? '2rem' : '2.25rem';
  const radius = shape === 'circle' ? 'var(--rounded-full)' : 'var(--rounded-md)';

  const isDanger = variant === 'danger';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-testid={testId}
      className={`vp-icon-btn ${isDanger ? 'vp-icon-btn--danger' : ''} ${className}`}
      style={{
        width: dim,
        height: dim,
        borderRadius: radius,
        ...style,
      }}
      {...rest}
    >
      <style>{`
        .vp-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--color-ink-muted);
          cursor: pointer;
          transition: background-color 120ms ease, color 120ms ease, transform 80ms ease;
          flex-shrink: 0;
        }
        .vp-icon-btn:hover {
          background: var(--color-hairline-soft);
          color: var(--color-ink);
        }
        .vp-icon-btn:active { transform: scale(0.95); }
        .vp-icon-btn:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        .vp-icon-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          pointer-events: none;
        }
        .vp-icon-btn--danger:hover {
          background: rgb(var(--color-semantic-error-raw) / 0.08);
          color: var(--color-semantic-error);
        }
        .vp-icon-btn--danger:focus-visible {
          outline-color: var(--color-semantic-error);
        }
      `}</style>
      {icon}
    </button>
  );
};
