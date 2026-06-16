import React, { useState, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Check, LogIn, ArrowLeft } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { AuthError } from '../components/AuthError';
import { NipInput } from '../components/NipInput';
import { StepProgress } from '../components/StepProgress';
import { notify } from '../lib/notify';
import { LoginTransition, LOGIN_TRANSITION_MS } from '../components/LoginTransition';
import { MAPA_TURNOS } from '../lib/turnos';
import { useReducedMotion } from '../lib/useReducedMotion';

/* ============================================================
   LOGIN — Colaborador (flujo NIP 4 dígitos)
   Pasos:
     1. Número de empleado
     2. Pregunta de seguridad (turno) → muestra foto + nombre
     3. Crear NIP        (solo si no existe)
     4. Confirmar NIP    (solo si no existe)
     5. Ingresar NIP existente
   ============================================================ */

const NIP_LENGTH = 4;
const TOTAL_STEPS_NEW_NIP   = 4; // 1→2→3→4
const TOTAL_STEPS_EXIST_NIP = 2; // 1→5

/* Catálogo central de pasos — añadir uno nuevo es solo añadir aquí */
const STEPS = {
  1: { eyebrow: 'Colaborador',  label: 'Identificación' },
  2: { eyebrow: 'Verificación', label: 'Verificación' },
  3: { eyebrow: 'Crear NIP',    label: 'Nuevo NIP' },
  4: { eyebrow: 'Confirmar',    label: 'Confirmación' },
  5: { eyebrow: 'Acceso',       label: 'Ingreso' },
};

/* NIPs triviales rechazados (anti-patrones obvios) */
const WEAK_NIPS = new Set([
  '0000','1111','2222','3333','4444','5555','6666','7777','8888','9999',
  '1234','2345','3456','4567','5678','6789','7890',
  '0987','9876','8765','7654','6543','5432','4321','3210',
]);

const stepMotion = (reduced) => reduced ? {
  initial: false,
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} : {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
};

