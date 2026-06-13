import React, { useState } from 'react';
import { QrCode, CheckCircle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import QRCode from 'qrcode';

const Spinner = () => (
  <motion.span
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <Upload size={14} />
  </motion.span>
);

export const QrGenerateModal = ({ onCancel, onComplete }) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleGenerate = async () => {
    setGenerating(true);
    let successCount = 0;
    
    try {
      const { data: empleados, error: fetchError } = await supabase
        .from('empleados')
        .select('id, numero_empleado');
        
      if (fetchError) throw fetchError;
      if (!empleados || empleados.length === 0) {
        toast.error('No hay empleados registrados para generar QR.');
        setGenerating(false);
        return;
      }

      setProgress({ current: 0, total: empleados.length });

      for (let i = 0; i < empleados.length; i++) {
        const emp = empleados[i];
        const qrContent = JSON.stringify({ numero_empleado: emp.numero_empleado });
        const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 300, margin: 2 });
        
        await supabase
          .from('empleados')
          .update({ qr_code: qrDataUrl })
          .eq('id', emp.id);

        successCount++;
        setProgress(p => ({ ...p, current: p.current + 1 }));
      }
      
      toast.success(`${successCount} códigos QR generados correctamente.`);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      toast.error('Ocurrió un error al generar los QR: ' + err.message);
    }
    
    setGenerating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{
        border: `1.5px dashed hsl(var(--color-hairline-soft))`,
        borderRadius: '10px',
        padding: '48px 24px',
        textAlign: 'center',
        background: 'transparent',
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'hsl(var(--color-accent) / 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <QrCode size={18} color="hsl(var(--color-accent))" />
        </div>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'hsl(var(--color-ink))' }}>
          Generación Automática
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'hsl(var(--color-muted))', lineHeight: '1.5' }}>
          Este proceso generará un código único para cada uno de los empleados<br/>
          y lo guardará en la base de datos de manera silenciosa.
        </p>
      </div>

      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ background: 'hsl(var(--color-accent) / 0.04)', padding: '16px', borderRadius: '8px', border: '1px solid hsl(var(--color-accent) / 0.2)', overflow: 'hidden' }}
          >
            <h4 style={{ margin: '0 0 8px 0', color: 'hsl(var(--color-ink))', fontSize: '13px' }}>Procesando {progress.current} de {progress.total}...</h4>
            <div style={{ width: '100%', height: '6px', background: 'hsl(var(--color-hairline))', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: 'hsl(var(--color-accent))', transition: 'width 200ms ease' }} />
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
          onClick={handleGenerate}
          disabled={generating}
          whileHover={!generating ? { y: -1 } : {}}
          whileTap={!generating ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            flex: 2, height: '36px', borderRadius: '8px',
            border: '1px solid hsl(var(--color-accent) / 0.4)',
            background: !generating
              ? 'hsl(var(--color-accent))'
              : 'hsl(var(--color-accent) / 0.1)',
            cursor: !generating ? 'pointer' : 'not-allowed',
            fontSize: '13px', fontWeight: 500,
            color: !generating
              ? 'hsl(var(--color-canvas, white))'
              : 'hsl(var(--color-accent) / 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {generating ? (
            <><Spinner /> Generando…</>
          ) : (
            <><CheckCircle size={14} /> Comenzar Generación</>
          )}
        </motion.button>
      </div>
    </div>
  );
};
