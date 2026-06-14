import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * AuthButton — botón primario cohesivo para forms de auth.
 */
export const AuthButton = ({
  children,
  loading = false,
  disabled = false,
  loadingText = 'Procesando…',
  trailingIcon = ArrowRight,
  ...rest
}) => {
  const isOff = loading || disabled;
  const TrailIcon = trailingIcon;

  return (
    <button
      type="button"
      disabled={isOff}
      aria-busy={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-xs)',
        width: '100%',
        minHeight: '2.75rem',
        padding: '0 var(--spacing-base)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--typography-button-size)',
        fontWeight: 'var(--typography-button-weight)',
        letterSpacing: 'var(--typography-button-ls)',
        color: 'var(--color-on-primary)',
        background: 'var(--color-accent)',
        border: 'none',
        borderRadius: 'var(--rounded-md)',
        cursor: isOff ? 'not-allowed' : 'pointer',
        opacity: isOff ? 0.55 : 1,
        transition: 'background-color 120ms ease, transform 80ms ease, opacity 120ms ease',
      }}
      onMouseDown={(e) => { if (!isOff) e.currentTarget.style.transform = 'scale(0.99)'; }}
      onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e)=> { e.currentTarget.style.transform = 'scale(1)'; }}
      {...rest}
    >
      {loading ? loadingText : children}
      {!loading && TrailIcon && <TrailIcon size={15} strokeWidth={2} aria-hidden="true" />}
    </button>
  );
};
