import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, ScanLine, ChevronRight,
  X, Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalHeader } from '../components/PortalHeader';
import { notify } from '../lib/notify';
import {
  RUTAS_LIST,
  DAY_NAMES,
  SHIFT_SCHEDULE,
  SHIFT_HOURS,
  SHIFT_TOLERANCE,
  SCAN_CONFIG,
  TAP_TARGET,
  APP_ROUTES,
  parseRuta,
  getRutaColor,
  resolveTurno,
} from '../lib/choferConfig';
import { safeStorage, STORAGE_KEYS } from '../lib/safeStorage';
import { offlineQueue, wireOfflineFlush } from '../lib/offlineQueue';
import { useReducedMotion } from '../lib/useReducedMotion';

/* ─── Pantalla de Selección de Ruta ───────────────────────── */
const RutaSelectionPanel = ({ onSelect, rutasActivas, loading, reducedMotion }) => {
  const anim = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };
  return (
    <motion.section
      {...anim}
      aria-labelledby="ruta-heading"
      style={{
        position: 'absolute',
        inset: 0,
        padding: 'max(var(--spacing-lg), env(safe-area-inset-top)) var(--spacing-lg) max(var(--spacing-xxl), env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        overflowY: 'auto',
      }}
    >
      <header style={{ marginBottom: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
        <h1
          id="ruta-heading"
          style={{
            margin: 0,
            fontSize: 'var(--typography-display-sm-size)',
            fontWeight: 'var(--typography-title-md-weight)',
            fontFamily: 'var(--font-display)',
            color: 'var(--color-ink)',
          }}
        >
          Selecciona tu ruta
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 'var(--typography-body-sm-size)',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-muted)',
          }}
        >
          ¿Qué ruta vas a manejar hoy?
        </p>
      </header>

      <ul
        role="list"
        aria-label="Rutas disponibles"
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
        }}
      >
        {loading ? (
          <li
            role="status"
            aria-live="polite"
            style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 'var(--spacing-xl)' }}
          >
            Cargando rutas…
          </li>
        ) : (
          RUTAS_LIST.map((ruta) => {
            const { code, desc } = parseRuta(ruta);
            const color = getRutaColor(code);
            const enUso = rutasActivas.includes(ruta);

            return (
              <li key={ruta} style={{ margin: 0 }}>
                <motion.button
                  type="button"
                  whileTap={enUso || reducedMotion ? {} : { scale: 0.97 }}
                  onClick={() => !enUso && onSelect(ruta)}
                  disabled={enUso}
                  data-testid={`ruta-option-${code}`}
                  aria-label={enUso ? `Ruta ${code} ${desc}, en uso por otro chofer` : `Seleccionar ruta ${code} ${desc}`}
                  style={{
                    width: '100%',
                    minHeight: `${TAP_TARGET.cozy + 24}px`,
                    background: enUso ? 'var(--color-canvas)' : 'var(--color-surface-card)',
                    border: `1px solid ${enUso ? 'var(--color-hairline-soft)' : 'var(--color-hairline-strong)'}`,
                    borderRadius: 'var(--rounded-xl)',
                    padding: 'var(--spacing-base)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-base)',
                    cursor: enUso ? 'not-allowed' : 'pointer',
                    opacity: enUso ? 0.6 : 1,
                    textAlign: 'left',
                    boxShadow: enUso ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--rounded-lg)',
                      flexShrink: 0,
                      background: enUso ? 'var(--color-hairline-soft)' : color.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--typography-caption-uppercase-size)',
                        fontWeight: 'var(--typography-caption-uppercase-weight)',
                        color: enUso ? 'var(--color-muted)' : color.text,
                      }}
                    >
                      {code}
                    </span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 'var(--typography-body-sm-size)',
                        fontWeight: 'var(--typography-title-sm-weight)',
                        fontFamily: 'var(--font-body)',
                        color: enUso ? 'var(--color-muted)' : 'var(--color-ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {desc}
                    </span>
                    {enUso && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: '3px',
                          fontSize: 'var(--typography-caption-size)',
                          fontFamily: 'var(--font-body)',
                          color: 'var(--color-semantic-error)',
                        }}
                      >
                        En uso por otro chofer
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    size={18}
                    color={enUso ? 'var(--color-hairline-strong)' : 'var(--color-muted)'}
                    aria-hidden="true"
                  />
                </motion.button>
              </li>
            );
          })
        )}
      </ul>
    </motion.section>
  );
};

