import React, { useState } from 'react';
import { QrCode, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { notify } from '../lib/notify';
import { plural } from '../lib/choferConfig';
import { ModalActions, ModalIntro } from './ModalKit';
import QRCode from 'qrcode';

/* ============================================================
   QR GENERATE MODAL — Generación masiva de QRs
   ============================================================
   Diseño del código:
   - Contenido: SOLO el numero_empleado como texto plano (string corto)
       → QR mucho menos denso → mejor lectura en pantallas y a distancia
   - errorCorrectionLevel 'H' (30% redundancia)
       → tolera reflejos, sombras, desenfoque
   - margin 4 módulos (quiet zone estándar)
       → cámaras reconocen los bordes más rápido
   - 512 px de salida (data URL)
       → suficiente para impresión y pantalla sin pixelar
   El portal del chofer ya acepta tanto texto plano numérico como JSON,
   por lo que es compatible con cualquier QR previamente generado.
   ============================================================ */

const QR_OPTIONS = {
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 512,
  color: { dark: '#000000', light: '#FFFFFF' },
};

const BATCH_SIZE = 10; // updates en paralelo (acelera ~10x sin saturar BD)

export const QrGenerateModal = ({ onCancel, onComplete }) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress]     = useState({ current: 0, total: 0 });
  const [onlyMissing, setOnlyMissing] = useState(true);

  const handleGenerate = async () => {
    setGenerating(true);
    let successCount = 0;
    try {
      const { data: empleados, error } = await supabase
        .from('empleados').select('id, numero_empleado, qr_code');
      if (error) throw error;

      const target = (empleados || []).filter((e) => onlyMissing ? !e.qr_code : true);
      if (target.length === 0) {
        notify.info(onlyMissing ? 'Todos ya tienen QR' : 'No hay empleados');
        setGenerating(false);
        return;
      }

      setProgress({ current: 0, total: target.length });

      // Genera y guarda en lotes paralelos para acelerar
      for (let i = 0; i < target.length; i += BATCH_SIZE) {
        const batch = target.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (emp) => {
            // Contenido: texto plano corto = QR más simple = mejor lectura
            const content = String(emp.numero_empleado);
            const dataUrl = await QRCode.toDataURL(content, QR_OPTIONS);
            const { error: updErr } = await supabase
              .from('empleados').update({ qr_code: dataUrl }).eq('id', emp.id);
            if (updErr) throw updErr;
          }),
        );
        successCount += results.filter((r) => r.status === 'fulfilled').length;
        setProgress((p) => ({ ...p, current: p.current + batch.length }));
      }

      notify.success(`${plural(successCount, 'QR', 'QRs')} generado${successCount !== 1 ? 's' : ''}`);
      if (onComplete) onComplete();
    } catch {
      notify.error('No se pudieron generar los QR');
    }
    setGenerating(false);
  };

  const pct = progress.total ? (progress.current / progress.total) * 100 : 0;

  return (
    <div style={S.root} data-testid="qr-modal">
      <ModalIntro
        icon={QrCode}
        title="Generación automática"
        subtitle="Un código único por empleado, guardado en la base de datos."
      />

      <label style={S.toggleRow}>
        <input
          type="checkbox"
          checked={onlyMissing}
          onChange={(e) => setOnlyMissing(e.target.checked)}
          disabled={generating}
          data-testid="qr-only-missing"
        />
        <span>Solo empleados sin QR</span>
      </label>

      <AnimatePresence>
        {generating && (
          <motion.div
            role="status" aria-live="polite"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={S.progressWrap}
            data-testid="qr-progress"
          >
            <div style={S.progressHead}>
              <span style={S.progressLabel}>{progress.current} de {progress.total}…</span>
              <span style={S.progressPct}>{Math.round(pct)}%</span>
            </div>
            <div style={S.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
              <motion.div style={S.barFill} animate={{ width: `${pct}%` }} transition={{ duration: 0.2 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalActions
        cancel={{ onClick: onCancel, disabled: generating }}
        confirm={{
          onClick: handleGenerate,
          loading: generating,
          loadingLabel: 'Generando…',
          icon: CheckCircle,
          label: 'Comenzar',
        }}
        testIdCancel="qr-modal-cancel"
        testIdConfirm="qr-modal-confirm"
      />
    </div>
  );
};

const S = {
  root: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' },
  toggleRow: {
    display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
    fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-ink)', cursor: 'pointer', padding: 'var(--spacing-xxs) 0',
  },
  progressWrap: {
    background: 'rgb(var(--color-accent-raw) / 0.04)',
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid rgb(var(--color-accent-raw) / 0.2)',
    display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)',
  },
  progressHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--spacing-xs)' },
  progressLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)', color: 'var(--color-ink)', fontWeight: 500 },
  progressPct: { fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)', color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 },
  bar: { width: '100%', height: '0.375rem', background: 'var(--color-hairline)', borderRadius: 'var(--rounded-pill)', overflow: 'hidden' },
  barFill: { height: '100%', background: 'var(--color-accent)', borderRadius: 'inherit' },
};
