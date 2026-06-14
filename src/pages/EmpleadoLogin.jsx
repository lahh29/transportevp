import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Check, LogIn } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { LoginTransition } from '../components/LoginTransition';
import { notify, toast } from '../lib/notify';
import { MAPA_TURNOS } from '../lib/turnos';

/* ============================================================
   LOGIN — Colaborador (flujo NIP 4 dígitos)
   Pasos:
     1. Número de empleado
     2. Pregunta de seguridad (turno)
     3. Crear NIP
     4. Confirmar NIP
     5. Ingresar NIP (si ya existe)
   ============================================================ */

const stepMotion = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0  },
  exit:    { opacity: 0, x: -16 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

export const EmpleadoLogin = () => {
  const navigate = useNavigate();
  const [step, setStep]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [numEmpleado, setNumEmpleado] = useState('');
  const [empleado, setEmpleado]       = useState(null);
  const [options, setOptions]         = useState([]);
  const [nip, setNip]                 = useState('');
  const [confirmNip, setConfirmNip]   = useState('');
  const [successAnim, setSuccessAnim] = useState(false);

  /* ── Buscar empleado ── */
  const handleBuscarEmpleado = async (e) => {
    e?.preventDefault?.();
    if (!numEmpleado.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('numero_empleado', numEmpleado.trim())
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      toast.error('Número de empleado no encontrado.');
      return;
    }

    setEmpleado(data);

    if (data.nip) {
      setStep(5);
      return;
    }

    const dbTurno = String(data.turno || '').trim();
    const realTurno = MAPA_TURNOS[dbTurno] || dbTurno || 'Sin asignar';
    const posibles = ['1', '2', '3', '4'];
    if (!posibles.includes(realTurno) && realTurno !== 'Sin asignar') posibles.push(realTurno);
    setOptions(posibles.map((t) => ({ label: t, isReal: t === realTurno })));
    setStep(2);
  };

  const handleVerificarTurno = (isReal) => {
    if (isReal) {
      setStep(3);
    } else {
      toast.error('Respuesta incorrecta. Contacta a Reclutamiento si hay un error en tus datos.');
      setNumEmpleado(''); setEmpleado(null); setStep(1);
    }
  };

  const handleCrearNip = () => {
    if (nip.length !== 4) { toast.error('El NIP debe ser de 4 dígitos.'); return; }
    setStep(4);
  };

  const handleConfirmarNip = async () => {
    if (nip !== confirmNip) {
      toast.error('Los NIP no coinciden.');
      setNip(''); setConfirmNip(''); setStep(3);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('empleados').update({ nip }).eq('id', empleado.id);
    setLoading(false);

    if (error) { toast.error('Error al guardar NIP.'); return; }
    toast.success('¡NIP creado!');
    iniciarSesion(empleado.id);
  };

  const handleLoginNip = (e) => {
    e?.preventDefault?.();
    if (nip !== empleado.nip) { toast.error('NIP incorrecto.'); setNip(''); return; }
    iniciarSesion(empleado.id);
  };

  const iniciarSesion = (id) => {
    localStorage.setItem('empleado_id', id);
    notify.welcome(empleado?.nombre);
    setSuccessAnim(true);
    setTimeout(() => navigate('/empleado/dashboard'), 2500);
  };

  const handleCambiarEmpleado = () => {
    setStep(1); setNumEmpleado(''); setEmpleado(null); setNip(''); setConfirmNip('');
  };

  /* ── Eyebrow dinámico ── */
  const eyebrow = step === 1 ? 'Colaborador'
                : step === 2 ? 'Verificación'
                : step === 3 ? 'Crear NIP'
                : step === 4 ? 'Confirmar NIP'
                : /* 5 */     'Acceso';

  return (
    <>
      <LoginTransition isVisible={successAnim} userName={empleado?.nombre} />
      <AuthShell eyebrow={eyebrow} testId="empleado-login-page">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Número de empleado ── */}
          {step === 1 && (
            <motion.form key="step-1" {...stepMotion} onSubmit={handleBuscarEmpleado} style={formStyle}>
              <StepIntro
                icon={User}
                title="Bienvenido"
                subtitle="Ingresa tu número de empleado"
              />

              <AuthField
                id="num-empleado"
                label="Número"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={numEmpleado}
                onChange={(e) => setNumEmpleado(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 10234"
                centered
                autoFocus
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

          {/* ── Step 2: Pregunta de seguridad ── */}
          {step === 2 && (
            <motion.div key="step-2" {...stepMotion} style={formStyle}>
              <StepIntro
                title={`Hola, ${empleado.nombre.split(' ')[0]}`}
                subtitle="¿Cuál es tu turno asignado?"
                tone="success"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                {options.map((op, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleVerificarTurno(op.isReal)}
                    data-testid={`empleado-turno-opt-${op.label}`}
                    style={optionStyle}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.borderColor = 'var(--color-hairline-soft)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
                  >
                    Turno {op.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Crear NIP ── */}
          {step === 3 && (
            <motion.div key="step-3" {...stepMotion} style={formStyle}>
              <StepIntro
                icon={Lock}
                title="Crea tu NIP"
                subtitle="4 dígitos para proteger tu cuenta"
              />

              <AuthField
                id="nip-nuevo"
                label="NIP"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                centered
                autoFocus
                data-testid="empleado-nip-nuevo-input"
              />

              <AuthButton
                onClick={handleCrearNip}
                disabled={nip.length !== 4}
                data-testid="empleado-nip-siguiente-btn"
              >
                Siguiente
              </AuthButton>
            </motion.div>
          )}

          {/* ── Step 4: Confirmar NIP ── */}
          {step === 4 && (
            <motion.div key="step-4" {...stepMotion} style={formStyle}>
              <StepIntro
                icon={Check}
                title="Confirma tu NIP"
                subtitle="Vuelve a ingresar los 4 dígitos"
              />

              <AuthField
                id="nip-confirm"
                label="Confirmación"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmNip}
                onChange={(e) => setConfirmNip(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                centered
                autoFocus
                data-testid="empleado-nip-confirm-input"
              />

              <AuthButton
                onClick={handleConfirmarNip}
                loading={loading}
                loadingText="Guardando…"
                disabled={confirmNip.length !== 4}
                data-testid="empleado-nip-confirmar-btn"
              >
                Finalizar
              </AuthButton>
            </motion.div>
          )}

          {/* ── Step 5: Login con NIP existente ── */}
          {step === 5 && empleado && (
            <motion.form key="step-5" {...stepMotion} onSubmit={handleLoginNip} style={formStyle}>
              <EmpleadoIdentity empleado={empleado} />

              <AuthField
                id="nip-login"
                label="NIP"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                centered
                autoFocus
                data-testid="empleado-nip-login-input"
              />

              <AuthButton
                type="submit"
                onClick={handleLoginNip}
                disabled={nip.length !== 4}
                trailingIcon={LogIn}
                data-testid="empleado-nip-login-btn"
              >
                Ingresar
              </AuthButton>

              <button
                type="button"
                onClick={handleCambiarEmpleado}
                data-testid="empleado-cambiar-btn"
                style={linkBtnStyle}
              >
                ¿No eres tú? Cambiar empleado
              </button>
            </motion.form>
          )}

        </AnimatePresence>
      </AuthShell>
    </>
  );
};

/* ─── Intro de paso ─── */
const StepIntro = ({ icon: Icon, title, subtitle, tone = 'accent' }) => {
  const toneColor = tone === 'success' ? 'var(--color-semantic-success)' : 'var(--color-accent)';
  const toneBg    = tone === 'success' ? 'rgb(var(--color-semantic-success-raw) / 0.1)' : 'rgb(var(--color-accent-raw) / 0.1)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
      {Icon && (
        <div style={{
          width: '2.5rem', height: '2.5rem', borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: toneBg, color: toneColor, marginBottom: 'var(--spacing-xxs)',
        }}>
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <h2 style={{
        margin: 0,
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--typography-title-md-size)',
        fontWeight: 'var(--typography-title-md-weight)',
        color: 'var(--color-ink)',
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--typography-caption-size)',
          color: 'var(--color-muted)',
          lineHeight: 'var(--typography-caption-lh)',
        }}>{subtitle}</p>
      )}
    </div>
  );
};

/* ─── Identidad del empleado en step 5 ─── */
const EmpleadoIdentity = ({ empleado }) => {
  const firstName = empleado.nombre?.split(' ')[0] || '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
      {empleado.foto_url ? (
        <img
          src={empleado.foto_url}
          alt={empleado.nombre}
          style={{
            width: '3.5rem', height: '3.5rem', borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgb(var(--color-accent-raw) / 0.2)',
          }}
        />
      ) : (
        <div style={{
          width: '3.5rem', height: '3.5rem', borderRadius: '50%',
          background: 'rgb(var(--color-accent-raw) / 0.1)',
          color: 'var(--color-accent)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={24} strokeWidth={1.75} />
        </div>
      )}
      <h2 style={{
        margin: 0,
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--typography-title-md-size)',
        fontWeight: 'var(--typography-title-md-weight)',
        color: 'var(--color-ink)',
        lineHeight: 1.2,
      }}>¡Hola, {firstName}!</h2>
      <p style={{
        margin: 0,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--typography-caption-size)',
        color: 'var(--color-muted)',
      }}>Ingresa tu NIP</p>
    </div>
  );
};

/* ─── Inline styles compartidos ─── */
const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-base)',
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
  transition: 'border-color 160ms ease, color 160ms ease, background 160ms ease',
  letterSpacing: '0.04em',
};

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  padding: 'var(--spacing-xs) 0 0',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--typography-caption-size)',
  color: 'var(--color-muted)',
  textAlign: 'center',
};
