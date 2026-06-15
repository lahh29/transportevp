import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Upload, CheckCircle, Image as ImageIcon, X as XIcon, Loader2,
  AlertTriangle, UserX, FileWarning, RefreshCw, ArrowLeft, Hash,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '../lib/notify';
import { supabase } from '../lib/supabaseClient';

/* ============================================================
   PHOTO UPLOAD MODAL — Carga masiva de fotos de empleados
   v2: pre-chequeo de empleados + barra de progreso + estado por
       archivo + thumbnails + validaciones + reintento + cancelar.
   100% tokens · mobile-first · semántico · accesible.
   ============================================================ */

const MAX_BYTES        = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_TYPES   = ['image/jpeg','image/png','image/webp','image/heic','image/heif','image/jpg'];
const CONCURRENCY      = 4;

/* Phases */
const PHASE = {
  PICKING:    'picking',
  VALIDATING: 'validating',
  REVIEWING:  'reviewing',
  UPLOADING:  'uploading',
  DONE:       'done',
};

/* File status */
const STATUS = {
  PENDING:    'pending',      // listo para subir
  NEW:        'new',          // empleado existe sin foto
  REPLACE:    'replace',      // empleado existe ya tiene foto
  NOT_FOUND:  'not_found',    // número no existe en BD
  INVALID:    'invalid',      // nombre/tipo/tamaño inválido
  UPLOADING:  'uploading',
  DONE:       'done',
  ERROR:      'error',
  SKIPPED:    'skipped',
};

const extractEmployeeNum = (name) => {
  if (!name) return null;
  // Captura dígitos iniciales (con o sin espacio/guion/underscore detrás)
  const m = String(name).match(/^\s*(\d{1,10})\b/);
  return m ? m[1] : null;
};

const formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const PhotoUploadModal = ({ onCancel, onComplete }) => {
  const [phase,    setPhase]   = useState(PHASE.PICKING);
  const [items,    setItems]   = useState([]); // [{ id, file, thumb, num, status, message, empleado }]
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const cancelRef    = useRef({ cancelled: false });

  /* Limpieza de blobs al desmontar */
  const thumbsRef = useRef([]);
  useEffect(() => {
    thumbsRef.current = items.map(it => it.thumb).filter(Boolean);
  }, [items]);
  useEffect(() => () => {
    thumbsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  /* ─── Derivados ─── */
  const counts = useMemo(() => {
    const c = { total: items.length, ready: 0, invalid: 0, notFound: 0, replace: 0, done: 0, error: 0, uploading: 0 };
    items.forEach(it => {
      if (it.status === STATUS.NEW)        c.ready++;
      else if (it.status === STATUS.REPLACE)   { c.ready++; c.replace++; }
      else if (it.status === STATUS.INVALID)   c.invalid++;
      else if (it.status === STATUS.NOT_FOUND) c.notFound++;
      else if (it.status === STATUS.DONE)      c.done++;
      else if (it.status === STATUS.ERROR)     c.error++;
      else if (it.status === STATUS.UPLOADING) c.uploading++;
    });
    return c;
  }, [items]);

  const uploadingProgress = useMemo(() => {
    if (phase !== PHASE.UPLOADING && phase !== PHASE.DONE) return 0;
    const toUpload = items.filter(i => i.status !== STATUS.INVALID && i.status !== STATUS.NOT_FOUND && i.status !== STATUS.SKIPPED).length;
    const finished = items.filter(i => i.status === STATUS.DONE || i.status === STATUS.ERROR).length;
    if (!toUpload) return 0;
    return Math.round((finished / toUpload) * 100);
  }, [items, phase]);

  /* ─── Helpers ─── */
  const updateItem = useCallback((id, patch) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }, []);

  /* ─── Selección + validación local + pre-chequeo BD ─── */
  const handleFilesChange = useCallback(async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setPhase(PHASE.VALIDATING);

    const base = Array.from(selectedFiles).map((file, i) => {
      const num = extractEmployeeNum(file.name);
      const isImg = file.type ? ACCEPTED_TYPES.includes(file.type.toLowerCase()) : /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
      const tooBig = file.size > MAX_BYTES;

      let status = STATUS.PENDING;
      let message = '';
      if (!isImg)       { status = STATUS.INVALID; message = 'Tipo de archivo no soportado'; }
      else if (tooBig)  { status = STATUS.INVALID; message = `Excede ${formatBytes(MAX_BYTES)}`; }
      else if (!num)    { status = STATUS.INVALID; message = 'El nombre debe iniciar con el número de empleado'; }

      return {
        id:    `${Date.now()}-${i}-${file.name}`,
        file,
        thumb: isImg ? URL.createObjectURL(file) : null,
        num,
        status,
        message,
        empleado: null,
      };
    });

    setItems(base);

    /* Pre-chequeo: buscar empleados existentes para los números válidos */
    const numsToCheck = [...new Set(base.filter(b => b.status === STATUS.PENDING && b.num).map(b => b.num))];

    if (numsToCheck.length === 0) {
      setPhase(PHASE.REVIEWING);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('numero_empleado, nombre, foto_url')
        .in('numero_empleado', numsToCheck);

      if (error) throw error;

      const byNum = new Map();
      (data || []).forEach(e => byNum.set(String(e.numero_empleado), e));

      setItems(prev => prev.map(it => {
        if (it.status !== STATUS.PENDING) return it;
        const emp = byNum.get(String(it.num));
        if (!emp) return { ...it, status: STATUS.NOT_FOUND, message: 'Empleado no existe en la base de datos' };
        const replacing = !!emp.foto_url;
        return {
          ...it,
          status:   replacing ? STATUS.REPLACE : STATUS.NEW,
          message:  replacing ? 'Reemplazará la foto actual' : 'Empleado encontrado',
          empleado: { nombre: emp.nombre, foto_url: emp.foto_url },
        };
      }));
    } catch (err) {
      console.error('Pre-chequeo falló:', err);
      notify.error('No se pudo validar empleados', { description: err.message || 'Error desconocido' });
      // Continúa: marcar todos los PENDING como NEW para no bloquear al usuario
      setItems(prev => prev.map(it => it.status === STATUS.PENDING ? { ...it, status: STATUS.NEW, message: 'Sin verificar' } : it));
    } finally {
      setPhase(PHASE.REVIEWING);
    }
  }, []);

  /* ─── Drag & drop ─── */
  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = ()  => setDragging(false);
  const handleDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFilesChange(e.dataTransfer.files);
  };

  /* ─── Subida concurrente ─── */
  const uploadOne = useCallback(async (item) => {
    const { file, num, id } = item;
    updateItem(id, { status: STATUS.UPLOADING, message: 'Subiendo…' });

    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeName = `${num}-${Date.now()}.${ext}`;

      const { data: up, error: upErr } = await supabase.storage
        .from('fotos')
        .upload(safeName, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('fotos').getPublicUrl(up.path);
      const publicUrl = pub.publicUrl;

      const { error: updErr } = await supabase
        .from('empleados')
        .update({ foto_url: publicUrl })
        .eq('numero_empleado', num);
      if (updErr) throw updErr;

      updateItem(id, { status: STATUS.DONE, message: 'Subida' });
    } catch (err) {
      updateItem(id, { status: STATUS.ERROR, message: err.message || 'Error al subir' });
    }
  }, [updateItem]);

  const runQueue = useCallback(async (queue) => {
    let i = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (i < queue.length) {
        if (cancelRef.current.cancelled) return;
        const item = queue[i++];
        await uploadOne(item);
      }
    });
    await Promise.all(workers);
  }, [uploadOne]);

  const handleConfirm = useCallback(async () => {
    cancelRef.current.cancelled = false;
    setPhase(PHASE.UPLOADING);

    // Snapshot fuera de setItems para evitar dobles efectos en StrictMode
    const toUpload = items.filter(it => it.status === STATUS.NEW || it.status === STATUS.REPLACE);

    setItems(prev => prev.map(it => {
      if (it.status === STATUS.NEW || it.status === STATUS.REPLACE) {
        return { ...it, status: STATUS.PENDING, message: 'En cola' };
      }
      if (it.status === STATUS.NOT_FOUND || it.status === STATUS.INVALID) {
        return { ...it, status: STATUS.SKIPPED };
      }
      return it;
    }));

    await runQueue(toUpload);

    setPhase(PHASE.DONE);

    if (!cancelRef.current.cancelled) {
      // Resumen con notificaciones
      setItems(curr => {
        const done = curr.filter(i => i.status === STATUS.DONE).length;
        const err  = curr.filter(i => i.status === STATUS.ERROR).length;
        if (done > 0) notify.success(`${done} foto${done !== 1 ? 's' : ''} subida${done !== 1 ? 's' : ''}`);
        if (err  > 0) notify.warning(`${err} archivo${err !== 1 ? 's' : ''} con error`);
        return curr;
      });
    }
  }, [items, runQueue]);

  const handleCancelUpload = () => {
    cancelRef.current.cancelled = true;
    setItems(prev => prev.map(it => it.status === STATUS.PENDING ? { ...it, status: STATUS.SKIPPED, message: 'Cancelado' } : it));
  };

  const handleRetryFailed = useCallback(async () => {
    cancelRef.current.cancelled = false;
    const failed = items.filter(i => i.status === STATUS.ERROR);
    if (failed.length === 0) return;
    setPhase(PHASE.UPLOADING);
    setItems(prev => prev.map(it => it.status === STATUS.ERROR ? { ...it, status: STATUS.PENDING, message: 'Reintentando…' } : it));
    await runQueue(failed);
    setPhase(PHASE.DONE);
  }, [items, runQueue]);

  const handleReset = () => {
    items.forEach(it => { if (it.thumb) URL.revokeObjectURL(it.thumb); });
    setItems([]);
    setPhase(PHASE.PICKING);
  };

  const handleFinish = () => {
    if (onComplete) onComplete();
  };

  /* ─── UI ─── */
  return (
    <div style={S.root} data-testid="photo-upload-modal">
      <AnimatePresence mode="wait">

        {/* Phase 1: PICKING */}
        {phase === PHASE.PICKING && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <input
              type="file" multiple accept="image/*"
              ref={fileInputRef}
              onChange={(e) => handleFilesChange(e.target.files)}
              data-testid="photo-file-input"
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="photo-dropzone"
              aria-label="Seleccionar fotos o arrastrar aquí"
              style={{
                ...S.dropzone,
                borderColor: dragging ? 'var(--color-accent)' : 'var(--color-hairline-strong)',
                background:  dragging ? 'rgb(var(--color-accent-raw) / 0.04)' : 'transparent',
              }}
            >
              <div style={S.dropIcon} aria-hidden="true"><Upload size={20} strokeWidth={1.75} /></div>
              <p style={S.dropTitle}>Arrastra las fotos aquí</p>
              <p style={S.dropSub}>o toca para seleccionarlas</p>
              <p style={S.dropHint}>
                El nombre debe iniciar con el número de empleado · Ej. <code style={S.code}>3 TERRAZAS.jpg</code>
              </p>
              <p style={S.dropMicro}>JPG · PNG · WEBP · HEIC — hasta {formatBytes(MAX_BYTES)}</p>
            </button>
          </motion.div>
        )}

        {/* Phase 2: VALIDATING */}
        {phase === PHASE.VALIDATING && (
          <motion.div
            key="validating"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={S.centeredState}
            data-testid="photo-validating"
            role="status" aria-live="polite"
          >
            <Loader2 size={22} strokeWidth={1.75} style={{ animation: 'vp-photo-spin 0.8s linear infinite', color: 'var(--color-accent)' }} />
            <p style={S.stateTitle}>Validando archivos…</p>
            <p style={S.stateSub}>Verificando empleados en la base de datos</p>
          </motion.div>
        )}

        {/* Phase 3: REVIEWING */}
        {phase === PHASE.REVIEWING && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={S.column}
            data-testid="photo-review"
          >
            <SummaryStrip counts={counts} />

            {(counts.notFound > 0 || counts.invalid > 0) && (
              <div style={S.alert} role="alert" data-testid="photo-review-alert">
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  {counts.notFound > 0 && (
                    <><strong>{counts.notFound}</strong> archivo{counts.notFound !== 1 ? 's' : ''} no coincide{counts.notFound === 1 ? '' : 'n'} con ningún empleado existente. </>
                  )}
                  {counts.invalid > 0 && (
                    <><strong>{counts.invalid}</strong> archivo{counts.invalid !== 1 ? 's' : ''} inválido{counts.invalid !== 1 ? 's' : ''}. </>
                  )}
                  Se omitirán al subir.
                </span>
              </div>
            )}

            <FileList items={items} phase={phase} progress={uploadingProgress} />
          </motion.div>
        )}

        {/* Phase 4: UPLOADING */}
        {phase === PHASE.UPLOADING && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={S.column}
            data-testid="photo-uploading"
          >
            <ProgressHeader counts={counts} progress={uploadingProgress} />
            <FileList items={items} phase={phase} progress={uploadingProgress} />
          </motion.div>
        )}

        {/* Phase 5: DONE */}
        {phase === PHASE.DONE && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={S.column}
            data-testid="photo-done"
          >
            <DoneSummary counts={counts} />
            <FileList items={items} phase={phase} progress={100} />
          </motion.div>
        )}

      </AnimatePresence>

      {/* Action bar — sticky */}
      <div style={S.actions}>
        {phase === PHASE.PICKING && (
          <button type="button" onClick={onCancel} data-testid="photo-modal-cancel" style={S.btnSecondary}>
            Cancelar
          </button>
        )}

        {phase === PHASE.REVIEWING && (
          <>
            <button
              type="button"
              onClick={handleReset}
              data-testid="photo-modal-back"
              style={S.btnSecondary}
              aria-label="Volver a seleccionar archivos"
            >
              <ArrowLeft size={15} strokeWidth={2} /> Cambiar
            </button>
            <motion.button
              type="button"
              onClick={handleConfirm}
              disabled={counts.ready === 0}
              whileTap={counts.ready > 0 ? { scale: 0.985 } : {}}
              data-testid="photo-modal-confirm"
              style={{
                ...S.btnPrimary,
                opacity: counts.ready === 0 ? 0.55 : 1,
                cursor:  counts.ready === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle size={15} strokeWidth={2} />
              {counts.ready > 0 ? `Subir ${counts.ready}` : 'Sin archivos válidos'}
            </motion.button>
          </>
        )}

        {phase === PHASE.UPLOADING && (
          <button
            type="button"
            onClick={handleCancelUpload}
            data-testid="photo-modal-cancel-upload"
            style={S.btnSecondary}
            aria-label="Cancelar la subida en curso"
          >
            Cancelar subida
          </button>
        )}

        {phase === PHASE.DONE && (
          <>
            {counts.error > 0 && (
              <button
                type="button"
                onClick={handleRetryFailed}
                data-testid="photo-modal-retry"
                style={S.btnSecondary}
              >
                <RefreshCw size={15} strokeWidth={2} /> Reintentar {counts.error}
              </button>
            )}
            <button
              type="button"
              onClick={handleFinish}
              data-testid="photo-modal-finish"
              style={S.btnPrimary}
            >
              <CheckCircle size={15} strokeWidth={2} /> Finalizar
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes vp-photo-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes vp-photo-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        @media (prefers-reduced-motion: reduce) {
          .vp-photo-anim { animation: none !important }
        }
      `}</style>
    </div>
  );
};

/* ============================================================
   Sub-componentes
   ============================================================ */

const SummaryStrip = ({ counts }) => (
  <div style={S.summary} aria-label="Resumen de la selección">
    <SummaryChip
      icon={<Hash size={13} strokeWidth={2} />}
      value={counts.total}
      label="Total"
      tone="neutral"
    />
    <SummaryChip
      icon={<CheckCircle size={13} strokeWidth={2} />}
      value={counts.ready}
      label="Listos"
      tone="success"
      testId="photo-summary-ready"
    />
    {counts.replace > 0 && (
      <SummaryChip
        icon={<RefreshCw size={13} strokeWidth={2} />}
        value={counts.replace}
        label="Reemplaza"
        tone="info"
      />
    )}
    {counts.notFound > 0 && (
      <SummaryChip
        icon={<UserX size={13} strokeWidth={2} />}
        value={counts.notFound}
        label="No existe"
        tone="warning"
        testId="photo-summary-notfound"
      />
    )}
    {counts.invalid > 0 && (
      <SummaryChip
        icon={<FileWarning size={13} strokeWidth={2} />}
        value={counts.invalid}
        label="Inválidos"
        tone="error"
      />
    )}
  </div>
);

const SummaryChip = ({ icon, value, label, tone = 'neutral', testId }) => (
  <div style={{ ...S.chip, ...S.chipTone[tone] }} data-testid={testId}>
    <span style={S.chipIcon} aria-hidden="true">{icon}</span>
    <span style={S.chipValue}>{value}</span>
    <span style={S.chipLabel}>{label}</span>
  </div>
);

const ProgressHeader = ({ counts, progress }) => {
  const totalQueue = counts.uploading + counts.done + counts.error
    + (counts.total - counts.done - counts.error - counts.uploading - counts.invalid - counts.notFound);
  const finished   = counts.done + counts.error;
  return (
    <div style={S.progressWrap} aria-live="polite">
      <div style={S.progressTopRow}>
        <p style={S.progressTitle}>Subiendo fotos…</p>
        <p style={S.progressPct} data-testid="photo-progress-pct">{progress}%</p>
      </div>
      <div
        style={S.progressTrack}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de subida"
        data-testid="photo-progress-bar"
      >
        <div style={{ ...S.progressFill, width: `${progress}%` }} />
      </div>
      <p style={S.progressMeta}>
        <span data-testid="photo-progress-count">{finished}</span> de <span>{totalQueue}</span>
        {counts.error > 0 ? ` · ${counts.error} con error` : ' · sin errores'}
      </p>
    </div>
  );
};

const DoneSummary = ({ counts }) => {
  const ok = counts.done;
  const err = counts.error;
  return (
    <div style={S.doneCard} data-testid="photo-done-summary">
      <div style={{ ...S.doneIcon, background: err > 0 ? 'rgb(var(--color-semantic-warning-raw) / 0.12)' : 'rgb(var(--color-semantic-success-raw) / 0.12)', color: err > 0 ? 'var(--color-semantic-warning)' : 'var(--color-semantic-success)' }}>
        {err > 0 ? <AlertTriangle size={20} strokeWidth={1.75} /> : <CheckCircle size={20} strokeWidth={1.75} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={S.doneTitle}>{err > 0 ? 'Subida completada con errores' : '¡Subida completada!'}</p>
        <p style={S.doneMeta}>
          <strong>{ok}</strong> subida{ok !== 1 ? 's' : ''}
          {err > 0 && <> · <strong>{err}</strong> con error</>}
          {counts.notFound > 0 && <> · {counts.notFound} omitida{counts.notFound !== 1 ? 's' : ''} (no existe)</>}
        </p>
      </div>
    </div>
  );
};

const FileList = ({ items, phase, progress }) => (
  <ul role="list" style={S.list} data-testid="photo-file-list">
    {items.map(it => (
      <FileRow key={it.id} item={it} phase={phase} progress={progress} />
    ))}
  </ul>
);

const STATUS_META = {
  [STATUS.PENDING]:   { label: 'En cola',     tone: 'neutral' },
  [STATUS.NEW]:       { label: 'Nuevo',       tone: 'success' },
  [STATUS.REPLACE]:   { label: 'Reemplaza',   tone: 'info'    },
  [STATUS.NOT_FOUND]: { label: 'No existe',   tone: 'warning' },
  [STATUS.INVALID]:   { label: 'Inválido',    tone: 'error'   },
  [STATUS.UPLOADING]: { label: 'Subiendo',    tone: 'info'    },
  [STATUS.DONE]:      { label: 'Subida',      tone: 'success' },
  [STATUS.ERROR]:     { label: 'Error',       tone: 'error'   },
  [STATUS.SKIPPED]:   { label: 'Omitido',     tone: 'muted'   },
};

const FileRow = ({ item }) => {
  const meta = STATUS_META[item.status] || STATUS_META[STATUS.PENDING];
  const isUploading = item.status === STATUS.UPLOADING;
  const isError     = item.status === STATUS.ERROR;
  const isOmitted   = item.status === STATUS.NOT_FOUND || item.status === STATUS.INVALID || item.status === STATUS.SKIPPED;
  return (
    <li
      style={{
        ...S.row,
        opacity: isOmitted ? 0.78 : 1,
        borderColor: isError ? 'rgb(var(--color-semantic-error-raw) / 0.35)' : 'var(--color-hairline-soft)',
      }}
      data-testid={`photo-file-row-${item.status}`}
    >
      {/* Thumb */}
      <div style={S.thumb}>
        {item.thumb ? (
          <img src={item.thumb} alt="" style={S.thumbImg} loading="lazy" />
        ) : (
          <ImageIcon size={16} strokeWidth={1.5} style={{ color: 'var(--color-muted)' }} aria-hidden="true" />
        )}
        {isUploading && (
          <div style={S.thumbOverlay} aria-hidden="true">
            <Loader2 size={16} strokeWidth={2} style={{ animation: 'vp-photo-spin 0.8s linear infinite', color: 'var(--color-on-primary)' }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={S.rowInfo}>
        <p style={S.rowName} title={item.file.name}>{item.file.name}</p>
        <p style={S.rowMeta}>
          {item.num && <span style={S.numTag}>#{item.num}</span>}
          {item.empleado?.nombre && <span style={S.rowEmpName}>{item.empleado.nombre}</span>}
          {!item.empleado?.nombre && <span style={S.rowSize}>{formatBytes(item.file.size)}</span>}
        </p>
        {item.message && (
          <p style={{ ...S.rowMessage, color: isError ? 'var(--color-semantic-error)' : 'var(--color-muted-soft)' }}>
            {item.message}
          </p>
        )}
      </div>

      {/* Badge */}
      <span style={{ ...S.badge, ...S.badgeTone[meta.tone] }} data-testid={`photo-file-status-${item.status}`}>
        {meta.label}
      </span>
    </li>
  );
};

/* ============================================================
   Styles — 100% tokens
   ============================================================ */
const S = {
  root: {
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  },
  column: {
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-base)',
  },

  /* Drop zone */
  dropzone: {
    width: '100%',
    border: '1.5px dashed var(--color-hairline-strong)',
    borderRadius: 'var(--rounded-lg)',
    padding: 'var(--spacing-xl) var(--spacing-base)',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'transparent',
    transition: 'border-color 160ms ease, background 160ms ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    fontFamily: 'var(--font-body)',
    WebkitTapHighlightColor: 'transparent',
  },
  dropIcon: {
    width: '2.75rem', height: '2.75rem', borderRadius: '50%',
    background: 'rgb(var(--color-accent-raw) / 0.1)',
    color: 'var(--color-accent)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 'var(--spacing-xs)',
  },
  dropTitle: {
    margin: 0,
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  dropSub: {
    margin: 0,
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
  },
  dropHint: {
    margin: 'var(--spacing-xs) 0 0',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted-soft)',
    lineHeight: 'var(--typography-caption-lh)',
  },
  dropMicro: {
    margin: 'var(--spacing-xxs) 0 0',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted-soft)',
    opacity: 0.8,
  },
  code: {
    fontFamily: 'var(--font-display)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline-soft)',
    padding: '0 var(--spacing-xxs)',
    borderRadius: 'var(--rounded-sm)',
    color: 'var(--color-ink)',
    fontSize: '0.85em',
  },

  /* Centered state (validating) */
  centeredState: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xl) var(--spacing-base)',
    minHeight: '8rem',
  },
  stateTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  stateSub: {
    margin: 0,
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
  },

  /* Summary strip */
  summary: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
    flexWrap: 'wrap',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    padding: 'var(--spacing-xxs) var(--spacing-sm)',
    borderRadius: 'var(--rounded-full, 999px)',
    border: '1px solid var(--color-hairline-soft)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
  },
  chipIcon: { display: 'inline-flex' },
  chipValue: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  chipLabel: { color: 'var(--color-muted)' },
  chipTone: {
    neutral: { background: 'var(--color-canvas-soft)', color: 'var(--color-ink)' },
    success: {
      background: 'rgb(var(--color-semantic-success-raw) / 0.08)',
      color: 'var(--color-semantic-success)',
      borderColor: 'rgb(var(--color-semantic-success-raw) / 0.25)',
    },
    info: {
      background: 'rgb(var(--color-accent-raw) / 0.08)',
      color: 'var(--color-accent)',
      borderColor: 'rgb(var(--color-accent-raw) / 0.25)',
    },
    warning: {
      background: 'rgb(var(--color-semantic-warning-raw) / 0.10)',
      color: 'var(--color-semantic-warning)',
      borderColor: 'rgb(var(--color-semantic-warning-raw) / 0.28)',
    },
    error: {
      background: 'rgb(var(--color-semantic-error-raw) / 0.10)',
      color: 'var(--color-semantic-error)',
      borderColor: 'rgb(var(--color-semantic-error-raw) / 0.28)',
    },
  },

  /* Alert */
  alert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    background: 'rgb(var(--color-semantic-warning-raw) / 0.08)',
    border: '1px solid rgb(var(--color-semantic-warning-raw) / 0.25)',
    borderRadius: 'var(--rounded-md)',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* Progress */
  progressWrap: {
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-canvas-soft)',
  },
  progressTopRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  progressTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  progressPct: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600,
    color: 'var(--color-accent)',
    fontVariantNumeric: 'tabular-nums',
  },
  progressTrack: {
    width: '100%',
    height: '0.5rem',
    borderRadius: 'var(--rounded-full, 999px)',
    background: 'var(--color-hairline-soft)',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent))',
    transition: 'width 240ms ease',
  },
  progressMeta: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
  },

  /* Done */
  doneCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-canvas-soft)',
  },
  doneIcon: {
    width: '2.75rem', height: '2.75rem', borderRadius: 'var(--rounded-md)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  doneTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  doneMeta: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
  },

  /* File list */
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
    transition: 'opacity 160ms ease, border-color 160ms ease',
  },
  thumb: {
    width: '2.5rem', height: '2.5rem',
    borderRadius: 'var(--rounded-sm)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline-soft)',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%', height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  thumbOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgb(var(--color-accent-raw) / 0.6)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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
  rowMeta: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  numTag: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-accent)',
    fontWeight: 600,
  },
  rowEmpName: {
    color: 'var(--color-ink)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  rowSize: {
    color: 'var(--color-muted-soft)',
  },
  rowMessage: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    lineHeight: 'var(--typography-caption-lh)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },

  /* Badge */
  badge: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px var(--spacing-xs)',
    borderRadius: 'var(--rounded-full, 999px)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontWeight: 600,
    letterSpacing: '0.01em',
    border: '1px solid transparent',
  },
  badgeTone: {
    neutral: {
      background: 'var(--color-canvas-soft)',
      color: 'var(--color-muted)',
      borderColor: 'var(--color-hairline-soft)',
    },
    muted: {
      background: 'transparent',
      color: 'var(--color-muted-soft)',
      borderColor: 'var(--color-hairline-soft)',
    },
    success: {
      background: 'rgb(var(--color-semantic-success-raw) / 0.10)',
      color: 'var(--color-semantic-success)',
      borderColor: 'rgb(var(--color-semantic-success-raw) / 0.25)',
    },
    info: {
      background: 'rgb(var(--color-accent-raw) / 0.10)',
      color: 'var(--color-accent)',
      borderColor: 'rgb(var(--color-accent-raw) / 0.25)',
    },
    warning: {
      background: 'rgb(var(--color-semantic-warning-raw) / 0.10)',
      color: 'var(--color-semantic-warning)',
      borderColor: 'rgb(var(--color-semantic-warning-raw) / 0.28)',
    },
    error: {
      background: 'rgb(var(--color-semantic-error-raw) / 0.10)',
      color: 'var(--color-semantic-error)',
      borderColor: 'rgb(var(--color-semantic-error-raw) / 0.28)',
    },
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
    transition: 'opacity 120ms ease',
    cursor: 'pointer',
  },
};
