import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * ModalKit — Componentes compartidos para los modales del portal /empresa.
 * Reemplaza las definiciones duplicadas de btnPrimary/btnSecondary/spinner/etc.
 *
 * Exports:
 *   <ModalSpinner />
 *   <ModalActions cancel={{label, onClick}} confirm={{label, onClick, loading, icon, disabled, variant}} />
 *   <ModalIntro icon title subtitle />
 */

/* Spinner cohesivo (un solo keyframe global) */
export const ModalSpinner = ({ size = 15 }) => (
  <Loader2
    size={size}
    strokeWidth={2}
    aria-hidden="true"
    style={{ animation: 'vp-modal-spin 0.8s linear infinite' }}
  />
);

/* Estilo de acciones bottom — secundaria + primaria */
export const ModalActions = ({
  cancel,
  confirm,
  testIdCancel = 'modal-cancel',
  testIdConfirm = 'modal-confirm',
}) => {
  const cancelDisabled = cancel?.disabled || confirm?.loading;
  const confirmDisabled = confirm?.disabled || confirm?.loading;
  const variant = confirm?.variant || 'primary';
  const ConfirmIcon = confirm?.icon;

  return (
    <div style={S.actions}>
      {cancel && (
        <button
          type="button"
          onClick={cancel.onClick}
          disabled={cancelDisabled}
          data-testid={testIdCancel}
          style={{
            ...S.btnSecondary,
            opacity: cancelDisabled ? 0.6 : 1,
            cursor: cancelDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {cancel.label || 'Cancelar'}
        </button>
      )}
      {confirm && (
        <motion.button
          type={confirm.type || 'button'}
          onClick={confirm.onClick}
          disabled={confirmDisabled}
          whileTap={confirmDisabled ? {} : { scale: 0.985 }}
          aria-busy={confirm.loading || undefined}
          data-testid={testIdConfirm}
          style={{
            ...(variant === 'danger' ? S.btnDanger : S.btnPrimary),
            opacity: confirmDisabled ? 0.55 : 1,
            cursor: confirmDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {confirm.loading
            ? <><ModalSpinner /> {confirm.loadingLabel || 'Procesando…'}</>
            : <>{ConfirmIcon && <ConfirmIcon size={15} strokeWidth={2} aria-hidden="true" />} {confirm.label}</>
          }
        </motion.button>
      )}

      <style>{`
        @keyframes vp-modal-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
};

/* Intro / cabecera dentro del cuerpo del modal */
export const ModalIntro = ({ icon: Icon, title, subtitle, tone = 'accent' }) => {
  const toneColor = tone === 'success' ? 'var(--color-semantic-success)'
                  : tone === 'danger'  ? 'var(--color-semantic-error)'
                  :                       'var(--color-accent)';
  const toneRaw = tone === 'success' ? 'var(--color-semantic-success-raw)'
                : tone === 'danger'  ? 'var(--color-semantic-error-raw)'
                :                       'var(--color-accent-raw)';
  return (
    <div style={S.intro}>
      {Icon && (
        <div
          style={{
            ...S.introIcon,
            background: `rgb(${toneRaw} / 0.1)`,
            color: toneColor,
          }}
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <p style={S.introTitle}>{title}</p>
      {subtitle && <p style={S.introBody}>{subtitle}</p>}
    </div>
  );
};

const S = {
  intro: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xl) var(--spacing-base)',
    border: '1.5px dashed var(--color-hairline-strong)',
    borderRadius: 'var(--rounded-lg)',
  },
  introIcon: {
    width: '2.75rem', height: '2.75rem', borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 'var(--spacing-xxs)',
  },
  introTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  introBody: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
    maxWidth: '24rem',
  },

  actions: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
    paddingTop: 'var(--spacing-sm)',
    borderTop: '1px solid var(--color-hairline-soft)',
  },
  btnSecondary: {
    flex: 1,
    minHeight: '2.75rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline)',
    background: 'transparent',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 500,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
  btnPrimary: {
    flex: 2,
    minHeight: '2.75rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: 'none',
    background: 'var(--color-accent)',
    color: 'var(--color-on-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    transition: 'opacity 120ms ease',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
  btnDanger: {
    flex: 2,
    minHeight: '2.75rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: 'none',
    background: 'var(--color-semantic-error)',
    color: 'var(--color-on-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    transition: 'opacity 120ms ease',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  },
};
