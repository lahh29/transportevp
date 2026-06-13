import React from 'react';

/**
 * Text Input component implementing Cursor design specs
 */
export const Input = ({ className = '', style = {}, ...props }) => {
  const inputStyles = {
    backgroundColor: 'var(--color-surface-card)',
    color: 'var(--color-ink)',
    borderRadius: 'var(--rounded-md)',
    padding: '12px 16px',
    height: '44px',
    border: '1px solid var(--color-hairline-strong)',
    fontSize: '16px', // Prevents iOS zoom on focus
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
    ...style
  };

  return (
    <input 
      style={inputStyles} 
      className={className} 
      onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
      onBlur={(e) => e.target.style.borderColor = 'var(--color-hairline-strong)'}
      {...props} 
    />
  );
};
