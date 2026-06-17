import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { MapPin, Clock, QrCode, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import AvatarComponent from 'boring-avatars';
import { PortalHeader } from '../components/PortalHeader';
import { empleadoSession, empleadoCache } from '../lib/empleadoSession';
import { APP_ROUTES } from '../lib/choferConfig';

/* ============================================================
   EMPLEADO DASHBOARD
   Mobile-first · 100 % tokens · QR como héroe · Semántico
   ============================================================ */

/* ─── Helpers ───────────────────────────────────────────── */
const splitName = (fullName) => {
  if (!fullName) return { apellidos: '', nombres: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { apellidos: '', nombres: parts.join(' ') };
  if (parts.length === 2) return { apellidos: parts[0], nombres: parts[1] };
  return { apellidos: parts.slice(0, 2).join(' '), nombres: parts.slice(2).join(' ') };
};

const parseRutaCode = (ruta) => {
  if (!ruta) return null;
  const m = ruta.match(/^(R\d+)/i);
  return m ? m[1].toUpperCase() : ruta;
};

/* ─── Avatar ────────────────────────────────────────────── */
const AVATAR_SIZE_PX = 48;
const AVATAR_PALETTE = ['#0A0310', '#49007E', '#FF005B', '#FF7D10', '#FFB238'];

const Avatar = ({ empleado }) => {
  if (empleado.foto_url) {
    return (
      <img
        src={empleado.foto_url}
        alt=""
        className="emp-avatar emp-avatar--photo"
        loading="eager"
        decoding="async"
      />
    );
  }
  return (
    <div className="emp-avatar emp-avatar--generated" aria-hidden="true">
      <AvatarComponent
        size={AVATAR_SIZE_PX}
        name={empleado.nombre || empleado.numero_empleado || 'colaborador'}
        variant="beam"
        colors={AVATAR_PALETTE}
      />
    </div>
  );
};

/* ─── Skeleton ──────────────────────────────────────────── */
const LoadingState = () => (
  <main className="emp-page" data-testid="empleado-dashboard-loading">
    <style>{CSS}</style>
    <PortalHeader subtitle="Acceso Personal" showRefresh={false} onLogout={() => {}} />
    <div className="emp-body" aria-busy="true" aria-label="Cargando">
      <div className="emp-identity">
        <div className="emp-skel emp-skel--avatar" />
        <div className="emp-skel-stack">
          <div className="emp-skel emp-skel--lg" />
          <div className="emp-skel emp-skel--sm" />
        </div>
      </div>
      <div className="emp-skel emp-skel--qr" />
      <div className="emp-stats">
        <div className="emp-skel emp-skel--chip" />
        <div className="emp-skel emp-skel--chip" />
      </div>
    </div>
  </main>
);

/* ─── Página ────────────────────────────────────────────── */
export const EmpleadoDashboard = () => {
  const navigate = useNavigate();
  const [empleado, setEmpleado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const id = empleadoSession.getEmpleadoId();
    if (!id) { navigate(APP_ROUTES.empleadoLogin, { replace: true }); return; }

    // 1) Hidratación inmediata desde caché local
    const cached = empleadoCache.get();
    if (cached?.empleado?.id === id) {
      setEmpleado(cached.empleado);
      setLoading(false);
    }

    // 2) Refresco contra Supabase
    const fetchEmpleado = async () => {
      try {
        const { data, error } = await supabase
          .from('empleados')
          .select('id, nombre, numero_empleado, turno, ruta, foto_url, qr_code, colonia, referencia')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          empleadoSession.clear();
          navigate(APP_ROUTES.empleadoLogin, { replace: true });
          return;
        }

        setEmpleado(data);
        setIsOffline(false);
        empleadoCache.save(data);
      } catch {
        if (cached?.empleado?.id === id) {
          setIsOffline(true);
        } else {
          empleadoSession.clear();
          navigate(APP_ROUTES.empleadoLogin, { replace: true });
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmpleado();
  }, [navigate]);

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine && Boolean(empleado));
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [empleado]);

  const handleLogout = () => {
    empleadoSession.clear();
    navigate(APP_ROUTES.empleadoLogin, { replace: true });
  };

  if (loading) return <LoadingState />;
  if (!empleado) return null;

  const { apellidos, nombres } = splitName(empleado.nombre);
  const rutaCode = parseRutaCode(empleado.ruta);

  return (
    <main className="emp-page" data-testid="empleado-dashboard">
      <style>{CSS}</style>
      <PortalHeader
        subtitle="Acceso Personal"
        onBrandClick={() => navigate('/empleado/dashboard')}
        onLogout={handleLogout}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="emp-body"
      >
        {/* ── Identidad ── */}
        <header className="emp-identity" aria-labelledby="emp-name">
          <Avatar empleado={empleado} />
          <div className="emp-identity__text">
            {apellidos && <p className="emp-identity__surname">{apellidos}</p>}
            <h1 id="emp-name" className="emp-identity__name">{nombres}</h1>
            <p className="emp-identity__num" data-testid="empleado-numero">
              #{empleado.numero_empleado}
            </p>
          </div>
        </header>

        {/* ── QR Hero ── */}
        <section
          className="emp-qr"
          aria-labelledby="qr-title"
          data-testid="qr-panel"
        >
          <header className="emp-qr__head">
            <h2 id="qr-title" className="emp-qr__title">Código de acceso</h2>
            {isOffline && (
              <span
                className="emp-qr__offline"
                role="status"
                aria-label="Sin conexión, mostrando código guardado"
                data-testid="qr-offline-badge"
              >
                <WifiOff size={11} strokeWidth={2.25} aria-hidden="true" />
                Sin conexión
              </span>
            )}
          </header>

          {empleado.qr_code ? (
            <div className="emp-qr__frame">
              <img
                src={empleado.qr_code}
                alt={`Código QR de acceso de ${empleado.nombre}`}
                data-testid="qr-image"
                className="emp-qr__img"
              />
            </div>
          ) : (
            <div className="emp-qr__empty" role="status" data-testid="qr-empty">
              <div className="emp-qr__empty-icon" aria-hidden="true">
                <QrCode size={32} strokeWidth={1.5} />
              </div>
              <p className="emp-qr__empty-text">Tu código aún no está listo</p>
              <p className="emp-qr__empty-sub">
                Pide a Recursos Humanos que genere tu código para poder abordar.
              </p>
            </div>
          )}

          <p className="emp-qr__hint">
            {empleado.qr_code
              ? (isOffline
                  ? 'Tu código sigue disponible sin conexión.'
                  : 'Muéstralo al chofer al abordar.')
              : 'Mientras tanto, el chofer puede registrarte manualmente con tu número.'}
          </p>
        </section>

        {/* ── Datos de transporte (secundarios) ── */}
        <section className="emp-stats" aria-label="Detalles de transporte">
          <div className="emp-stat" data-testid="stat-ruta">
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" className="emp-stat__icon" />
            <span className="emp-stat__label">Ruta</span>
            <span className="emp-stat__value">{rutaCode || '—'}</span>
          </div>
          <div className="emp-stat" data-testid="stat-turno">
            <Clock size={14} strokeWidth={1.75} aria-hidden="true" className="emp-stat__icon" />
            <span className="emp-stat__label">Turno</span>
            <span className="emp-stat__value">{empleado.turno || '—'}</span>
          </div>
        </section>

        {/* ── Nota legal discreta ── */}
        <aside role="note" className="emp-note" data-testid="banner-personal">
          <p className="emp-note__text">
            Código <strong className="emp-note__strong">intransferible</strong>.
            Su préstamo conlleva sanciones administrativas.
          </p>
        </aside>

        <footer className="emp-foot">
          Planta Querétaro · {new Date().getFullYear()}
        </footer>
      </motion.div>
    </main>
  );
};

/* ════════════════════════════════════════════════════════════
   Scoped CSS — 100 % tokens · mobile-first
   ════════════════════════════════════════════════════════════ */
const CSS = /* css */ `
.emp-page {
  min-height: 100dvh;
  background: var(--color-canvas);
  display: flex;
  flex-direction: column;
}

.emp-body {
  flex: 1;
  width: 100%;
  max-width: 28rem;
  margin-inline: auto;
  padding: var(--spacing-base);
  padding-bottom: max(var(--spacing-lg), env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

/* ── Identidad ── */
.emp-identity {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-block: var(--spacing-xs);
}
.emp-identity__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}
.emp-identity__surname {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  font-weight: var(--typography-eyebrow-weight);
  line-height: var(--typography-eyebrow-lh);
  letter-spacing: var(--typography-eyebrow-ls);
  text-transform: uppercase;
  color: var(--color-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.emp-identity__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--typography-title-size);
  font-weight: var(--typography-title-weight);
  line-height: var(--typography-title-lh);
  letter-spacing: var(--ls-tight-2);
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.emp-identity__num {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--typography-caption-size);
  color: var(--color-ink-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: var(--ls-wide-1);
}

/* ── Avatar ── */
.emp-avatar {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: var(--rounded-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.emp-avatar--photo {
  object-fit: cover;
  border: 1px solid var(--color-hairline-soft);
}
.emp-avatar--generated {
  overflow: hidden;
  background: var(--color-hairline-soft);
}

/* ── QR héroe ── */
.emp-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-base);
  padding: var(--spacing-lg) var(--spacing-base) var(--spacing-base);
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--rounded-xl);
  box-shadow: var(--shadow-soft);
}
.emp-qr__head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-xs);
}
.emp-qr__title {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  font-weight: var(--typography-eyebrow-weight);
  line-height: var(--typography-eyebrow-lh);
  letter-spacing: var(--typography-eyebrow-ls);
  text-transform: uppercase;
  color: var(--color-ink-muted);
}
.emp-qr__offline {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xxs);
  padding: var(--spacing-xxs) var(--spacing-xs);
  border-radius: var(--rounded-pill);
  background: rgb(var(--color-semantic-warning-raw) / 0.12);
  color: var(--color-semantic-warning);
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  font-weight: var(--typography-eyebrow-weight);
  letter-spacing: var(--typography-eyebrow-ls);
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
}
.emp-qr__frame {
  width: 100%;
  max-width: min(78vw, 18rem);
  aspect-ratio: 1 / 1;
  padding: var(--spacing-sm);
  border-radius: var(--rounded-lg);
  background: var(--color-canvas-soft);
  border: 1px solid var(--color-hairline-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}
.emp-qr__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  display: block;
}
.emp-qr__empty {
  width: 100%;
  max-width: min(78vw, 18rem);
  aspect-ratio: 1 / 1;
  border-radius: var(--rounded-lg);
  border: 1px dashed var(--color-hairline);
  background: var(--color-canvas);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  color: var(--color-ink-faint);
  text-align: center;
  padding: var(--spacing-base);
}
.emp-qr__empty-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--rounded-full);
  background: var(--color-hairline-soft);
  color: var(--color-ink-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-xs);
}
.emp-qr__empty-text {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--typography-body-md-size);
  font-weight: 600;
  letter-spacing: var(--ls-tight-2);
  color: var(--color-ink);
}
.emp-qr__empty-sub {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--typography-body-sm-size);
  color: var(--color-ink-muted);
  line-height: var(--typography-body-sm-lh);
  max-width: 24ch;
}
.emp-qr__hint {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--typography-body-sm-size);
  color: var(--color-ink-muted);
  text-align: center;
  line-height: var(--typography-body-sm-lh);
}

/* ── Chips de transporte ── */
.emp-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xs);
}
.emp-stat {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-base);
  border-radius: var(--rounded-md);
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline-soft);
  min-width: 0;
}
.emp-stat__icon {
  color: var(--color-ink-faint);
  flex-shrink: 0;
}
.emp-stat__label {
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  font-weight: var(--typography-eyebrow-weight);
  letter-spacing: var(--typography-eyebrow-ls);
  text-transform: uppercase;
  color: var(--color-ink-faint);
}
.emp-stat__value {
  margin-left: auto;
  font-family: var(--font-body);
  font-size: var(--typography-body-sm-size);
  font-weight: 600;
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* ── Nota legal mínima ── */
.emp-note {
  border-left: 2px solid rgb(var(--color-semantic-warning-raw) / 0.4);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgb(var(--color-semantic-warning-raw) / 0.04);
  border-radius: 0 var(--rounded-sm) var(--rounded-sm) 0;
}
.emp-note__text {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--typography-caption-size);
  color: var(--color-ink-muted);
  line-height: var(--typography-caption-lh);
}
.emp-note__strong {
  color: var(--color-semantic-warning);
  font-weight: 600;
}

/* ── Footer ── */
.emp-foot {
  margin-top: auto;
  padding-top: var(--spacing-sm);
  text-align: center;
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  letter-spacing: var(--typography-eyebrow-ls);
  text-transform: uppercase;
  color: var(--color-ink-faint);
}

/* ── Skeleton ── */
.emp-skel {
  background: var(--color-hairline-soft);
  border-radius: var(--rounded-sm);
  animation: emp-pulse 1.4s ease-in-out infinite;
}
.emp-skel-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.emp-skel--avatar { width: 3rem; height: 3rem; border-radius: var(--rounded-full); flex-shrink: 0; }
.emp-skel--lg     { height: 1rem; width: 70%; }
.emp-skel--sm     { height: 0.75rem; width: 40%; }
.emp-skel--qr     { height: 18rem; border-radius: var(--rounded-xl); }
.emp-skel--chip   { height: 2.75rem; border-radius: var(--rounded-md); }

@keyframes emp-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.45; }
}

/* ── Tabletas+ ── */
@media (min-width: 30rem) {
  .emp-body { gap: var(--spacing-xl); padding: var(--spacing-lg); }
  .emp-qr__frame, .emp-qr__empty { max-width: 18rem; }
}

/* ── Reduce motion ── */
@media (prefers-reduced-motion: reduce) {
  .emp-skel { animation: none; opacity: 0.7; }
}
`;