/* ─── Portal Principal ────────────────────────────────────── */
export const ChoferPortal = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [rutasActivas, setRutasActivas] = useState([]);
  const [loadingRutas, setLoadingRutas] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [session, setSession] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  const timerRef = useRef(null);
  const isScanningRef = useRef(false);
  const qrRef = useRef(null);
  const lastScanRef = useRef({ text: null, at: 0 }); // dedupe re-escaneos
  const cancelledRef = useRef(false);                // ignora callbacks tras desmontar

  /* ── Sesión + listener de auth state (item 7 mejorado) ───────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  /* ── Cola offline (item 8) ───────────────────────────────────── */
  useEffect(() => {
    const off = wireOfflineFlush(({ ok }) => {
      if (ok > 0) notify.success(`Sincronizados ${ok} registros pendientes`);
    });
    return off;
  }, []);

  /* ── Fetch rutas activas ─────────────────────────────────────── */
  const fetchRutasActivas = useCallback(async () => {
    setLoadingRutas(true);
    try {
      const { data, error } = await supabase.from('rutas_activas').select('*');
      if (error) throw error;
      setRutasActivas(data.map((r) => r.ruta));
      if (session?.user?.id) {
        const mine = data.find((r) => r.chofer_id === session.user.id);
        if (mine) setSelectedRoute(mine.ruta);
      }
    } catch (err) {
      // Fallback local seguro
      const local = safeStorage.get(STORAGE_KEYS.rutasActivas, []);
      setRutasActivas(local.map((r) => r.ruta));
      if (session?.user?.id) {
        const mine = local.find((r) => r.chofer_id === session.user.id);
        if (mine) setSelectedRoute(mine.ruta);
      }
    } finally {
      setLoadingRutas(false);
    }
  }, [session]);

  useEffect(() => {
    if (!selectedRoute) {
      // Diferimos al microtask para que el primer setState de
      // fetchRutasActivas no se ejecute síncrono dentro del effect.
      Promise.resolve().then(fetchRutasActivas);
    }
  }, [selectedRoute, fetchRutasActivas]);

  const handleSelectRoute = useCallback(async (ruta) => {
    if (!session?.user?.id) return;
    const { code } = parseRuta(ruta);
    try {
      const { error } = await supabase
        .from('rutas_activas')
        .insert({ ruta, chofer_id: session.user.id });
      if (error) throw error;
    } catch {
      const local = safeStorage.get(STORAGE_KEYS.rutasActivas, []);
      local.push({ ruta, chofer_id: session.user.id });
      safeStorage.set(STORAGE_KEYS.rutasActivas, local);
    }
    setSelectedRoute(ruta);
    notify.routeSelected(code);
  }, [session]);

  const handleEndRoute = useCallback(async () => {
    if (!selectedRoute || !session?.user?.id) return;
    const { code } = parseRuta(selectedRoute);
    setIsFinishing(true);
    try {
      const { error } = await supabase
        .from('rutas_activas')
        .delete()
        .eq('ruta', selectedRoute);
      if (error) throw error;
    } catch {
      notify.warning('Ruta cerrada solo localmente', {
        description: 'No pudimos sincronizar con el servidor. Se reintentará al recuperar conexión.',
      });
    }
    const local = safeStorage.get(STORAGE_KEYS.rutasActivas, [])
      .filter((r) => r.ruta !== selectedRoute);
    safeStorage.set(STORAGE_KEYS.rutasActivas, local);

    setSelectedRoute(null);
    setIsFinishing(false);
    fetchRutasActivas();
    notify.routeFinished(code);
  }, [selectedRoute, session, fetchRutasActivas]);

  /* ── Escáner QR ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedRoute) return undefined;

    cancelledRef.current = false;
    const qr = new Html5Qrcode('reader');
    qrRef.current = qr;

    const stopScanner = async () => {
      try {
        if (qr?.isScanning) {
          await qr.stop();
          await qr.clear();
        }
      } catch {
        /* noop */
      }
    };

    const onScanSuccess = async (decodedText) => {
      if (cancelledRef.current) return;
      if (isScanningRef.current) return;

      // Dedupe: ignora el mismo QR si llega dentro de la ventana de cooldown
      const now = Date.now();
      if (
        lastScanRef.current.text === decodedText &&
        now - lastScanRef.current.at < SCAN_CONFIG.dedupeWindowMs
      ) {
        return;
      }
      lastScanRef.current = { text: decodedText, at: now };

      isScanningRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);

      let uiColor = 'success';

      try {
        // Parse QR → lookup por id o numero_empleado
        let lookupField = 'id';
        let lookupValue = decodedText;
        const trimmed = String(decodedText).trim();

        if (trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed && parsed.numero_empleado != null) {
              lookupField = 'numero_empleado';
              lookupValue = String(parsed.numero_empleado).trim();
            } else if (parsed && parsed.id != null) {
              lookupField = 'id';
              lookupValue = String(parsed.id).trim();
            }
          } catch {
            /* texto no-JSON, lo dejamos como UUID/id */
          }
        } else if (/^\d+$/.test(trimmed)) {
          lookupField = 'numero_empleado';
          lookupValue = trimmed;
        }

        const { data: emp, error: empError } = await supabase
          .from('empleados')
          .select('*')
          .eq(lookupField, lookupValue)
          .maybeSingle();
        const nowDate = new Date();
        const timeStr = nowDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        let estado = 'autorizado';
        let isValid = true;
        let rejectReason = '';

        if (!emp || empError) {
          isValid = false;
          estado = 'rechazado_qr';
          rejectReason = 'El código no está registrado.';
        } else if (emp.ruta !== selectedRoute) {
          isValid = false;
          estado = 'rechazado_ruta';
          rejectReason = `Pertenece a la ${emp.ruta || 'Sin Ruta'}.`;
        } else {
          const diaActualStr = DAY_NAMES[nowDate.getDay()];
          const diasLaborables = SHIFT_SCHEDULE[emp.turno];

          if (diasLaborables && !diasLaborables.includes(diaActualStr)) {
            estado = 'dia_descanso';
          } else {
            const turnoReal = resolveTurno(emp.turno, diaActualStr);
            const hours = SHIFT_HOURS[turnoReal];
            if (hours) {
              const currentMins = nowDate.getHours() * 60 + nowDate.getMinutes();
              const isWithin = (hStart, hEnd) => {
                const startM = hStart * 60;
                const endM = hEnd * 60;
                if (startM <= endM) return currentMins >= startM && currentMins <= endM;
                return currentMins >= startM || currentMins <= endM; // cruza medianoche
              };

              let startEntH = hours.start - SHIFT_TOLERANCE.entradaAntes;
              if (startEntH < 0) startEntH += 24;
              let endEntH = hours.start + SHIFT_TOLERANCE.entradaDespues;
              if (endEntH >= 24) endEntH -= 24;

              let startSalH = hours.end - SHIFT_TOLERANCE.salidaAntes;
              if (startSalH < 0) startSalH += 24;
              const endSalMins = hours.end * 60 + SHIFT_TOLERANCE.salidaDespuesMin;

              const isValidEntrada = isWithin(startEntH, endEntH);
              const isValidSalida =
                currentMins >= startSalH * 60 ||
                currentMins <= endSalMins % (24 * 60);

              if (!isValidEntrada && !isValidSalida) estado = 'fuera_horario';
            }
          }
        }

        const isWarning = estado === 'dia_descanso' || estado === 'fuera_horario';
        uiColor = isValid ? (isWarning ? 'warning' : 'success') : 'error';

        let warningReason = '';
        if (estado === 'dia_descanso') warningReason = 'Día de descanso';
        else if (estado === 'fuera_horario') warningReason = 'Fuera de horario de abordaje';

        if (cancelledRef.current) return;

        setScanResult({
          text: decodedText,
          isValid,
          estado,
          uiColor,
          rejectReason: isValid && isWarning ? warningReason : rejectReason,
          employee: emp,
          time: timeStr,
        });

        // Háptica solo si el usuario NO pidió reducir movimiento
        if (
          !reducedMotion &&
          typeof navigator !== 'undefined' &&
          typeof navigator.vibrate === 'function'
        ) {
          navigator.vibrate(SCAN_CONFIG.haptics[uiColor]);
        }

        const record = {
          chofer_id: session?.user?.id || null,
          ruta_chofer: selectedRoute,
          estado,
          qr_leido: decodedText,
        };
        if (emp) record.empleado_id = emp.id;

        try {
          const { error: regError } = await supabase.from('registros').insert(record);
          if (regError) throw regError;
        } catch {
          offlineQueue.enqueue(record);
          // Historial local de respaldo
          const local = safeStorage.get(STORAGE_KEYS.qrHistory, []);
          local.unshift({
            id: Date.now(),
            fecha_hora: nowDate.toISOString(),
            empleados: emp,
            estado,
            ruta_chofer: selectedRoute,
          });
          safeStorage.set(STORAGE_KEYS.qrHistory, local.slice(0, 500));
        }
      } catch {
        // Falla de red en la búsqueda: notificamos al chofer
        if (!cancelledRef.current) {
          notify.networkError({ message: 'No pudimos validar el QR. Inténtalo de nuevo.' });
        }
      } finally {
        const ms = SCAN_CONFIG.scanCooldownMs[uiColor] || SCAN_CONFIG.scanCooldownMs.success;
        timerRef.current = setTimeout(() => {
          if (cancelledRef.current) return;
          setScanResult(null);
          isScanningRef.current = false;
        }, ms);
      }
    };

    const startCamera = () => qr
      .start(
        { facingMode: 'environment' },
        {
          fps: SCAN_CONFIG.fps,
          qrbox: (w, h) => {
            const size = Math.round(Math.min(w, h) * SCAN_CONFIG.qrboxRatio);
            return { width: size, height: size };
          },
          aspectRatio: window.innerHeight / window.innerWidth,
          disableFlip: false,
        },
        onScanSuccess,
        () => {},
      )
      .catch(() => qr.start(
        { facingMode: 'user' },
        { fps: SCAN_CONFIG.fps, qrbox: { width: 240, height: 240 } },
        onScanSuccess,
        () => {},
      ))
      .catch((err) => {
        setCameraError(
          err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
            ? 'permission'
            : 'unavailable'
        );
      });

    startCamera();

    /* ── Pausar cámara si el usuario sale a otra app (item 7) ──── */
    const onVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        if (qr?.isScanning) {
          try { await qr.stop(); } catch { /* noop */ }
        }
      } else if (document.visibilityState === 'visible' && !cancelledRef.current) {
        if (qrRef.current && !qrRef.current.isScanning) startCamera();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelledRef.current = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
      stopScanner();
    };
    // Intencionalmente sin `session` en deps: la sesión cambia al refrescar
    // token cada hora y reiniciaría la cámara. Usamos session.user.id solo
    // para registrar el chofer en cada inserción.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoute, reducedMotion]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        minHeight: '100vh', // fallback
        background: 'var(--color-canvas-soft)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        /* Scoping a nivel componente para que el efecto se revierta al desmontar */
        html, body { overscroll-behavior: none; }
        .app-container > nav, .app-container > header { display: none !important; }
        .app-container > main { padding: 0 !important; max-width: none !important; }

        #reader {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          background: #000 !important;
          padding: 0 !important;
          position: absolute !important;
          inset: 0 !important;
        }
        #reader > div { width: 100% !important; height: 100% !important; padding: 0 !important; border: none !important; }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0 !important; left: 0 !important;
        }
        #reader__scan_region { width: 100% !important; height: 100% !important; border: none !important; }
        #reader__scan_region img, #reader__dashboard { display: none !important; }

        /* Helpers responsivos */
        .vp-hide-sm { display: inline; }
        @media (max-width: 360px) { .vp-hide-sm { display: none; } }

        /* Respeta usuarios con reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Header solo en selección de ruta */}
      {!selectedRoute && (
        <PortalHeader
          subtitle="Portal Abordaje · Transporte"
          onBrandClick={() => navigate(isAdmin ? APP_ROUTES.empresa : APP_ROUTES.chofer)}
          onLogout={async () => { await supabase.auth.signOut(); navigate(APP_ROUTES.landing); }}
          extras={
            isAdmin && (
              <motion.button
                type="button"
                whileTap={reducedMotion ? {} : { scale: 0.93 }}
                onClick={() => navigate(APP_ROUTES.empresa)}
                data-testid="back-to-empresa-btn"
                aria-label="Volver al portal de Empresa"
                style={{
                  height: `${TAP_TARGET.min}px`,
                  minWidth: `${TAP_TARGET.min}px`,
                  padding: '0 var(--spacing-base)',
                  borderRadius: 'var(--rounded-pill)',
                  background: 'rgb(var(--color-accent-raw) / 0.1)',
                  border: '1px solid rgb(var(--color-accent-raw) / 0.25)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-xxs)',
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--typography-caption-size)',
                  fontWeight: 600,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Building2 size={16} aria-hidden="true" />
                <span className="vp-hide-sm">Empresa</span>
              </motion.button>
            )
          }
        />
      )}

      {/* Main */}
      <main
        role="main"
        aria-label="Portal de chofer"
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      >
        <section
          aria-label={selectedRoute ? 'Escáner de códigos QR' : 'Selección de ruta'}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 5,
          }}
        >
          <div
            style={{
              flex: 1,
              position: 'relative',
              background: selectedRoute ? '#000' : 'var(--color-canvas-soft)',
            }}
          >
            {!selectedRoute ? (
              <RutaSelectionPanel
                onSelect={handleSelectRoute}
                rutasActivas={rutasActivas}
                loading={loadingRutas}
                reducedMotion={reducedMotion}
              />
            ) : (
              <>
                <div
                  id="reader"
                  role="application"
                  aria-label="Vista previa de cámara para escanear códigos QR"
                  style={{ position: 'absolute', inset: 0 }}
                />

                {/* Mensaje de error de cámara */}
                {cameraError && (
                  <div
                    role="alert"
                    data-testid="camera-error"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 'var(--spacing-base)',
                      right: 'var(--spacing-base)',
                      transform: 'translateY(-50%)',
                      background: 'var(--color-surface-card)',
                      borderRadius: 'var(--rounded-xl)',
                      padding: 'var(--spacing-lg)',
                      textAlign: 'center',
                      zIndex: 6,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-semantic-error)' }}>
                      {cameraError === 'permission' ? 'Cámara bloqueada' : 'Cámara no disponible'}
                    </p>
                    <p style={{ margin: '8px 0 0', color: 'var(--color-muted)', fontSize: 'var(--typography-body-sm-size)' }}>
                      {cameraError === 'permission'
                        ? 'Permite el acceso a la cámara desde los ajustes del navegador y vuelve a intentarlo.'
                        : 'No detectamos una cámara disponible en este dispositivo.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      data-testid="camera-error-retry"
                      style={{
                        marginTop: 'var(--spacing-base)',
                        minHeight: `${TAP_TARGET.min}px`,
                        padding: '0 var(--spacing-lg)',
                        borderRadius: 'var(--rounded-pill)',
                        background: 'var(--color-accent)',
                        color: 'var(--color-on-primary)',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Reintentar
                    </button>
                  </div>
                )}

                {/* Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 2,
                    boxShadow: 'inset 0 0 0 2000px rgba(0,0,0,0.5)',
                  }}
                  aria-hidden="true"
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 'min(70vmin, 320px)',
                      height: 'min(70vmin, 320px)',
                      border: '2px solid rgba(255,255,255,0.55)',
                      borderRadius: '24px',
                    }}
                  >
                    <ScanLine
                      size={40}
                      color="rgba(255,255,255,0.6)"
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  </div>

                  {/* Top Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 'max(var(--spacing-lg), env(safe-area-inset-top))',
                      left: 'max(var(--spacing-lg), env(safe-area-inset-left))',
                      right: 'max(var(--spacing-lg), env(safe-area-inset-right))',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      pointerEvents: 'auto',
                      gap: 'var(--spacing-sm)',
                    }}
                  >
                    <div
                      role="status"
                      aria-label={`Ruta activa ${parseRuta(selectedRoute).code}`}
                      style={{
                        background: 'rgba(0,0,0,0.55)',
                        padding: 'var(--spacing-xxs) var(--spacing-base)',
                        borderRadius: 'var(--rounded-pill)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        minHeight: '32px',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getRutaColor(parseRuta(selectedRoute).code).text,
                          boxShadow: `0 0 8px ${getRutaColor(parseRuta(selectedRoute).code).text}`,
                        }}
                      />
                      <span
                        style={{
                          color: '#fff',
                          fontSize: 'var(--typography-body-sm-size)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {parseRuta(selectedRoute).code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleEndRoute}
                      disabled={isFinishing}
                      data-testid="end-route-btn"
                      aria-label="Finalizar ruta y liberar"
                      style={{
                        background: 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        borderRadius: 'var(--rounded-pill)',
                        minWidth: `${TAP_TARGET.min}px`,
                        minHeight: `${TAP_TARGET.min}px`,
                        padding: '0 var(--spacing-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xxs)',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        opacity: isFinishing ? 0.6 : 1,
                      }}
                    >
                      {isFinishing
                        ? <span aria-hidden="true" style={{ fontSize: '14px' }}>…</span>
                        : <X size={20} aria-hidden="true" />}
                      <span className="vp-hide-sm" style={{ fontSize: 'var(--typography-caption-size)', fontWeight: 600 }}>
                        Finalizar
                      </span>
                    </button>
                  </div>
                </div>

                {/* Resultado flotante */}
                <AnimatePresence>
                  {scanResult && (() => {
                    const dur = SCAN_CONFIG.scanCooldownMs[scanResult.uiColor] || SCAN_CONFIG.scanCooldownMs.success;
                    const titleText = scanResult.isValid
                      ? (scanResult.uiColor === 'warning' ? 'Alerta de Horario' : 'Acceso Autorizado')
                      : (scanResult.estado === 'rechazado_qr' ? 'QR no Reconocido' : 'Acceso Denegado');
                    const tone = `var(--color-semantic-${scanResult.uiColor})`;
                    const toneRaw = `var(--color-semantic-${scanResult.uiColor}-raw)`;
                    // ARIA crítico: 'assertive' para denegaciones y advertencias (item 6)
                    const ariaLive = scanResult.uiColor === 'error' || scanResult.uiColor === 'warning' ? 'assertive' : 'polite';
                    const ariaRole = scanResult.uiColor === 'error' ? 'alert' : 'status';
                    const motionProps = reducedMotion
                      ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
                      : {
                          initial: { opacity: 0, y: 60, scale: 0.92 },
                          animate: { opacity: 1, y: 0, scale: 1 },
                          exit: { opacity: 0, y: 20, scale: 0.95 },
                          transition: { type: 'spring', stiffness: 320, damping: 26 },
                        };
                    return (
                      <motion.div
                        key={`scan-${scanResult.estado}-${scanResult.time}`}
                        {...motionProps}
                        onClick={() => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          setScanResult(null);
                          isScanningRef.current = false;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                            e.preventDefault();
                            if (timerRef.current) clearTimeout(timerRef.current);
                            setScanResult(null);
                            isScanningRef.current = false;
                          }
                        }}
                        tabIndex={0}
                        role={ariaRole}
                        aria-live={ariaLive}
                        aria-atomic="true"
                        data-testid="scan-result-card"
                        style={{
                          position: 'absolute',
                          bottom: 'max(var(--spacing-xl), env(safe-area-inset-bottom))',
                          left: 'max(var(--spacing-base), env(safe-area-inset-left))',
                          right: 'max(var(--spacing-base), env(safe-area-inset-right))',
                          zIndex: 10,
                          background: 'var(--color-surface-card)',
                          borderRadius: 'var(--rounded-xl)',
                          padding: 'var(--spacing-lg) var(--spacing-base) var(--spacing-base)',
                          boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${tone}`,
                          borderTop: `4px solid ${tone}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--spacing-sm)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          outline: 'none',
                          minHeight: `${TAP_TARGET.min}px`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-base)' }}>
                          <motion.div
                            initial={reducedMotion ? false : { scale: 0.6, rotate: -15 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.05 }}
                            aria-hidden="true"
                            style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: tone,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: scanResult.uiColor === 'warning' ? 'var(--color-ink)' : '#fff',
                              boxShadow: `0 8px 20px rgb(${toneRaw} / 0.35)`,
                            }}
                          >
                            {scanResult.isValid
                              ? <CheckCircle size={36} strokeWidth={2.5} />
                              : <XCircle size={36} strokeWidth={2.5} />}
                          </motion.div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 'var(--typography-title-md-size)',
                                fontWeight: 700,
                                fontFamily: 'var(--font-display)',
                                color: tone,
                                lineHeight: 1.1,
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {titleText}
                            </p>
                            <p
                              style={{
                                margin: '4px 0 0',
                                fontSize: 'var(--typography-body-sm-size)',
                                fontFamily: 'var(--font-body)',
                                fontWeight: 500,
                                color: 'var(--color-ink)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {scanResult.isValid
                                ? (scanResult.employee?.nombre || '—')
                                : (scanResult.rejectReason || '—')}
                            </p>
                            {scanResult.employee?.numero_empleado && (
                              <p
                                style={{
                                  margin: '2px 0 0',
                                  fontSize: 'var(--typography-caption-size)',
                                  fontFamily: 'var(--font-body)',
                                  color: 'var(--color-muted)',
                                }}
                              >
                                #{scanResult.employee.numero_empleado} ·{' '}
                                <time dateTime={new Date().toISOString()}>{scanResult.time}</time>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Chips */}
                        {scanResult.employee && (scanResult.employee.turno || scanResult.employee.ruta) && (
                          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                            {scanResult.employee.turno && (
                              <span
                                style={{
                                  padding: 'var(--spacing-xxs) var(--spacing-sm)',
                                  background: 'var(--color-canvas)',
                                  borderRadius: 'var(--rounded-pill)',
                                  fontSize: 'var(--typography-caption-uppercase-size)',
                                  fontWeight: 'var(--typography-caption-uppercase-weight)',
                                  letterSpacing: 'var(--typography-caption-uppercase-ls)',
                                  textTransform: 'uppercase',
                                  fontFamily: 'var(--font-body)',
                                  color: 'var(--color-ink)',
                                  border: '1px solid var(--color-hairline-soft)',
                                }}
                              >
                                Turno {scanResult.employee.turno}
                              </span>
                            )}
                            {scanResult.employee.ruta && (
                              <span
                                style={{
                                  padding: 'var(--spacing-xxs) var(--spacing-sm)',
                                  background:
                                    scanResult.estado === 'rechazado_ruta'
                                      ? `rgb(${toneRaw} / 0.1)`
                                      : 'var(--color-canvas)',
                                  borderRadius: 'var(--rounded-pill)',
                                  fontSize: 'var(--typography-caption-uppercase-size)',
                                  fontWeight: 'var(--typography-caption-uppercase-weight)',
                                  letterSpacing: 'var(--typography-caption-uppercase-ls)',
                                  textTransform: 'uppercase',
                                  fontFamily: 'var(--font-body)',
                                  color:
                                    scanResult.estado === 'rechazado_ruta'
                                      ? tone
                                      : 'var(--color-ink)',
                                  border: `1px solid ${
                                    scanResult.estado === 'rechazado_ruta'
                                      ? `rgb(${toneRaw} / 0.3)`
                                      : 'var(--color-hairline-soft)'
                                  }`,
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {parseRuta(scanResult.employee.ruta).code} ·{' '}
                                {parseRuta(scanResult.employee.ruta).desc}
                              </span>
                            )}
                          </div>
                        )}

                        <div
                          aria-hidden="true"
                          style={{
                            height: '3px',
                            background: 'var(--color-hairline-soft)',
                            borderRadius: 'var(--rounded-pill)',
                            overflow: 'hidden',
                            marginTop: 'var(--spacing-xxs)',
                          }}
                        >
                          <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: dur / 1000, ease: 'linear' }}
                            style={{ height: '100%', background: tone, borderRadius: 'inherit' }}
                          />
                        </div>

                        <p
                          style={{
                            margin: 0,
                            fontSize: 'var(--typography-caption-size)',
                            fontFamily: 'var(--font-body)',
                            color: 'var(--color-muted-soft)',
                            textAlign: 'center',
                          }}
                        >
                          Toca o presiona Enter para cerrar
                        </p>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
