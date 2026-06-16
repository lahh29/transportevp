import React from 'react';

/**
 * StepProgress — Indicador de progreso minimalista para flujos multi-step.
 * Muestra N puntos: rellenos = pasos completados, anillo = paso actual.
 * Accesible: <ol> semántico + aria-current + visually-hidden text.
 *
 * Props:
 *  - current: paso actual (1-indexed)
 *  - total: total de pasos
 *  - label?: string corto opcional ("Paso 2 de 5")
 */
export const StepProgress = ({ current, total, label }) => {
  const stepsLabel = label || `Paso ${current} de ${total}`;
  return (
    <div
      role="group"
      aria-label={stepsLabel}
      data-testid="step-progress"
      style={S.wrap}
    >
      <ol style={S.list}>
        {Array.from({ length: total }).map((_, i) => {
          const idx = i + 1;
          const state = idx < current ? 'done' : idx === current ? 'current' : 'todo';
          return (
            <li
              key={idx}
              data-state={state}
              aria-current={idx === current ? 'step' : undefined}
              style={S.item}
            >
              <span style={dotStyle(state)} aria-hidden="true" />
              <span style={S.sr}>Paso {idx}{idx === current ? ' (actual)' : ''}</span>
            </li>
          );
        })}
      </ol>
      <span aria-live="polite" style={S.sr}>{stepsLabel}</span>
    </div>
  );
};

const dotStyle = (state) => ({
  display: 'inline-block',
  width: state === 'current' ? '1.25rem' : '0.5rem',
  height: '0.5rem',
  borderRadius: 'var(--rounded-pill)',
  background:
    state === 'done'    ? 'var(--color-ink)'
    : state === 'current' ? 'var(--color-accent)'
    :                       'var(--color-hairline)',
  transition: 'width 220ms ease, background-color 180ms ease',
});

const S = {
  wrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 'var(--spacing-xs)',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '0.5rem',
  },
  sr: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
};
