import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { MapPin, Clock, QrCode, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { PortalHeader } from '../components/PortalHeader';

/* ============================================================
   EMPLEADO DASHBOARD
   Cohesivo · Mobile-first · 100% tokens · UI/UX semántico
   ============================================================ */

/* ─── Helpers ───────────────────────────────────────────── */
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

const parseRutaCode = (ruta) => {
  if (!ruta) return 'SR';
  const m = ruta.match(/^(R\d+)/i);
  return m ? m[1].toUpperCase() : 'R?';
};

/* ─── Skeleton ──────────────────────────────────────────── */
const Skeleton = ({ w = '100%', h = '1rem', radius = 'var(--rounded-sm)' }) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: 'var(--color-hairline-soft)',
    animation: 'vp-emp-pulse 1.4s ease-in-out infinite',
  }} />
);

const LoadingState = () => (
  <main style={S.page} data-testid="empleado-dashboard-loading">
    <style>{`@keyframes vp-emp-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    <PortalHeader subtitle="Acceso Personal" showRefresh={false} onLogout={() => {}} />
    <section style={S.body}>
      <article style={S.card} aria-busy="true">
        <div style={S.identityRow}>
          <Skeleton w="3rem" h="3rem" radius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <Skeleton w="70%" h="0.875rem" />
            <Skeleton w="40%" h="0.75rem" />
          </div>
        </div>
        <div style={S.statsRow}>
          <Skeleton h="3rem" radius="var(--rounded-md)" />
          <Skeleton h="3rem" radius="var(--rounded-md)" />
        </div>
        <Skeleton h="14rem" radius="var(--rounded-lg)" />
      </article>
    </section>
  </main>
);

/* ─── Avatar ────────────────────────────────────────────── */
const Avatar = ({ empleado, size = '3rem' }) => {
  if (empleado.foto_url) {
    return (
      <img
        src={empleado.foto_url}
        alt=""
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid var(--color-hairline-soft)',
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgb(var(--color-accent-raw) / 0.1)',
        color: 'var(--color-accent)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)',
        fontSize: '0.95rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        flexShrink: 0,
      }}
    >
      {getInitials(empleado.nombre)}
    </div>
  );
};

/* ─── Stat tile ─────────────────────────────────────────── */
const StatTile = ({ icon: Icon, label, value, testId }) => (
  <div style={S.statTile} data-testid={testId}>
    <Icon size={14} strokeWidth={1.75} style={{ color: 'var(--color-accent)', flexShrink: 0 }} aria-hidden="true" />
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '1px' }}>
      <span style={S.statLabel}>{label}</span>
      <span style={S.statValue} title={value || 'Sin asignar'}>
        {value || '—'}
      </span>
    </div>
  </div>
);

/* ─── QR Panel ──────────────────────────────────────────── */
const QrPanel = ({ empleado }) => (
  <figure style={S.qrPanel} data-testid="qr-panel">
    <figcaption style={S.qrEyebrow}>Código de acceso</figcaption>

    {empleado.qr_code ? (
      <div style={S.qrFrame}>
        <img
          src={empleado.qr_code}
          alt="Código QR personal"
          data-testid="qr-image"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
    ) : (
      <div style={S.qrEmpty} aria-label="Sin código asignado">
        <QrCode size={32} strokeWidth={1.5} aria-hidden="true" />
        <span style={S.qrEmptyText}>Sin código asignado</span>
      </div>
    )}

    <p style={S.qrHint}>Muéstralo al chofer para abordar.</p>
  </figure>
);

/* ─── Banner ────────────────────────────────────────────── */
const PersonalUseBanner = () => (
  <aside role="note" data-testid="banner-personal" style={S.banner}>
    <div style={S.bannerIcon} aria-hidden="true">
      <AlertTriangle size={18} strokeWidth={2.25} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={S.bannerTitle}>Uso personal</p>
      <p style={S.bannerBody}>
        Este código es <strong style={{ color: 'var(--color-semantic-warning)' }}>intransferible</strong>.
        Su préstamo conlleva sanciones administrativas.
      </p>
    </div>
  </aside>
);

/* ─── Componente principal ──────────────────────────────── */
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
        .maybeSingle();

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

  if (loading)   return <LoadingState />;
  if (!empleado) return null;

  const { apellidos, nombres } = splitName(empleado.nombre);
  const rutaCode = parseRutaCode(empleado.ruta);

  return (
    <main style={S.page} data-testid="empleado-dashboard">
      <PortalHeader
        subtitle="Acceso Personal"
        onBrandClick={() => navigate('/empleado/dashboard')}
        onLogout={handleLogout}
      />

      <section style={S.body}>
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={S.card}
          aria-labelledby="emp-name"
        >
          {/* Identidad */}
          <header style={S.identityRow}>
            <Avatar empleado={empleado} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {apellidos && (
                <span style={S.surname}>{apellidos}</span>
              )}
              <h2 id="emp-name" style={S.name}>{nombres}</h2>
              <span style={S.empNumber} data-testid="empleado-numero">
                #{empleado.numero_empleado}
              </span>
            </div>
          </header>

          {/* Stats */}
          <div style={S.statsRow} role="list">
            <StatTile icon={MapPin} label="Ruta"  value={rutaCode}        testId="stat-ruta" />
            <StatTile icon={Clock}  label="Turno" value={empleado.turno}  testId="stat-turno" />
          </div>

          {/* QR */}
          <QrPanel empleado={empleado} />

          {/* Banner */}
          <PersonalUseBanner />
        </motion.article>

        <footer style={S.footer}>
          Planta Querétaro · {new Date().getFullYear()}
        </footer>
      </section>
    </main>
  );
};

/* ============================================================
   STYLES — 100% tokens, mobile-first
   ============================================================ */
const S = {
  /* Page */
  page: {
    minHeight: '100dvh',
    background: 'var(--color-canvas)',
    display: 'flex',
    flexDirection: 'column',
  },

  /* Body wrapper */
  body: {
    flex: 1,
    width: '100%',
    maxWidth: 'min(100%, 28rem)',
    margin: '0 auto',
    padding: 'var(--spacing-base)',
    paddingBottom: 'max(var(--spacing-base), env(safe-area-inset-bottom))',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  },

  /* Card */
  card: {
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-xl)',
    padding: 'clamp(var(--spacing-base), 5vw, var(--spacing-lg))',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
    boxShadow: '0 1px 0 var(--color-hairline-soft)',
  },

  /* Identity */
  identityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  surname: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    letterSpacing: '0.01em',
    lineHeight: 1.1,
    textTransform: 'uppercase',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  name: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--typography-title-sm-size)',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)',
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
    textTransform: 'uppercase',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  empNumber: {
    marginTop: '2px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.03em',
  },

  /* Stats */
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--spacing-xs)',
  },
  statTile: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline-soft)',
    minWidth: 0,
  },
  statLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
    lineHeight: 1,
  },
  statValue: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.15,
  },

  /* QR */
  qrPanel: {
    margin: 0,
    width: '100%',
    padding: 'var(--spacing-lg)',
    borderRadius: 'var(--rounded-lg)',
    border: '1px dashed rgb(var(--color-accent-raw) / 0.25)',
    background: 'rgb(var(--color-accent-raw) / 0.02)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  qrEyebrow: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  },
  qrFrame: {
    width: '100%',
    maxWidth: 'min(60vw, 14rem)',
    aspectRatio: '1 / 1',
    padding: 'var(--spacing-xs)',
    borderRadius: 'var(--rounded-md)',
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrEmpty: {
    width: '100%',
    maxWidth: 'min(60vw, 14rem)',
    aspectRatio: '1 / 1',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-canvas)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    color: 'var(--color-hairline-strong)',
  },
  qrEmptyText: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted-soft)',
  },
  qrHint: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    textAlign: 'center',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* Banner */
  banner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    background: 'rgb(var(--color-semantic-warning-raw) / 0.06)',
    border: '1px solid rgb(var(--color-semantic-warning-raw) / 0.22)',
  },
  bannerIcon: {
    flexShrink: 0,
    width: '2rem',
    height: '2rem',
    borderRadius: 'var(--rounded-md)',
    background: 'rgb(var(--color-semantic-warning-raw) / 0.15)',
    color: 'var(--color-semantic-warning)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-semantic-warning)',
    lineHeight: 1.2,
  },
  bannerBody: {
    margin: 'var(--spacing-xxs) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* Footer */
  footer: {
    textAlign: 'center',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted-soft)',
    letterSpacing: '0.02em',
  },
};
