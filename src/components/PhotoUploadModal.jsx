import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Spinner = () => (
  <motion.span
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <Upload size={14} />
  </motion.span>
);

export const PhotoUploadModal = ({ onCancel, onComplete }) => {
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesChange = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setFiles(Array.from(selectedFiles));
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFilesChange(e.dataTransfer.files);
  };

  const handleReset = () => {
    setFiles(null);
  };

  const handleConfirm = async () => {
    if (!files) return;
    setLoading(true);

    let successCount = 0;
    let errorCount = 0;

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
        toast.error(`Error en ${file.name}: ${err.message || 'Error desconocido'}`);
      }
    }

    setLoading(false);
    if (successCount > 0) toast.success(`${successCount} fotos subidas correctamente.`);
    if (errorCount > 0) toast.error(`${errorCount} fotos fallaron.`);
    
    if (onComplete) onComplete();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <AnimatePresence mode="wait">
        {!files && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => handleFilesChange(e.target.files)}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => fileInputRef.current.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `1.5px dashed hsl(var(--color-${dragging ? 'accent' : 'hairline-soft'}))`,
                borderRadius: '10px',
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? 'hsl(var(--color-accent) / 0.04)' : 'transparent',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'hsl(var(--color-accent) / 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Upload size={18} color="hsl(var(--color-accent))" />
              </div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'hsl(var(--color-ink))' }}>
                Arrastra las fotos aquí
              </p>
              <p style={{ margin: '6px 0 16px', fontSize: '12px', color: 'hsl(var(--color-muted))' }}>
                o haz clic para seleccionarlas (Ej. "3 TERRAZAS.jpg")
              </p>
            </div>
          </motion.div>
        )}

        {files && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', borderRadius: '10px',
              border: '1px solid hsl(var(--color-hairline-soft))',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                background: 'hsl(var(--color-accent) / 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ImageIcon size={16} color="hsl(var(--color-accent))" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'hsl(var(--color-ink))' }}>
                  Archivos listos
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'hsl(var(--color-muted))' }}>
                  <span style={{ color: 'hsl(var(--color-semantic-success))', fontWeight: 500 }}>
                    {files.length}
                  </span>
                  {' '}fotos seleccionadas
                </p>
              </div>
              <button
                onClick={handleReset}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                  color: 'hsl(var(--color-muted))', display: 'flex', alignItems: 'center',
                  flexShrink: 0,
                }}
                title="Cambiar archivos"
              >
                <X size={15} />
              </button>
            </div>
            
            <div>
              <p style={{
                margin: '0 0 8px', fontSize: '11px', fontWeight: 500,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: 'hsl(var(--color-muted))',
              }}>
                Vista previa — primeras 3
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {files.slice(0, 3).map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid hsl(var(--color-hairline-soft))',
                    fontSize: '13px',
                  }}>
                    <span style={{
                      color: 'hsl(var(--color-ink))', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {f.name}
                    </span>
                  </div>
                ))}
                {files.length > 3 && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'hsl(var(--color-muted))', textAlign: 'center' }}>
                    y {files.length - 3} fotos más…
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        display: 'flex', gap: '8px',
        paddingTop: '16px',
        borderTop: '1px solid hsl(var(--color-hairline-soft))',
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1, height: '36px', borderRadius: '8px',
            border: '1px solid hsl(var(--color-hairline-soft))',
            background: 'transparent', cursor: 'pointer',
            fontSize: '13px', color: 'hsl(var(--color-muted))',
          }}
        >
          Cancelar
        </button>
        <motion.button
          type="button"
          onClick={handleConfirm}
          disabled={!files || loading}
          whileHover={files && !loading ? { y: -1 } : {}}
          whileTap={files && !loading ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            flex: 2, height: '36px', borderRadius: '8px',
            border: '1px solid hsl(var(--color-accent) / 0.4)',
            background: files && !loading
              ? 'hsl(var(--color-accent))'
              : 'hsl(var(--color-accent) / 0.1)',
            cursor: files && !loading ? 'pointer' : 'not-allowed',
            fontSize: '13px', fontWeight: 500,
            color: files && !loading
              ? 'hsl(var(--color-canvas, white))'
              : 'hsl(var(--color-accent) / 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {loading ? (
            <><Spinner /> Subiendo…</>
          ) : (
            <><CheckCircle size={14} /> Confirmar y subir</>
          )}
        </motion.button>
      </div>
    </div>
  );
};
