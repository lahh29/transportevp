import React from 'react';

/**
 * Button component implementing Cursor design specs
 * Variants: primary, secondary, tertiary, download
 */
export const Button = ({ 
  children, 
  variant = 'primary', 
  active = false, 
  className = '', 
  style = {},
  ...props 
}) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
  };

  // Typography logic based on variant
  const getTypography = () => {
    if (variant === 'tertiary') return { fontSize: '16px', fontWeight: 400 }; // inline link
    return { fontSize: '14px', fontWeight: 500, letterSpacing: '0px' }; // typography.button
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: active ? 'var(--color-primary-active)' : 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          padding: '10px 18px',
          height: '40px',
          borderRadius: 'var(--rounded-md)',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-surface-card)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-hairline-strong)',
          padding: '10px 18px',
          height: '40px',
          borderRadius: 'var(--rounded-md)', // Or pill if needed
        };
      case 'download':
        return {
          backgroundColor: 'var(--color-ink)',
          color: 'var(--color-canvas)',
          padding: '12px 20px',
          height: '44px',
          borderRadius: 'var(--rounded-md)',
        };
      case 'tertiary':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-ink)',
          padding: 0,
          textDecoration: 'underline',
        };
      default:
        return {};
    }
  };

  const styles = {
    ...baseStyles,
    ...getTypography(),
    ...getVariantStyles(),
    ...style
  };

  return (
    <button style={styles} className={className} {...props}>
      {children}
    </button>
  );
};
