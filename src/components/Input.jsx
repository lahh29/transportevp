import React from 'react';

/**
 * Text Input component implementing Notion design specs
 * Tight 4px radius, 6px vertical padding
 */
export const Input = ({ className = '', style = {}, ...props }) => {
  const inputStyles = {
    backgroundColor: 'var(--color-surface-card)',
    color: 'var(--color-ink)',
    borderRadius: 'var(--rounded-xs)', // Notion: tight 4px for inputs
    padding: '0.375rem var(--spacing-base)', // 6px vertical as Notion spec
    height: 'var(--input-height-md)',
    border: '1px solid rgb(221, 221, 221)', // Notion spec
    fontSize: 'var(--typography-body-md-size)', // 16px prevents iOS zoom
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
    ...style
  };

  return (
    <input 
      style={inputStyles} 
      className={className} 
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--color-ink)';
        e.target.style.boxShadow = 'var(--shadow-soft)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgb(221, 221, 221)';
        e.target.style.boxShadow = 'none';
      }}
      {...props} 
    />
  );
};
