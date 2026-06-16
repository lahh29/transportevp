import React, { useRef, useEffect, useCallback } from 'react';

/**
 * NipInput — Pin input estilo OTP (4 cajas individuales).
 * ------------------------------------------------------------
 *  • Auto-advance al escribir, auto-back con Backspace en caja vacía
 *  • Paste support: pegar "1234" llena las 4 cajas
 *  • Navegación con flechas
 *  • A11y: cada input con label propio, aria-label "Dígito N de M",
 *    role="group" en el contenedor con aria-labelledby/aria-describedby
 *  • Mobile-first: type=tel + inputMode=numeric + sin password manager
 *  • Mask opcional (default: oculto con bullets)
 *
 * Props:
 *  - value: string de hasta {length} dígitos
 *  - onChange(next: string)
 *  - onComplete?(value: string)  → cuando se llenan todas las cajas
 *  - length?: number (default 4)
 *  - mask?: boolean (default true)
 *  - autoFocus?: boolean
 *  - disabled?: boolean
 *  - error?: boolean
 *  - labelledBy?: string  (id del título o aria-labelledby)
 *  - describedBy?: string (id del subtitle/hint)
 *  - testId?: string      (data-testid base; cada caja añade -{i})
 *  - enterKeyHint?: 'next' | 'done' | 'go' | 'send'
 */
export const NipInput = ({
  value = '',
  onChange,
  onComplete,
  length = 4,
  mask = true,
  autoFocus = false,
  disabled = false,
  error = false,
  labelledBy,
  describedBy,
  testId = 'nip-input',
  enterKeyHint = 'done',
}) => {
  const refs = useRef([]);
  const digits = String(value).slice(0, length).split('');
  while (digits.length < length) digits.push('');

  /* Focus inicial */
  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      // Pequeño defer evita que iOS haga scroll-jump abrupto
      const t = setTimeout(() => {
        refs.current[0]?.focus({ preventScroll: true });
      }, 60);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Notifica completion cuando se llena */
  useEffect(() => {
    if (value.length === length && onComplete) onComplete(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setAt = useCallback((idx, ch) => {
    const arr = digits.slice();
    arr[idx] = ch;
    const next = arr.join('').replace(/[^0-9]/g, '').slice(0, length);
    onChange?.(next);
  }, [digits, length, onChange]);

  const focusAt = (idx) => {
    const el = refs.current[idx];
    if (el) el.focus({ preventScroll: true });
  };

  const handleInput = (idx) => (e) => {
    // Tomamos solo el último dígito tipeado (iOS a veces envía 2 chars)
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setAt(idx, '');
      return;
    }
    // Si pegaron varios dígitos, distribuir desde idx
    if (raw.length > 1) {
      const arr = digits.slice();
      for (let k = 0; k < raw.length && idx + k < length; k++) {
        arr[idx + k] = raw[k];
      }
      const next = arr.join('').replace(/[^0-9]/g, '').slice(0, length);
      onChange?.(next);
      const last = Math.min(idx + raw.length, length - 1);
      focusAt(last);
      return;
    }
    setAt(idx, raw);
    if (idx < length - 1) focusAt(idx + 1);
  };

  const handleKeyDown = (idx) => (e) => {
    const key = e.key;
    if (key === 'Backspace') {
      if (digits[idx]) {
        // Caja con valor: vacíala y permanece
        setAt(idx, '');
        e.preventDefault();
      } else if (idx > 0) {
        // Caja vacía: retrocede + vacía la anterior
        e.preventDefault();
        setAt(idx - 1, '');
        focusAt(idx - 1);
      }
      return;
    }
    if (key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      focusAt(idx - 1);
      return;
    }
    if (key === 'ArrowRight' && idx < length - 1) {
      e.preventDefault();
      focusAt(idx + 1);
      return;
    }
    if (key === 'Home') {
      e.preventDefault();
      focusAt(0);
      return;
    }
    if (key === 'End') {
      e.preventDefault();
      focusAt(length - 1);
    }
  };

  const handlePaste = (idx) => (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) return;
    e.preventDefault();
    const arr = digits.slice();
    for (let k = 0; k < cleaned.length && idx + k < length; k++) {
      arr[idx + k] = cleaned[k];
    }
    const next = arr.join('').replace(/[^0-9]/g, '').slice(0, length);
    onChange?.(next);
    focusAt(Math.min(idx + cleaned.length, length - 1));
  };

  const handleFocus = (idx) => (e) => {
    // Selecciona el contenido para que tipear sobreescriba
    e.target.select?.();
  };

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      data-testid={testId}
      style={S.row}
    >
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          type={mask ? 'password' : 'tel'}
          inputMode="numeric"
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={1}
          value={digits[idx] || ''}
          onChange={handleInput(idx)}
          onKeyDown={handleKeyDown(idx)}
          onPaste={handlePaste(idx)}
          onFocus={handleFocus(idx)}
          disabled={disabled}
          aria-label={`Dígito ${idx + 1} de ${length}`}
          aria-invalid={error || undefined}
          enterKeyHint={idx === length - 1 ? enterKeyHint : 'next'}
          data-testid={`${testId}-${idx}`}
          data-filled={Boolean(digits[idx])}
          data-error={error || undefined}
          style={S.cell}
          className="vp-nip-cell"
        />
      ))}

      <style>{`
        .vp-nip-cell {
          transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease;
        }
        .vp-nip-cell:focus-visible {
          outline: none;
          border-color: var(--color-accent);
          background: var(--color-surface-card);
          box-shadow: 0 0 0 3px rgb(var(--color-accent-raw) / 0.18);
        }
        .vp-nip-cell[data-filled="true"] {
          border-color: var(--color-ink);
          background: var(--color-surface-card);
        }
        .vp-nip-cell[data-error] {
          border-color: var(--color-semantic-error);
          background: rgb(var(--color-semantic-error-raw) / 0.05);
          animation: vp-nip-shake 320ms ease;
        }
        @keyframes vp-nip-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vp-nip-cell { transition: none; animation: none !important; }
        }
      `}</style>
    </div>
  );
};

const S = {
  row: {
    display: 'flex',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    width: '100%',
  },
  cell: {
    width: 'clamp(2.75rem, 14vw, 3.25rem)',
    height: 'clamp(3rem, 15vw, 3.5rem)',
    textAlign: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--typography-title-md-size)',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--color-ink)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    outline: 'none',
    padding: 0,
    boxSizing: 'border-box',
    caretColor: 'var(--color-accent)',
    /* iOS evita ZOOM al enfocar input si font-size >= 16px (ya lo cumplimos) */
  },
};
