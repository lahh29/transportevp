import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle, Search, X as XIcon, Copy, Upload, UserX } from 'lucide-react';
import { Modal } from './Modal';
import { notify } from '../lib/notify';

/* ============================================================
   PHOTO COVERAGE CHIP
   Mini-KPI clickable que muestra la cobertura de fotos:
   ej. "Fotos 87 / 120 · 33 pendientes".
   Al hacer click abre el listado de empleados sin foto y
   permite disparar la carga masiva.
   100% tokens · mobile-first · accesible.
   ============================================================ */

const getInitials = (nombre) => {
  if (!nombre) return '?';
  const parts = String(nombre).trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const PhotoCoverageChip = ({ employees, loading, onUpload }) => {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const total   = employees.length;
    const withPhoto = employees.filter(e => !!e.foto_url).length;
    const pending = total - withPhoto;
    const pct     = total === 0 ? 0 : Math.round((withPhoto / total) * 100);
    return { total, withPhoto, pending, pct };
  }, [employees]);

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes vp-coverage-shimmer {
            0% { transform: translateX(-100%) }
            100% { transform: translateX(100%) }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-vp-shimmer] { animation: none !important }
          }
        `}</style>
        <div style={{ ...S.chip, ...S.chipLoading }} aria-hidden="true">
          <span data-vp-shimmer style={S.shimmer} />
        </div>
      </>
    );
  }

  if (stats.total === 0) return null;

  const isComplete = stats.pending === 0;

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        aria-label={
          isComplete
            ? `Cobertura de fotos completa: ${stats.withPhoto} de ${stats.total}`
            : `Cobertura de fotos: ${stats.withPhoto} de ${stats.total}, ${stats.pending} pendientes. Toca para ver la lista.`
        }
        data-testid="photo-coverage-chip"
        style={{
          ...S.chip,
          ...(isComplete ? S.chipSuccess : S.chipPending),
        }}
      >
        <span style={S.chipIcon} aria-hidden="true">
          {isComplete
            ? <CheckCircle size={13} strokeWidth={2.25} />
            : <Camera     size={13} strokeWidth={2.25} />}
        </span>
        <span style={S.chipText}>
          <span style={S.chipLabel}>Fotos</span>
          <span style={S.chipValue} data-testid="photo-coverage-count">
            {stats.withPhoto}<span style={S.chipSep}>/</span>{stats.total}
          </span>
        </span>
        {!isComplete && (
          <>
            <span style={S.chipDot} aria-hidden="true" />
            <span style={S.chipPending2} data-testid="photo-coverage-pending">
              {stats.pending} pendiente{stats.pending !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </motion.button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={isComplete ? 'Cobertura completa' : 'Fotos pendientes'}
        size="md"
        testId="modal-photo-coverage"
      >
        <PendingPhotosPanel
          employees={employees}
          stats={stats}
          isComplete={isComplete}
          onClose={() => setOpen(false)}
          onUpload={() => { setOpen(false); onUpload?.(); }}
        />
      </Modal>
    </>
  );
};

/* ============================================================
   PendingPhotosPanel — listado interno del modal
   ============================================================ */
const PendingPhotosPanel = ({ employees, stats, isComplete, onClose, onUpload }) => {
  const [q, setQ] = useState('');

  const pending = useMemo(
    () => employees
      .filter(e => !e.foto_url)
      .sort((a, b) => {
        const na = Number(a.numero_empleado) || 0;
        const nb = Number(b.numero_empleado) || 0;
        return na - nb;
      }),
    [employees]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return pending;
    return pending.filter(e =>
      (e.nombre          && String(e.nombre).toLowerCase().includes(needle)) ||
      (e.numero_empleado && String(e.numero_empleado).toLowerCase().includes(needle))
    );
  }, [pending, q]);

  const copyAllNumbers = async () => {
    const list = pending.map(e => e.numero_empleado).filter(Boolean).join(', ');
    if (!list) return;
    try {
      await navigator.clipboard.writeText(list);
      notify.success(`${pending.length} número${pending.length !== 1 ? 's' : ''} copiado${pending.length !== 1 ? 's' : ''}`);
    } catch {
      notify.error('No se pudo copiar al portapapeles');
    }
  };

  const copyOne = async (num) => {
    try {
      await navigator.clipboard.writeText(String(num));
      notify.success(`#${num} copiado`);
    } catch {
      notify.error('No se pudo copiar');
    }
  };

  /* Estado vacío: cobertura completa */
  if (isComplete) {
    return (
      <div style={S.column}>
        <div style={S.completeCard} data-testid="photo-coverage-complete">
          <div style={S.completeIcon} aria-hidden="true">
            <CheckCircle size={22} strokeWidth={1.75} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={S.completeTitle}>¡Catálogo completo!</p>
            <p style={S.completeMeta}>
              Los <strong>{stats.total}</strong> empleados tienen foto registrada.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="photo-coverage-close"
          style={S.btnPrimary}
        >
          Entendido
        </button>
      </div>
    );
  }

  return (
    <div style={S.column}>
      {/* Resumen */}
      <ProgressStrip stats={stats} />

      {/* Buscador */}
      <label style={S.searchWrap}>
        <Search size={15} strokeWidth={1.75} style={S.searchIcon} aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar por número o nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar empleado pendiente"
          data-testid="photo-coverage-search"
          style={S.searchInput}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Limpiar búsqueda"
            style={S.searchClear}
          >
            <XIcon size={13} strokeWidth={2} />
          </button>
        )}
      </label>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={S.emptySearch} role="status">
          <UserX size={18} strokeWidth={1.5} aria-hidden="true" />
          <p style={S.emptyText}>Sin resultados para "{q}"</p>
        </div>
      ) : (
        <ul role="list" style={S.list} data-testid="photo-coverage-list">
          {filtered.map(emp => (
            <li key={emp.id || emp.numero_empleado} style={S.row}>
              <div style={S.avatar} aria-hidden="true">{getInitials(emp.nombre)}</div>
              <div style={S.rowInfo}>
                <p style={S.rowName} title={emp.nombre}>{emp.nombre || 'Sin nombre'}</p>
                <p style={S.rowNum}>#{emp.numero_empleado}</p>
              </div>
              <button
                type="button"
                onClick={() => copyOne(emp.numero_empleado)}
                aria-label={`Copiar número ${emp.numero_empleado}`}
                data-testid={`photo-coverage-copy-${emp.numero_empleado}`}
                style={S.copyBtn}
              >
                <Copy size={13} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Acciones */}
      <div style={S.actions}>
        <button
          type="button"
          onClick={copyAllNumbers}
          data-testid="photo-coverage-copy-all"
          style={S.btnSecondary}
          disabled={pending.length === 0}
        >
          <Copy size={14} strokeWidth={2} /> Copiar números
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={onUpload}
          data-testid="photo-coverage-upload"
          style={S.btnPrimary}
        >
          <Upload size={14} strokeWidth={2} /> Cargar fotos
        </motion.button>
      </div>
    </div>
  );
};

/* ============================================================
   ProgressStrip — barra de cobertura
   ============================================================ */
const ProgressStrip = ({ stats }) => (
  <div style={S.progressWrap} aria-label={`Cobertura: ${stats.pct} por ciento`}>
    <div style={S.progressTopRow}>
      <p style={S.progressLabel}>Cobertura</p>
      <p style={S.progressPct} data-testid="photo-coverage-pct">{stats.pct}%</p>
    </div>
    <div
      style={S.progressTrack}
      role="progressbar"
      aria-valuenow={stats.pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ ...S.progressFill, width: `${stats.pct}%` }} />
    </div>
    <p style={S.progressMeta}>
      <strong>{stats.withPhoto}</strong> con foto · <strong>{stats.pending}</strong> pendiente{stats.pending !== 1 ? 's' : ''} de <strong>{stats.total}</strong>
    </p>
  </div>
);

