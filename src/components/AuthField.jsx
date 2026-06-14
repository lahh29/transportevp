import React, { forwardRef } from 'react';

/**
 * AuthField — Input semántico con label flotante y soporte para icono + sufijo.
 * Cohesivo con AuthShell.
 */
export const AuthField = forwardRef(({
  id,
  label,
  icon: Icon,
  suffix = null,
  centered = false,
  ...inputProps
}, ref) => {
  return (
    <div style={S.field}>
      <label htmlFor={id} style={S.label}>
        {label}
      </label>
      <div style={S.wrap}>
        {Icon && (
          <Icon
            size={16}
            strokeWidth={1.75}
            style={S.icon}
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          id={id}
          style={{
            ...S.input,
            paddingLeft: Icon ? '2.25rem' : 'var(--spacing-sm)',
            paddingRight: suffix ? '2.75rem' : 'var(--spacing-sm)',
            textAlign: centered ? 'center' : 'left',
            letterSpacing: centered ? '0.4em' : 'normal',
            fontVariantNumeric: centered ? 'tabular-nums' : 'normal',
          }}
          {...inputProps}
        />
        {suffix && <div style={S.suffix}>{suffix}</div>}
      </div>
    </div>
  );
});
AuthField.displayName = 'AuthField';

const S = {
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xxs)',
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  },
  wrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: 'var(--spacing-sm)',
    color: 'var(--color-muted-soft)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    minHeight: '2.75rem',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-ink)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    outline: 'none',
    transition: 'border-color 120ms ease, background 120ms ease',
    boxSizing: 'border-box',
  },
  suffix: {
    position: 'absolute',
    right: 'var(--spacing-xs)',
    display: 'inline-flex',
    alignItems: 'center',
  },
};
