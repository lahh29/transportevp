import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, ShieldCheck, Check, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { LogoMockup } from '../components/LogoMockup';
import { LoginTransition } from '../components/LoginTransition';

export const EmpleadoLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Numero, 2: Pregunta Seg, 3: Crear NIP, 4: Confirmar NIP, 5: Ingresar NIP
  const [loading, setLoading] = useState(false);
  const [numEmpleado, setNumEmpleado] = useState('');
  const [empleado, setEmpleado] = useState(null);
  const [successAnim, setSuccessAnim] = useState(false);
  
  // Opciones generadas para pregunta de seguridad
  const [options, setOptions] = useState([]);
  const [nip, setNip] = useState('');
  const [confirmNip, setConfirmNip] = useState('');

  const handleBuscarEmpleado = async (e) => {
    e.preventDefault();
    if (!numEmpleado.trim()) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('numero_empleado', numEmpleado.trim())
      .single();
      
    if (error || !data) {
      setLoading(false);
      toast.error('Número de empleado no encontrado.');
      return;
    }
    
    setEmpleado(data);
    
    if (data.nip) {
      setLoading(false);
      setStep(5); // Ya tiene NIP, ir a login normal
    } else {
      setLoading(false);
      
      let realTurno = String(data.turno || '').trim() || 'Sin asignar';
      let posibles = ['1', '2', '3', '4'];
      
      // Si por alguna razón tiene un turno que no es 1, 2, 3 o 4, lo agregamos para que pueda pasar
      if (!posibles.includes(realTurno) && realTurno !== 'Sin asignar') {
         posibles.push(realTurno);
      }
      
      const combinadas = posibles.map(t => ({
        label: t,
        isReal: t === realTurno
      }));
        
      setOptions(combinadas);
      setStep(2); // No tiene NIP, ir a verificación
    }
  };

  const handleVerificarTurno = (isReal) => {
    if (isReal) {
      setStep(3); // Crear NIP
    } else {
      toast.error('Respuesta incorrecta. Contacta a RH si hay un error en tus datos.');
      setNumEmpleado('');
      setEmpleado(null);
      setStep(1);
    }
  };

  const handleCrearNip = () => {
    if (nip.length !== 4) {
      toast.error('El NIP debe ser de 4 dígitos.');
      return;
    }
    setStep(4); // Confirmar
  };

  const handleConfirmarNip = async () => {
    if (nip !== confirmNip) {
      toast.error('Los NIP no coinciden. Intenta de nuevo.');
      setNip('');
      setConfirmNip('');
      setStep(3);
      return;
    }
    
    setLoading(true);
    const { error } = await supabase
      .from('empleados')
      .update({ nip: nip })
      .eq('id', empleado.id);
      
    setLoading(false);
    
    if (error) {
      toast.error('Error al guardar NIP.');
    } else {
      toast.success('¡NIP creado exitosamente!');
      iniciarSesion(empleado.id);
    }
  };

  const handleLoginNip = async (e) => {
    e.preventDefault();
    if (nip !== empleado.nip) {
      toast.error('NIP incorrecto.');
      setNip('');
      return;
    }
    iniciarSesion(empleado.id);
  };

  const iniciarSesion = (id) => {
    localStorage.setItem('empleado_id', id);
    setSuccessAnim(true);
    setTimeout(() => {
      navigate('/empleado/dashboard');
    }, 2500);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleBuscarEmpleado}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgb(var(--color-accent-raw) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <User size={24} color="var(--color-accent)" />
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-ink)' }}>Bienvenido</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>Ingresa tu número de empleado para continuar</p>
            </div>
            
            <input 
              type="number" 
              placeholder="Ej. 10234" 
              value={numEmpleado} 
              onChange={e => setNumEmpleado(e.target.value)} 
              style={{ width: '100%', boxSizing: 'border-box', height: '44px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--color-hairline-soft)', fontSize: '16px', textAlign: 'center', letterSpacing: '2px', marginBottom: '16px' }}
              autoFocus
            />
            
            <button type="submit" disabled={!numEmpleado || loading} style={{ width: '100%', height: '44px', borderRadius: '10px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: (!numEmpleado || loading) ? 'not-allowed' : 'pointer', opacity: (!numEmpleado || loading) ? 0.7 : 1 }}>
              {loading ? 'Buscando...' : 'Siguiente'}
            </button>
          </motion.form>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgb(var(--color-semantic-success-raw) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <ShieldCheck size={24} color="var(--color-semantic-success)" />
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-ink)' }}>Verificación de Identidad</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>Hola, {empleado.nombre.split(' ')[0]}. Selecciona tu turno asignado:</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {options.map((opcion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleVerificarTurno(opcion.isReal)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-hairline-soft)',
                    background: 'var(--color-surface-card)',
                    color: 'var(--color-ink)',
                    fontSize: '15px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 120ms ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--color-hairline-soft)'; e.currentTarget.style.color = 'var(--color-ink)'; }}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgb(var(--color-accent-raw) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Lock size={24} color="var(--color-accent)" />
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-ink)' }}>Crea tu NIP</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>Ingresa 4 números para proteger tu cuenta</p>
            </div>
            
            <input 
              type="password" 
              maxLength={4}
              placeholder="••••" 
              value={nip} 
              onChange={e => setNip(e.target.value.replace(/\D/g, ''))} 
              style={{ width: '100%', boxSizing: 'border-box', height: '54px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--color-hairline-soft)', fontSize: '24px', textAlign: 'center', letterSpacing: '8px', marginBottom: '16px' }}
              autoFocus
            />
            
            <button onClick={handleCrearNip} disabled={nip.length !== 4} style={{ width: '100%', height: '44px', borderRadius: '10px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: nip.length !== 4 ? 'not-allowed' : 'pointer', opacity: nip.length !== 4 ? 0.7 : 1 }}>
              Siguiente
            </button>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgb(var(--color-accent-raw) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Check size={24} color="var(--color-accent)" />
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-ink)' }}>Confirma tu NIP</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>Vuelve a ingresar los 4 números</p>
            </div>
            
            <input 
              type="password" 
              maxLength={4}
              placeholder="••••" 
              value={confirmNip} 
              onChange={e => setConfirmNip(e.target.value.replace(/\D/g, ''))} 
              style={{ width: '100%', boxSizing: 'border-box', height: '54px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--color-hairline-soft)', fontSize: '24px', textAlign: 'center', letterSpacing: '8px', marginBottom: '16px' }}
              autoFocus
            />
            
            <button onClick={handleConfirmarNip} disabled={confirmNip.length !== 4 || loading} style={{ width: '100%', height: '44px', borderRadius: '10px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: (confirmNip.length !== 4 || loading) ? 'not-allowed' : 'pointer', opacity: (confirmNip.length !== 4 || loading) ? 0.7 : 1 }}>
              {loading ? 'Guardando...' : 'Finalizar e Ingresar'}
            </button>
          </motion.div>
        );
      case 5:
        return (
          <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleLoginNip}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
              {empleado.foto_url ? (
                <img src={empleado.foto_url} alt={empleado.nombre} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', marginBottom: '16px', border: '2px solid rgb(var(--color-accent-raw) / 0.2)' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgb(var(--color-accent-raw) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <User size={32} color="var(--color-accent)" />
                </div>
              )}
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-ink)' }}>¡Hola, {empleado.nombre.split(' ')[0]}!</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>Ingresa tu NIP para acceder</p>
            </div>
            
            <input 
              type="password" 
              maxLength={4}
              placeholder="••••" 
              value={nip} 
              onChange={e => setNip(e.target.value.replace(/\D/g, ''))} 
              style={{ width: '100%', boxSizing: 'border-box', height: '54px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--color-hairline-soft)', fontSize: '24px', textAlign: 'center', letterSpacing: '8px', marginBottom: '16px' }}
              autoFocus
            />
            
            <button type="submit" disabled={nip.length !== 4} style={{ width: '100%', height: '44px', borderRadius: '10px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: nip.length !== 4 ? 'not-allowed' : 'pointer', opacity: nip.length !== 4 ? 0.7 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Ingresar <LogIn size={16} />
              </div>
            </button>
            <button type="button" onClick={() => { setStep(1); setNumEmpleado(''); setEmpleado(null); setNip(''); }} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', fontSize: '12px', color: 'var(--color-muted)', cursor: 'pointer' }}>
              ¿No eres tú? Cambiar empleado
            </button>
          </motion.form>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <LoginTransition isVisible={successAnim} userName={empleado?.nombre} />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
          <LogoMockup />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.03em' }}>Transporte ViñoPlastic</h1>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--color-muted)' }}>Portal de Empleados</p>
        </div>

        <div style={{ background: 'var(--color-surface-card)', borderRadius: '20px', padding: '32px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', border: '1px solid var(--color-hairline-soft)' }}>
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  );
};
