import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   LoginTransition — Animación de entrada al dashboard
   Diseño abstracto: anillos concéntricos + check geométrico
   + saludo tipográfico. Sin logo, sin emojis.
   ============================================================ */

const EASE = [0.22, 1, 0.36, 1]; // ease-out cubic suave

export const LoginTransition = ({ isVisible, userName = '' }) => {
  const firstName = userName ? String(userName).trim().split(/\s+/)[0] : '';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          data-testid="login-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.45, ease: EASE }}
          style={S.overlay}
        >
          {/* Ruido decorativo de fondo (anillos sutiles que se expanden) */}
          <RipplesBg />

          {/* Núcleo central */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.55, ease: EASE }}
            style={S.core}
          >
            <Mark />

            {/* Saludo tipográfico */}
            <div style={S.textBlock}>
              <Eyebrow />
              <Heading firstName={firstName} />
            </div>

            {/* Indicador de progreso */}
            <Indicator />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Anillos concéntricos de fondo ───────────────────────── */
const RipplesBg = () => (
  <>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        aria-hidden="true"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{
          delay: i * 0.55,
          duration: 2.8,
          ease: 'easeOut',
          repeat: Infinity,
        }}
        style={{
          position: 'absolute',
          width: 'min(60vmin, 24rem)',
          height: 'min(60vmin, 24rem)',
          borderRadius: '50%',
          border: '1px solid rgb(var(--color-accent-raw) / 0.18)',
          pointerEvents: 'none',
        }}
      />
    ))}
  </>
);

/* ─── Símbolo geométrico (check abstracto) ────────────────── */
const Mark = () => (
  <motion.svg
    width="72" height="72" viewBox="0 0 72 72"
    initial={{ scale: 0.6, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.18, type: 'spring', stiffness: 220, damping: 18 }}
    style={{ display: 'block' }}
    aria-hidden="true"
  >
    {/* Círculo accent (trazo animado) */}
    <motion.circle
      cx="36" cy="36" r="30"
      fill="none"
      stroke="rgb(var(--color-accent-raw))"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ delay: 0.24, duration: 0.7, ease: EASE }}
    />
    {/* Check trazo a trazo */}
    <motion.path
      d="M 22 37 L 32 47 L 51 27"
      fill="none"
      stroke="rgb(var(--color-accent-raw))"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ delay: 0.55, duration: 0.45, ease: EASE }}
    />
  </motion.svg>
);

/* ─── Eyebrow ─────────────────────────────────────────────── */
const Eyebrow = () => (
  <motion.span
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.85, duration: 0.4, ease: EASE }}
    style={S.eyebrow}
  >
    Acceso autorizado
  </motion.span>
);

/* ─── Heading con saludo (split letra a letra) ────────────── */
const Heading = ({ firstName }) => {
  const text = firstName ? `Hola, ${firstName}` : 'Bienvenido';
  const chars = text.split('');

  return (
    <h2 style={S.heading} aria-label={text}>
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.95 + i * 0.025,
            duration: 0.42,
            ease: EASE,
          }}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          aria-hidden="true"
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </h2>
  );
};

/* ─── Indicador de progreso ───────────────────────────────── */
const Indicator = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 1.4, duration: 0.3 }}
    style={S.indicator}
    aria-hidden="true"
  >
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        style={S.dot}
        animate={{
          opacity:   [0.25, 1, 0.25],
          y:         [0, -4, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.1,
          ease: 'easeInOut',
          delay: i * 0.15,
        }}
      />
    ))}
  </motion.div>
);

/* ─── Styles ──────────────────────────────────────────────── */
const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'var(--color-canvas)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 'var(--spacing-lg)',
  },
  core: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-xl)',
  },
  textBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    textAlign: 'center',
  },
  eyebrow: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-accent)',
  },
  heading: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(var(--typography-title-md-size), 7vw, var(--typography-display-md-size))',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)',
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  indicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: 'var(--spacing-sm)',
  },
  dot: {
    display: 'inline-block',
    width: '0.4rem',
    height: '0.4rem',
    borderRadius: '50%',
    background: 'var(--color-accent)',
  },
};