export const EmpleadoLogin = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [step, setStep]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [numEmpleado, setNumEmpleado] = useState('');
  const [empleado, setEmpleado]       = useState(null);
  const [options, setOptions]         = useState([]);
  const [nip, setNip]                 = useState('');
  const [confirmNip, setConfirmNip]   = useState('');
  const [error, setError]             = useState('');
  const [successAnim, setSuccessAnim] = useState(false);

  /* IDs únicos para aria-describedby */
  const introHintId = useId();

  /* Pasos visibles para el indicador (cambia según flujo) */
  const flow = empleado?.nip ? 'existing' : 'new';
  const total = flow === 'existing' ? TOTAL_STEPS_EXIST_NIP : TOTAL_STEPS_NEW_NIP;
  const currentForUI = useMemo(() => {
    if (step === 5) return 2; // step 5 es el 2/2 del flujo "existing"
    return step;
  }, [step]);

  /* ── Buscar empleado ── */
  const handleBuscarEmpleado = async (e) => {
    e?.preventDefault?.();
    if (!numEmpleado.trim()) return;
    setError('');
    setLoading(true);

    try {
      const { data, error: dbErr } = await supabase
        .from('empleados')
        .select('id, nombre, turno, foto_url, nip')
        .eq('numero_empleado', numEmpleado.trim())
        .maybeSingle();

      if (dbErr || !data) {
        setError('No encontramos ese número');
        return;
      }

      setEmpleado(data);

      if (data.nip) {
        setStep(5);
        return;
      }

      const dbTurno   = String(data.turno || '').trim();
      const realTurno = MAPA_TURNOS[dbTurno] || dbTurno;

      if (!realTurno) {
        setError('Turno sin asignar. Contacta a RH.');
        setEmpleado(null);
        return;
      }

      // Opciones = todos los turnos del MAPA + el real (si no está)
      const base = Object.keys(MAPA_TURNOS);
      const set  = new Set(base);
      set.add(realTurno);
      const posibles = Array.from(set);
      setOptions(posibles.map((t) => ({ label: t, isReal: t === realTurno })));
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarTurno = (isReal) => {
    if (isReal) {
      setError('');
      setStep(3);
    } else {
      setError('Respuesta incorrecta. Vuelve a empezar.');
      // Permanecemos en step 2 unos ms para que el usuario lea, luego reset
      setTimeout(() => resetFlow(), 900);
    }
  };

  const handleCrearNip = (e) => {
    e?.preventDefault?.();
    if (nip.length !== NIP_LENGTH) return;
    if (WEAK_NIPS.has(nip)) {
      setError('Elige un NIP menos predecible');
      setNip('');
      return;
    }
    setError('');
    setStep(4);
  };

  const handleConfirmarNip = async (e) => {
    e?.preventDefault?.();
    if (confirmNip.length !== NIP_LENGTH) return;
    if (nip !== confirmNip) {
      setError('Los NIP no coinciden');
      setConfirmNip(''); // conserva nip original (UX item 11)
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { error: dbErr } = await supabase
        .from('empleados')
        .update({ nip })
        .eq('id', empleado.id);
      if (dbErr) throw dbErr;
      notify.success('NIP creado');
      iniciarSesion(empleado.id);
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginNip = (e) => {
    e?.preventDefault?.();
    if (nip.length !== NIP_LENGTH) return;
    if (nip !== empleado.nip) {
      setError('NIP incorrecto');
      setNip('');
      return;
    }
    setError('');
    iniciarSesion(empleado.id);
  };

  const iniciarSesion = (id) => {
    try { localStorage.setItem('empleado_id', id); } catch { /* iOS private: ignore */ }
    setSuccessAnim(true);
    setTimeout(() => navigate('/empleado/dashboard'), LOGIN_TRANSITION_MS);
  };

  /* ── Resets / navegación atrás ── */
  const resetFlow = () => {
    setStep(1);
    setNumEmpleado('');
    setEmpleado(null);
    setNip('');
    setConfirmNip('');
    setOptions([]);
    setError('');
  };

  const handleBack = () => {
    setError('');
    if (step === 2) resetFlow();
    else if (step === 3) { setNip(''); setStep(2); }
    else if (step === 4) { setConfirmNip(''); setStep(3); }
    else if (step === 5) resetFlow();
  };

  const canGoBack = step !== 1;
  const stepCfg   = STEPS[step];

  return (
    <>
      <LoginTransition isVisible={successAnim} userName={empleado?.nombre} />
      <AuthShell eyebrow={stepCfg.eyebrow} testId="empleado-login-page">

        {/* Progreso visual */}
        <StepProgress current={currentForUI} total={total} />

        {/* Anuncio del paso para lectores de pantalla (item 8) */}
        <p
          role="status"
          aria-live="polite"
          data-testid="step-announcer"
          style={srOnly}
        >
          Paso {currentForUI} de {total}: {stepCfg.label}
        </p>

        {/* Barra superior con back button (item 10) */}
        <div style={topBarStyle}>
          {canGoBack ? (
            <button
              type="button"
              onClick={handleBack}
              data-testid="empleado-back-step"
              aria-label="Volver al paso anterior"
              className="vp-back-btn"
              style={backBtnStyle}
            >
              <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Atrás</span>
            </button>
          ) : <span aria-hidden="true" />}
        </div>

        <AuthError testId="empleado-error">{error}</AuthError>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Número de empleado ── */}
          {step === 1 && (
            <motion.form
              key="step-1"
              {...stepMotion(reducedMotion)}
              onSubmit={handleBuscarEmpleado}
              style={formStyle}
              noValidate
            >
              <StepIntro
                icon={User}
                title="Bienvenido"
                subtitle="Ingresa tu número de empleado"
                hintId={introHintId}
              />
              <AuthField
                id="num-empleado"
                label="Número"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="next"
                autoComplete="off"
                value={numEmpleado}
                onChange={(e) => setNumEmpleado(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 10234"
                centered
                autoFocus
                aria-required="true"
                aria-invalid={Boolean(error)}
                aria-describedby={introHintId}
                data-testid="empleado-numero-input"
              />
              <AuthButton
                type="submit"
                onClick={handleBuscarEmpleado}
                loading={loading}
                loadingText="Buscando…"
                disabled={!numEmpleado}
                data-testid="empleado-buscar-btn"
              >
                Siguiente
              </AuthButton>
            </motion.form>
          )}

          {/* ── Step 2: Verificación de identidad ── */}
          {step === 2 && empleado && (
            <motion.div
              key="step-2"
              {...stepMotion(reducedMotion)}
              style={formStyle}
            >
              <EmpleadoIdentity empleado={empleado} />

              <fieldset style={fieldsetStyle} data-testid="empleado-turno-group">
                <legend style={legendStyle} id={introHintId}>
                  ¿Cuál es tu turno asignado?
                </legend>
                <div style={optionsGridStyle} role="radiogroup" aria-labelledby={introHintId}>
                  {options.map((op) => (
                    <button
                      key={op.label}
                      type="button"
                      role="radio"
                      aria-checked="false"
                      onClick={() => handleVerificarTurno(op.isReal)}
                      data-testid={`empleado-turno-opt-${op.label}`}
                      className="vp-turno-opt"
                      style={optionStyle}
                    >
                      Turno {op.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </motion.div>
          )}

          {/* ── Step 3: Crear NIP ── */}
          {step === 3 && (
            <motion.form
              key="step-3"
              {...stepMotion(reducedMotion)}
              onSubmit={handleCrearNip}
              style={formStyle}
              noValidate
            >
              <StepIntro
                icon={Lock}
                title="Crea tu NIP"
                subtitle={`${NIP_LENGTH} dígitos para proteger tu cuenta`}
                hintId={introHintId}
              />
              <NipInput
                value={nip}
                onChange={(v) => { setNip(v); if (error) setError(''); }}
                length={NIP_LENGTH}
                autoFocus
                error={Boolean(error)}
                labelledBy={introHintId}
                enterKeyHint="next"
                testId="empleado-nip-nuevo"
              />
              <AuthButton
                type="submit"
                onClick={handleCrearNip}
                disabled={nip.length !== NIP_LENGTH}
                data-testid="empleado-nip-siguiente-btn"
              >
                Siguiente
              </AuthButton>
            </motion.form>
          )}

          {/* ── Step 4: Confirmar NIP ── */}
          {step === 4 && (
            <motion.form
              key="step-4"
              {...stepMotion(reducedMotion)}
              onSubmit={handleConfirmarNip}
              style={formStyle}
              noValidate
            >
              <StepIntro
                icon={Check}
                title="Confirma tu NIP"
                subtitle="Repite los dígitos"
                hintId={introHintId}
              />
              <NipInput
                value={confirmNip}
                onChange={(v) => { setConfirmNip(v); if (error) setError(''); }}
                length={NIP_LENGTH}
                autoFocus
                error={Boolean(error)}
                labelledBy={introHintId}
                enterKeyHint="done"
                testId="empleado-nip-confirm"
              />
              <AuthButton
                type="submit"
                onClick={handleConfirmarNip}
                loading={loading}
                loadingText="Guardando…"
                disabled={confirmNip.length !== NIP_LENGTH}
                data-testid="empleado-nip-confirmar-btn"
              >
                Finalizar
              </AuthButton>
            </motion.form>
          )}

          {/* ── Step 5: Login con NIP existente ── */}
          {step === 5 && empleado && (
            <motion.form
              key="step-5"
              {...stepMotion(reducedMotion)}
              onSubmit={handleLoginNip}
              style={formStyle}
              noValidate
            >
              <EmpleadoIdentity empleado={empleado} variant="compact" />
              <NipInput
                value={nip}
                onChange={(v) => {
                  setNip(v);
                  if (error) setError('');
                  // Auto-submit cuando se completa (UX fluida)
                  if (v.length === NIP_LENGTH && empleado?.nip && v === empleado.nip) {
                    // breve delay para que el shake/feedback no aparezca antes
                    setTimeout(() => iniciarSesion(empleado.id), 80);
                  }
                }}
                length={NIP_LENGTH}
                autoFocus
                error={Boolean(error)}
                labelledBy="nip-login-label"
                enterKeyHint="done"
                testId="empleado-nip-login"
              />
              <span id="nip-login-label" style={srOnly}>Ingresa tu NIP de {NIP_LENGTH} dígitos</span>

              <AuthButton
                type="submit"
                onClick={handleLoginNip}
                disabled={nip.length !== NIP_LENGTH}
                trailingIcon={LogIn}
                data-testid="empleado-nip-login-btn"
              >
                Ingresar
              </AuthButton>

              <button
                type="button"
                onClick={resetFlow}
                data-testid="empleado-cambiar-btn"
                className="vp-link-btn"
                style={linkBtnStyle}
              >
                ¿No eres tú? Cambiar empleado
              </button>
            </motion.form>
          )}

        </AnimatePresence>

        {/* Estilos para hover/focus accesibles — sin onMouseOver/Out */}
        <style>{`
          .vp-turno-opt {
            transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
          }
          .vp-turno-opt:hover {
            border-color: var(--color-accent);
            color: var(--color-accent);
          }
          .vp-turno-opt:focus-visible {
            outline: none;
            border-color: var(--color-accent);
            color: var(--color-accent);
            box-shadow: 0 0 0 3px rgb(var(--color-accent-raw) / 0.18);
          }
          .vp-turno-opt:active {
            transform: scale(0.98);
          }

          .vp-link-btn {
            text-decoration: underline;
            text-decoration-color: rgb(var(--color-ink-raw, 0 0 0) / 0.2);
            text-underline-offset: 3px;
            transition: color 120ms ease, text-decoration-color 120ms ease;
          }
          .vp-link-btn:hover, .vp-link-btn:focus-visible {
            color: var(--color-ink);
            text-decoration-color: var(--color-ink);
            outline: none;
          }
          .vp-link-btn:focus-visible {
            box-shadow: 0 0 0 3px rgb(var(--color-accent-raw) / 0.18);
            border-radius: var(--rounded-sm);
          }

          .vp-back-btn {
            transition: color 120ms ease, background-color 120ms ease;
          }
          .vp-back-btn:hover, .vp-back-btn:focus-visible {
            color: var(--color-ink);
            background: var(--color-canvas-soft);
            outline: none;
          }
          .vp-back-btn:focus-visible {
            box-shadow: 0 0 0 3px rgb(var(--color-accent-raw) / 0.18);
          }

          @media (prefers-reduced-motion: reduce) {
            .vp-turno-opt, .vp-link-btn, .vp-back-btn { transition: none; }
            .vp-turno-opt:active { transform: none; }
          }
        `}</style>
      </AuthShell>
    </>
  );
};

/* ─── Intro de paso ─── */
const StepIntro = ({ icon: Icon, title, subtitle, tone = 'accent', hintId }) => {
  const toneColor = tone === 'success' ? 'var(--color-semantic-success)' : 'var(--color-accent)';
  const toneBg    = tone === 'success' ? 'rgb(var(--color-semantic-success-raw) / 0.1)' : 'rgb(var(--color-accent-raw) / 0.1)';
  return (
    <div style={introStyle}>
      {Icon && (
        <div style={{ ...introIconStyle, background: toneBg, color: toneColor }}>
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
      <h2 style={introTitleStyle}>{title}</h2>
      {subtitle && (
        <p id={hintId} style={introSubtitleStyle}>{subtitle}</p>
      )}
    </div>
  );
};

/* ─── Identidad del empleado (steps 2 y 5) ─── */
const EmpleadoIdentity = ({ empleado, variant = 'full' }) => {
  const firstName = empleado?.nombre?.split(' ')[0] || '';
  const compact = variant === 'compact';
  const size = compact ? '3rem' : '3.5rem';

  return (
    <div style={introStyle} data-testid="empleado-identity">
      {empleado.foto_url ? (
        <img
          src={empleado.foto_url}
          alt={`Foto de ${empleado.nombre}`}
          loading="lazy"
          decoding="async"
          style={{
            width: size, height: size, borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgb(var(--color-accent-raw) / 0.2)',
          }}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgb(var(--color-accent-raw) / 0.1)',
          color: 'var(--color-accent)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }} aria-hidden="true">
          <User size={compact ? 22 : 26} strokeWidth={1.75} />
        </div>
      )}
      <h2 style={introTitleStyle}>
        {compact ? `Hola, ${firstName}` : empleado.nombre || firstName}
      </h2>
      {!compact && (
        <p style={introSubtitleStyle}>Verifiquemos tu identidad</p>
      )}
      {compact && (
        <p style={introSubtitleStyle}>Ingresa tu NIP</p>
      )}
    </div>
  );
};

/* ============================================================
   STYLES — 100% tokens, mobile-first
   ============================================================ */
const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-base)',
};

const topBarStyle = {
  minHeight: '2.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
};

const backBtnStyle = {
  background: 'none',
  border: 'none',
  minHeight: '2.5rem',
  minWidth: '2.75rem',
  padding: 'var(--spacing-xxs) var(--spacing-sm)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--spacing-xxs)',
  borderRadius: 'var(--rounded-pill)',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--typography-caption-size)',
  color: 'var(--color-muted)',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
};

const introStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 'var(--spacing-xs)',
  marginBottom: 'var(--spacing-xs)',
};

const introIconStyle = {
  width: '2.5rem',
  height: '2.5rem',
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 'var(--spacing-xxs)',
};

const introTitleStyle = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--typography-title-md-size)',
  fontWeight: 'var(--typography-title-md-weight)',
  color: 'var(--color-ink)',
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
};

const introSubtitleStyle = {
  margin: 0,
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--typography-caption-size)',
  color: 'var(--color-muted)',
  lineHeight: 'var(--typography-caption-lh)',
};

const fieldsetStyle = {
  border: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-sm)',
};

const legendStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--typography-body-sm-size)',
  fontWeight: 'var(--typography-title-sm-weight)',
  color: 'var(--color-ink)',
  textAlign: 'center',
  padding: 0,
  marginBottom: 'var(--spacing-xs)',
  width: '100%',
};

const optionsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 'var(--spacing-xs)',
};

const optionStyle = {
  width: '100%',
  minHeight: '3rem',
  padding: 'var(--spacing-sm) var(--spacing-base)',
  borderRadius: 'var(--rounded-lg)',
  border: '1px solid var(--color-hairline-soft)',
  background: 'var(--color-surface-card)',
  color: 'var(--color-ink)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--typography-body-sm-size)',
  fontWeight: 'var(--typography-title-sm-weight)',
  textAlign: 'center',
  cursor: 'pointer',
  letterSpacing: '0.04em',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
};

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  minHeight: '2.75rem',
  padding: 'var(--spacing-xs) var(--spacing-sm)',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--typography-caption-size)',
  color: 'var(--color-muted)',
  textAlign: 'center',
  alignSelf: 'center',
  WebkitTapHighlightColor: 'transparent',
};

const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};
