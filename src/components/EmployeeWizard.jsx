import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Truck, MapPin, Check } from 'lucide-react';

/* ─── Configuración de pasos ─── */
const STEPS = [
  {
    id: 1,
    label: 'Identificación',
    icon: User,
    fields: [
      { name: 'numero_empleado', label: 'Número de empleado', placeholder: 'Ej. 10234', required: true },
      { name: 'nombre',          label: 'Nombre completo',    placeholder: 'Apellido Apellido Nombre', required: true },
    ],
  },
  {
    id: 2,
    label: 'Logística',
    icon: Truck,
    fields: [
      { name: 'turno', label: 'Turno', placeholder: 'Ej. Matutino', required: true },
      { name: 'ruta',  label: 'Ruta',  placeholder: 'Ej. Ruta 1 — Centro', required: true },
    ],
  },
  {
    id: 3,
    label: 'Ubicación',
    icon: MapPin,
    fields: [
      { name: 'colonia',     label: 'Colonia',     placeholder: '',                              required: true  },
      { name: 'referencia',  label: 'Referencia',  placeholder: 'Casa verde esquina con…',       required: false },
    ],
  },
];

const EMPTY_FORM = {
  numero_empleado: '',
  nombre:          '',
  turno:           '',
  ruta:            '',
  colonia:         '',
  referencia:      '',
};

/* ─── Step indicator ─── */
const StepIndicator = ({ current, total }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '32px' }}>
    {STEPS.map((s, i) => {
      const done    = current > s.id;
      const active  = current === s.id;
      const Icon    = s.icon;

      return (
        <React.Fragment key={s.id}>
          {/* Nodo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s, border-color 0.2s',
              background: done
                ? 'hsl(var(--color-accent))'
                : active
                  ? 'hsl(var(--color-accent) / 0.1)'
                  : 'transparent',
              border: done
                ? '1.5px solid hsl(var(--color-accent))'
                : active
                  ? '1.5px solid hsl(var(--color-accent))'
                  : '1.5px solid hsl(var(--color-hairline-soft))',
            }}>
              {done
                ? <Check size={13} color="hsl(var(--color-canvas, white))" strokeWidth={2.5} />
                : <Icon
                    size={13}
                    color={active ? 'hsl(var(--color-accent))' : 'hsl(var(--color-muted))'}
                    strokeWidth={2}
                  />
              }
            </div>
            <span style={{
              fontSize: '10px', letterSpacing: '0.03em',
              color: active ? 'hsl(var(--color-accent))' : 'hsl(var(--color-muted))',
              fontWeight: active ? 500 : 400,
              whiteSpace: 'nowrap',
            }}>
              {s.label}
            </span>
          </div>

          {/* Conector */}
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: '1px', margin: '0 4px', marginBottom: '16px',
              background: current > s.id
                ? 'hsl(var(--color-accent) / 0.4)'
                : 'hsl(var(--color-hairline-soft))',
              transition: 'background 0.3s',
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ─── Componente principal ─── */
export const EmployeeWizard = ({ initialData, onSave, onCancel }) => {
  const [step,     setStep]     = useState(1);
  const [dir,      setDir]      = useState(1);   // 1 = adelante, -1 = atrás
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => { setDir(1);  setStep(s => s + 1); };
  const handlePrev = () => { setDir(-1); setStep(s => s - 1); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step < 3) { handleNext(); return; }
    onSave(formData);
  };

  const currentStep = STEPS[step - 1];

  /* Variantes de animación */
  const variants = {
    enter:   { opacity: 0, x: dir * 24 },
    center:  { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: dir * -24 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      <StepIndicator current={step} total={STEPS.length} />

      <form onSubmit={handleSubmit}>

        {/* Panel animado del paso actual */}
        <div style={{ minHeight: '180px', position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {currentStep.fields.map((field) => (
                <div key={field.name}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'hsl(var(--color-muted))',
                    marginBottom: '6px',
                  }}>
                    {field.label}
                    {field.required && (
                      <span style={{ color: 'hsl(var(--color-semantic-error))', marginLeft: '3px' }}>*</span>
                    )}
                  </label>
                  <Input
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required={field.required}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pie: navegación */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '28px', paddingTop: '20px',
          borderTop: '1px solid hsl(var(--color-hairline-soft))',
        }}>

          {/* Izquierda: cancelar o anterior */}
          {step === 1 ? (
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0',
                fontSize: '13px', color: 'hsl(var(--color-muted))',
              }}
            >
              Cancelar
            </button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handlePrev}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                height: '36px', padding: '0 14px', borderRadius: '8px',
                border: '1px solid hsl(var(--color-hairline-soft))',
                background: 'transparent', cursor: 'pointer',
                fontSize: '13px', color: 'hsl(var(--color-ink))',
              }}
            >
              Anterior
            </motion.button>
          )}

          {/* Derecha: siguiente o guardar */}
          <motion.button
            type="submit"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '36px', padding: '0 18px', borderRadius: '8px',
              border: '1px solid hsl(var(--color-accent) / 0.4)',
              background: step === 3
                ? 'hsl(var(--color-accent))'
                : 'hsl(var(--color-accent) / 0.08)',
              cursor: 'pointer',
              fontSize: '13px', fontWeight: 500,
              color: step === 3
                ? 'hsl(var(--color-canvas, white))'
                : 'hsl(var(--color-accent))',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {step === 3 ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                {initialData ? 'Guardar cambios' : 'Crear empleado'}
              </>
            ) : (
              'Siguiente'
            )}
          </motion.button>

        </div>
      </form>
    </div>
  );
};
