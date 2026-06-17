import React, { useState, useRef, useMemo } from 'react';
import { Upload, CheckCircle, FileText, AlertCircle, X as XIcon, Copy, Download, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalActions } from './ModalKit';
import { notify } from '../lib/notify';
import { plural } from '../lib/choferConfig';

/* ============================================================
   BULK UPLOAD MODAL — Carga masiva de colaboradores
   Modos:
     - 'full'   → alta/actualización completa (numero, nombre, turno, ruta, colonia, ref)
     - 'turnos' → actualización masiva de turnos (solo numero_empleado + turno)
   Formatos aceptados: .csv y .json
   ============================================================ */

const NORM = (s) => String(s ?? '').trim();
const NORM_KEY = (k) =>
  NORM(k).toLowerCase().replace(/\s+/g, '_').replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');

const NUM_ALIASES = ['numero_empleado', 'numero', 'no_empleado', 'no_de_empleado', 'num_empleado', 'numero_de_empleado'];
const TURNO_ALIASES = ['turno', 'shift'];

const pickField = (row, aliases) => {
  for (const k of Object.keys(row)) {
    if (aliases.includes(NORM_KEY(k))) return row[k];
  }
  return null;
};

/* ── CSV parser básico con soporte para comillas dobles ── */
const parseCSV = (text) => {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const splitLine = (line) => {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQ = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out;
  };

  const headers = splitLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
    return obj;
  });
};

const parseFileContent = (text, filename) => {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (ext === 'csv') return parseCSV(text);
  // JSON por defecto
  const json = JSON.parse(text);
  if (!Array.isArray(json)) throw new Error('El archivo no contiene una lista de colaboradores.');
  return json;
};

/* ── Config por modo ── */
const MODE_CONFIG = {
  full: {
    title: 'Cargar colaboradores',
    hint: 'Acepta archivos .csv o .json con la lista de colaboradores.',
    dropTitle: 'Arrastra el archivo aquí',
    dropSub: 'o toca para seleccionarlo',
    previewLabel: (n) => `${plural(n, 'colaborador', 'colaboradores')} listo${n !== 1 ? 's' : ''} para cargar`,
    confirmLabel: (n) => `Cargar ${plural(n, 'colaborador', 'colaboradores')}`,
    loadingLabel: 'Cargando…',
    parse: (raw) =>
      raw.map((item) => ({
        numero_empleado: NORM(item.numero_empleado || item['numero empleado']),
        nombre:      NORM(item.nombre),
        turno:       item.turno ?? null,
        ruta:        item.ruta ?? null,
        colonia:     item.colonia ?? null,
        referencia:  item.referencia ?? null,
      })).filter((r) => r.numero_empleado && r.nombre),
    validate: (rows, raw) => {
      if (rows.length === 0) {
        throw new Error('No se encontraron registros con número y nombre.');
      }
      if (rows.length !== raw.length) {
        throw new Error(`${raw.length - rows.length} registro(s) sin número o nombre fueron ignorados.`);
      }
    },
    renderPreviewItem: (it) => ({ primary: it.nombre, secondary: `#${it.numero_empleado}` }),
  },
  turnos: {
    title: 'Actualizar turnos',
    hint: 'Solo se actualizará el turno de los colaboradores que ya existan.',
    dropTitle: 'Arrastra el archivo aquí',
    dropSub: 'o toca para seleccionarlo',
    previewLabel: (n) => `${n} turno${n !== 1 ? 's' : ''} listo${n !== 1 ? 's' : ''} para actualizar`,
    confirmLabel: (n) => `Actualizar ${n} turno${n !== 1 ? 's' : ''}`,
    loadingLabel: 'Actualizando…',
    parse: (raw) =>
      raw.map((item) => ({
        numero_empleado: NORM(pickField(item, NUM_ALIASES) ?? item.numero_empleado),
        turno: NORM(pickField(item, TURNO_ALIASES) ?? item.turno),
      })).filter((r) => r.numero_empleado && r.turno),
    validate: (rows, raw) => {
      if (rows.length === 0) {
        throw new Error('No se encontró ningún registro con número de empleado y turno.');
      }
      if (rows.length !== raw.length) {
        // No es un error duro: solo informativo.
      }
    },
    renderPreviewItem: (it) => ({ primary: `Turno ${it.turno}`, secondary: `#${it.numero_empleado}` }),
  },
};

