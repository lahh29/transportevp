import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, ScanLine, List, Camera, ChevronRight, ChevronLeft, Bus, Calendar, Users, Clock, MapPin, X, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalHeader } from '../components/PortalHeader';

/* ─── Helpers ─────────────────────────────────────────────── */
const getInitials = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getWeekKey = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=dom, 1=lun...
  const diff = day === 0 ? -6 : 1 - day; // desplazar al lunes
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  // Usar fecha LOCAL para evitar desfase por UTC vs UTC-6
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const SHIFT_SCHEDULE = {
  '1': ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  '2': ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  '3': ['Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'],
  '4': ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves'],
};

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Prioridad de anomalías para ordenar registros: menor número = más crítico
const PRIORITY = {
  rechazado_ruta: 1, // Ruta Incorrecta — el chofer rechazó a alguien de otra ruta
  rechazado_qr:   2, // QR no registrado
  fuera_horario:  3, // Fuera de la ventana de horario del turno
  dia_descanso:   4, // Intento de abordar en día de descanso
  autorizado:     5, // Acceso normal
};

// Número de semana ISO 8601 (lunes = primer día)
const getISOWeek = (dateOrStr) => {
  const d = new Date(dateOrStr instanceof Date ? dateOrStr : dateOrStr + 'T12:00:00');
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
};

const formatWeekLabel = (weekKey) => {
  const mon = new Date(weekKey + 'T12:00:00'); // noon local para evitar salto de día
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const weekNum = getISOWeek(mon);
  const monStr = mon.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const sunStr = sun.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return `Semana ${weekNum} · ${monStr} – ${sunStr}`;
};

