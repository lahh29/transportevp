import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, FileJson, AlertCircle, X as XIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalActions } from './ModalKit';
import { plural } from '../lib/choferConfig';

/* ============================================================
   JSON UPLOAD MODAL — Carga masiva de empleados
   Cohesivo · 100% tokens · UI/UX semántico
   Lógica de parseo/validación intacta.
   ============================================================ */
export const JsonUploadModal = ({ onConfirm, onCancel }) => {
  const [file,       setFile]       = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [dragging,   setDragging]   = useState(false);
  const fileInputRef = useRef(null);

  /* ── Parseo y validación ── */
  const processFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setError(null);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json)) {
          throw new Error('El archivo debe ser un arreglo JSON ( [...] ).');
        }

        const formattedJson = json.map((item) => ({
          numero_empleado: String(item.numero_empleado || item['numero empleado'] || '').trim(),
          nombre:      (item.nombre      || '').trim(),
          turno:       item.turno       || null,
          ruta:        item.ruta        || null,
          colonia:     item.colonia     || null,
          referencia:  item.referencia  || null,
        }));

        const isValid = formattedJson.every((i) => i.numero_empleado && i.nombre);
        if (!isValid) throw new Error('Algunos registros no tienen número de empleado o nombre.');

        setParsedData(formattedJson);
      } catch (err) {
        setError(err.message);
        setParsedData(null);
      }
    };
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
    await onConfirm(parsedData);
    setLoading(false);
  };

  /* ── Reset ── */
  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
  };

  return (
    <div style={S.root} data-testid="json-upload-modal">
      <AnimatePresence mode="wait">

        {/* Estado 1: Drop zone */}
        {!parsedData && !error && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <input
              type="file" accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              data-testid="json-file-input"
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="json-dropzone"
              aria-label="Seleccionar archivo JSON o arrastrar aquí"
              style={{
                ...S.dropzone,
                borderColor: dragging ? 'var(--color-accent)' : 'var(--color-hairline-strong)',
                background:  dragging ? 'rgb(var(--color-accent-raw) / 0.04)' : 'transparent',
              }}
            >
              <div style={S.dropIcon} aria-hidden="true">
                <Upload size={18} strokeWidth={1.75} />
              </div>
              <p style={S.dropTitle}>Arrastra el archivo aquí</p>
              <p style={S.dropSub}>o toca para seleccionarlo</p>
              <p style={S.dropHint}>Formato: JSON con array de empleados</p>
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
            data-testid="json-error"
          >
            <AlertCircle size={18} strokeWidth={1.75} style={{ color: 'var(--color-semantic-error)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={S.errorTitle}>Error de validación</p>
              <p style={S.errorBody}>{error}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              data-testid="json-error-reset"
              aria-label="Reintentar"
              style={S.iconBtnGhost}
            >
              <XIcon size={15} strokeWidth={2} />
            </button>
          </motion.div>
        )}

        {/* Estado 3: Preview */}
        {parsedData && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' }}
            data-testid="json-preview"
          >
            {/* Resumen archivo */}
            <div style={S.fileSummary}>
              <div style={S.fileIcon} aria-hidden="true">
                <FileJson size={16} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={S.fileName} title={file?.name}>{file?.name}</p>
                <p style={S.fileMeta}>
                  <span style={S.fileCount}>{parsedData.length}</span>
                  {' '}empleado{parsedData.length !== 1 ? 's' : ''} listo{parsedData.length !== 1 ? 's' : ''} para cargar
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Cambiar archivo"
                data-testid="json-preview-reset"
                style={S.iconBtnGhost}
              >
                <XIcon size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Vista previa */}
            <div>
              <p style={S.previewEyebrow}>Vista previa — primeros 3</p>
              <ul role="list" style={S.previewList}>
                {parsedData.slice(0, 3).map((emp, i) => (
                  <li key={i} style={S.previewItem}>
                    <span style={S.previewNum}>#{emp.numero_empleado}</span>
                    <span style={S.previewName} title={emp.nombre}>{emp.nombre}</span>
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

      </AnimatePresence>

      {/* Acciones */}
      <ModalActions
        cancel={{ onClick: onCancel, disabled: loading }}
        confirm={{
          onClick: handleConfirm,
          disabled: !parsedData,
          loading,
          loadingLabel: 'Subiendo…',
          icon: CheckCircle,
          label: parsedData ? `Subir ${plural(parsedData.length, 'empleado')}` : 'Subir',
        }}
        testIdCancel="json-modal-cancel"
        testIdConfirm="json-modal-confirm"
      />
    </div>
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
    textTransform: 'uppercase',
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
  },
};
