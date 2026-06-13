import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, FileJson, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Spinner ─── */
const Spinner = () => (
  <motion.span
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <Upload size={14} />
  </motion.span>
);

/* ─── Componente principal ─── */
export const JsonUploadModal = ({ onConfirm, onCancel }) => {
  const [file,       setFile]       = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [dragging,   setDragging]   = useState(false);
  const fileInputRef = useRef(null);

  /* ── Parseo y validación (lógica original intacta) ── */
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

        const formattedJson = json.map(item => ({
          numero_empleado: String(item.numero_empleado || item['numero empleado'] || ''),
          nombre:      item.nombre      || '',
          turno:       item.turno       || null,
          ruta:        item.ruta        || null,
          colonia:     item.colonia     || null,
          referencia:  item.referencia  || null,
        }));

        const isValid = formattedJson.every(i => i.numero_empleado && i.nombre);
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

  /* ── Render ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <AnimatePresence mode="wait">

        {/* Estado 1: Drop zone */}
        {!parsedData && !error && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
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
                background: dragging
                  ? 'hsl(var(--color-accent) / 0.04)'
                  : 'transparent',
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
                Arrastra el archivo aquí
              </p>
              <p style={{ margin: '6px 0 16px', fontSize: '12px', color: 'hsl(var(--color-muted))' }}>
                o haz clic para seleccionarlo
              </p>
            </div>
          </motion.div>
        )}

        {/* Estado 2: Error */}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{
              padding: '16px', borderRadius: '10px',
              border: '1px solid hsl(var(--color-semantic-error) / 0.3)',
              background: 'hsl(var(--color-semantic-error) / 0.05)',
              display: 'flex', alignItems: 'flex-start', gap: '12px',
            }}
          >
            <AlertCircle size={18} color="hsl(var(--color-semantic-error))" style={{ flexShrink: 0, marginTop: '1px' }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'hsl(var(--color-semantic-error))' }}>
                Error de validación
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'hsl(var(--color-semantic-error) / 0.8)' }}>
                {error}
              </p>
            </div>

            <button
              onClick={handleReset}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                color: 'hsl(var(--color-muted))', display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
              title="Reintentar"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}

        {/* Estado 3: Archivo válido — vista previa */}
        {parsedData && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Resumen del archivo */}
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
                <FileJson size={16} color="hsl(var(--color-accent))" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: '13px', fontWeight: 500,
                  color: 'hsl(var(--color-ink))',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {file.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'hsl(var(--color-muted))' }}>
                  <span style={{ color: 'hsl(var(--color-semantic-success))', fontWeight: 500 }}>
                    {parsedData.length}
                  </span>
                  {' '}empleados listos para cargar
                </p>
              </div>

              <button
                onClick={handleReset}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                  color: 'hsl(var(--color-muted))', display: 'flex', alignItems: 'center',
                  flexShrink: 0,
                }}
                title="Cambiar archivo"
              >
                <X size={15} />
              </button>
            </div>

            {/* Vista previa */}
            <div>
              <p style={{
                margin: '0 0 8px', fontSize: '11px', fontWeight: 500,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: 'hsl(var(--color-muted))',
              }}>
                Vista previa — primeros 3
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {parsedData.slice(0, 3).map((emp, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid hsl(var(--color-hairline-soft))',
                    fontSize: '13px',
                  }}>
                    <span style={{
                      fontSize: '10px', fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0.04em', color: 'hsl(var(--color-muted))',
                      flexShrink: 0,
                    }}>
                      #{emp.numero_empleado}
                    </span>
                    <span style={{
                      color: 'hsl(var(--color-ink))', fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '0.01em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {emp.nombre}
                    </span>
                  </div>
                ))}
                {parsedData.length > 3 && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'hsl(var(--color-muted))', textAlign: 'center' }}>
                    y {parsedData.length - 3} registros más…
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Pie: acciones ── */}
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
          disabled={!parsedData || loading}
          whileHover={parsedData && !loading ? { y: -1 } : {}}
          whileTap={parsedData && !loading ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            flex: 2, height: '36px', borderRadius: '8px',
            border: '1px solid hsl(var(--color-accent) / 0.4)',
            background: parsedData && !loading
              ? 'hsl(var(--color-accent))'
              : 'hsl(var(--color-accent) / 0.1)',
            cursor: parsedData && !loading ? 'pointer' : 'not-allowed',
            fontSize: '13px', fontWeight: 500,
            color: parsedData && !loading
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
