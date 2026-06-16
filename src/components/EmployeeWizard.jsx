import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Truck, MapPin, Check, ChevronLeft } from 'lucide-react';

/* ============================================================
   EMPLOYEE WIZARD — Crear / editar empleado (3 pasos)
   Cohesivo · 100% tokens · UI/UX semántico
   ============================================================ */

const STEPS = [
  {
    id: 1,
    label: 'Identificación',
    icon: User,
    fields: [
      { name: 'numero_empleado', label: 'Número de empleado', placeholder: 'Ej. 10234', required: true, inputMode: 'numeric', autoComplete: 'off' },
      { name: 'nombre',          label: 'Nombre completo',    placeholder: 'Apellido Apellido Nombre', required: true, autoComplete: 'name' },
    ],
  },
  {
    id: 2,
    label: 'Logística',
    icon: Truck,
    fields: [
      { name: 'turno', label: 'Turno', placeholder: 'Ej. 1, 2, 3…', required: true, autoComplete: 'off' },
      { name: 'ruta',  label: 'Ruta',  placeholder: 'Ej. R1- QUERETARO', required: true, autoComplete: 'off' },
    ],
  },
  {
    id: 3,
    label: 'Ubicación',
    icon: MapPin,
    fields: [
      { name: 'colonia',     label: 'Colonia',    placeholder: 'Ej. La Luz', required: true, autoComplete: 'address-level2' },
      { name: 'referencia',  label: 'Referencia', placeholder: 'Casa verde esquina con…', required: false, autoComplete: 'off' },
    ],
  },
];

const EMPTY_FORM = {
  numero_empleado: '',
  nombre: '',
  turno: '',
  ruta: '',
  colonia: '',
  referencia: '',
};

/* ─── Step indicator ──────────────────────────────────────── */
const StepIndicator = ({ current }) => (
  <ol style={S.stepperRow} aria-label="Progreso del formulario">
    {STEPS.map((s, i) => {
      const done   = current > s.id;
      const active = current === s.id;
      const Icon   = s.icon;

      return (
        <React.Fragment key={s.id}>
          <li style={S.stepNode} aria-current={active ? 'step' : undefined}>
            <div
              aria-hidden="true"
              style={{
                ...S.stepDot,
                background:  done ? 'var(--color-accent)' : active ? 'rgb(var(--color-accent-raw) / 0.1)' : 'transparent',
                borderColor: done || active ? 'var(--color-accent)' : 'var(--color-hairline-strong)',
                color:       done ? 'var(--color-on-primary)' : active ? 'var(--color-accent)' : 'var(--color-muted)',
              }}
            >
              {done
                ? <Check size={13} strokeWidth={2.5} />
                : <Icon size={13} strokeWidth={2} />
              }
            </div>
            <span style={{
              ...S.stepLabel,
              color: active ? 'var(--color-accent)' : 'var(--color-muted)',
              fontWeight: active ? 600 : 500,
            }}>
              {s.label}
            </span>
          </li>

          {i < STEPS.length - 1 && (
            <li
              aria-hidden="true"
              style={{
                ...S.stepConnector,
                background: current > s.id ? 'rgb(var(--color-accent-raw) / 0.4)' : 'var(--color-hairline-soft)',
              }}
            />
          )}
        </React.Fragment>
      );
    })}
  </ol>
);

