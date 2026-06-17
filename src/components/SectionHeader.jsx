import React from 'react';

/**
 * SectionHeader — encabezado semántico para secciones de página.
 *
 * Estructura:
 *   <header>
 *     [eyebrow opcional]
 *     <h1>title</h1>
 *     [description opcional]
 *     [acción opcional a la derecha en desktop]
 *   </header>
 *
 * Props
 *  - eyebrow: string opcional (label corto en mayúsculas, contexto)
 *  - title: string obligatorio
 *  - description: string opcional (línea de apoyo)
 *  - action: ReactNode opcional (ej. botón "Nuevo")
 *  - as: tag del título, default 'h1'
 *  - testId
 */
export const SectionHeader = ({
  eyebrow,
  title,
  description,
  action,
  as: Title = 'h1',
  testId,
}) => {
  return (
    <header className="vp-section-header" data-testid={testId}>
      <style>{`
        .vp-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: var(--spacing-base);
          flex-wrap: wrap;
          margin-bottom: var(--spacing-lg);
        }
        .vp-section-header__text {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xxs);
          min-width: 0;
          flex: 1 1 16rem;
        }
        .vp-section-header__eyebrow {
          font-family: var(--font-body);
          font-size: var(--typography-eyebrow-size);
          font-weight: var(--typography-eyebrow-weight);
          line-height: var(--typography-eyebrow-lh);
          letter-spacing: var(--typography-eyebrow-ls);
          text-transform: uppercase;
          color: var(--color-ink-faint);
          margin: 0;
        }
        .vp-section-header__title {
          font-family: var(--font-display);
          font-size: var(--typography-heading-2-size);
          font-weight: var(--typography-heading-2-weight);
          line-height: var(--typography-heading-2-lh);
          letter-spacing: var(--typography-heading-2-ls);
          color: var(--color-ink);
          margin: 0;
        }
        .vp-section-header__description {
          font-family: var(--font-body);
          font-size: var(--typography-body-sm-size);
          font-weight: var(--typography-body-sm-weight);
          line-height: var(--typography-body-sm-lh);
          color: var(--color-ink-muted);
          margin: 0;
          max-width: 48ch;
        }
        .vp-section-header__action { flex-shrink: 0; }
      `}</style>

      <div className="vp-section-header__text">
        {eyebrow && <p className="vp-section-header__eyebrow">{eyebrow}</p>}
        <Title className="vp-section-header__title">{title}</Title>
        {description && (
          <p className="vp-section-header__description">{description}</p>
        )}
      </div>

      {action && <div className="vp-section-header__action">{action}</div>}
    </header>
  );
};
