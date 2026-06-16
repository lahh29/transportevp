import React, { useState, useEffect, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Check, LogIn, ArrowLeft, Fingerprint } from 'lucide-react';
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
import { empleadoApi } from '../lib/empleadoApi';
import { empleadoSession, webauthnHints } from '../lib/empleadoSession';
import { webauthn } from '../lib/webauthn';
import { APP_ROUTES, MOTION, getFirstName } from '../lib/choferConfig';

/* ============================================================
   LOGIN — Colaborador (flujo NIP 4 dígitos + WebAuthn biométrico)
   Pasos:
     1. Número de empleado
     2. Verificación de turno (sólo primera vez)
     3. Crear NIP        (sólo primera vez)
     4. Confirmar NIP    (sólo primera vez)
     5. Ingresar NIP existente + opción biometría
     6. Prompt opcional: "¿Activar Face ID/Touch ID?" tras login
   ============================================================ */

const NIP_LENGTH = 4;

const STEPS = {
  1: { eyebrow: 'Colaborador',  label: 'Identificación' },
  2: { eyebrow: 'Verificación', label: 'Verificación' },
  3: { eyebrow: 'Crear NIP',    label: 'Nuevo NIP' },
  4: { eyebrow: 'Confirmar',    label: 'Confirmación' },
  5: { eyebrow: 'Acceso',       label: 'Ingreso' },
  6: { eyebrow: 'Biometría',    label: 'Acceso rápido' },
};

const stepMotion = (reduced) => reduced ? {
  initial: false,
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
} : {
  initial: { opacity: 0, y: MOTION.offset.sm },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -MOTION.offset.sm },
  transition: { duration: MOTION.duration.base, ease: MOTION.ease },
};