/* ─── Field ───────────────────────────────────────────────── */
const Field = ({ field, value, onChange }) => {
  const id = `field-${field.name}`;
  return (
    <div style={S.field}>
      <label htmlFor={id} style={S.label}>
        {field.label}
        {field.required && <span style={S.required} aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={field.name}
        type="text"
        value={value || ''}
        onChange={onChange}
        placeholder={field.placeholder}
        required={field.required}
        inputMode={field.inputMode}
        autoComplete={field.autoComplete}
        data-testid={`wizard-field-${field.name}`}
        style={S.input}
      />
    </div>
  );
};

/* ─── Componente principal ────────────────────────────────── */
export const EmployeeWizard = ({ initialData, onSave, onCancel, flat = false }) => {
  const [step,     setStep]     = useState(1);
  const [dir,      setDir]      = useState(1);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState(EMPTY_FORM);

  useEffect(() => {
    const next = initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM;
    setFormData(next);
    setInitialSnapshot(next);
  }, [initialData]);

  const isDirty = useMemo(
    () => Object.keys(EMPTY_FORM).some((k) => (formData[k] || '') !== (initialSnapshot[k] || '')),
    [formData, initialSnapshot],
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => { setDir(1);  setStep((s) => s + 1); };
  const handlePrev = () => { setDir(-1); setStep((s) => s - 1); };

  const handleCancel = () => {
    if (isDirty && !window.confirm('¿Descartar los cambios sin guardar?')) return;
    onCancel?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!flat && step < STEPS.length) { handleNext(); return; }
    onSave(formData);
  };

  const currentStep = STEPS[step - 1];

  const variants = {
    enter:  { opacity: 0, x: dir * 24 },
    center: { opacity: 1, x: 0 },
    exit:   { opacity: 0, x: dir * -24 },
  };

  /* Modo plano (edición): todos los campos visibles */
  if (flat) {
    return (
      <div style={S.root} data-testid="employee-wizard-flat">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {STEPS.map((stepCfg) => (
              <fieldset key={stepCfg.id} style={S.fieldset}>
                <legend style={S.legendVisible}>{stepCfg.label}</legend>
                {stepCfg.fields.map((field) => (
                  <Field key={field.name} field={field} value={formData[field.name]} onChange={handleChange} />
                ))}
              </fieldset>
            ))}
          </div>

          <div style={S.footer}>
            <button type="button" onClick={handleCancel} data-testid="wizard-cancel" style={S.btnLink}>
              Cancelar
            </button>
            <motion.button
              type="submit"
              whileTap={isDirty ? { scale: 0.985 } : {}}
              disabled={!isDirty}
              data-testid="wizard-submit"
              style={{
                ...S.btnPrimary,
                background: 'var(--color-accent)',
                color: 'var(--color-on-primary)',
                border: 'none',
                opacity: isDirty ? 1 : 0.5,
                cursor: isDirty ? 'pointer' : 'not-allowed',
              }}
            >
              <Check size={14} strokeWidth={2.5} /> Guardar cambios
            </motion.button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={S.root} data-testid="employee-wizard">

      <StepIndicator current={step} />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Panel animado del paso actual */}
        <div style={S.stage}>
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.fieldset
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              style={S.fieldset}
            >
              <legend style={S.legend}>{currentStep.label}</legend>
              {currentStep.fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={formData[field.name]}
                  onChange={handleChange}
                />
              ))}
            </motion.fieldset>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          {step === 1 ? (
            <button
              type="button"
              onClick={handleCancel}
              data-testid="wizard-cancel"
              style={S.btnLink}
            >
              Cancelar
            </button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={handlePrev}
              data-testid="wizard-prev"
              style={S.btnSecondary}
            >
              <ChevronLeft size={14} strokeWidth={2} />
              Anterior
            </motion.button>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.985 }}
            data-testid="wizard-submit"
            style={{
              ...S.btnPrimary,
              background: step === STEPS.length
                ? 'var(--color-accent)'
                : 'rgb(var(--color-accent-raw) / 0.1)',
              color: step === STEPS.length ? 'var(--color-on-primary)' : 'var(--color-accent)',
              border: step === STEPS.length ? 'none' : '1px solid rgb(var(--color-accent-raw) / 0.4)',
            }}
          >
            {step === STEPS.length
              ? <><Check size={14} strokeWidth={2.5} /> {initialData ? 'Guardar cambios' : 'Crear empleado'}</>
              : 'Siguiente'
            }
          </motion.button>
        </div>
      </form>
    </div>
  );
};

const S = {
  root: {
    display: 'flex',
    flexDirection: 'column',
  },

  /* Stepper */
  stepperRow: {
    listStyle: 'none',
    margin: '0 0 var(--spacing-xl)',
    padding: 0,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 0,
  },
  stepNode: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    flex: '0 0 auto',
  },
  stepDot: {
    width: '2rem', height: '2rem', borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid var(--color-hairline-strong)',
    transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
  },
  stepLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  },
  stepConnector: {
    flex: 1,
    height: '1px',
    margin: '1rem var(--spacing-xxs) 0',
    transition: 'background 320ms ease',
  },

  /* Stage */
  stage: {
    minHeight: '11rem',
    position: 'relative',
    overflow: 'hidden',
  },
  fieldset: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-base)',
    border: 'none',
    padding: 0,
    margin: 0,
  },
  legend: {
    position: 'absolute',
    width: '1px', height: '1px',
    margin: '-1px', padding: 0,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
  legendVisible: {
    position: 'static',
    width: 'auto', height: 'auto',
    margin: '0 0 var(--spacing-xs)',
    padding: 0,
    overflow: 'visible',
    clip: 'auto',
    whiteSpace: 'normal',
    border: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  },

  /* Field */
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xxs)',
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted)',
  },
  required: {
    color: 'var(--color-semantic-error)',
    marginLeft: '3px',
  },
  input: {
    width: '100%',
    minHeight: '2.75rem',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-ink)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 120ms ease, background 120ms ease',
  },

  /* Footer */
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'var(--spacing-lg)',
    paddingTop: 'var(--spacing-base)',
    borderTop: '1px solid var(--color-hairline-soft)',
    gap: 'var(--spacing-sm)',
  },
  btnLink: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--spacing-xs) var(--spacing-xs) var(--spacing-xs) 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-muted)',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    minHeight: '2.5rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline)',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 500,
    color: 'var(--color-ink)',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xxs)',
    minHeight: '2.5rem',
    padding: '0 var(--spacing-lg)',
    borderRadius: 'var(--rounded-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600,
    transition: 'background 160ms ease, color 160ms ease',
  },
};
