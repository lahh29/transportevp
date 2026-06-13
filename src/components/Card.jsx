import React from 'react';

/**
 * Card component implementing hairline-only depth (no drop shadows)
 */
export const Card = ({ children, className = '', style = {}, ...props }) => {
  const cardStyles = {
    backgroundColor: 'var(--color-surface-card)',
    color: 'var(--color-ink)',
    borderRadius: 'var(--rounded-lg)',
    padding: '24px',
    border: '1px solid var(--color-hairline)',
    boxShadow: 'none', // Strictly no drop shadows
    ...style
  };

  return (
    <div style={cardStyles} className={className} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', style = {} }) => {
  return (
    <div style={{ marginBottom: '16px', ...style }} className={className}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', style = {} }) => {
  return (
    <h3 style={{ 
      fontSize: '18px', 
      fontWeight: 600, 
      lineHeight: 1.4, 
      margin: 0,
      ...style 
    }} className={className}>
      {children}
    </h3>
  );
};
