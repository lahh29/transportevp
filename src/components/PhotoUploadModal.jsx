import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, Image as ImageIcon, X as XIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '../lib/notify';
import { supabase } from '../lib/supabaseClient';

/* ============================================================
   PHOTO UPLOAD MODAL — Carga masiva de fotos de empleados
   Cohesivo · 100% tokens · UI/UX semántico
   Lógica de upload intacta.
   ============================================================ */
export const PhotoUploadModal = ({ onCancel, onComplete }) => {
  const [files,    setFiles]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesChange = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setFiles(Array.from(selectedFiles));
  };

  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = ()  => setDragging(false);
  const handleDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFilesChange(e.dataTransfer.files);
  };

  const handleReset = () => setFiles(null);

  const handleConfirm = async () => {
    if (!files) return;
    setLoading(true);

    let successCount = 0;
    let errorCount   = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const numEmpleado = file.name.split(' ')[0];

      if (!numEmpleado || isNaN(numEmpleado)) {
        console.warn(`Archivo ignorado: ${file.name}`);
        errorCount++;
        continue;
      }

      try {
        const fileExt = file.name.split('.').pop();
        const safeName = `${numEmpleado}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fotos')
          .upload(safeName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('fotos')
          .getPublicUrl(uploadData.path);

        const publicUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase
          .from('empleados')
          .update({ foto_url: publicUrl })
          .eq('numero_empleado', numEmpleado);

        if (updateError) throw updateError;
        successCount++;
      } catch (err) {
        console.error(`Error con el archivo ${file.name}:`, err);
        errorCount++;
        notify.error(`Error en ${file.name}`, { description: err.message || 'Error desconocido' });
      }
    }

    setLoading(false);
    if (successCount > 0) notify.success(`${successCount} foto${successCount !== 1 ? 's' : ''} subida${successCount !== 1 ? 's' : ''}`);
    if (errorCount   > 0) notify.warning(`${errorCount} archivo${errorCount !== 1 ? 's' : ''} fallaron`, { description: 'Revisa el nombre: debe comenzar por el número de empleado.' });

    if (onComplete) onComplete();
  };

  return (
    <div style={S.root} data-testid="photo-upload-modal">
      <AnimatePresence mode="wait">

        {/* Estado 1: Drop zone */}
        {!files && (
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
              <div style={S.dropIcon} aria-hidden="true">
                <Upload size={18} strokeWidth={1.75} />
              </div>
              <p style={S.dropTitle}>Arrastra las fotos aquí</p>
              <p style={S.dropSub}>o toca para seleccionarlas</p>
              <p style={S.dropHint}>El nombre debe iniciar con el número de empleado · Ej. <code style={S.code}>3 TERRAZAS.jpg</code></p>
            </button>
          </motion.div>
        )}

        {/* Estado 2: Preview */}
        {files && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' }}
            data-testid="photo-preview"
          >
            {/* Resumen */}
            <div style={S.fileSummary}>
              <div style={S.fileIcon} aria-hidden="true">
                <ImageIcon size={16} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={S.fileTitle}>Archivos listos</p>
                <p style={S.fileMeta}>
                  <span style={S.fileCount}>{files.length}</span>
                  {' '}foto{files.length !== 1 ? 's' : ''} seleccionada{files.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Cambiar archivos"
                data-testid="photo-preview-reset"
                style={S.iconBtnGhost}
              >
                <XIcon size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Vista previa */}
            <div>
              <p style={S.previewEyebrow}>Vista previa — primeras 3</p>
              <ul role="list" style={S.previewList}>
                {files.slice(0, 3).map((f, i) => (
                  <li key={i} style={S.previewItem}>
                    <span style={S.previewName} title={f.name}>{f.name}</span>
                  </li>
                ))}
              </ul>
              {files.length > 3 && (
                <p style={S.previewMore}>
                  + {files.length - 3} foto{files.length - 3 !== 1 ? 's' : ''} más
                </p>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Acciones */}
      <div style={S.actions}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          data-testid="photo-modal-cancel"
          style={S.btnSecondary}
        >
          Cancelar
        </button>

        <motion.button
          type="button"
          onClick={handleConfirm}
          disabled={!files || loading}
          whileTap={files && !loading ? { scale: 0.985 } : {}}
          aria-busy={loading}
          data-testid="photo-modal-confirm"
          style={{
            ...S.btnPrimary,
            opacity: !files || loading ? 0.55 : 1,
            cursor:  !files || loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading
            ? <><Loader2 size={15} strokeWidth={2} style={{ animation: 'vp-photo-spin 0.8s linear infinite' }} /> Subiendo…</>
            : <><CheckCircle size={15} strokeWidth={2} /> Confirmar y subir</>
          }
        </motion.button>
      </div>

      <style>{`@keyframes vp-photo-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
};

/* ─── Styles — 100% tokens, calcados del JsonUploadModal ─── */
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
    lineHeight: 'var(--typography-caption-lh)',
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
  fileTitle: {
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
  previewName: {
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 500,
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