/* ============================================================
   Styles — 100% tokens
   ============================================================ */
const S = {
  /* Chip */
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    padding: '4px var(--spacing-sm)',
    borderRadius: 'var(--rounded-full, 999px)',
    border: '1px solid transparent',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    transition: 'background 140ms ease, border-color 140ms ease',
  },
  chipPending: {
    background: 'rgb(var(--color-semantic-warning-raw) / 0.10)',
    color: 'var(--color-semantic-warning)',
    borderColor: 'rgb(var(--color-semantic-warning-raw) / 0.28)',
  },
  chipSuccess: {
    background: 'rgb(var(--color-semantic-success-raw) / 0.10)',
    color: 'var(--color-semantic-success)',
    borderColor: 'rgb(var(--color-semantic-success-raw) / 0.25)',
  },
  chipLoading: {
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline-soft)',
    width: '7rem',
    height: '1.5rem',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'default',
  },
  shimmer: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(90deg, transparent, rgb(var(--color-hairline-strong-raw, 207 205 196) / 0.4), transparent)',
    animation: 'vp-coverage-shimmer 1.4s linear infinite',
  },
  chipIcon: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  chipText: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 'var(--spacing-xxs)',
  },
  chipLabel: {
    color: 'currentColor',
    opacity: 0.8,
    fontWeight: 500,
  },
  chipValue: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    fontFamily: 'var(--font-display)',
  },
  chipSep: {
    opacity: 0.45,
    margin: '0 1px',
  },
  chipDot: {
    width: '3px', height: '3px',
    borderRadius: '50%',
    background: 'currentColor',
    opacity: 0.5,
    margin: '0 2px',
  },
  chipPending2: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },

  /* Layout */
  column: {
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-base)',
  },

  /* Progress strip */
  progressWrap: {
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-canvas-soft)',
  },
  progressTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  },
  progressPct: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 700,
    color: 'var(--color-accent)',
    fontVariantNumeric: 'tabular-nums',
  },
  progressTrack: {
    width: '100%',
    height: '0.5rem',
    borderRadius: 'var(--rounded-full, 999px)',
    background: 'var(--color-hairline-soft)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--color-accent)',
    transition: 'width 320ms ease',
  },
  progressMeta: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
  },

  /* Search */
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 'var(--spacing-sm)',
    color: 'var(--color-muted)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    minHeight: '2.5rem',
    padding: '0 var(--spacing-xl) 0 calc(var(--spacing-sm) + 1.5rem)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline)',
    background: 'var(--color-surface-card)',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    outline: 'none',
  },
  searchClear: {
    position: 'absolute',
    right: 'var(--spacing-xs)',
    width: '1.5rem', height: '1.5rem',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--color-canvas-soft)',
    color: 'var(--color-muted)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* List */
  list: {
    listStyle: 'none',
    margin: 0, padding: 0,
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-xxs)',
    maxHeight: 'min(50vh, 22rem)',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-surface-card)',
  },
  avatar: {
    width: '2.25rem', height: '2.25rem',
    borderRadius: '50%',
    background: 'rgb(var(--color-accent-raw) / 0.1)',
    color: 'var(--color-accent)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontWeight: 600,
    flexShrink: 0,
    letterSpacing: '0.02em',
  },
  rowInfo: {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column',
    gap: '1px',
  },
  rowName: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 500,
    color: 'var(--color-ink)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  rowNum: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    fontWeight: 600,
  },
  copyBtn: {
    width: '2rem', height: '2rem',
    borderRadius: 'var(--rounded-sm)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'transparent',
    color: 'var(--color-muted)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 120ms ease, color 120ms ease',
  },

  /* Empty search */
  emptySearch: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xl) var(--spacing-base)',
    color: 'var(--color-muted-soft)',
    minHeight: '6rem',
  },
  emptyText: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
  },

  /* Complete state */
  completeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid rgb(var(--color-semantic-success-raw) / 0.25)',
    background: 'rgb(var(--color-semantic-success-raw) / 0.06)',
  },
  completeIcon: {
    width: '2.75rem', height: '2.75rem',
    borderRadius: 'var(--rounded-md)',
    background: 'rgb(var(--color-semantic-success-raw) / 0.12)',
    color: 'var(--color-semantic-success)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  completeTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  completeMeta: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
  },

  /* Actions */
  actions: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
    paddingTop: 'var(--spacing-sm)',
    borderTop: '1px solid var(--color-hairline-soft)',
  },
  btnSecondary: {
    flex: 1,
    minHeight: '2.5rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline)',
    background: 'transparent',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
  },
  btnPrimary: {
    flex: 2,
    minHeight: '2.5rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: 'none',
    background: 'var(--color-accent)',
    color: 'var(--color-on-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    cursor: 'pointer',
  },
};
