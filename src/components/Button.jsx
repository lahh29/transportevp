import React from 'react';

/**
 * Button component implementing Notion design specs
 * Variants: primary, secondary, tertiary, download, utility
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
    transition: 'all 120ms ease',
    textDecoration: 'none',
  };

  // Typography logic based on variant
  const getTypography = () => {
    if (variant === 'tertiary') return { 
      fontSize: 'var(--typography-body-md-size)', 
      fontWeight: 'var(--typography-body-md-weight)',
      lineHeight: 'var(--typography-body-md-lh)',
      letterSpacing: 'var(--typography-body-md-ls)',
    };
    return { 
      fontSize: 'var(--typography-button-size)', 
      fontWeight: 'var(--typography-button-weight)',
      lineHeight: 'var(--typography-button-lh)',
      letterSpacing: 'var(--typography-button-ls)',
    };
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: active ? 'var(--color-primary-active)' : 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          padding: '0 var(--spacing-lg)',
          height: 'var(--button-height-md)',
          borderRadius: 'var(--rounded-pill)', // Notion: pill-shaped marketing CTAs
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-surface-card)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-hairline-soft)',
          padding: '0 var(--spacing-lg)',
          height: 'var(--button-height-md)',
          borderRadius: 'var(--rounded-pill)', // Notion: pill-shaped like primary
          boxShadow: 'var(--shadow-soft)', // Notion: carried by soft shadow
        };
      case 'utility':
        return {
          backgroundColor: 'var(--color-surface-card)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-hairline)',
          padding: 'var(--spacing-xxs) var(--spacing-base)',
          height: 'var(--button-height-sm)',
          borderRadius: 'var(--rounded-md)', // Notion: tighter 8px for utility
        };
      case 'download':
        return {
          backgroundColor: 'var(--color-ink)',
          color: 'var(--color-canvas)',
          padding: '0 var(--spacing-md)',
          height: 'var(--button-height-lg)',
          borderRadius: 'var(--rounded-md)',
        };
      case 'tertiary':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-primary)', // Notion: links use primary blue
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