export const JsonUploadModal = ({ onConfirm, onCancel, mode = 'full' }) => {
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.full;

  const [file,       setFile]       = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [dragging,   setDragging]   = useState(false);
  const [result,     setResult]     = useState(null); // { updated, notFound:[], failed:[] }
  const fileInputRef = useRef(null);

  const previewItems = useMemo(
    () => (parsedData ? parsedData.slice(0, 3).map(cfg.renderPreviewItem) : []),
    [parsedData, cfg],
  );

  /* ── Parseo y validación ── */
  const processFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setError(null);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = parseFileContent(event.target.result, selected.name);
        if (!Array.isArray(raw)) {
          throw new Error('El archivo no contiene una lista de colaboradores.');
        }
        const rows = cfg.parse(raw);
        cfg.validate(rows, raw);
        setParsedData(rows);
      } catch (err) {
        setError(err.message || 'El archivo no tiene un formato válido.');
        setParsedData(null);
      }
    };
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsText(selected);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  /* ── Drag & drop ── */
  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true);  };
  const handleDragLeave = ()  => setDragging(false);
  const handleDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  /* ── Confirmar ── */
  const handleConfirm = async () => {
    if (!parsedData) return;
    setLoading(true);
    const r = await onConfirm(parsedData);
    setLoading(false);
    // Si la operación devolvió un reporte y hay incidencias, lo mostramos.
    if (r && (Array.isArray(r.notFound) || Array.isArray(r.failed))) {
      const hasIssues = (r.notFound?.length || 0) + (r.failed?.length || 0) > 0;
      if (hasIssues) setResult(r);
    }
  };

  /* ── Copiar lista al portapapeles ── */
  const copyList = async (list, label) => {
    try {
      await navigator.clipboard.writeText(list.join('\n'));
      notify.success(`${label} copiado${list.length !== 1 ? 's' : ''} al portapapeles`);
    } catch {
      notify.error('No se pudo copiar');
    }
  };

  /* ── Descargar lista como CSV ── */
  const downloadList = (list, filename) => {
    const csv = 'numero_empleado\n' + list.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ── Reset ── */
  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
  };

  return (
    <div style={S.root} data-testid="bulk-upload-modal">
      <AnimatePresence mode="wait">

        {/* Estado 1: Drop zone */}
        {!parsedData && !error && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <input
              type="file" accept=".json,.csv,application/json,text/csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              data-testid="bulk-file-input"
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="bulk-dropzone"
              aria-label="Seleccionar archivo o arrastrar aquí"
              style={{
                ...S.dropzone,
                borderColor: dragging ? 'var(--color-accent)' : 'var(--color-hairline-strong)',
                background:  dragging ? 'rgb(var(--color-accent-raw) / 0.04)' : 'transparent',
              }}
            >
              <div style={S.dropIcon} aria-hidden="true">
                <Upload size={18} strokeWidth={1.75} />
              </div>
              <p style={S.dropTitle}>{cfg.dropTitle}</p>
              <p style={S.dropSub}>{cfg.dropSub}</p>
              <p style={S.dropHint}>{cfg.hint}</p>
            </button>
          </motion.div>
        )}

        {/* Estado 2: Error */}
        {error && (
          <motion.div
            key="error" role="alert"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={S.errorBox}
            data-testid="bulk-error"
          >
            <AlertCircle size={18} strokeWidth={1.75} style={{ color: 'var(--color-semantic-error)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={S.errorTitle}>No se pudo procesar el archivo</p>
              <p style={S.errorBody}>{error}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              data-testid="bulk-error-reset"
              aria-label="Reintentar"
              style={S.iconBtnGhost}
            >
              <XIcon size={15} strokeWidth={2} />
            </button>
          </motion.div>
        )}

        {/* Estado 3: Preview */}
        {parsedData && !result && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' }}
            data-testid="bulk-preview"
          >
            {/* Resumen archivo */}
            <div style={S.fileSummary}>
              <div style={S.fileIcon} aria-hidden="true">
                <FileText size={16} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={S.fileName} title={file?.name}>{file?.name}</p>
                <p style={S.fileMeta}>
                  <span style={S.fileCount}>{parsedData.length}</span>
                  {' '}{cfg.previewLabel(parsedData.length).replace(/^\d+\s/, '')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Cambiar archivo"
                data-testid="bulk-preview-reset"
                style={S.iconBtnGhost}
              >
                <XIcon size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Vista previa */}
            <div>
              <p style={S.previewEyebrow}>Vista previa — primeros 3</p>
              <ul role="list" style={S.previewList}>
                {previewItems.map((it, i) => (
                  <li key={i} style={S.previewItem}>
                    <span style={S.previewNum}>{it.secondary}</span>
                    <span style={S.previewName} title={it.primary}>{it.primary}</span>
                  </li>
                ))}
              </ul>
              {parsedData.length > 3 && (
                <p style={S.previewMore}>
                  + {parsedData.length - 3} registro{parsedData.length - 3 !== 1 ? 's' : ''} más
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Estado 4: Resultado con incidencias */}
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' }}
            data-testid="bulk-result"
          >
            {/* Resumen */}
            <ul role="list" style={S.summaryList}>
              {result.updated > 0 && (
                <li style={{ ...S.summaryItem, ...S.summaryItemOk }}>
                  <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                  <span><strong>{result.updated}</strong> turno{result.updated !== 1 ? 's' : ''} actualizado{result.updated !== 1 ? 's' : ''}</span>
                </li>
              )}
              {result.notFound?.length > 0 && (
                <li style={{ ...S.summaryItem, ...S.summaryItemErr }}>
                  <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
                  <span><strong>{result.notFound.length}</strong> colaborador{result.notFound.length !== 1 ? 'es' : ''} no encontrado{result.notFound.length !== 1 ? 's' : ''}</span>
                </li>
              )}
              {result.failed?.length > 0 && (
                <li style={{ ...S.summaryItem, ...S.summaryItemErr }}>
                  <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
                  <span><strong>{result.failed.length}</strong> con error al actualizar</span>
                </li>
              )}
            </ul>

            {/* Listas con detalle */}
            {result.notFound?.length > 0 && (
              <IssueGroup
                title="No encontrados"
                hint="Estos números no existen en el directorio. Revísalos en tu archivo."
                items={result.notFound}
                onCopy={() => copyList(result.notFound, 'No encontrados')}
                onDownload={() => downloadList(result.notFound, 'no-encontrados.csv')}
                testId="bulk-not-found"
                tone="error"
              />
            )}

            {result.failed?.length > 0 && (
              <IssueGroup
                title="Con error al actualizar"
                hint="No se pudo guardar el cambio. Inténtalo más tarde."
                items={result.failed}
                onCopy={() => copyList(result.failed, 'Con error')}
                onDownload={() => downloadList(result.failed, 'con-error.csv')}
                testId="bulk-failed"
                tone="error"
              />
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Acciones */}
      {result ? (
        <ModalActions
          confirm={{
            onClick: onCancel,
            icon: CheckCircle,
            label: 'Cerrar',
          }}
          testIdConfirm="bulk-result-close"
        />
      ) : (
        <ModalActions
          cancel={{ onClick: onCancel, disabled: loading }}
          confirm={{
            onClick: handleConfirm,
            disabled: !parsedData,
            loading,
            loadingLabel: cfg.loadingLabel,
            icon: CheckCircle,
            label: parsedData ? cfg.confirmLabel(parsedData.length) : 'Continuar',
          }}
          testIdCancel="bulk-modal-cancel"
          testIdConfirm="bulk-modal-confirm"
        />
      )}
    </div>
  );
};

/* ─── Sub-componente: bloque de incidencias con copia + descarga ── */
const IssueGroup = ({ title, hint, items, onCopy, onDownload, testId, tone = 'error' }) => {
  const toneStyles = tone === 'error' ? S.issueErr : S.issueWarn;
  return (
    <section style={{ ...S.issueGroup, ...toneStyles }} data-testid={testId}>
      <header style={S.issueHeader}>
        <div style={{ minWidth: 0 }}>
          <h4 style={S.issueTitle}>{title}</h4>
          <p style={S.issueHint}>{hint}</p>
        </div>
        <div style={S.issueActions}>
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copiar lista"
            data-testid={`${testId}-copy`}
            style={S.iconBtnSubtle}
          >
            <Copy size={14} strokeWidth={2} aria-hidden="true" />
            <span>Copiar</span>
          </button>
          <button
            type="button"
            onClick={onDownload}
            aria-label="Descargar lista"
            data-testid={`${testId}-download`}
            style={S.iconBtnSubtle}
          >
            <Download size={14} strokeWidth={2} aria-hidden="true" />
            <span>CSV</span>
          </button>
        </div>
      </header>
      <ul role="list" style={S.issueList} aria-label={title}>
        {items.map((num) => (
          <li key={num} style={S.issueChip}>#{num}</li>
        ))}
      </ul>
    </section>
  );
};

const S = {
  root: {
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-lg)',
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
    maxWidth: '32ch',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* Error */
  errorBox: {
    padding: 'var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid rgb(var(--color-semantic-error-raw) / 0.3)',
    background: 'rgb(var(--color-semantic-error-raw) / 0.05)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--spacing-sm)',
  },
  errorTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-semantic-error)',
  },
  errorBody: {
    margin: 'var(--spacing-xxs) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-semantic-error)',
    opacity: 0.85,
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* File summary */
  fileSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-canvas-soft)',
  },
  fileIcon: {
    width: '2.25rem', height: '2.25rem', borderRadius: 'var(--rounded-md)',
    background: 'rgb(var(--color-accent-raw) / 0.1)',
    color: 'var(--color-accent)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  fileName: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  fileMeta: {
    margin: '2px 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
  },
  fileCount: {
    color: 'var(--color-semantic-success)',
    fontWeight: 600,
  },

  /* Preview */
  previewEyebrow: {
    margin: '0 0 var(--spacing-xs)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  },
  previewList: {
    listStyle: 'none',
    margin: 0, padding: 0,
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-xxs)',
  },
  previewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'var(--color-surface-card)',
  },
  previewNum: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.03em',
    color: 'var(--color-muted)',
    flexShrink: 0,
  },
  previewName: {
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    letterSpacing: '0.01em',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  previewMore: {
    margin: 'var(--spacing-xs) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted-soft)',
    textAlign: 'center',
  },

  /* Generic */
  iconBtnGhost: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--spacing-xxs)',
    color: 'var(--color-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    borderRadius: 'var(--rounded-sm)',
  },

  /* Result — summary list */
  summaryList: {
    listStyle: 'none',
    margin: 0, padding: 0,
    display: 'flex', flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-ink)',
    border: '1px solid transparent',
  },
  summaryItemOk: {
    background: 'rgb(var(--color-semantic-success-raw) / 0.08)',
    borderColor: 'rgb(var(--color-semantic-success-raw) / 0.25)',
    color: 'var(--color-semantic-success)',
  },
  summaryItemErr: {
    background: 'rgb(var(--color-semantic-error-raw) / 0.06)',
    borderColor: 'rgb(var(--color-semantic-error-raw) / 0.25)',
    color: 'var(--color-semantic-error)',
  },

  /* Issue group */
  issueGroup: {
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-md)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    background: 'var(--color-surface-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  issueErr: {
    borderColor: 'rgb(var(--color-semantic-error-raw) / 0.2)',
    background: 'rgb(var(--color-semantic-error-raw) / 0.03)',
  },
  issueWarn: {
    borderColor: 'rgb(var(--color-semantic-warning-raw) / 0.25)',
    background: 'rgb(var(--color-semantic-warning-raw) / 0.04)',
  },
  issueHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--spacing-sm)',
    flexWrap: 'wrap',
  },
  issueTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600,
    color: 'var(--color-ink)',
  },
  issueHint: {
    margin: 'var(--spacing-xxs) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-ink-muted)',
    lineHeight: 'var(--typography-caption-lh)',
    maxWidth: '32ch',
  },
  issueActions: {
    display: 'inline-flex',
    gap: 'var(--spacing-xxs)',
    flexShrink: 0,
  },
  iconBtnSubtle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    padding: 'var(--spacing-xxs) var(--spacing-xs)',
    borderRadius: 'var(--rounded-sm)',
    border: '1px solid var(--color-hairline)',
    background: 'var(--color-canvas-soft)',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-eyebrow-size)',
    fontWeight: 600,
    letterSpacing: 'var(--typography-eyebrow-ls)',
    cursor: 'pointer',
  },
  issueList: {
    listStyle: 'none',
    margin: 0, padding: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--spacing-xxs)',
    maxHeight: '12rem',
    overflowY: 'auto',
  },
  issueChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'var(--spacing-xxs) var(--spacing-xs)',
    borderRadius: 'var(--rounded-sm)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline)',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.02em',
  },
};
