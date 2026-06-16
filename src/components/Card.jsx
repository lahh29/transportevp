import React from 'react';

/**
 * Card component implementing Notion hairline-only depth
 * Use .card-elevated for soft shadow lift
 */
export const Card = ({ children, className = '', style = {}, elevated = false, ...props }) => {
  const cardStyles = {
    backgroundColor: 'var(--color-surface-card)',
    color: 'var(--color-ink)',
    borderRadius: 'var(--rounded-lg)',
    padding: 'var(--spacing-lg)',
    border: '1px solid var(--color-hairline-soft)',
    boxShadow: elevated ? 'var(--shadow-soft)' : 'var(--shadow-flat)',
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
    <div style={{ marginBottom: 'var(--spacing-base)', ...style }} className={className}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', style = {} }) => {
  return (
    <h3 style={{ 
      fontSize: 'var(--typography-title-size)', 
      fontWeight: 'var(--typography-title-weight)', 
      lineHeight: 'var(--typography-title-lh)',
      letterSpacing: 'var(--typography-title-ls)',
      margin: 0,
      color: 'var(--color-ink)',
      ...style 
    }} className={className}>
      {children}
    </h3>
  );
};
