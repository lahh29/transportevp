import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { MapPin, Clock, QrCode, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalHeader } from '../components/PortalHeader';

/* ─── Helpers ─── */
const getInitials = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const splitName = (fullName) => {
  if (!fullName) return { apellidos: '', nombres: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { apellidos: '', nombres: parts.join(' ') };
  if (parts.length === 2) return { apellidos: parts[0], nombres: parts[1] };
  return { apellidos: parts.slice(0, 2).join(' '), nombres: parts.slice(2).join(' ') };
};

const parseRuta = (ruta) => {
  if (!ruta || ruta === 'Sin ruta') return { code: 'SR', desc: ruta || 'Sin ruta' };
  const match = ruta.match(/^(R\d+)[-\s]+(.+)$/i);
  if (!match) return { code: 'R?', desc: ruta };
  return { code: match[1].toUpperCase(), desc: match[2].trim() };
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

/* ─── Info tile mini ─── */
const InfoTileMini = ({ icon: Icon, label, value, isRoute }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const displayValue = isRoute ? parseRuta(value).code : value;
  const fullValue = value || 'Sin asignar';

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <div style={{
        background: 'var(--color-canvas)',
        padding: '10px 12px',
        borderRadius: '12px',
        border: '1px solid var(--color-hairline-soft)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '4px', cursor: isRoute ? 'pointer' : 'default',
        minWidth: '56px'
      }}>
        <Icon size={16} color="var(--color-accent)" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: value ? 'var(--color-ink)' : 'var(--color-muted-soft)', letterSpacing: '0.02em' }}>
          {displayValue || '-'}
        </span>
      </div>

      {/* Tooltip / Popover */}
      <AnimatePresence>
        {showTooltip && isRoute && value && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '100%', right: 0,
              marginBottom: '8px',
              padding: '6px 10px',
              background: 'var(--color-ink)',
              color: 'var(--color-canvas)',
              borderRadius: '8px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
              fontWeight: 500
            }}
          >
            {fullValue}
            <div style={{ position: 'absolute', bottom: '-4px', right: '24px', width: '8px', height: '8px', background: 'var(--color-ink)', transform: 'rotate(45deg)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Avatar ─── */
const Avatar = ({ empleado, size = '48px' }) => {
  if (empleado.foto_url) {
    return (
      <img
        src={empleado.foto_url}
        alt={empleado.nombre}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid var(--color-hairline-soft)',
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgb(var(--color-accent-raw) / 0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-accent)',
      fontSize: `calc(${size} / 2.5)`, fontWeight: 600, letterSpacing: '-0.02em',
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
          style={{ width: '220px', height: '220px', display: 'block' }}
        />
      </div>
    ) : (
      <div style={{
        width: '220px', height: '220px',
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
      minHeight: '100dvh',
      background: 'var(--color-canvas)',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
    }}>

      {/* ── Header cohesivo ── */}
      <PortalHeader
        subtitle="Acceso Personal"
        onBrandClick={() => navigate('/empleado/dashboard')}
        onLogout={handleLogout}
      />

      <div style={{
        flex: 1,
        padding: 'var(--spacing-base)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

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
          padding: '24px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '24px',
          marginTop: 'var(--spacing-lg)',
        }}
      >
        {/* Encabezado: Izq (Foto+Nombre), Der (Cards ruta/turno) */}
        <div style={{ display: 'flex', gap: '16px', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <div style={{ flexShrink: 0 }}><Avatar empleado={empleado} size="48px" /></div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ 
                margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: 1.2, textTransform: 'uppercase'
              }}>
                {splitName(empleado.nombre).apellidos && (
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-muted)', fontWeight: 500, marginBottom: '1px' }}>
                    {splitName(empleado.nombre).apellidos}
                  </span>
                )}
                {splitName(empleado.nombre).nombres}
              </div>
              <p style={{
                margin: 0, fontSize: '11px', color: 'var(--color-muted)',
                fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em'
              }}>
                #{empleado.numero_empleado}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
             <InfoTileMini icon={MapPin} label="Ruta" value={empleado.ruta} isRoute />
             <InfoTileMini icon={Clock} label="Turno" value={empleado.turno} />
          </div>
        </div>

        {/* QR */}
        <QrPanel empleado={empleado} />

        {/* Banner de prohibición — Mobile-first, responsivo, animado y flotante */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          whileHover={{ 
            y: -2, 
            boxShadow: '0 8px 24px rgba(var(--color-semantic-warning-raw) / 0.15)',
            borderColor: 'rgb(var(--color-semantic-warning-raw) / 0.4)'
          }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgb(var(--color-semantic-warning-raw) / 0.08) 0%, rgb(var(--color-semantic-warning-raw) / 0.03) 100%)',
            border: '1px solid rgb(var(--color-semantic-warning-raw) / 0.2)',
            borderRadius: 'var(--rounded-xl, 0.75rem)',
            padding: 'var(--spacing-base, 0.75rem) var(--spacing-lg, 1rem)',
            display: 'flex',
            gap: 'var(--spacing-base, 0.75rem)',
            alignItems: 'flex-start',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            transition: 'border-color 0.2s ease',
            cursor: 'default',
          }}
        >
          <motion.div 
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{
              flexShrink: 0,
              width: '2.2rem',
              height: '2.2rem',
              borderRadius: 'var(--rounded-lg, 0.5rem)',
              background: 'linear-gradient(135deg, rgb(var(--color-semantic-warning-raw) / 0.18) 0%, rgb(var(--color-semantic-warning-raw) / 0.08) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '0.125rem',
              boxShadow: 'inset 0 1px 2px rgb(255 255 255 / 0.3)',
            }}
          >
            <AlertTriangle 
              size="1.25em" 
              color="var(--color-semantic-warning)" 
              strokeWidth={2.5}
            />
          </motion.div>
          
          <div style={{ minWidth: 0 }}>
            <p style={{ 
              margin: 0, 
              fontWeight: 600, 
              color: 'var(--color-semantic-warning)',
              lineHeight: '1.25',
              fontSize: 'var(--typography-body-size, 14px)'
            }}>
              Uso Estrictamente Personal
            </p>
            <p style={{ 
              margin: 'var(--spacing-xs, 0.25rem) 0 0', 
              color: 'var(--color-muted)', 
              lineHeight: '1.625',
              fontSize: 'var(--typography-caption-size, 12px)',
            }}>
              Este código QR es <strong style={{ color: 'var(--color-semantic-warning)' }}>intransferible</strong>. El uso indebido o préstamo del mismo incurrirá en sanciones administrativas.
            </p>
          </div>
        </motion.div>

      </motion.div>

      {/* Pie de página */}
      <p style={{
        marginTop: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-base)',
        fontSize: 'var(--typography-caption-size)',
        color: 'var(--color-muted-soft)',
        textAlign: 'center',
      }}>
        Planta Querétaro · {new Date().getFullYear()}
      </p>

      </div>
    </div>
  );
};