export const EmpleadoLogin = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [step, setStep]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [numEmpleado, setNumEmpleado] = useState('');
  const [empleado, setEmpleado]       = useState(null);
  const [hasWebAuthn, setHasWebAuthn] = useState(false);
  const [options, setOptions]         = useState([]);
  const [nip, setNip]                 = useState('');
  const [confirmNip, setConfirmNip]   = useState('');
  const [error, setError]             = useState('');
  const [successAnim, setSuccessAnim] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);

  const introHintId = useId();

  /* ── Si ya hay sesión válida, salta al dashboard ── */
  useEffect(() => {
    if (empleadoSession.isAuthenticated()) {
      navigate(APP_ROUTES.empleadoDashboard, { replace: true });
    }
  }, [navigate]);

  /* ── Detecta soporte biométrico ── */
  useEffect(() => {
    let alive = true;
    webauthn.hasPlatformAuthenticator().then((ok) => {
      if (alive) setBioAvailable(ok);
    });
    return () => { alive = false; };
  }, []);

  /* ── Progreso visual ── */
  const flow = empleado?.has_nip ? 'existing' : 'new';
  const total = flow === 'existing' ? 2 : 4;
  const currentForUI = useMemo(() => {
    if (step === 5 || step === 6) return 2;
    return step;
  }, [step]);

  /* ── Step 1: Buscar empleado ── */
  const handleBuscarEmpleado = async (e) => {
    e?.preventDefault?.();
    if (!numEmpleado.trim()) return;
    setError('');
    setLoading(true);

    try {
      const { empleado: emp } = await empleadoApi.find(numEmpleado.trim());
      setEmpleado(emp);
      setHasWebAuthn(emp.has_webauthn || webauthnHints.has(numEmpleado.trim()));

      if (emp.has_nip) {
        setStep(5);
        return;
      }

      // Primera vez: arma las opciones de turno
      const realTurno = String(emp.turno || '').trim();
      if (!realTurno) {
        setError('Turno sin asignar. Contacta a RH.');
        setEmpleado(null);
        return;
      }
      const base = Object.keys(MAPA_TURNOS);
      const set  = new Set(base);
      set.add(realTurno);
      const posibles = Array.from(set);
      setOptions(posibles.map((t) => ({ label: t, isReal: t === realTurno })));
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verificación de turno ── */
  const handleVerificarTurno = (op) => {
    if (op.isReal) {
      setError('');
      setStep(3);
    } else {
      setError('Respuesta incorrecta');
      setTimeout(() => resetFlow(), 900);
    }
  };

  /* ── Step 3 → 4 ── */
  const handleCrearNip = (e) => {
    e?.preventDefault?.();
    if (nip.length !== NIP_LENGTH) return;
    setError('');
    setStep(4);
  };

  /* ── Step 4: Confirmar y guardar ── */
  const handleConfirmarNip = async (e) => {
    e?.preventDefault?.();
    if (confirmNip.length !== NIP_LENGTH) return;
    if (nip !== confirmNip) {
      setError('Los NIP no coinciden');
      setConfirmNip('');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Verificación de turno se hizo en step 2 (lado cliente).
      // Para mayor seguridad, el backend la vuelve a verificar.
      const turnoReal = String(empleado.turno || '').trim();
      const { token, empleado: fresh } = await empleadoApi.setNipPrimerLogin(
        numEmpleado.trim(),
        turnoReal,
        nip,
      );
      empleadoSession.setToken(token, fresh);
      setEmpleado(fresh);
      notify.success('NIP creado');
      // Pregunta por biometría antes de entrar
      if (bioAvailable) setStep(6);
      else iniciarSesion();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 5: Login con NIP existente ── */
  const handleLoginNip = async (e) => {
    e?.preventDefault?.();
    if (nip.length !== NIP_LENGTH) return;
    setError('');
    setLoading(true);
    try {
      const { token, empleado: fresh } = await empleadoApi.login(numEmpleado.trim(), nip);
      empleadoSession.setToken(token, fresh);
      setEmpleado(fresh);
      // Si nunca enrolaron biometría y el dispositivo lo soporta, ofrécelo
      if (bioAvailable && !hasWebAuthn) setStep(6);
      else iniciarSesion();
    } catch (err) {
      setError(err.message);
      setNip('');
    } finally {
      setLoading(false);
    }
  };

  /* ── Login biométrico (atajo desde step 5) ── */
  const handleBiometricLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { token, empleado: fresh } = await webauthn.loginWithBiometric(numEmpleado.trim());
      empleadoSession.setToken(token, fresh);
      setEmpleado(fresh);
      iniciarSesion();
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        // Usuario canceló el prompt — silencio
      } else {
        setError(err.message || 'No se pudo usar biometría');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 6: Enrolar biometría (opcional) ── */
  const handleEnableBio = async () => {
    setBioRegistering(true);
    try {
      await webauthn.register({ deviceLabel: navigator.userAgent.slice(0, 80) });
      webauthnHints.set(numEmpleado.trim(), true);
      notify.success('Biometría activada');
      iniciarSesion();
    } catch (err) {
      if (err?.name !== 'NotAllowedError') {
        notify.error('No se pudo activar la biometría');
      }
      iniciarSesion();
    } finally {
      setBioRegistering(false);
    }
  };

  const handleSkipBio = () => iniciarSesion();

  const iniciarSesion = () => {
    setSuccessAnim(true);
    setTimeout(() => navigate(APP_ROUTES.empleadoDashboard), LOGIN_TRANSITION_MS);
  };

  /* ── Resets ── */
  const resetFlow = () => {
    setStep(1);
    setNumEmpleado('');
    setEmpleado(null);
    setHasWebAuthn(false);
    setNip('');
    setConfirmNip('');
    setOptions([]);
    setError('');
  };

  const handleBack = () => {
    setError('');
    if (step === 2 || step === 5) resetFlow();
    else if (step === 3) { setNip(''); setStep(2); }
    else if (step === 4) { setConfirmNip(''); setStep(3); }
  };

  const canGoBack = step !== 1 && step !== 6;
  const stepCfg = STEPS[step];
  const showBioInStep5 = step === 5 && bioAvailable && (hasWebAuthn || empleado?.has_webauthn);

  return (
    <>
      <LoginTransition isVisible={successAnim} userName={empleado?.nombre} />
      <AuthShell eyebrow={stepCfg.eyebrow} testId="empleado-login-page">

        {step !== 6 && <StepProgress current={currentForUI} total={total} />}

        <p role="status" aria-live="polite" data-testid="step-announcer" style={srOnly}>
          {step === 6
            ? 'Activar acceso rápido con biometría'
            : `Paso ${currentForUI} de ${total}: ${stepCfg.label}`
          }
        </p>

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

          {/* ── Step 1 ── */}
          {step === 1 && (
            <motion.form key="step-1" {...stepMotion(reducedMotion)} onSubmit={handleBuscarEmpleado} style={formStyle} noValidate>
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

          {/* ── Step 2 ── */}
          {step === 2 && empleado && (
            <motion.div key="step-2" {...stepMotion(reducedMotion)} style={formStyle}>
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
                      onClick={() => handleVerificarTurno(op)}
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

          {/* ── Step 3 ── */}
          {step === 3 && (
            <motion.form key="step-3" {...stepMotion(reducedMotion)} onSubmit={handleCrearNip} style={formStyle} noValidate>
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

          {/* ── Step 4 ── */}
          {step === 4 && (
            <motion.form key="step-4" {...stepMotion(reducedMotion)} onSubmit={handleConfirmarNip} style={formStyle} noValidate>
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

          {/* ── Step 5 ── */}
          {step === 5 && empleado && (
            <motion.form key="step-5" {...stepMotion(reducedMotion)} onSubmit={handleLoginNip} style={formStyle} noValidate>
              <EmpleadoIdentity empleado={empleado} variant="compact" />

              {showBioInStep5 && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  className="vp-bio-btn"
                  style={bioBtnStyle}
                  data-testid="empleado-bio-login"
                >
                  <Fingerprint size={20} strokeWidth={1.75} aria-hidden="true" />
                  <span>Ingresar con biometría</span>
                </button>
              )}

              <NipInput
                value={nip}
                onChange={(v) => { setNip(v); if (error) setError(''); }}
                length={NIP_LENGTH}
                autoFocus={!showBioInStep5}
                error={Boolean(error)}
                labelledBy="nip-login-label"
                enterKeyHint="done"
                testId="empleado-nip-login"
              />
              <span id="nip-login-label" style={srOnly}>Ingresa tu NIP de {NIP_LENGTH} dígitos</span>

              <AuthButton
                type="submit"
                onClick={handleLoginNip}
                loading={loading}
                loadingText="Verificando…"
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

          {/* ── Step 6: Prompt biometría ── */}
          {step === 6 && (
            <motion.div key="step-6" {...stepMotion(reducedMotion)} style={formStyle}>
              <StepIntro
                icon={Fingerprint}
                title="Acceso rápido"
                subtitle="Activa Face ID o Touch ID para entrar sin NIP"
              />
              <AuthButton
                onClick={handleEnableBio}
                loading={bioRegistering}
                loadingText="Activando…"
                data-testid="empleado-bio-enable"
              >
                Activar biometría
              </AuthButton>
              <button
                type="button"
                onClick={handleSkipBio}
                disabled={bioRegistering}
                className="vp-link-btn"
                style={linkBtnStyle}
                data-testid="empleado-bio-skip"
              >
                Ahora no
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        <style>{`
          .vp-turno-opt { transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease; }
          .vp-turno-opt:hover { border-color: var(--color-accent); color: var(--color-accent); }
          .vp-turno-opt:focus-visible {
            outline: none;
            border-color: var(--color-accent);
            color: var(--color-accent);
            box-shadow: 0 0 0 3px rgb(var(--color-accent-raw) / 0.18);
          }
          .vp-turno-opt:active { transform: scale(0.98); }

          .vp-link-btn {
            text-decoration: underline;
            text-decoration-color: rgb(0 0 0 / 0.18);
            text-underline-offset: 3px;
            transition: color 120ms ease, text-decoration-color 120ms ease, box-shadow 120ms ease;
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

          .vp-back-btn { transition: color 120ms ease, background-color 120ms ease; }
          .vp-back-btn:hover, .vp-back-btn:focus-visible {
            color: var(--color-ink); background: var(--color-canvas-soft); outline: none;
          }
          .vp-back-btn:focus-visible { box-shadow: 0 0 0 3px rgb(var(--color-accent-raw) / 0.18); }

          .vp-bio-btn { transition: background 140ms ease, border-color 140ms ease, color 140ms ease; }
          .vp-bio-btn:hover, .vp-bio-btn:focus-visible {
            background: rgb(var(--color-accent-raw) / 0.08);
            border-color: var(--color-accent);
            color: var(--color-accent);
            outline: none;
          }
          .vp-bio-btn:focus-visible { box-shadow: 0 0 0 3px rgb(var(--color-accent-raw) / 0.18); }
          .vp-bio-btn:disabled { opacity: 0.55; cursor: not-allowed; }

          @media (prefers-reduced-motion: reduce) {
            .vp-turno-opt, .vp-link-btn, .vp-back-btn, .vp-bio-btn { transition: none; }
            .vp-turno-opt:active { transform: none; }
          }
        `}</style>
      </AuthShell>
    </>
  );
};

/* ─── Intro de paso ─── */
const StepIntro = ({ icon: Icon, title, subtitle, hintId }) => (
  <div style={introStyle}>
    {Icon && (
      <div style={{ ...introIconStyle, background: 'rgb(var(--color-accent-raw) / 0.1)', color: 'var(--color-accent)' }}>
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </div>
    )}
    <h2 style={introTitleStyle}>{title}</h2>
    {subtitle && <p id={hintId} style={introSubtitleStyle}>{subtitle}</p>}
  </div>
);

/* ─── Identidad ─── */
const EmpleadoIdentity = ({ empleado, variant = 'full' }) => {
  const firstName = getFirstName(empleado?.nombre);
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
        <div
          aria-hidden="true"
          style={{
            width: size, height: size, borderRadius: '50%',
            background: 'rgb(var(--color-accent-raw) / 0.1)',
            color: 'var(--color-accent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <User size={compact ? 22 : 26} strokeWidth={1.75} />
        </div>
      )}
      <h2 style={introTitleStyle}>
        {compact ? `Hola, ${firstName}` : empleado.nombre || firstName}
      </h2>
      <p style={introSubtitleStyle}>
        {compact ? 'Ingresa tu NIP' : 'Verifiquemos tu identidad'}
      </p>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
const formStyle = { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' };
const topBarStyle = { minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' };
const backBtnStyle = {
  background: 'none', border: 'none',
  minHeight: '2.5rem', minWidth: '2.75rem',
  padding: 'var(--spacing-xxs) var(--spacing-sm)',
  display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xxs)',
  borderRadius: 'var(--rounded-pill)', cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)',
  color: 'var(--color-muted)',
  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
};
const introStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  textAlign: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)',
};
const introIconStyle = {
  width: '2.5rem', height: '2.5rem', borderRadius: '50%',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: 'var(--spacing-xxs)',
};
const introTitleStyle = {
  margin: 0, fontFamily: 'var(--font-display)',
  fontSize: 'var(--typography-title-md-size)',
  fontWeight: 'var(--typography-title-md-weight)',
  color: 'var(--color-ink)', lineHeight: 1.2, letterSpacing: '-0.01em',
};
const introSubtitleStyle = {
  margin: 0, fontFamily: 'var(--font-body)',
  fontSize: 'var(--typography-caption-size)',
  color: 'var(--color-muted)', lineHeight: 'var(--typography-caption-lh)',
};
const fieldsetStyle = { border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' };
const legendStyle = {
  fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)',
  fontWeight: 'var(--typography-title-sm-weight)', color: 'var(--color-ink)',
  textAlign: 'center', padding: 0, marginBottom: 'var(--spacing-xs)', width: '100%',
};
const optionsGridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--spacing-xs)',
};
const optionStyle = {
  width: '100%', minHeight: '3rem',
  padding: 'var(--spacing-sm) var(--spacing-base)',
  borderRadius: 'var(--rounded-lg)',
  border: '1px solid var(--color-hairline-soft)',
  background: 'var(--color-surface-card)',
  color: 'var(--color-ink)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)',
  fontWeight: 'var(--typography-title-sm-weight)',
  textAlign: 'center', cursor: 'pointer',
  letterSpacing: '0.04em',
  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
};
const linkBtnStyle = {
  background: 'none', border: 'none', minHeight: '2.75rem',
  padding: 'var(--spacing-xs) var(--spacing-sm)', cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)',
  color: 'var(--color-muted)', textAlign: 'center', alignSelf: 'center',
  WebkitTapHighlightColor: 'transparent',
};
const bioBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 'var(--spacing-xs)',
  minHeight: '2.75rem',
  padding: 'var(--spacing-xs) var(--spacing-base)',
  borderRadius: 'var(--rounded-pill)',
  border: '1px dashed var(--color-hairline-strong)',
  background: 'transparent',
  color: 'var(--color-ink)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)',
  fontWeight: 600,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
};
const srOnly = {
  position: 'absolute', width: '1px', height: '1px',
  overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};
