import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Modal } from '../components/Modal';
import { EmployeeWizard } from '../components/EmployeeWizard';
import { JsonUploadModal } from '../components/JsonUploadModal';
import { PhotoUploadModal } from '../components/PhotoUploadModal';
import { QrGenerateModal } from '../components/QrGenerateModal';
import { Upload, Users, Search, Edit2, Trash2, ChevronLeft, ChevronRight, UserPlus, Image, QrCode, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/* ─── Helpers ─── */
const getInitials = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_PALETTES = [
  { bg: 'hsl(var(--color-accent) / 0.12)', text: 'hsl(var(--color-accent))' },
  { bg: 'hsl(210 60% 93%)',                text: 'hsl(210 60% 35%)' },
  { bg: 'hsl(142 40% 90%)',                text: 'hsl(142 40% 28%)' },
  { bg: 'hsl(32 80% 92%)',                 text: 'hsl(32 70% 30%)' },
  { bg: 'hsl(280 50% 93%)',                text: 'hsl(280 50% 35%)' },
];

const getAvatarPalette = (nombre) => {
  let hash = 0;
  for (let i = 0; i < (nombre || '').length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
};

/* ─── Avatar ─── */
const Avatar = ({ nombre, photoUrl }) => {
  const { bg, text } = getAvatarPalette(nombre);
  if (photoUrl) {
    return <img src={photoUrl} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt={nombre} />;
  }
  return (
    <div style={{
      width: '40px', height: '40px', borderRadius: '50%',
      background: bg, color: text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 600, flexShrink: 0,
      letterSpacing: '0.02em',
    }}>
      {getInitials(nombre)}
    </div>
  );
};

/* ─── Empty State ─── */
const EmptyState = ({ hasQuery }) => (
  <div style={{
    gridColumn: '1 / -1',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '12px',
    padding: '64px 24px', textAlign: 'center',
  }}>
    <div style={{
      width: '48px', height: '48px', borderRadius: '50%',
      background: 'hsl(var(--color-accent) / 0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Users size={22} color="hsl(var(--color-accent))" />
    </div>
    <p style={{ margin: 0, fontWeight: 500, color: 'hsl(var(--color-ink))' }}>
      {hasQuery ? 'Sin resultados' : 'Directorio vacío'}
    </p>
    <p style={{ margin: '0', fontSize: '13px', color: 'hsl(var(--color-muted))', maxWidth: '240px' }}>
      {hasQuery
        ? 'No hay empleados que coincidan con tu búsqueda.'
        : 'Añade empleados manualmente o carga un archivo JSON para comenzar.'}
    </p>
  </div>
);

/* ─── Skeleton ─── */
const SkeletonCard = () => (
  <div style={{
    padding: '14px 16px', borderRadius: '10px',
    border: '1px solid hsl(var(--color-hairline-soft))',
    display: 'flex', alignItems: 'center', gap: '12px',
    animation: 'pulse 1.4s ease-in-out infinite',
  }}>
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'hsl(var(--color-hairline-soft))' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ height: 10, width: '60%', borderRadius: 4, background: 'hsl(var(--color-hairline-soft))' }} />
      <div style={{ height: 8,  width: '35%', borderRadius: 4, background: 'hsl(var(--color-hairline-soft))' }} />
    </div>
  </div>
);

/* ─── Componente principal ─── */
export const EmpresaPortal = () => {
  const [employees,          setEmployees]          = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [isModalOpen,        setIsModalOpen]        = useState(false);
  const [isUploadModalOpen,  setIsUploadModalOpen]  = useState(false);
  const [isPhotoModalOpen,   setIsPhotoModalOpen]   = useState(false);
  const [isQrModalOpen,      setIsQrModalOpen]      = useState(false);
  const [previewQrUrl,       setPreviewQrUrl]       = useState(null);
  const [editingEmployee,    setEditingEmployee]    = useState(null);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [currentPage,        setCurrentPage]        = useState(1);

  /* ── Fetch ── */
  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) console.error('Error fetching employees:', error);
    else setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  /* ── CRUD ── */
  const handleSaveEmployee = async (formData) => {
    if (editingEmployee) {
      const { error } = await supabase.from('empleados').update(formData).eq('id', editingEmployee.id);
      if (error) toast.error('Error al actualizar: ' + error.message);
      else       toast.success('Empleado actualizado');
    } else {
      const { error } = await supabase.from('empleados').insert([formData]);
      if (error) toast.error('Error al crear: ' + error.message);
      else       toast.success('Empleado creado');
    }
    setIsModalOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este empleado?')) return;
    const { error } = await supabase.from('empleados').delete().eq('id', id);
    if (error) toast.error('Error al eliminar: ' + error.message);
    else { toast.success('Empleado eliminado'); fetchEmployees(); }
  };

  const handleResetNip = async (id, nombre) => {
    if (!window.confirm(`¿Resetear acceso (borrar NIP) de ${nombre}?`)) return;
    const { error } = await supabase.from('empleados').update({ nip: null }).eq('id', id);
    if (error) toast.error('Error al resetear NIP: ' + error.message);
    else { toast.success('Acceso reseteado'); fetchEmployees(); }
  };

  const handleUploadConfirm = async (parsedData) => {
    try {
      const { error } = await supabase.from('empleados').insert(parsedData);
      if (error) throw error;
      toast.success(`${parsedData.length} empleados cargados`);
      setIsUploadModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error('Error al subir los datos: ' + err.message);
    }
  };

  /* ── Filtrado y paginación ── */
  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      (emp.nombre          && emp.nombre.toLowerCase().includes(q)) ||
      (emp.numero_empleado && String(emp.numero_empleado).toLowerCase().includes(q))
    );
  });

  const ITEMS_PER_PAGE   = 12;
  const totalPages       = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const currentEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ── Render ── */
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        .emp-card-actions { opacity: 0; transition: opacity 0.15s ease; }
        .emp-card:hover .emp-card-actions,
        .emp-card:focus-within .emp-card-actions { opacity: 1; }
        @media (max-width: 640px) {
          .emp-card-actions { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px',
          }}>
            <div>
              <h1 style={{
                margin: 0, fontSize: 'clamp(20px, 4vw, 26px)',
                fontWeight: 500, color: 'hsl(var(--color-ink))', lineHeight: 1.2,
              }}>
                Colaboradores Activos
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'hsl(var(--color-muted))' }}>
                {loading ? '—' : `${employees.length} empleados registrados`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button whileHover={{ y: -2 }} onClick={() => setIsQrModalOpen(true)} title="Generar QRs" style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid hsl(var(--color-hairline-soft))', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-muted))' }}><QrCode size={16} /></motion.button>
              <motion.button whileHover={{ y: -2 }} onClick={() => setIsPhotoModalOpen(true)} title="Cargar Fotos" style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid hsl(var(--color-hairline-soft))', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-muted))' }}><Image size={16} /></motion.button>
              <motion.button whileHover={{ y: -2 }} onClick={() => setIsUploadModalOpen(true)} title="Cargar JSON" style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid hsl(var(--color-hairline-soft))', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-muted))' }}><Upload size={16} /></motion.button>
              <motion.button whileHover={{ y: -2 }} onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }} title="Añadir empleado" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 14px', borderRadius: '8px', border: '1px solid hsl(var(--color-accent) / 0.4)', background: 'hsl(var(--color-accent) / 0.08)', cursor: 'pointer', color: 'hsl(var(--color-accent))', fontSize: '13px', fontWeight: 500 }}><UserPlus size={15} /><span>Añadir</span></motion.button>
            </div>
          </div>

          <div style={{ position: 'relative', maxWidth: '440px', width: '100%' }}>
            <Search size={15} color="hsl(var(--color-muted))" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Buscar por número o nombre…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input" style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* ── Grid ── */}
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          ) : currentEmployees.length === 0 ? (
            <EmptyState hasQuery={searchQuery.length > 0} />
          ) : (
            <AnimatePresence mode="popLayout">
              {currentEmployees.map((emp, i) => (
                <motion.div key={emp.id} className="emp-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.3) }} style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid hsl(var(--color-hairline-soft))', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                  <Avatar nombre={emp.nombre || ''} photoUrl={emp.foto_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'hsl(var(--color-ink))', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.nombre}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'hsl(var(--color-muted))', fontVariantNumeric: 'tabular-nums' }}>#{emp.numero_empleado}</p>
                  </div>
                  <div className="emp-card-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <motion.button onClick={() => handleResetNip(emp.id, emp.nombre)} title="Resetear Acceso (NIP)" style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-muted))' }}><Unlock size={13} /></motion.button>
                    {emp.qr_code && <motion.button onClick={() => setPreviewQrUrl(emp.qr_code)} title="Ver QR" style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-muted))' }}><QrCode size={13} /></motion.button>}
                    <motion.button onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }} title="Editar" style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-muted))' }}><Edit2 size={13} /></motion.button>
                    <motion.button onClick={() => handleDelete(emp.id)} title="Eliminar" style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-semantic-error))' }}><Trash2 size={13} /></motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* ── Paginación ── */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid hsl(var(--color-hairline-soft))' }}>
            <span style={{ fontSize: '12px', color: 'hsl(var(--color-muted))' }}>{filteredEmployees.length} resultado{filteredEmployees.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ width: '32px', height: '32px', borderRadius: '7px', border: '1px solid hsl(var(--color-hairline-soft))', background: 'transparent', cursor: 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}><ChevronLeft size={15} /></button>
              <span style={{ fontSize: '12px', color: 'hsl(var(--color-muted))' }}>{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ width: '32px', height: '32px', borderRadius: '7px', border: '1px solid hsl(var(--color-hairline-soft))', background: 'transparent', cursor: 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEmployee(null); }} title={editingEmployee ? 'Editar empleado' : 'Nuevo empleado'}>
        <EmployeeWizard initialData={editingEmployee} onSave={handleSaveEmployee} onCancel={() => { setIsModalOpen(false); setEditingEmployee(null); }} />
      </Modal>

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Carga Masiva de Empleados">
        <JsonUploadModal onConfirm={handleUploadConfirm} onCancel={() => setIsUploadModalOpen(false)} />
      </Modal>

      <Modal isOpen={isPhotoModalOpen} onClose={() => setIsPhotoModalOpen(false)} title="Carga Masiva de Fotos">
        <PhotoUploadModal onCancel={() => setIsPhotoModalOpen(false)} onComplete={() => { setIsPhotoModalOpen(false); fetchEmployees(); }} />
      </Modal>

      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Generar Códigos QR">
        <QrGenerateModal onCancel={() => setIsQrModalOpen(false)} onComplete={() => { setIsQrModalOpen(false); fetchEmployees(); }} />
      </Modal>

      <Modal isOpen={!!previewQrUrl} onClose={() => setPreviewQrUrl(null)} title="Código QR del Empleado">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <img src={previewQrUrl} alt="QR Code" style={{ width: '250px', height: '250px' }} />
        </div>
      </Modal>
    </>
  );
};
