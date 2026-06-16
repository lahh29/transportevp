import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmployeeWizard } from '../components/EmployeeWizard';
import { JsonUploadModal } from '../components/JsonUploadModal';
import { PhotoUploadModal } from '../components/PhotoUploadModal';
import { PhotoCoverageChip } from '../components/PhotoCoverageChip';
import { QrGenerateModal } from '../components/QrGenerateModal';
import {
  Upload, Users, Search, Edit2, Trash2, ChevronLeft, ChevronRight,
  UserPlus, Image as ImageIcon, QrCode, Unlock, MoreHorizontal, X as XIcon,
  MoreVertical, Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/* ============================================================
   EMPRESA PORTAL — Directorio de empleados
   Cohesivo · Mobile-first · 100% tokens · UI/UX semántico
   ============================================================ */

/* ─── Helpers ─────────────────────────────────────────────── */
const getInitials = (nombre) => {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ITEMS_PER_PAGE = 12;

const splitName = (fullName) => {
  if (!fullName) return { apellidos: '', nombres: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { apellidos: parts.join(' '), nombres: '' };
  if (parts.length === 2) return { apellidos: parts[0], nombres: parts[1] };
  return { apellidos: parts.slice(0, 2).join(' '), nombres: parts.slice(2).join(' ') };
};

/* ─── Avatar ──────────────────────────────────────────────── */
const Avatar = ({ nombre, photoUrl }) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        style={{
          width: '2.5rem', height: '2.5rem', borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: '1px solid var(--color-hairline-soft)',
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: '2.5rem', height: '2.5rem', borderRadius: '50%',
        background: 'rgb(var(--color-accent-raw) / 0.1)',
        color: 'var(--color-accent)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--typography-caption-size)',
        fontWeight: 600,
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      {getInitials(nombre)}
    </div>
  );
};

/* ─── Empty State ─────────────────────────────────────────── */
const EmptyState = ({ hasQuery }) => (
  <div role="status" data-testid="empresa-empty" style={S.empty}>
    <div aria-hidden="true" style={S.emptyIcon}>
      <Users size={22} strokeWidth={1.5} />
    </div>
    <p style={S.emptyTitle}>
      {hasQuery ? 'Sin resultados' : 'Directorio vacío'}
    </p>
    <p style={S.emptySub}>
      {hasQuery
        ? 'No hay empleados que coincidan con tu búsqueda.'
        : 'Añade empleados o carga un archivo JSON para comenzar.'}
    </p>
  </div>
);

/* ─── Skeleton ────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div style={S.skeletonCard} aria-hidden="true">
    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--color-hairline-soft)' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
      <div style={{ height: '0.625rem', width: '60%', borderRadius: 'var(--rounded-sm)', background: 'var(--color-hairline-soft)' }} />
      <div style={{ height: '0.5rem',   width: '35%', borderRadius: 'var(--rounded-sm)', background: 'var(--color-hairline-soft)' }} />
    </div>
  </div>
);

/* ─── Botón icono cuadrado (header actions) ───────────────── */
const IconAction = ({ icon: Icon, onClick, title, testId }) => (
  <motion.button
    type="button"
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    title={title}
    aria-label={title}
    data-testid={testId}
    style={S.iconAction}
  >
    <Icon size={16} strokeWidth={1.75} />
  </motion.button>
);

/* ─── Componente principal ────────────────────────────────── */
export const EmpresaPortal = () => {
  const navigate = useNavigate();
  const [employees,         setEmployees]         = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPhotoModalOpen,  setIsPhotoModalOpen]  = useState(false);
  const [openDropdownId,    setOpenDropdownId]    = useState(null);
  const [isQrModalOpen,     setIsQrModalOpen]     = useState(false);
  const [previewQrUrl,      setPreviewQrUrl]      = useState(null);
  const [editingEmployee,   setEditingEmployee]   = useState(null);
  const [confirmDialog,     setConfirmDialog]     = useState({
    isOpen: false, title: '', message: '', confirmText: '', onConfirm: null, isDestructive: false,
  });
  const [searchQuery, setSearchQuery]   = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  /* ── Fetch ── */
  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .order('numero_empleado', { ascending: true });
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

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar empleado',
      message: '¿Eliminar este registro? Esta acción es permanente.',
      confirmText: 'Eliminar',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        const { error } = await supabase.from('empleados').delete().eq('id', id);
        if (error) toast.error('Error al eliminar: ' + error.message);
        else { toast.success('Empleado eliminado'); fetchEmployees(); }
      },
    });
  };

  const handleResetNip = (id, nombre) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Resetear acceso',
      message: `¿Borrar el NIP de ${nombre}? Tendrá que crear uno nuevo al ingresar.`,
      confirmText: 'Resetear NIP',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        const { error } = await supabase.from('empleados').update({ nip: null }).eq('id', id);
        if (error) toast.error('Error al resetear NIP: ' + error.message);
        else { toast.success('Acceso reseteado'); fetchEmployees(); }
      },
    });
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

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const currentEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ── Render ── */
  return (
    <>
      <style>{`
        @keyframes vp-emp-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        .vp-emp-card .vp-emp-actions { opacity: 0; transition: opacity 160ms ease; }
        .vp-emp-card:hover .vp-emp-actions,
        .vp-emp-card:focus-within .vp-emp-actions { opacity: 1; }
        @media (max-width: 640px) {
          .vp-emp-card .vp-emp-actions { opacity: 1; }
        }
        .vp-emp-dropdown-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-base);
          border: none;
          background: transparent;
          border-radius: var(--rounded-md);
          font-family: var(--font-body);
          font-size: var(--typography-body-sm-size);
          font-weight: 500;
          color: var(--color-ink);
          cursor: pointer;
          transition: background 120ms ease;
          text-align: left;
        }
        .vp-emp-dropdown-item:hover { background: var(--color-canvas-soft); }
        .vp-emp-dropdown-item--danger { color: var(--color-semantic-error); }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <section data-testid="empresa-portal" aria-labelledby="empresa-title" style={S.page}>

        {/* ── Header ── */}
        <header style={S.headerBlock}>
          <div style={S.headerRow}>
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <div>
                <h1 id="empresa-title" style={S.h1}>
                  Colaboradores
                </h1>
                <p style={S.h1Sub} data-testid="empresa-count">
                  {loading ? '—' : `${employees.length} empleado${employees.length === 1 ? '' : 's'} registrado${employees.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <PhotoCoverageChip
                employees={employees}
                loading={loading}
                onUpload={() => setIsPhotoModalOpen(true)}
              />
            </div>

            <div style={S.headerActions}>
              {/* Menú "Acciones" (bulk) — agrupa QR/Fotos/JSON */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setBulkMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={bulkMenuOpen}
                  aria-label="Acciones masivas"
                  data-testid="action-bulk-menu"
                  style={{
                    ...S.iconAction,
                    background: bulkMenuOpen ? 'var(--color-canvas-soft)' : 'transparent',
                    color: bulkMenuOpen ? 'var(--color-ink)' : 'var(--color-muted)',
                  }}
                >
                  <MoreVertical size={16} strokeWidth={1.75} />
                </motion.button>

                <AnimatePresence>
                  {bulkMenuOpen && (
                    <>
                      <div
                        aria-hidden="true"
                        onClick={() => setBulkMenuOpen(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                      />
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        transition={{ duration: 0.14 }}
                        style={S.dropdown}
                      >
                        <button
                          type="button" role="menuitem"
                          className="vp-emp-dropdown-item"
                          onClick={() => { setBulkMenuOpen(false); setIsQrModalOpen(true); }}
                          data-testid="bulk-qr"
                        >
                          <QrCode size={15} strokeWidth={1.75} />
                          Generar QRs
                        </button>
                        <button
                          type="button" role="menuitem"
                          className="vp-emp-dropdown-item"
                          onClick={() => { setBulkMenuOpen(false); navigate('/empresa/imprimir-qr'); }}
                          data-testid="bulk-print-qr"
                        >
                          <Printer size={15} strokeWidth={1.75} />
                          Imprimir credenciales
                        </button>
                        <button
                          type="button" role="menuitem"
                          className="vp-emp-dropdown-item"
                          onClick={() => { setBulkMenuOpen(false); setIsPhotoModalOpen(true); }}
                          data-testid="bulk-photos"
                        >
                          <ImageIcon size={15} strokeWidth={1.75} />
                          Cargar fotos
                        </button>
                        <button
                          type="button" role="menuitem"
                          className="vp-emp-dropdown-item"
                          onClick={() => { setBulkMenuOpen(false); setIsUploadModalOpen(true); }}
                          data-testid="bulk-upload"
                        >
                          <Upload size={15} strokeWidth={1.75} />
                          Cargar JSON
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* CTA primario */}
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }}
                aria-label="Añadir empleado"
                data-testid="action-add"
                style={S.addBtn}
              >
                <UserPlus size={15} strokeWidth={1.75} />
                <span>Añadir</span>
              </motion.button>
            </div>
          </div>

          {/* Search */}
          <label style={S.searchWrap}>
            <Search
              size={15} strokeWidth={1.75}
              style={S.searchIcon}
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Buscar por número o nombre…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="empresa-search-input"
              aria-label="Buscar empleado"
              style={S.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                data-testid="empresa-search-clear"
                style={S.searchClear}
              >
                <XIcon size={14} strokeWidth={2} />
              </button>
            )}
          </label>
        </header>

        {/* ── Grid ── */}
        <div style={S.grid} role="list" aria-label="Lista de empleados">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          ) : currentEmployees.length === 0 ? (
            <EmptyState hasQuery={searchQuery.length > 0} />
          ) : (
            <AnimatePresence mode="popLayout">
              {currentEmployees.map((emp, i) => {
                const { apellidos, nombres } = splitName(emp.nombre);
                return (
                  <motion.article
                    key={emp.id}
                  role="listitem"
                  className="vp-emp-card"
                  data-testid={`empresa-card-${emp.numero_empleado || emp.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18, delay: Math.min(i, 8) * 0.025 }}
                  style={S.card}
                >
                  <Avatar nombre={emp.nombre || ''} photoUrl={emp.foto_url} />

                  <div style={S.cardBody} title={emp.nombre}>
                    {apellidos && <p style={S.cardLastName}>{apellidos}</p>}
                    {nombres && <p style={S.cardFirstName}>{nombres}</p>}
                    <p style={S.cardNum}>#{emp.numero_empleado}</p>
                  </div>

                  <div className="vp-emp-actions" style={S.actionsWrap}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setOpenDropdownId(openDropdownId === emp.id ? null : emp.id)}
                      aria-label="Opciones del empleado"
                      aria-haspopup="menu"
                      aria-expanded={openDropdownId === emp.id}
                      data-testid={`empresa-card-menu-${emp.numero_empleado || emp.id}`}
                      style={{
                        ...S.moreBtn,
                        background: openDropdownId === emp.id ? 'var(--color-canvas-soft)' : 'transparent',
                      }}
                    >
                      <MoreHorizontal size={18} strokeWidth={1.75} />
                    </motion.button>

                    <AnimatePresence>
                      {openDropdownId === emp.id && (
                        <>
                          <div
                            aria-hidden="true"
                            style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                            onClick={() => setOpenDropdownId(null)}
                          />
                          <motion.div
                            role="menu"
                            initial={{ opacity: 0, scale: 0.96, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -4 }}
                            transition={{ duration: 0.14 }}
                            style={S.dropdown}
                          >
                            <button
                              type="button" role="menuitem"
                              className="vp-emp-dropdown-item"
                              onClick={() => { setOpenDropdownId(null); handleResetNip(emp.id, emp.nombre); }}
                              data-testid="card-action-reset-nip"
                            >
                              <Unlock size={15} strokeWidth={1.75} /> Resetear NIP
                            </button>
                            {emp.qr_code && (
                              <button
                                type="button" role="menuitem"
                                className="vp-emp-dropdown-item"
                                onClick={() => { setOpenDropdownId(null); setPreviewQrUrl(emp.qr_code); }}
                                data-testid="card-action-view-qr"
                              >
                                <QrCode size={15} strokeWidth={1.75} /> Ver código QR
                              </button>
                            )}
                            <div style={S.dropdownDivider} aria-hidden="true" />
                            <button
                              type="button" role="menuitem"
                              className="vp-emp-dropdown-item"
                              onClick={() => { setOpenDropdownId(null); setEditingEmployee(emp); setIsModalOpen(true); }}
                              data-testid="card-action-edit"
                            >
                              <Edit2 size={15} strokeWidth={1.75} /> Editar datos
                            </button>
                            <button
                              type="button" role="menuitem"
                              className="vp-emp-dropdown-item vp-emp-dropdown-item--danger"
                              onClick={() => { setOpenDropdownId(null); handleDelete(emp.id); }}
                              data-testid="card-action-delete"
                            >
                              <Trash2 size={15} strokeWidth={1.75} /> Eliminar
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.article>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* ── Paginación ── */}
        {!loading && totalPages > 1 && (
          <nav aria-label="Paginación" style={S.pagination}>
            <span style={S.pagInfo} data-testid="pagination-info">
              {filteredEmployees.length} resultado{filteredEmployees.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                data-testid="pagination-prev"
                style={{ ...S.pagBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={15} strokeWidth={1.75} />
              </button>
              <span style={S.pagInfo}>{currentPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
                data-testid="pagination-next"
                style={{ ...S.pagBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={15} strokeWidth={1.75} />
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* ── Modales ── */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEmployee(null); }}
             title={editingEmployee ? 'Editar empleado' : 'Nuevo empleado'} testId="modal-employee">
        <EmployeeWizard
          initialData={editingEmployee}
          onSave={handleSaveEmployee}
          onCancel={() => { setIsModalOpen(false); setEditingEmployee(null); }}
        />
      </Modal>

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Carga masiva" testId="modal-upload">
        <JsonUploadModal
          onConfirm={handleUploadConfirm}
          onCancel={() => setIsUploadModalOpen(false)}
        />
      </Modal>

      <Modal isOpen={isPhotoModalOpen} onClose={() => setIsPhotoModalOpen(false)} title="Carga de fotos" size="lg" testId="modal-photos">
        <PhotoUploadModal
          onCancel={() => setIsPhotoModalOpen(false)}
          onComplete={() => { setIsPhotoModalOpen(false); fetchEmployees(); }}
        />
      </Modal>

      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Generar QRs" testId="modal-qr">
        <QrGenerateModal
          onCancel={() => setIsQrModalOpen(false)}
          onComplete={() => { setIsQrModalOpen(false); fetchEmployees(); }}
        />
      </Modal>

      <Modal isOpen={!!previewQrUrl} onClose={() => setPreviewQrUrl(null)} title="Código QR" size="sm" testId="modal-qr-preview">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-sm) 0' }}>
          <img
            src={previewQrUrl}
            alt="Código QR del empleado"
            data-testid="qr-preview-img"
            style={{
              width: '100%',
              maxWidth: '16rem',
              height: 'auto',
              aspectRatio: '1 / 1',
              borderRadius: 'var(--rounded-md)',
              border: '1px solid var(--color-hairline-soft)',
            }}
          />
        </div>
      </Modal>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

/* ============================================================
   STYLES — 100% tokens · mobile-first
   ============================================================ */
const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xxl)',
  },

  /* Header */
  headerBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-base)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 'var(--spacing-base)',
  },
  h1: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(var(--typography-title-md-size), 4vw, var(--typography-display-sm-size))',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)',
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },
  h1Sub: {
    margin: 'var(--spacing-xxs) 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },
  headerActions: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
    flexWrap: 'wrap',
  },
  iconAction: {
    width: '2.5rem', height: '2.5rem',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'transparent',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-muted)',
    transition: 'color 120ms ease, border-color 120ms ease',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    minHeight: '2.5rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid rgb(var(--color-accent-raw) / 0.4)',
    background: 'rgb(var(--color-accent-raw) / 0.08)',
    cursor: 'pointer',
    color: 'var(--color-accent)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600,
  },

  /* Search */
  searchWrap: {
    position: 'relative',
    display: 'block',
    maxWidth: '28rem',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: 'var(--spacing-sm)',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-muted-soft)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    minHeight: '2.5rem',
    paddingLeft: '2.25rem',
    paddingRight: '2.25rem',
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
  searchClear: {
    position: 'absolute',
    right: 'var(--spacing-xs)',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '1.5rem', height: '1.5rem',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--color-hairline-soft)',
    color: 'var(--color-muted)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Grid */
  grid: {
    display: 'grid',
    gap: 'var(--spacing-sm)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 16rem), 1fr))',
  },

  /* Card */
  card: {
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    position: 'relative',
    background: 'var(--color-surface-card)',
    minHeight: '4rem',
    transition: 'border-color 160ms ease',
  },
  cardBody: {
    flex: 1, minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardLastName: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  },
  cardFirstName: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    fontWeight: 'normal',
    color: 'var(--color-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  },
  cardNum: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.03em',
  },

  /* Actions */
  actionsWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  moreBtn: {
    width: '2rem', height: '2rem',
    borderRadius: 'var(--rounded-md)',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-muted)',
    transition: 'background 120ms ease',
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + var(--spacing-xxs))',
    zIndex: 10,
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-md)',
    padding: 'var(--spacing-xxs)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '11rem',
  },
  dropdownDivider: {
    height: '1px',
    background: 'var(--color-hairline-soft)',
    margin: 'var(--spacing-xxs) 0',
  },

  /* Empty */
  empty: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xxl) var(--spacing-lg)',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '3rem', height: '3rem',
    borderRadius: '50%',
    background: 'rgb(var(--color-accent-raw) / 0.08)',
    color: 'var(--color-accent)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--spacing-xxs)',
  },
  emptyTitle: {
    margin: 0,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)',
    color: 'var(--color-ink)',
  },
  emptySub: {
    margin: 0,
    maxWidth: '16rem',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },

  /* Skeleton */
  skeletonCard: {
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    animation: 'vp-emp-pulse 1.4s ease-in-out infinite',
    minHeight: '4rem',
  },

  /* Pagination */
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 'var(--spacing-sm)',
    borderTop: '1px solid var(--color-hairline-soft)',
    gap: 'var(--spacing-sm)',
    flexWrap: 'wrap',
  },
  pagInfo: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  pagBtn: {
    width: '2rem', height: '2rem',
    borderRadius: 'var(--rounded-sm)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'transparent',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-muted)',
  },
};
