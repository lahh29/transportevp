import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, XCircle, ScanLine, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Helpers ─── */
const getInitials = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ─── Resultado del scan ─── */
const ScanResult = ({ result, onDismiss }) => {
  const ok = result.isValid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        borderRadius: '12px',
        border: `1px solid hsl(var(--color-${ok ? 'semantic-success' : 'semantic-error'}) / 0.25)`,
        background: `hsl(var(--color-${ok ? 'semantic-success' : 'semantic-error'}) / 0.06)`,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Icono */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
        background: `hsl(var(--color-${ok ? 'semantic-success' : 'semantic-error'}) / 0.12)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {ok
          ? <CheckCircle size={22} color="hsl(var(--color-semantic-success))" />
          : <XCircle    size={22} color="hsl(var(--color-semantic-error))"   />
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em',
          color: `hsl(var(--color-${ok ? 'semantic-success' : 'semantic-error'}))`,
        }}>
          {ok ? 'Acceso permitido' : 'QR inválido'}
        </p>
        <p style={{
          margin: '3px 0 0', fontSize: '13px',
          color: 'hsl(var(--color-muted))',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {ok
            ? `${result.employee.nombre || result.employee.name}`
            : 'El código no pertenece a ningún empleado registrado.'
          }
        </p>
        {ok && result.employee.turno && (
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'hsl(var(--color-muted))', letterSpacing: '0.03em' }}>
            {result.employee.turno}{result.employee.ruta ? ` · ${result.employee.ruta}` : ''}
          </p>
        )}
      </div>

      {/* Avatar (solo si es válido) */}
      {ok && (
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
          background: 'hsl(var(--color-semantic-success) / 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 600,
          color: 'hsl(var(--color-semantic-success))',
        }}>
          {getInitials(result.employee.nombre || result.employee.name || '')}
        </div>
      )}
    </motion.div>
  );
};

/* ─── Historial item ─── */
const HistoryItem = ({ entry }) => {
  const ok = entry.isValid;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 0',
      borderBottom: '1px solid hsl(var(--color-hairline-soft))',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        background: `hsl(var(--color-${ok ? 'semantic-success' : 'semantic-error'}) / 0.1)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {ok
          ? <CheckCircle size={13} color="hsl(var(--color-semantic-success))" />
          : <XCircle    size={13} color="hsl(var(--color-semantic-error))"   />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: '13px', fontWeight: 500,
          color: 'hsl(var(--color-ink))', textTransform: 'uppercase',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {ok
            ? (entry.employee.nombre || entry.employee.name)
            : <span style={{ color: 'hsl(var(--color-muted))', fontWeight: 400 }}>QR desconocido</span>
          }
        </p>
        {ok && entry.employee.numero_empleado && (
          <p style={{ margin: '1px 0 0', fontSize: '11px', color: 'hsl(var(--color-muted))', letterSpacing: '0.04em' }}>
            #{entry.employee.numero_empleado}
          </p>
        )}
      </div>

      <span style={{ fontSize: '11px', color: 'hsl(var(--color-muted))', flexShrink: 0 }}>
        {entry.time}
      </span>
    </div>
  );
};

/* ─── Componente principal ─── */
export const ChoferPortal = () => {
  const [scanResult, setScanResult]   = useState(null);
  const [history,    setHistory]      = useState([]);
  const [scanCount,  setScanCount]    = useState({ ok: 0, fail: 0 });
  const timerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 220, height: 220 } },
      false
    );

    scanner.render(onScanSuccess, () => {});

    function onScanSuccess(decodedText) {
      /* Limpiar timer anterior si escanea rápido */
      if (timerRef.current) clearTimeout(timerRef.current);

      const employees = JSON.parse(localStorage.getItem('qr_transport_employees') || '[]');
      const emp = employees.find(e => e.id === decodedText);

      const now = new Date();
      const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const result = { text: decodedText, isValid: !!emp, employee: emp, time };

      setScanResult(result);
      setHistory(prev => [result, ...prev].slice(0, 20));
      setScanCount(prev => ({
        ok:   emp ? prev.ok + 1   : prev.ok,
        fail: emp ? prev.fail     : prev.fail + 1,
      }));

      timerRef.current = setTimeout(() => setScanResult(null), 3500);
    }

    return () => {
      scanner.clear().catch(console.error);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /* ── Render ── */
  return (
    <div style={{
      maxWidth: '560px', margin: '0 auto',
      display: 'flex', flexDirection: 'column', gap: '20px',
    }}>

      {/* ── Header ── */}
      <div>
        <h1 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 500, color: 'hsl(var(--color-ink))' }}>
          Escáner de abordaje
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'hsl(var(--color-muted))' }}>
          Apunta la cámara al código QR del empleado.
        </p>
      </div>

      {/* ── Contadores ── */}
      {(scanCount.ok > 0 || scanCount.fail > 0) && (
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { label: 'Abordaron', value: scanCount.ok,   color: 'semantic-success' },
            { label: 'Rechazados', value: scanCount.fail, color: 'semantic-error'   },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, padding: '12px 14px', borderRadius: '10px',
              border: `1px solid hsl(var(--color-${color}) / 0.2)`,
              background: `hsl(var(--color-${color}) / 0.05)`,
            }}>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: `hsl(var(--color-${color}))`, lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'hsl(var(--color-muted))', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Scanner ── */}
      <div style={{
        borderRadius: '12px',
        border: '1px solid hsl(var(--color-hairline-soft))',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Icono decorativo mientras no hay cámara activa */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', zIndex: 0,
          opacity: 0.06,
        }}>
          <ScanLine size={96} color="hsl(var(--color-ink))" />
        </div>

        <div
          id="reader"
          style={{
            width: '100%',
            position: 'relative', zIndex: 1,
          }}
        />
      </div>

      {/* ── Resultado del scan ── */}
      <AnimatePresence mode="wait">
        {scanResult && (
          <ScanResult key={scanResult.text + scanResult.time} result={scanResult} />
        )}
      </AnimatePresence>

      {/* ── Historial ── */}
      {history.length > 0 && (
        <div style={{
          borderRadius: '12px',
          border: '1px solid hsl(var(--color-hairline-soft))',
          padding: '16px 18px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '8px',
          }}>
            <p style={{
              margin: 0, fontSize: '11px', fontWeight: 500,
              letterSpacing: '0.05em', textTransform: 'uppercase',
              color: 'hsl(var(--color-muted))',
            }}>
              Historial de sesión
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} color="hsl(var(--color-muted))" />
              <span style={{ fontSize: '11px', color: 'hsl(var(--color-muted))' }}>{history.length}</span>
            </div>
          </div>

          <div>
            {history.map((entry, i) => (
              <HistoryItem key={i} entry={entry} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
