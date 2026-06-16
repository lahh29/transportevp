import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, ScanLine, List, Camera, ChevronRight, ChevronLeft, Bus, Calendar, Users, Clock, MapPin, X, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalHeader } from '../components/PortalHeader';
import { notify } from '../lib/notify';

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



/* ─── Página Historial ────────────────────────────────────── */
export default function Historial() {
  const [registros, setRegistros] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

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

  const fetchRegistros = async () => {
    setLoadingRegistros(true);
    try {
      const { data, error } = await supabase
        .from('registros')
        .select(`id, fecha_hora, estado, qr_leido, ruta_chofer, empleados (id, nombre, numero_empleado, turno, ruta)`)
        .order('fecha_hora', { ascending: false })
        .limit(500);
      if (error) throw error;
      setRegistros(data?.length ? data : MOCK_REGISTROS);
    } catch {
      setRegistros(MOCK_REGISTROS);
    } finally {
      setLoadingRegistros(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 4rem)' }}>
      <RegistrosPanel registros={registros} loading={loadingRegistros} />
    </div>
  );
}
