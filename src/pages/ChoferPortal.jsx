import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, ScanLine, List, Camera, LogOut, ChevronRight, ChevronLeft, Bus, Calendar, Users, Clock, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  R1: { bg: 'rgb(245 78 0 / 0.1)',   text: 'var(--color-accent)' },
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
    style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%', overflowY: 'auto' }}
  >
    <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
      <Bus size={48} color="var(--color-accent)" style={{ opacity: 0.2, marginBottom: 'var(--spacing-base)' }} />
      <h2 style={{ margin: 0, fontSize: 'var(--typography-title-lg-size)', fontWeight: 'var(--typography-title-lg-weight)', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>Selecciona tu Ruta</h2>
      <p style={{ margin: '8px 0 0', fontSize: 'var(--typography-body-sm-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>¿Qué ruta vas a manejar en este viaje?</p>
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
    return map;
  }, [dayRegs]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
      Cargando registros…
    </div>
  );

  const Card = ({ onClick, left, right, sub, accent }) => (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        width: '100%', background: 'var(--color-surface-card)',
        border: '1px solid var(--color-hairline-soft)', borderRadius: 'var(--rounded-xl)',
        padding: 'var(--spacing-base) var(--spacing-lg)', display: 'flex',
        alignItems: 'center', gap: 'var(--spacing-base)', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {accent && (
        <div style={{
          width: '40px', height: '40px', borderRadius: 'var(--rounded-lg)', flexShrink: 0,
          background: 'rgb(var(--color-accent-raw) / 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {accent}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: 'var(--typography-body-sm-size)', fontWeight: 'var(--typography-title-sm-weight)', fontFamily: 'var(--font-body)', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {left}
        </p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
        {right && <span style={{ fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--color-accent)', background: 'rgb(var(--color-accent-raw) / 0.08)', padding: '2px 8px', borderRadius: 'var(--rounded-pill)' }}>{right}</span>}
        <ChevronRight size={16} color="var(--color-muted)" />
      </div>
    </motion.button>
  );

  const Header = ({ title, sub }) => (
    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
      {level > 0 && (
        <button onClick={back} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)', fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)', fontWeight: 500, marginBottom: 'var(--spacing-xs)', padding: 0 }}>
          <ChevronLeft size={16} /> Atrás
        </button>
      )}
      <h2 style={{ margin: 0, fontSize: 'var(--typography-display-sm-size)', fontWeight: 'var(--typography-title-md-weight)', fontFamily: 'var(--font-display)', color: 'var(--color-ink)', textTransform: 'capitalize' }}>{title}</h2>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-xxl)' }}>
      <AnimatePresence mode="wait">

        {/* NIVEL 0 – Rutas */}
        {level === 0 && (
          <motion.div key="rutas" {...slideIn}>
            <Header title="Historial de Abordajes" sub="Selecciona una ruta para ver el detalle" />
              {Object.keys(byRuta).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--color-muted)', background: 'var(--color-surface-card)', borderRadius: 'var(--rounded-xl)', border: '1px dashed var(--color-hairline-strong)' }}>
                <Bus size={40} style={{ opacity: 0.2, marginBottom: 'var(--spacing-base)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)' }}>No hay registros aún.</p>
                <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)' }}>Los abordajes escaneados aparecerán aquí.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {Object.entries(byRuta).sort().map(([ruta, regs]) => {
                  const { code, desc } = parseRuta(ruta);
                  const color = getRutaColor(code);
                  return (
                    <motion.button key={ruta} whileTap={{ scale: 0.97 }} onClick={() => push('ruta', ruta)}
                      style={{ width: '100%', background: 'var(--color-surface-card)', border: '1px solid var(--color-hairline-soft)', borderRadius: 'var(--rounded-xl)', padding: 'var(--spacing-base)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-base)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'left' }}
                    >
                      {/* Badge de ruta */}
                      <div style={{ width: '48px', height: '48px', borderRadius: 'var(--rounded-lg)', flexShrink: 0, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--typography-caption-uppercase-size)', fontWeight: 'var(--typography-caption-uppercase-weight)', letterSpacing: 'var(--typography-caption-uppercase-ls)', color: color.text }}>{code}</span>
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 'var(--typography-body-sm-size)', fontWeight: 'var(--typography-title-sm-weight)', fontFamily: 'var(--font-body)', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {desc}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>
                          {regs.length} abordaje{regs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {/* Contador + chevron */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
                        <span style={{ fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', fontWeight: 600, color: color.text, background: color.bg, padding: '2px 8px', borderRadius: 'var(--rounded-pill)' }}>{regs.length}</span>
                        <ChevronRight size={16} color="var(--color-muted)" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* NIVEL 1 – Semanas */}
        {level === 1 && (
          <motion.div key="semanas" {...slideIn}>
            <Header title={currentRuta} sub="Selecciona una semana" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {Object.entries(byWeek).sort((a, b) => b[0].localeCompare(a[0])).map(([weekKey, regs]) => (
                <Card key={weekKey} onClick={() => push('week', weekKey)}
                  left={formatWeekLabel(weekKey)}
                  sub={`${regs.length} abordaje${regs.length !== 1 ? 's' : ''}`}
                  right={`${regs.length}`}
                  accent={<Calendar size={18} color="var(--color-accent)" />}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* NIVEL 2 – Días */}
        {level === 2 && (
          <motion.div key="dias" {...slideIn}>
            <Header title={formatWeekLabel(currentWeek)} sub="Selecciona un día" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).map(([dayKey, regs]) => (
                <Card key={dayKey} onClick={() => push('day', dayKey)}
                  left={formatDayLabel(dayKey)}
                  sub={`${regs.length} abordaje${regs.length !== 1 ? 's' : ''}`}
                  right={`${regs.length}`}
                  accent={<Clock size={18} color="var(--color-accent)" />}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* NIVEL 3 – Turnos + Empleados */}
        {level === 3 && (
          <motion.div key="turnos" {...slideIn}>
            <Header title={formatDayLabel(currentDay)} sub={`${dayRegs.length} empleado${dayRegs.length !== 1 ? 's' : ''} abordaron`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              {Object.entries(byTurno).sort().map(([turno, regs]) => (
                <div key={turno}>
                  {/* Cabecera de turno */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-uppercase-size)', fontWeight: 'var(--typography-caption-uppercase-weight)', letterSpacing: 'var(--typography-caption-uppercase-ls)', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
                      Turno {turno}
                    </span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-hairline-soft)' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)', color: 'var(--color-muted)' }}>{regs.length}</span>
                  </div>
                  {/* Lista de empleados */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                    {regs.map((reg, i) => {
                      const emp = reg.empleados;
                      const time = new Date(reg.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                      const isRejected = reg.estado === 'rechazado_ruta' || reg.estado === 'rechazado_qr';
                      const isFakeQR = reg.estado === 'rechazado_qr';
                      const isWarning = reg.estado === 'dia_descanso' || reg.estado === 'fuera_horario';
                      
                      let badgeText = '';
                      if (isFakeQR) badgeText = 'QR Inválido';
                      else if (isRejected) badgeText = 'Ruta Incorrecta';
                      else if (reg.estado === 'dia_descanso') badgeText = 'Día Descanso';
                      else if (reg.estado === 'fuera_horario') badgeText = 'Fuera de Horario';

                      // Estilos según el estado
                      let bgColor = 'var(--color-surface-card)';
                      let borderColor = 'var(--color-hairline-soft)';
                      let iconBg = 'rgb(var(--color-accent-raw) / 0.08)';
                      let iconColor = 'var(--color-accent)';
                      let textColor = 'var(--color-ink)';
                      let badgeBg = 'var(--color-accent)';

                      if (isRejected) {
                        bgColor = 'rgb(var(--color-semantic-error-raw) / 0.04)';
                        borderColor = 'rgb(var(--color-semantic-error-raw) / 0.2)';
                        iconBg = 'rgb(var(--color-semantic-error-raw) / 0.1)';
                        iconColor = 'var(--color-semantic-error)';
                        textColor = 'var(--color-semantic-error)';
                        badgeBg = 'var(--color-semantic-error)';
                      } else if (isWarning) {
                        bgColor = 'rgb(var(--color-semantic-warning-raw) / 0.05)';
                        borderColor = 'rgb(var(--color-semantic-warning-raw) / 0.3)';
                        iconBg = 'rgb(var(--color-semantic-warning-raw) / 0.15)';
                        iconColor = 'var(--color-semantic-warning)';
                        badgeBg = 'var(--color-semantic-warning)';
                      }

                      return (
                        <motion.div key={reg.id || i}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          style={{ background: bgColor, borderRadius: 'var(--rounded-lg)', padding: 'var(--spacing-sm) var(--spacing-base)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', border: `1px solid ${borderColor}` }}
                        >
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', fontWeight: 'var(--typography-title-sm-weight)', color: iconColor }}>
                            {isFakeQR ? <XCircle size={18} /> : getInitials(emp?.nombre)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 'var(--typography-body-sm-size)', fontWeight: 'var(--typography-title-sm-weight)', fontFamily: 'var(--font-body)', color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isRejected ? 'line-through' : 'none' }}>
                              {isFakeQR ? (reg.qr_leido || 'Código Desconocido') : (emp?.nombre || 'Desconocido')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                              <p style={{ margin: 0, fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>
                                {isFakeQR ? '---' : `#${emp?.numero_empleado || '---'}`}
                              </p>
                              {badgeText && (
                                <span style={{ fontSize: '10px', background: badgeBg, color: isWarning ? '#000' : '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  {badgeText}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)', flexShrink: 0 }}>{time}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
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

      try {
        const { data: emp, error: empError } = await supabase.from('empleados').select('*').eq('id', decodedText).single();
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
        const uiColor = isValid ? (isWarning ? 'warning' : 'success') : 'error';
        
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
        timerRef.current = setTimeout(() => { setScanResult(null); isScanningRef.current = false; }, 3000);
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
      `}</style>

      {/* Header */}
      <header style={{ padding: 'var(--spacing-base) var(--spacing-lg)', background: 'var(--color-surface-card)', borderBottom: '1px solid var(--color-hairline-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--typography-title-md-size)', fontWeight: 'var(--typography-title-md-weight)', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>Portal Abordaje</h1>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--typography-caption-size)', fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}>ViñoPlastic Transporte</p>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} title="Cerrar sesión"
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-canvas)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={18} color="var(--color-semantic-error)" />
        </button>
      </header>

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
                    <div style={{ background: getRutaColor(parseRuta(selectedRoute).code).bg, padding: '6px 14px', borderRadius: 'var(--rounded-full)', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getRutaColor(parseRuta(selectedRoute).code).text, boxShadow: `0 0 8px ${getRutaColor(parseRuta(selectedRoute).code).text}` }} />
                      <span style={{ color: '#fff', fontSize: 'var(--typography-body-sm-size)', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
                        {parseRuta(selectedRoute).code}
                      </span>
                    </div>

                    {/* Botón Salir */}
                    <button 
                      onClick={handleEndRoute}
                      disabled={isFinishing}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 'var(--rounded-full)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                      aria-label="Cerrar cámara"
                    >
                      {isFinishing ? <span style={{ fontSize: '10px' }}>...</span> : <X size={20} />}
                    </button>
                  </div>
                </div>

                {/* Resultado flotante */}
                <AnimatePresence>
                  {scanResult && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      style={{ position: 'absolute', bottom: 'var(--spacing-xl)', left: 'var(--spacing-base)', right: 'var(--spacing-base)', zIndex: 10, background: 'var(--color-surface-card)', borderRadius: 'var(--rounded-xl)', padding: 'var(--spacing-base)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: `2px solid var(--color-semantic-${scanResult.uiColor})`, display: 'flex', alignItems: 'center', gap: 'var(--spacing-base)' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, background: `var(--color-semantic-${scanResult.uiColor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: scanResult.uiColor === 'warning' ? '#000' : '#fff' }}>
                        {scanResult.isValid ? <CheckCircle size={32} /> : <XCircle size={32} />}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: 'var(--typography-title-md-size)', fontWeight: 'var(--typography-title-md-weight)', fontFamily: 'var(--font-body)', color: 'var(--color-ink)' }}>
                          {scanResult.isValid ? (scanResult.uiColor === 'warning' ? 'Alerta de Horario' : 'Acceso Autorizado') : 'Acceso Denegado'}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 'var(--typography-body-sm-size)', fontFamily: 'var(--font-body)', color: scanResult.isValid && scanResult.uiColor !== 'warning' ? 'var(--color-muted)' : `var(--color-semantic-${scanResult.uiColor})`, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {scanResult.isValid ? scanResult.employee?.nombre : scanResult.rejectReason}
                        </p>
                        {scanResult.employee?.turno && (
                          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                            <span style={{ padding: 'var(--spacing-xxs) var(--spacing-xs)', background: 'var(--color-canvas)', borderRadius: 'var(--rounded-sm)', fontSize: 'var(--typography-caption-uppercase-size)', fontWeight: 'var(--typography-caption-uppercase-weight)', fontFamily: 'var(--font-body)', color: 'var(--color-ink)' }}>
                              Turno {scanResult.employee.turno}
                            </span>
                            {scanResult.employee.ruta && (
                              <span style={{ padding: 'var(--spacing-xxs) var(--spacing-xs)', background: scanResult.isValid ? 'var(--color-canvas)' : 'rgb(var(--color-semantic-error-raw) / 0.1)', borderRadius: 'var(--rounded-sm)', fontSize: 'var(--typography-caption-uppercase-size)', fontWeight: 'var(--typography-caption-uppercase-weight)', fontFamily: 'var(--font-body)', color: scanResult.isValid ? 'var(--color-ink)' : 'var(--color-semantic-error)' }}>
                                {scanResult.employee.ruta}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
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
      <nav style={{ background: 'var(--color-surface-card)', padding: 'var(--spacing-sm) var(--spacing-lg)', paddingBottom: 'max(var(--spacing-sm), env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-hairline-soft)', display: 'flex', zIndex: 10 }}>
        {[
          { id: 'scanner',   icon: <Camera size={22} />,  label: 'Escanear'  },
          { id: 'registros', icon: <List   size={22} />,  label: 'Registros' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, background: 'none', border: 'none', padding: 'var(--spacing-xs)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-muted)', cursor: 'pointer', transition: 'color 0.2s ease' }}>
            {tab.icon}
            <span style={{ fontSize: 'var(--typography-caption-uppercase-size)', fontWeight: 'var(--typography-caption-uppercase-weight)', fontFamily: 'var(--font-body)', letterSpacing: 'var(--typography-caption-uppercase-ls)' }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
