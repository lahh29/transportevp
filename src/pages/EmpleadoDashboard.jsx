import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogOut, MapPin, Clock, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Helpers ─── */
const getInitials = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ─── Skeleton ─── */
const Skeleton = ({ w = '100%', h = '16px', radius = '6px', style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: 'var(--color-hairline-soft)',
    animation: 'pulse 1.4s ease-in-out infinite',
    ...style,
  }} />
);

const LoadingSkeleton = () => (
  <div style={{
    minHeight: '100vh',
    background: 'var(--color-canvas)',
    padding: '16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  }}>
    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

    {/* Header skeleton */}
    <div style={{
      width: '100%', maxWidth: '400px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0', marginBottom: '24px',
    }}>
      <Skeleton w="80px" h="22px" />
      <Skeleton w="36px" h="36px" radius="50%" />
    </div>

    {/* Card skeleton */}
    <div style={{
      width: '100%', maxWidth: '400px',
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-hairline-soft)',
      borderRadius: '20px', padding: '32px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    }}>
      <Skeleton w="72px" h="72px" radius="50%" />
      <Skeleton w="60%" h="20px" />
      <Skeleton w="35%" h="14px" />
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
        <Skeleton h="80px" radius="12px" />
        <Skeleton h="80px" radius="12px" />
      </div>
      <Skeleton w="100%" h="220px" radius="16px" style={{ marginTop: '8px' }} />
    </div>
  </div>
);

/* ─── Info tile ─── */
const InfoTile = ({ icon: Icon, label, value }) => (
  <div style={{
    background: 'var(--color-canvas)',
    padding: '14px 12px',
    borderRadius: '12px',
    border: '1px solid var(--color-hairline-soft)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', gap: '6px',
  }}>
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%',
      background: 'rgb(var(--color-accent-raw) / 0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={15} color="var(--color-accent)" />
    </div>
    <span style={{
      fontSize: '10px', textTransform: 'uppercase',
      color: 'var(--color-muted)', letterSpacing: '0.06em', fontWeight: 500,
    }}>
      {label}
    </span>
    <span style={{
      fontSize: '13px', fontWeight: 500,
      color: value ? 'var(--color-ink)' : 'var(--color-muted-soft)',
    }}>
      {value || 'Sin asignar'}
    </span>
  </div>
);

/* ─── Avatar ─── */
const Avatar = ({ empleado }) => {
  if (empleado.foto_url) {
    return (
      <img
        src={empleado.foto_url}
        alt={empleado.nombre}
        style={{
          width: '72px', height: '72px', borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid var(--color-hairline-soft)',
        }}
      />
    );
  }
  return (
    <div style={{
      width: '72px', height: '72px', borderRadius: '50%',
      background: 'rgb(var(--color-accent-raw) / 0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-accent)',
      fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em',
    }}>
      {getInitials(empleado.nombre)}
    </div>
  );
};

/* ─── QR Panel ─── */
const QrPanel = ({ empleado }) => (
  <div style={{
    width: '100%',
    padding: '20px',
    borderRadius: '16px',
    border: '1px dashed rgb(var(--color-accent-raw) / 0.2)',
    background: 'rgb(var(--color-accent-raw) / 0.02)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
  }}>
    <p style={{
      margin: 0,
      fontSize: '10px', textTransform: 'uppercase',
      color: 'var(--color-muted)', letterSpacing: '0.06em', fontWeight: 500,
    }}>
      Código de acceso
    </p>

    {empleado.qr_code ? (
      <div style={{
        background: '#ffffff',
        padding: '10px', borderRadius: '12px',
        border: '1px solid var(--color-hairline-soft)',
      }}>
        <img
          src={empleado.qr_code}
          alt="QR Code"
          style={{ width: '180px', height: '180px', display: 'block' }}
        />
      </div>
    ) : (
      <div style={{
        width: '180px', height: '180px',
        borderRadius: '12px',
        border: '1px solid var(--color-hairline-soft)',
        background: 'var(--color-canvas)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '10px',
      }}>
        <QrCode size={40} color="var(--color-hairline-strong)" />
        <span style={{ fontSize: '11px', color: 'var(--color-muted-soft)' }}>
          Sin código asignado
        </span>
      </div>
    )}

    <p style={{
      margin: 0,
      fontSize: '11px', color: 'var(--color-muted)',
      textAlign: 'center', maxWidth: '200px', lineHeight: 1.5,
    }}>
      Muestra este código al abordar la ruta.
    </p>
  </div>
);

/* ─── Componente principal ─── */
export const EmpleadoDashboard = () => {
  const navigate = useNavigate();
  const [empleado, setEmpleado] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('empleado_id');
    if (!id) { navigate('/empleado/login'); return; }

    const fetchEmpleado = async () => {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        localStorage.removeItem('empleado_id');
        navigate('/empleado/login');
      } else {
        setEmpleado(data);
      }
      setLoading(false);
    };

    fetchEmpleado();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('empleado_id');
    navigate('/empleado/login');
  };

  if (loading)    return <LoadingSkeleton />;
  if (!empleado)  return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-canvas)',
      padding: '16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>

      {/* ── Header ── */}
      <header style={{
        width: '100%', maxWidth: '400px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 0', marginBottom: '20px',
      }}>
        <span style={{
          fontSize: '15px', fontWeight: 600,
          color: 'var(--color-ink)', letterSpacing: '-0.01em',
        }}>
          Viño<span style={{ color: 'var(--color-accent)' }}>Plastic</span>
        </span>

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            border: 'none',
            background: 'rgb(var(--color-semantic-error-raw) / 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-semantic-error)',
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} />
        </motion.button>
      </header>

      {/* ── Card principal ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-hairline-soft)',
          borderRadius: '20px',
          padding: '28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '24px',
        }}
      >

        {/* Avatar + nombre */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '10px',
          textAlign: 'center',
        }}>
          <Avatar empleado={empleado} />

          <div>
            <h1 style={{
              margin: 0,
              fontSize: '17px', fontWeight: 600,
              color: 'var(--color-ink)',
              textTransform: 'uppercase', letterSpacing: '0.02em',
              lineHeight: 1.3,
            }}>
              {empleado.nombre}
            </h1>
            <p style={{
              margin: '4px 0 0',
              fontSize: '12px',
              color: 'var(--color-muted)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.05em',
            }}>
              #{empleado.numero_empleado}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', background: 'var(--color-hairline-soft)' }} />

        {/* Tiles de info */}
        <div style={{
          width: '100%',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
        }}>
          <InfoTile icon={MapPin} label="Ruta"  value={empleado.ruta}  />
          <InfoTile icon={Clock}  label="Turno" value={empleado.turno} />
        </div>

        {/* QR */}
        <QrPanel empleado={empleado} />

      </motion.div>

      {/* Pie de página */}
      <p style={{
        marginTop: '24px',
        fontSize: '11px', color: 'var(--color-muted-soft)',
        textAlign: 'center',
      }}>
        Planta Querétaro · {new Date().getFullYear()}
      </p>

    </div>
  );
};