const getDayKey = (dateStr) => {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`; // fecha local, no UTC
};

const formatDayLabel = (dayKey) => {
  const d = new Date(dayKey + 'T12:00:00'); // noon local para no saltar de día
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
};

/* ─── Slide animation preset ──────────────────────────────── */
const slideIn = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -32 },
  transition: { duration: 0.22, ease: 'easeOut' },
};

/* ─── Parsear nombre de ruta ──────────────────────────────── */
// Ej: "R1- QUERETARO- PIE DE LA CUESTA" → { code: 'R1', desc: 'QUERETARO - PIE DE LA CUESTA' }
const parseRuta = (ruta) => {
  if (!ruta || ruta === 'Sin ruta') return { code: '?', desc: ruta || 'Sin ruta' };
  const match = ruta.match(/^(R\d+)[-\s]+(.+)$/i);
  if (!match) return { code: '?', desc: ruta };
  const desc = match[2].replace(/-/g, ' - ').replace(/\s{2,}/g, ' ').trim();
  return { code: match[1].toUpperCase(), desc };
};

const RUTA_COLORS = {
  R1: { bg: 'rgb(var(--color-accent-raw) / 0.1)',   text: 'var(--color-accent)' },
  R2: { bg: 'rgb(26 35 126 / 0.1)',  text: '#1a237e' },
  R3: { bg: 'rgb(0 130 120 / 0.1)',  text: '#008278' },
  R4: { bg: 'rgb(130 0 80 / 0.1)',   text: '#820050' },
  R5: { bg: 'rgb(200 130 0 / 0.1)',  text: '#a06400' },
  R6: { bg: 'rgb(40 120 40 / 0.1)',  text: '#287828' },
};
const getRutaColor = (code) => RUTA_COLORS[code] || { bg: 'rgb(var(--color-accent-raw) / 0.1)', text: 'var(--color-accent)' };

const RUTAS_LIST = [
  'R1- QUERETARO- PIE DE LA CUESTA',
  'R2- SAN JOSE ITURBIDE',
  'R3- SAN JOSE ITURBIDE 2',
  'R4-SANTA ROSA',
  'R5- QUERETARO-AV. DE LA LUZ',
  'R6- AV. DE LA LUZ - PASEOS QUERETARO',
];

/* ─── Pantalla de Selección de Ruta ───────────────────────── */
const RutaSelectionPanel = ({ onSelect, rutasActivas, loading }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    style={{ position: 'absolute', inset: 0, padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', overflowY: 'auto' }}
  >
    <div style={{ marginBottom: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--typography-display-sm-size)', fontWeight: 'var(--typography-title-md-weight)', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>Selecciona tu ruta</h2>
      <p style={{ margin: '4px 0 0', fontSize: 'var(--typography-body-sm-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>¿Qué ruta vas a manejar hoy?</p>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-xxl)' }}>
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 'var(--spacing-xl)' }}>Cargando rutas...</div>
      ) : (
        RUTAS_LIST.map((ruta) => {
          const { code, desc } = parseRuta(ruta);
          const color = getRutaColor(code);
          const enUso = rutasActivas.includes(ruta);

          return (
            <motion.button key={ruta} whileTap={enUso ? {} : { scale: 0.97 }} onClick={() => !enUso && onSelect(ruta)}
              disabled={enUso}
              style={{
                width: '100%', background: enUso ? 'var(--color-canvas)' : 'var(--color-surface-card)',
                border: `1px solid ${enUso ? 'var(--color-hairline-soft)' : 'var(--color-hairline-strong)'}`,
                borderRadius: 'var(--rounded-xl)', padding: 'var(--spacing-base)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-base)',
                cursor: enUso ? 'not-allowed' : 'pointer', opacity: enUso ? 0.6 : 1, textAlign: 'left',
                boxShadow: enUso ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--rounded-lg)', flexShrink: 0, background: enUso ? 'var(--color-hairline-soft)' : color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--typography-caption-uppercase-size)', fontWeight: 'var(--typography-caption-uppercase-weight)', color: enUso ? 'var(--color-muted)' : color.text }}>{code}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 'var(--typography-body-sm-size)', fontWeight: 'var(--typography-title-sm-weight)', fontFamily: 'var(--font-body)', color: enUso ? 'var(--color-muted)' : 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {desc}
                </p>
                {enUso && <p style={{ margin: '3px 0 0', fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-semantic-error)' }}>En uso por otro chofer</p>}
              </div>
              <ChevronRight size={18} color={enUso ? "var(--color-hairline-strong)" : "var(--color-muted)"} />
            </motion.button>
          );
        })
      )}
    </div>
  </motion.div>
);

/* ─── Sub-componentes top-level del RegistrosPanel ────────── */
const REG_ANIM = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
  transition: { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] },
};

const REG_LIST_ITEM = (i) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: Math.min(i, 8) * 0.035, duration: 0.18, ease: 'easeOut' },
});

/* ─── Header del drill-down (con botón Atrás) ─────────────── */
const RegHeader = ({ title, sub, onBack, showBack }) => (
  <header style={regStyles.header}>
    {showBack && (
      <button
        type="button"
        onClick={onBack}
        data-testid="reg-back-btn"
        aria-label="Volver al nivel anterior"
        style={regStyles.backBtn}
      >
        <ChevronLeft size={16} strokeWidth={2} />
        <span>Atrás</span>
      </button>
    )}
    <h2 style={regStyles.title}>{title}</h2>
    {sub && <p style={regStyles.sub}>{sub}</p>}
  </header>
);

/* ─── Card genérico de drill (semanas/días) ───────────────── */
const RegCard = ({ onClick, left, sub, right, accent, testId }) => (
  <motion.button
    whileTap={{ scale: 0.985 }}
    onClick={onClick}
    data-testid={testId}
    style={regStyles.card}
  >
    {accent && (
      <div style={regStyles.accentBox} aria-hidden="true">{accent}</div>
    )}
    <div style={regStyles.cardBody}>
      <p style={regStyles.cardLeft}>{left}</p>
      {sub && <p style={regStyles.cardSub}>{sub}</p>}
    </div>
    <div style={regStyles.cardRight}>
      {right && <span style={regStyles.countPill}>{right}</span>}
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-muted-soft)' }} />
    </div>
  </motion.button>
);

/* ─── Empty state ─────────────────────────────────────────── */
const RegEmpty = () => (
  <div role="status" data-testid="reg-empty" style={regStyles.empty}>
    <div style={regStyles.emptyIcon} aria-hidden="true">
      <Bus size={26} strokeWidth={1.5} />
    </div>
    <p style={regStyles.emptyTitle}>Sin registros</p>
    <p style={regStyles.emptySub}>Los abordajes aparecerán aquí cuando los escanees.</p>
  </div>
);

/* ─── Item individual de empleado (NIVEL 3) ───────────────── */
const RegItem = ({ reg, i }) => {
  const emp = reg.empleados;
  const time = new Date(reg.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const isRejected = reg.estado === 'rechazado_ruta' || reg.estado === 'rechazado_qr';
  const isFakeQR   = reg.estado === 'rechazado_qr';
  const isWarning  = reg.estado === 'dia_descanso' || reg.estado === 'fuera_horario';

  let badgeText = '';
  if (isFakeQR) badgeText = 'QR Inválido';
  else if (isRejected) badgeText = 'Ruta Incorrecta';
  else if (reg.estado === 'dia_descanso') badgeText = 'Día Descanso';
  else if (reg.estado === 'fuera_horario') badgeText = 'Fuera de Horario';

  // Sanitiza JSON crudo en QRs inválidos legacy
  let qrLabel = reg.qr_leido || 'Código Desconocido';
  if (isFakeQR && typeof qrLabel === 'string' && qrLabel.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(qrLabel);
      qrLabel = parsed?.numero_empleado != null ? `# ${parsed.numero_empleado}` : 'QR Desconocido';
    } catch {
      qrLabel = 'QR Ilegible';
    }
  }

  // Tonos según estado (todos por tokens semánticos)
  const tone = isRejected ? 'error' : isWarning ? 'warning' : 'success';
  const toneVar = `var(--color-semantic-${tone})`;
  const toneRaw = `var(--color-semantic-${tone}-raw)`;

  return (
    <motion.article
      {...REG_LIST_ITEM(i)}
      data-testid={`reg-item-${reg.id || i}`}
      style={{
        ...regStyles.item,
        background: isRejected || isWarning
          ? `rgb(${toneRaw} / 0.04)`
          : 'var(--color-surface-card)',
        borderColor: isRejected || isWarning
          ? `rgb(${toneRaw} / 0.22)`
          : 'var(--color-hairline-soft)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          ...regStyles.itemIcon,
          background: `rgb(${toneRaw} / 0.12)`,
          color: toneVar,
        }}
      >
        {isFakeQR
          ? <XCircle size={16} strokeWidth={2} />
          : tone === 'success'
            ? <span style={regStyles.initials}>{getInitials(emp?.nombre)}</span>
            : <span style={regStyles.initials}>{getInitials(emp?.nombre)}</span>
        }
      </div>

      <div style={regStyles.itemBody}>
        <p style={{
          ...regStyles.itemName,
          color: isRejected ? toneVar : 'var(--color-ink)',
          textDecoration: isRejected ? 'line-through' : 'none',
        }}>
          {isFakeQR ? qrLabel : (emp?.nombre || 'Desconocido')}
        </p>
        <div style={regStyles.itemMeta}>
          <span style={regStyles.itemNum}>
            {isFakeQR ? '—' : `#${emp?.numero_empleado || '—'}`}
          </span>
          {badgeText && (
            <span
              data-testid={`reg-item-badge-${tone}`}
              style={{
                ...regStyles.itemBadge,
                background: toneVar,
                color: isWarning ? 'var(--color-ink)' : 'var(--color-on-primary)',
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>

      <time
        dateTime={reg.fecha_hora}
        style={regStyles.itemTime}
      >
        {time}
      </time>
    </motion.article>
  );
};

/* ─── Componente drill-down de Registros ──────────────────── */
const RegistrosPanel = ({ registros, loading }) => {
  // drillPath: [] | ['ruta', rutaName] | ['ruta', rutaName, 'week', weekKey] | ['ruta', rutaName, 'week', weekKey, 'day', dayKey]
  const [drillPath, setDrillPath] = useState([]);

  const push = (...segments) => setDrillPath(prev => [...prev, ...segments]);
  const back = () => setDrillPath(prev => prev.slice(0, -2));

  // ── Datos agrupados por ruta
  const byRuta = useMemo(() => {
    const map = {};
    registros.forEach(reg => {
      const ruta = reg.ruta_chofer || reg.empleados?.ruta || 'Sin ruta';
      if (!map[ruta]) map[ruta] = [];
      map[ruta].push(reg);
    });
    return map;
  }, [registros]);

  const level = drillPath.length / 2; // 0=rutas, 1=semanas, 2=dias, 3=turnos

  const currentRuta  = drillPath[1];
  const currentWeek  = drillPath[3];
  const currentDay   = drillPath[5];

  // Datos filtrados según el nivel
  const rutaRegs = currentRuta ? (byRuta[currentRuta] || []) : [];

  const byWeek = useMemo(() => {
    const map = {};
    rutaRegs.forEach(reg => {
      const key = getWeekKey(reg.fecha_hora);
      if (!map[key]) map[key] = [];
      map[key].push(reg);
    });
    return map;
  }, [rutaRegs]);

  const weekRegs = currentWeek ? (byWeek[currentWeek] || []) : [];

  const byDay = useMemo(() => {
    const map = {};
    weekRegs.forEach(reg => {
      const key = getDayKey(reg.fecha_hora);
      if (!map[key]) map[key] = [];
      map[key].push(reg);
    });
    return map;
  }, [weekRegs]);

  const dayRegs = currentDay ? (byDay[currentDay] || []) : [];

  const byTurno = useMemo(() => {
    const map = {};
    dayRegs.forEach(reg => {
      const t = reg.empleados?.turno || 'Sin turno';
      if (!map[t]) map[t] = [];
      map[t].push(reg);
    });
    // Orden por prioridad de anomalía:
    // 1. Ruta Incorrecta · 2. QR Inválido · 3. Fuera de Horario · 4. Día Descanso · 5. Autorizado
    Object.keys(map).forEach(t => {
      map[t].sort((a, b) => {
        const pa = PRIORITY[a.estado] ?? 99;
        const pb = PRIORITY[b.estado] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.fecha_hora) - new Date(a.fecha_hora);
      });
    });
    return map;
  }, [dayRegs]);

  // Turnos ordenados: anomalías arriba, luego ascendente numérico
  const turnosOrdered = useMemo(() => {
    return Object.keys(byTurno).sort((a, b) => {
      const anomA = byTurno[a].filter(r => r.estado !== 'autorizado').length;
      const anomB = byTurno[b].filter(r => r.estado !== 'autorizado').length;
      if ((anomA > 0) !== (anomB > 0)) return anomB - anomA;
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      if (!isNaN(na)) return -1;
      if (!isNaN(nb)) return 1;
      return a.localeCompare(b);
    });
  }, [byTurno]);

  if (loading) {
    return (
      <div role="status" aria-busy="true" style={regStyles.loadingWrap}>
        {[0, 1, 2].map(k => (
          <div key={k} style={regStyles.skeletonCard} />
        ))}
        <style>{`@keyframes vp-reg-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
    );
  }

  return (
    <section style={regStyles.panel} data-testid="registros-panel" aria-label="Historial de abordajes">
      <AnimatePresence mode="wait">

        {/* NIVEL 0 — Rutas */}
        {level === 0 && (
          <motion.div key="rutas" {...REG_ANIM}>
            <RegHeader
              title="Historial"
              sub="Selecciona una ruta para ver el detalle"
              showBack={false}
            />
            {Object.keys(byRuta).length === 0 ? (
              <RegEmpty />
            ) : (
              <ul style={regStyles.list} role="list">
                {Object.entries(byRuta).sort().map(([ruta, regs], i) => {
                  const { code, desc } = parseRuta(ruta);
                  const color = getRutaColor(code);
                  return (
                    <motion.li key={ruta} {...REG_LIST_ITEM(i)} style={{ listStyle: 'none' }}>
                      <button
                        type="button"
                        onClick={() => push('ruta', ruta)}
                        data-testid={`reg-ruta-${code}`}
                        style={regStyles.rutaCard}
                      >
                        <div
                          aria-hidden="true"
                          style={{ ...regStyles.rutaBadge, background: color.bg }}
                        >
                          <span style={{ ...regStyles.rutaBadgeText, color: color.text }}>
                            {code}
                          </span>
                        </div>
                        <div style={regStyles.cardBody}>
                          <p style={regStyles.cardLeft} title={desc}>{desc}</p>
                          <p style={regStyles.cardSub}>
                            {regs.length} abordaje{regs.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div style={regStyles.cardRight}>
                          <span
                            style={{
                              ...regStyles.countPill,
                              background: color.bg,
                              color: color.text,
                            }}
                          >
                            {regs.length}
                          </span>
                          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-muted-soft)' }} />
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}

        {/* NIVEL 1 — Semanas */}
        {level === 1 && (
          <motion.div key="semanas" {...REG_ANIM}>
            <RegHeader
              title={currentRuta}
              sub="Selecciona una semana"
              showBack
              onBack={back}
            />
            <ul style={regStyles.list} role="list">
              {Object.entries(byWeek).sort((a, b) => b[0].localeCompare(a[0])).map(([weekKey, regs], i) => (
                <motion.li key={weekKey} {...REG_LIST_ITEM(i)} style={{ listStyle: 'none' }}>
                  <RegCard
                    onClick={() => push('week', weekKey)}
                    left={formatWeekLabel(weekKey)}
                    sub={`${regs.length} abordaje${regs.length !== 1 ? 's' : ''}`}
                    right={regs.length}
                    accent={<Calendar size={16} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />}
                    testId={`reg-week-${weekKey}`}
                  />
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* NIVEL 2 — Días */}
        {level === 2 && (
          <motion.div key="dias" {...REG_ANIM}>
            <RegHeader
              title={formatWeekLabel(currentWeek)}
              sub="Selecciona un día"
              showBack
              onBack={back}
            />
            <ul style={regStyles.list} role="list">
              {Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).map(([dayKey, regs], i) => (
                <motion.li key={dayKey} {...REG_LIST_ITEM(i)} style={{ listStyle: 'none' }}>
                  <RegCard
                    onClick={() => push('day', dayKey)}
                    left={formatDayLabel(dayKey)}
                    sub={`${regs.length} abordaje${regs.length !== 1 ? 's' : ''}`}
                    right={regs.length}
                    accent={<Clock size={16} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />}
                    testId={`reg-day-${dayKey}`}
                  />
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* NIVEL 3 — Turnos + Empleados (ordenados por prioridad) */}
        {level === 3 && (
          <motion.div key="turnos" {...REG_ANIM}>
            <RegHeader
              title={formatDayLabel(currentDay)}
              sub={`${dayRegs.length} empleado${dayRegs.length !== 1 ? 's' : ''} · orden por prioridad`}
              showBack
              onBack={back}
            />
            <div style={regStyles.turnosWrap}>
              {turnosOrdered.map(turno => {
                const regs = byTurno[turno];
                const anomalies = regs.filter(r => r.estado !== 'autorizado').length;
                return (
                  <section key={turno} aria-labelledby={`turno-${turno}`} data-testid={`reg-turno-${turno}`}>
                    <div style={regStyles.turnoHeader}>
                      <h3 id={`turno-${turno}`} style={regStyles.turnoTitle}>
                        Turno {turno}
                      </h3>
                      {anomalies > 0 && (
                        <span
                          style={regStyles.turnoAlertChip}
                          title={`${anomalies} incidencia${anomalies !== 1 ? 's' : ''}`}
                          aria-label={`${anomalies} incidencias en este turno`}
                          data-testid={`reg-turno-alert-${turno}`}
                        >
                          {anomalies} <span aria-hidden="true">⚠</span>
                        </span>
                      )}
                      <div style={regStyles.turnoDivider} aria-hidden="true" />
                      <span style={regStyles.turnoCount}>{regs.length}</span>
                    </div>

                    <div style={regStyles.itemList}>
                      {regs.map((reg, i) => (
                        <RegItem key={reg.id || `${turno}-${i}`} reg={reg} i={i} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </section>
  );
};

/* ============================================================
   STYLES — RegistrosPanel · 100% tokens · mobile-first
   ============================================================ */
const regStyles = {
  panel: {
    position: 'absolute',
    inset: 0,
    overflowY: 'auto',
    padding: 'var(--spacing-base)',
    paddingBottom: 'max(var(--spacing-xxl), calc(env(safe-area-inset-bottom) + var(--spacing-xl)))',
    WebkitOverflowScrolling: 'touch',
  },

  /* Header */
  header: {
    marginBottom: 'var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  backBtn: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    minHeight: '2rem',
    padding: 'var(--spacing-xxs) var(--spacing-xs) var(--spacing-xxs) 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 500,
    color: 'var(--color-accent)',
    WebkitTapHighlightColor: 'transparent',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(var(--typography-title-md-size), 5vw, var(--typography-display-sm-size))',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)',
    textTransform: 'capitalize',
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
  },
  sub: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* List */
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },

  /* Card genérica */
  card: {
    width: '100%',
    minHeight: '4rem',
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-xl)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 160ms ease, transform 120ms ease',
    WebkitTapHighlightColor: 'transparent',
  },
  accentBox: {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: 'var(--rounded-md)',
    flexShrink: 0,
    background: 'rgb(var(--color-accent-raw) / 0.1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardLeft: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  },
  cardSub: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },
  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    flexShrink: 0,
  },
  countPill: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontWeight: 600,
    color: 'var(--color-accent)',
    background: 'rgb(var(--color-accent-raw) / 0.08)',
    padding: '2px var(--spacing-xs)',
    borderRadius: 'var(--rounded-pill)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.4,
  },

  /* Ruta card (NIVEL 0) */
  rutaCard: {
    width: '100%',
    minHeight: '4rem',
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-xl)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 160ms ease, transform 120ms ease',
    WebkitTapHighlightColor: 'transparent',
  },
  rutaBadge: {
    width: '3rem',
    height: '3rem',
    borderRadius: 'var(--rounded-md)',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rutaBadgeText: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
  },

  /* Turno (NIVEL 3) */
  turnosWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  },
  turnoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    marginBottom: 'var(--spacing-sm)',
  },
  turnoTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  },
  turnoAlertChip: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    lineHeight: 1,
    background: 'rgb(var(--color-semantic-error-raw) / 0.1)',
    color: 'var(--color-semantic-error)',
    padding: '2px var(--spacing-xs)',
    borderRadius: 'var(--rounded-pill)',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  },
  turnoDivider: {
    flex: 1,
    height: '1px',
    background: 'var(--color-hairline-soft)',
  },
  turnoCount: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    fontVariantNumeric: 'tabular-nums',
  },

  /* Item de empleado */
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  item: {
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-lg)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  itemIcon: {
    width: '2.25rem',
    height: '2.25rem',
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.25,
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    marginTop: '2px',
    flexWrap: 'wrap',
  },
  itemNum: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  itemBadge: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    lineHeight: 1,
    padding: '2px var(--spacing-xs)',
    borderRadius: 'var(--rounded-pill)',
    fontWeight: 600,
  },
  itemTime: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    flexShrink: 0,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.02em',
  },

  /* Empty */
  empty: {
    textAlign: 'center',
    padding: 'var(--spacing-xxl) var(--spacing-lg)',
    background: 'var(--color-surface-card)',
    borderRadius: 'var(--rounded-xl)',
    border: '1px dashed var(--color-hairline-strong)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  emptyIcon: {
    width: '3rem',
    height: '3rem',
    borderRadius: '50%',
    background: 'var(--color-canvas-soft)',
    color: 'var(--color-muted-soft)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--spacing-xs)',
  },
  emptyTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  emptySub: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* Loading */
  loadingWrap: {
    padding: 'var(--spacing-lg) var(--spacing-base)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  skeletonCard: {
    height: '4rem',
    borderRadius: 'var(--rounded-xl)',
    background: 'var(--color-hairline-soft)',
    animation: 'vp-reg-pulse 1.4s ease-in-out infinite',
  },
};


/* ─── Portal Principal ────────────────────────────────────── */
export const ChoferPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.hash === '#registros' ? 'registros' : 'scanner');
  
  // Rutas y Scanner
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [rutasActivas, setRutasActivas] = useState([]);
  const [loadingRutas, setLoadingRutas] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  
  // Registros
  const [registros, setRegistros] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  
  const [session, setSession] = useState(null);
  const isAdmin = session?.user?.user_metadata?.role === 'admin';
  const timerRef = useRef(null);
  const isScanningRef = useRef(false);

  const qrRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  // Fetch rutas activas
  const fetchRutasActivas = async () => {
    setLoadingRutas(true);
    try {
      const { data, error } = await supabase.from('rutas_activas').select('*');
      if (error) throw error;
      setRutasActivas(data.map(r => r.ruta));
      
      // Si el chofer actual ya tenía una ruta, autoseleccionarla
      if (session?.user?.id) {
        const myRoute = data.find(r => r.chofer_id === session.user.id);
        if (myRoute) setSelectedRoute(myRoute.ruta);
      }
    } catch (err) {
      console.warn('No se pudo cargar rutas_activas (puede que no exista la tabla aún):', err.message);
      // Fallback local para pruebas si la tabla no existe
      const localActivas = JSON.parse(localStorage.getItem('rutas_activas_local') || '[]');
      setRutasActivas(localActivas.map(r => r.ruta));
      if (session?.user?.id) {
        const myRoute = localActivas.find(r => r.chofer_id === session.user.id);
        if (myRoute) setSelectedRoute(myRoute.ruta);
      }
    } finally {
      setLoadingRutas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'scanner' && !selectedRoute) fetchRutasActivas();
  }, [activeTab, selectedRoute, session]);

  const handleSelectRoute = async (ruta) => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase.from('rutas_activas').insert({ ruta, chofer_id: session.user.id });
      if (error) throw error;
      setSelectedRoute(ruta);
    } catch (err) {
      console.warn('Error al insertar ruta_activa, usando local:', err.message);
      const local = JSON.parse(localStorage.getItem('rutas_activas_local') || '[]');
      local.push({ ruta, chofer_id: session.user.id });
      localStorage.setItem('rutas_activas_local', JSON.stringify(local));
      setSelectedRoute(ruta);
    }
  };

  const handleEndRoute = async () => {
    if (!selectedRoute || !session?.user?.id) return;
    setIsFinishing(true);
    try {
      await supabase.from('rutas_activas').delete().eq('ruta', selectedRoute);
    } catch (err) {
      // ignore
    }
    const local = JSON.parse(localStorage.getItem('rutas_activas_local') || '[]').filter(r => r.ruta !== selectedRoute);
    localStorage.setItem('rutas_activas_local', JSON.stringify(local));
    setSelectedRoute(null);
    setIsFinishing(false);
    fetchRutasActivas();
  };

  useEffect(() => {
    if (activeTab === 'registros') fetchRegistros();
  }, [activeTab]);

  // ── TODO: QUITAR DATOS DE PRUEBA ──────────────────────────
  const MOCK_REGISTROS = (() => {
    const rutas = [
      'R1- QUERETARO- PIE DE LA CUESTA',
      'R2- SAN JOSE ITURBIDE',
      'R3- SAN JOSE ITURBIDE 2',
      'R4-SANTA ROSA',
      'R5- QUERETARO-AV. DE LA LUZ',
      'R6- AV. DE LA LUZ - PASEOS QUERETARO',
    ];
    const nombres = [
      'JUAN PÉREZ LÓPEZ', 'MARÍA GARCÍA HERNÁNDEZ', 'CARLOS RAMÍREZ TORRES',
      'ANA MARTÍNEZ REYES', 'PEDRO SÁNCHEZ LUNA', 'LAURA FLORES MENDOZA',
      'JOSE MORALES VEGA', 'PATRICIA RUIZ DELGADO', 'MIGUEL CASTILLO RAMOS',
      'SOFIA GUTIERREZ PONCE', 'ROBERTO DÍAZ SILVA', 'ELENA VARGAS CORONA',
    ];
    const turnos = ['1', '2', '3'];
    const records = [];
    let id = 1;
    // Semana pasada (lun-sáb)
    for (let day = 0; day < 6; day++) {
      const date = new Date('2026-06-09T07:00:00');
      date.setDate(date.getDate() + day);
      rutas.forEach((ruta, ri) => {
        turnos.forEach(turno => {
          const count = 2 + Math.floor(Math.random() * 3);
          for (let e = 0; e < count; e++) {
            const h = new Date(date);
            h.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
            
            // Simular algunos registros rechazados
            const isRejectedRuta = Math.random() > 0.9;
            const isRejectedQR = !isRejectedRuta && Math.random() > 0.95;
            const isFueraHorario = !isRejectedRuta && !isRejectedQR && Math.random() > 0.9;
            const isDiaDescanso = !isRejectedRuta && !isRejectedQR && !isFueraHorario && Math.random() > 0.9;
            
            let estado = 'autorizado';
            let qr_leido = null;
            let empleadoRuta = ruta;
            
            if (isRejectedRuta) {
              estado = 'rechazado_ruta';
              empleadoRuta = rutas[(ri + 1) % rutas.length]; // Le ponemos otra ruta al empleado
            } else if (isRejectedQR) {
              estado = 'rechazado_qr';
              qr_leido = `FAKE-QR-${id}`;
            } else if (isFueraHorario) {
              estado = 'fuera_horario';
            } else if (isDiaDescanso) {
              estado = 'dia_descanso';
            }

            records.push({
              id: String(id++),
              fecha_hora: h.toISOString(),
              estado,
              ruta_chofer: ruta,
              qr_leido,
              empleados: isRejectedQR ? null : {
                id: String(id * 10),
                nombre: nombres[(id + ri + e) % nombres.length],
                numero_empleado: String(10200 + id),
                turno,
                ruta: empleadoRuta,
              },
            });
          }
        });
      });
    }
    // Semana actual (lun-vie)
    for (let day = 0; day < 5; day++) {
      const date = new Date('2026-06-16T07:00:00');
      date.setDate(date.getDate() + day);
      [rutas[0], rutas[1], rutas[4]].forEach((ruta, ri) => {
        ['1', '2'].forEach(turno => {
          const h = new Date(date);
          h.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
          
          const isRejectedRuta = Math.random() > 0.85; // Un poco más probable para verlos más fácil
          const isRejectedQR = !isRejectedRuta && Math.random() > 0.9;
          const isFueraHorario = !isRejectedRuta && !isRejectedQR && Math.random() > 0.85;
          const isDiaDescanso = !isRejectedRuta && !isRejectedQR && !isFueraHorario && Math.random() > 0.85;

          let estado = 'autorizado';
          let qr_leido = null;
          let empleadoRuta = ruta;

          if (isRejectedRuta) {
            estado = 'rechazado_ruta';
            empleadoRuta = rutas[(ri + 2) % rutas.length];
          } else if (isRejectedQR) {
            estado = 'rechazado_qr';
            qr_leido = `INVALID-CODE-${id}`;
          } else if (isFueraHorario) {
            estado = 'fuera_horario';
          } else if (isDiaDescanso) {
            estado = 'dia_descanso';
          }

          records.push({
            id: String(id++),
            fecha_hora: h.toISOString(),
            estado,
            ruta_chofer: ruta,
            qr_leido,
            empleados: isRejectedQR ? null : {
              id: String(id * 10),
              nombre: nombres[(id + ri) % nombres.length],
              numero_empleado: String(10200 + id),
              turno,
              ruta: empleadoRuta,
            },
          });
        });
      });
    }
    return records;
  })();
  // ─────────────────────────────────────────────────────────

  const fetchRegistros = async () => {
    setLoadingRegistros(true);
    try {
      const { data, error } = await supabase
        .from('registros')
        .select(`id, fecha_hora, estado, qr_leido, ruta_chofer, empleados (id, nombre, numero_empleado, turno, ruta)`)
        .order('fecha_hora', { ascending: false })
        .limit(500);
      if (error) throw error;
      // TODO: quitar fallback a MOCK cuando la tabla exista
      setRegistros(data?.length ? data : MOCK_REGISTROS);
    } catch {
      setRegistros(MOCK_REGISTROS); // TODO: quitar cuando la tabla exista
    } finally {
      setLoadingRegistros(false);
    }
  };


  useEffect(() => {
    // Solo arrancamos la cámara si estamos en tab scanner Y hay ruta seleccionada
    if (activeTab !== 'scanner' || !selectedRoute) return;

    const qr = new Html5Qrcode('reader');
    qrRef.current = qr;

    const onScanSuccess = async (decodedText) => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);

      // uiColor en scope externo al try para poder usarlo en el finally
      let uiColor = 'success';

      try {
        // ─── Parsear el contenido del QR ──────────────────
        // Los QR generados contienen JSON: {"numero_empleado":"4"}
        // Mantenemos compatibilidad con QRs antiguos que pudieran contener
        // directamente el id (UUID) o el número de empleado en texto plano.
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
            // QR con texto no-JSON: lo dejamos como UUID/id
          }
        } else if (/^\d+$/.test(trimmed)) {
          // QR con solo dígitos → asumimos número de empleado
          lookupField = 'numero_empleado';
          lookupValue = trimmed;
        }

        const { data: emp, error: empError } = await supabase.from('empleados').select('*').eq(lookupField, lookupValue).maybeSingle();
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

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
          // Validar horario y día de descanso
          const diaActualStr = DAY_NAMES[now.getDay()];
          const diasLaborables = SHIFT_SCHEDULE[emp.turno];
          
          if (diasLaborables && !diasLaborables.includes(diaActualStr)) {
            estado = 'dia_descanso';
          } else {
            // Validar ventanas de horario si no es su día de descanso
            let turnoReal = String(emp.turno);
            // El turno 4 es comodín, depende del día
            if (turnoReal === '4') {
              if (diaActualStr === 'Domingo') turnoReal = '1';
              else if (diaActualStr === 'Lunes' || diaActualStr === 'Martes') turnoReal = '2';
              else if (diaActualStr === 'Miércoles' || diaActualStr === 'Jueves') turnoReal = '3';
            }

            const SHIFT_HOURS = {
              '1': { start: 6, end: 14 },
              '2': { start: 14, end: 22 },
              '3': { start: 22, end: 6 }
            };

            const hours = SHIFT_HOURS[turnoReal];
            if (hours) {
              const currentMins = now.getHours() * 60 + now.getMinutes();
              const isWithin = (hStr, mStr, hEnd, mEnd) => {
                const startM = hStr * 60 + mStr;
                const endM = hEnd * 60 + mEnd;
                if (startM <= endM) return currentMins >= startM && currentMins <= endM;
                return currentMins >= startM || currentMins <= endM; // Cruce de medianoche
              };

              // Entrada: 2 horas antes hasta 1 hora después del inicio
              let startEntH = hours.start - 2; if (startEntH < 0) startEntH += 24;
              let endEntH = hours.start + 1;   if (endEntH >= 24) endEntH -= 24;
              const isValidEntrada = isWithin(startEntH, 0, endEntH, 0);

              // Salida: 1 hora antes hasta 20 mins después del fin
              let startSalH = hours.end - 1;   if (startSalH < 0) startSalH += 24;
              const isValidSalida = isWithin(startSalH, 0, hours.end, 20);

              if (!isValidEntrada && !isValidSalida) {
                estado = 'fuera_horario';
              }
            }
          }
        }

        const isWarning = estado === 'dia_descanso' || estado === 'fuera_horario';
        uiColor = isValid ? (isWarning ? 'warning' : 'success') : 'error';
        
        let warningReason = '';
        if (estado === 'dia_descanso') warningReason = 'Día de descanso';
        else if (estado === 'fuera_horario') warningReason = 'Fuera de horario de abordaje';

        setScanResult({ 
          text: decodedText, 
          isValid, 
          estado,
          uiColor,
          rejectReason: isValid && isWarning ? warningReason : rejectReason,
          employee: emp, 
          time: timeStr 
        });

        // Feedback háptico (móvil): patrón distinto según severidad
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          if (uiColor === 'success') navigator.vibrate(60);
          else if (uiColor === 'warning') navigator.vibrate([60, 80, 60]);
          else navigator.vibrate([120, 80, 120, 80, 120]);
        }

        // Insertar en registros sin importar si es válido o no (requiere que empleado_id sea null-able si es rechazado_qr)
        const record = { 
          chofer_id: session?.user?.id || null,
          ruta_chofer: selectedRoute,
          estado,
          qr_leido: decodedText
        };
        // Solo asignamos empleado_id si existe el empleado, para evitar error de Foreign Key
        if (emp) record.empleado_id = emp.id;

        const { error: regError } = await supabase.from('registros').insert(record);
        if (regError) {
          console.warn('Error insertando registro, guardando local:', regError.message);
          const local = JSON.parse(localStorage.getItem('qr_local_history') || '[]');
          local.unshift({ id: Date.now(), fecha_hora: now.toISOString(), empleados: emp, estado, ruta_chofer: selectedRoute });
          localStorage.setItem('qr_local_history', JSON.stringify(local.slice(0, 500)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        // Duración del aviso según severidad — los errores/advertencias se quedan
        // más tiempo para que el chofer alcance a leerlos antes de seguir escaneando.
        // El usuario también puede tocar el aviso para descartarlo manualmente.
        let ms = 4000; // éxito por defecto
        if (uiColor === 'warning') ms = 6000;
        else if (uiColor === 'error') ms = 6500;
        timerRef.current = setTimeout(() => { setScanResult(null); isScanningRef.current = false; }, ms);
      }
    };

    qr.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: (w, h) => {
          const size = Math.round(Math.min(w, h) * 0.65);
          return { width: size, height: size };
        },
        aspectRatio: window.innerHeight / window.innerWidth,
        disableFlip: false,
      },
      onScanSuccess,
      () => {}
    ).catch((err) => {
      console.warn('Fallback a cámara frontal:', err);
      qr.start({ facingMode: 'user' }, { fps: 15, qrbox: { width: 240, height: 240 } }, onScanSuccess, () => {}).catch(console.error);
    });

    return () => {
      qr.isScanning && qr.stop().then(() => qr.clear()).catch(console.error);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeTab, selectedRoute, session]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-canvas-soft)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
        .app-container > nav, .app-container > header { display: none !important; }
        .app-container > main { padding: 0 !important; max-width: none !important; }

        /* --- Html5Qrcode overrides: video a pantalla completa --- */
        #reader {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          background: #000 !important;
          padding: 0 !important;
          position: absolute !important;
          inset: 0 !important;
        }
        #reader > div {
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          border: none !important;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0 !important; left: 0 !important;
        }
        /* Ocultar el QR box nativo de la librería, usamos el nuestro */
        #reader__scan_region {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
        }
        #reader__scan_region img, #reader__dashboard { display: none !important; }

        /* Helpers responsivos */
        .vp-hide-sm { display: inline; }
        @media (max-width: 360px) {
          .vp-hide-sm { display: none; }
        }
      `}</style>

      {/* Header cohesivo con TopNav de Empresa */}
      <PortalHeader
        subtitle="Portal Abordaje · Transporte"
        onBrandClick={() => navigate(isAdmin ? '/empresa' : '/chofer')}
        onLogout={async () => { await supabase.auth.signOut(); navigate('/'); }}
        extras={
          isAdmin && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => navigate('/empresa')}
              data-testid="back-to-empresa-btn"
              title="Volver a Empresa"
              aria-label="Volver al portal de Empresa"
              style={{
                height: '36px', minWidth: '36px', padding: '0 var(--spacing-sm)',
                borderRadius: 'var(--rounded-pill)',
                background: 'rgb(var(--color-accent-raw) / 0.1)',
                border: '1px solid rgb(var(--color-accent-raw) / 0.25)',
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-xxs)',
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--typography-caption-size)',
                fontWeight: 600,
              }}
            >
              <Building2 size={14} />
              <span className="vp-hide-sm">Empresa</span>
            </motion.button>
          )
        }
      />

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Tab: Escáner */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', opacity: activeTab === 'scanner' ? 1 : 0, pointerEvents: activeTab === 'scanner' ? 'auto' : 'none', transition: 'opacity 0.25s ease', zIndex: activeTab === 'scanner' ? 5 : 0 }}>
          <div style={{ flex: 1, position: 'relative', background: selectedRoute ? '#000' : 'var(--color-canvas-soft)' }}>
            
            {!selectedRoute ? (
              <RutaSelectionPanel onSelect={handleSelectRoute} rutasActivas={rutasActivas} loading={loadingRutas} />
            ) : (
              <>
                <div id="reader" style={{ position: 'absolute', inset: 0 }} />

                {/* Overlay minimalista */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, boxShadow: 'inset 0 0 0 2000px rgba(0,0,0,0.5)' }}>
                  
                  {/* Cuadro central del escáner */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '250px', height: '250px', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '24px' }}>
                    <ScanLine size={40} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                  </div>
                  
                  {/* Top Bar (Ruta y Botón Salir) */}
                  <div style={{ position: 'absolute', top: 'var(--spacing-lg)', left: 'var(--spacing-lg)', right: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
                    
                    {/* Etiqueta de ruta (Minimalista) */}
                    <div style={{ background: getRutaColor(parseRuta(selectedRoute).code).bg, padding: 'var(--spacing-xxs) var(--spacing-sm)', borderRadius: 'var(--rounded-pill)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getRutaColor(parseRuta(selectedRoute).code).text, boxShadow: `0 0 8px ${getRutaColor(parseRuta(selectedRoute).code).text}` }} />
                      <span style={{ color: 'var(--color-on-primary)', fontSize: 'var(--typography-body-sm-size)', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
                        {parseRuta(selectedRoute).code}
                      </span>
                    </div>

                    {/* Botón Salir */}
                    <button 
                      onClick={handleEndRoute}
                      disabled={isFinishing}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-on-primary)', borderRadius: 'var(--rounded-full)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                      aria-label="Cerrar cámara"
                    >
                      {isFinishing ? <span style={{ fontSize: 'var(--typography-caption-size)' }}>…</span> : <X size={20} />}
                    </button>
                  </div>
                </div>

                {/* Resultado flotante */}
                <AnimatePresence>
                  {scanResult && (() => {
                    const dur = scanResult.uiColor === 'success' ? 4000 : scanResult.uiColor === 'warning' ? 6000 : 6500;
                    const titleText = scanResult.isValid
                      ? (scanResult.uiColor === 'warning' ? 'Alerta de Horario' : 'Acceso Autorizado')
                      : (scanResult.estado === 'rechazado_qr' ? 'QR no Reconocido' : 'Acceso Denegado');
                    const tone = `var(--color-semantic-${scanResult.uiColor})`;
                    const toneRaw = `var(--color-semantic-${scanResult.uiColor}-raw)`;
                    return (
                      <motion.div
                        key={`scan-${scanResult.estado}-${scanResult.time}`}
                        initial={{ opacity: 0, y: 60, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        onClick={() => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          setScanResult(null);
                          isScanningRef.current = false;
                        }}
                        data-testid="scan-result-card"
                        role="status"
                        aria-live="polite"
                        style={{
                          position: 'absolute',
                          bottom: 'var(--spacing-xl)',
                          left: 'var(--spacing-base)', right: 'var(--spacing-base)',
                          zIndex: 10,
                          background: 'var(--color-surface-card)',
                          borderRadius: 'var(--rounded-xl)',
                          padding: 'var(--spacing-lg) var(--spacing-base) var(--spacing-base)',
                          boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${tone}`,
                          borderTop: `4px solid ${tone}`,
                          display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Fila principal */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-base)' }}>
                          <motion.div
                            initial={{ scale: 0.6, rotate: -15 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.05 }}
                            style={{
                              width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
                              background: tone,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: scanResult.uiColor === 'warning' ? 'var(--color-ink)' : 'var(--color-on-primary)',
                              boxShadow: `0 8px 20px rgb(${toneRaw} / 0.35)`,
                            }}
                          >
                            {scanResult.isValid ? <CheckCircle size={36} strokeWidth={2.5} /> : <XCircle size={36} strokeWidth={2.5} />}
                          </motion.div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 'var(--typography-title-md-size)', fontWeight: 700, fontFamily: 'var(--font-display)', color: tone, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                              {titleText}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 'var(--typography-body-sm-size)', fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {scanResult.isValid ? (scanResult.employee?.nombre || '—') : (scanResult.rejectReason || '—')}
                            </p>
                            {scanResult.employee?.numero_empleado && (
                              <p style={{ margin: '2px 0 0', fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>
                                #{scanResult.employee.numero_empleado} · {scanResult.time}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Chips de turno y ruta */}
                        {scanResult.employee && (scanResult.employee.turno || scanResult.employee.ruta) && (
                          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                            {scanResult.employee.turno && (
                              <span style={{
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
                              }}>
                                Turno {scanResult.employee.turno}
                              </span>
                            )}
                            {scanResult.employee.ruta && (
                              <span style={{
                                padding: 'var(--spacing-xxs) var(--spacing-sm)',
                                background: scanResult.estado === 'rechazado_ruta' ? `rgb(${toneRaw} / 0.1)` : 'var(--color-canvas)',
                                borderRadius: 'var(--rounded-pill)',
                                fontSize: 'var(--typography-caption-uppercase-size)',
                                fontWeight: 'var(--typography-caption-uppercase-weight)',
                                letterSpacing: 'var(--typography-caption-uppercase-ls)',
                                textTransform: 'uppercase',
                                fontFamily: 'var(--font-body)',
                                color: scanResult.estado === 'rechazado_ruta' ? tone : 'var(--color-ink)',
                                border: `1px solid ${scanResult.estado === 'rechazado_ruta' ? `rgb(${toneRaw} / 0.3)` : 'var(--color-hairline-soft)'}`,
                                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {parseRuta(scanResult.employee.ruta).code} · {parseRuta(scanResult.employee.ruta).desc}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Barra de progreso (countdown visual) */}
                        <div style={{ height: '3px', background: 'var(--color-hairline-soft)', borderRadius: 'var(--rounded-pill)', overflow: 'hidden', marginTop: 'var(--spacing-xxs)' }}>
                          <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: dur / 1000, ease: 'linear' }}
                            style={{ height: '100%', background: tone, borderRadius: 'inherit' }}
                          />
                        </div>

                        <p style={{ margin: 0, fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted-soft)', textAlign: 'center' }}>
                          Toca para cerrar
                        </p>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        {/* Tab: Registros */}
        <div style={{ position: 'absolute', inset: 0, opacity: activeTab === 'registros' ? 1 : 0, pointerEvents: activeTab === 'registros' ? 'auto' : 'none', transition: 'opacity 0.25s ease', zIndex: activeTab === 'registros' ? 5 : 0 }}>
          <RegistrosPanel registros={registros} loading={loadingRegistros} />
        </div>

      </div>

      {/* Bottom Nav */}
      <nav style={{ background: 'var(--color-surface-card)', padding: 'var(--spacing-xs) var(--spacing-base)', paddingBottom: 'max(var(--spacing-xs), env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-hairline-soft)', display: 'flex', zIndex: 10 }} role="tablist" aria-label="Navegación inferior">
        {[
          { id: 'scanner',   icon: <Camera size={22} />,  label: 'Escanear'  },
          { id: 'registros', icon: <List   size={22} />,  label: 'Registros' },
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, background: 'none', border: 'none',
                padding: 'var(--spacing-xs) var(--spacing-xxs)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 'var(--spacing-xxs)',
                color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                fontFamily: 'var(--font-body)',
              }}
            >
              {tab.icon}
              <span style={{
                fontSize: 'var(--typography-caption-uppercase-size)',
                fontWeight: active ? 700 : 'var(--typography-caption-uppercase-weight)',
                letterSpacing: 'var(--typography-caption-uppercase-ls)',
                textTransform: 'uppercase',
              }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
