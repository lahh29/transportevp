import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
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
  MoreVertical, Printer, Fingerprint, Copy, Download, FileSpreadsheet, Check,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notify } from '../lib/notify';
import { adminApi } from '../lib/adminApi';
import { exportEmployeesToCsv } from '../lib/exportCsv';
import { getInitials, splitName, plural, EMPRESA_PAGE_SIZE, APP_ROUTES } from '../lib/choferConfig';
import { useMenuKeyboardNav } from '../lib/useMenuKeyboardNav';
import { useIsMobile } from '../lib/useMediaQuery';

/* ─── Avatar ─────────────────────────────────────────────── */
const Avatar = ({ nombre, photoUrl, size = '2.5rem' }) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-hairline-soft)' }}
      />
    );
  }
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgb(var(--color-accent-raw) / 0.1)',
      color: 'var(--color-accent)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)',
      fontWeight: 600, flexShrink: 0, letterSpacing: '0.02em',
    }}>{getInitials(nombre)}</div>
  );
};

const EmptyState = ({ hasQuery }) => (
  <div role="status" data-testid="empresa-empty" style={S.empty}>
    <div aria-hidden="true" style={S.emptyIcon}><Users size={22} strokeWidth={1.5} /></div>
    <p style={S.emptyTitle}>{hasQuery ? 'Sin resultados' : 'Directorio vacío'}</p>
    <p style={S.emptySub}>{hasQuery ? 'No hay empleados que coincidan.' : 'Añade colaboradores o sube un archivo para empezar.'}</p>
  </div>
);

const SkeletonCard = () => (
  <div style={S.skeletonCard} aria-hidden="true">
    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--color-hairline-soft)' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
      <div style={{ height: '0.625rem', width: '60%', borderRadius: 'var(--rounded-sm)', background: 'var(--color-hairline-soft)' }} />
      <div style={{ height: '0.5rem', width: '35%', borderRadius: 'var(--rounded-sm)', background: 'var(--color-hairline-soft)' }} />
    </div>
  </div>
);

/* ─── Dropdown menu (popover + keyboard nav) ─────────────── */
const DropdownMenu = ({ isOpen, onClose, anchor = 'right', children, label }) => {
  const ref = useMenuKeyboardNav({ isOpen, onClose });
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div aria-hidden="true" onClick={onClose} style={S.menuOverlay} />
          <motion.div
            ref={ref}
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14 }}
            style={{ ...S.dropdown, [anchor]: 0 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const MenuItem = ({ icon: Icon, onClick, children, danger, testId }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    data-testid={testId}
    className={`vp-emp-dropdown-item${danger ? ' vp-emp-dropdown-item--danger' : ''}`}
  >
    {Icon && <Icon size={15} strokeWidth={1.75} aria-hidden="true" />}
    <span>{children}</span>
  </button>
);

const MenuGroupLabel = ({ children }) => (
  <p aria-hidden="true" style={S.menuGroupLabel}>{children}</p>
);

/* ─── Componente principal ───────────────────────────────── */
export const EmpresaPortal = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTurnoUpdateModalOpen, setIsTurnoUpdateModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [previewEmp, setPreviewEmp] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false, title: '', message: '', confirmText: '', onConfirm: null, isDestructive: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectMode, setSelectMode] = useState(false);

  /* ── Fetch ── */
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('empleados')
      .select('id, numero_empleado, nombre, turno, ruta, colonia, referencia, foto_url, qr_code, webauthn_enrolled_at')
      .order('numero_empleado', { ascending: true });
    if (error) notify.error('No se pudieron cargar los empleados');
    else setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { setCurrentPage(1); }, [deferredQuery]);
  useEffect(() => { if (!selectMode) setSelectedIds(new Set()); }, [selectMode]);

  /* ── CRUD ── */
  const handleSaveEmployee = async (formData) => {
    const isEdit = Boolean(editingEmployee);
    const { error } = isEdit
      ? await supabase.from('empleados').update(formData).eq('id', editingEmployee.id)
      : await supabase.from('empleados').insert([formData]);
    if (error) notify.error(isEdit ? 'No se pudo actualizar' : 'No se pudo crear');
    else notify.success(isEdit ? 'Empleado actualizado' : 'Empleado creado');
    setIsModalOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  const handleDelete = (emp) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar empleado',
      message: `¿Eliminar a ${emp.nombre}? Esta acción es permanente.`,
      confirmText: 'Eliminar',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, isOpen: false }));
        const { data, error } = await supabase.from('empleados').delete().eq('id', emp.id).select();
        if (error) {
          notify.error('No se pudo eliminar');
        } else if (!data || data.length === 0) {
          notify.error('No tienes permisos para eliminar estos registros.');
        } else {
          notify.success('Empleado eliminado');
          fetchEmployees();
        }
      },
    });
  };

  const handleResetNip = (emp) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Resetear NIP',
      message: `${emp.nombre} tendrá que crear un NIP nuevo al ingresar.`,
      confirmText: 'Resetear',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, isOpen: false }));
        try {
          await adminApi.resetNip(emp.id);
          notify.success('NIP reseteado');
          fetchEmployees();
        } catch (err) {
          notify.error(err.message || 'No se pudo resetear');
        }
      },
    });
  };

  const handleResetBio = (emp) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Borrar biometría',
      message: `Se eliminarán las credenciales de Face ID / Touch ID de ${emp.nombre}.`,
      confirmText: 'Borrar',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, isOpen: false }));
        try {
          await adminApi.resetWebauthn(emp.id);
          notify.success('Biometría borrada');
          fetchEmployees();
        } catch (err) {
          notify.error(err.message || 'No se pudo borrar');
        }
      },
    });
  };

  const handleCopyNumero = async (emp) => {
    try {
      await navigator.clipboard.writeText(String(emp.numero_empleado));
      notify.copied();
    } catch {
      notify.error('No se pudo copiar');
    }
  };

  const handleDownloadQr = (emp) => {
    if (!emp.qr_code) return;
    const a = document.createElement('a');
    a.href = emp.qr_code;
    a.download = `qr-${emp.numero_empleado}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleUploadConfirm = async (parsedData) => {
    try {
      // 1) Detectar qué números ya existen en el directorio
      const numbers = parsedData.map((r) => r.numero_empleado);
      const { data: existing, error: checkErr } = await supabase
        .from('empleados')
        .select('numero_empleado')
        .in('numero_empleado', numbers);

      if (checkErr) throw checkErr;

      const existingSet = new Set((existing || []).map((e) => String(e.numero_empleado)));
      const toInsert  = parsedData.filter((r) => !existingSet.has(String(r.numero_empleado)));
      const duplicates = parsedData
        .filter((r) => existingSet.has(String(r.numero_empleado)))
        .map((r) => r.numero_empleado);

      let created = 0;
      let failed = [];

      if (toInsert.length > 0) {
        const { data: inserted, error: insErr } = await supabase
          .from('empleados')
          .insert(toInsert)
          .select('numero_empleado');

        if (insErr) {
          failed = toInsert.map((r) => r.numero_empleado);
        } else {
          created = inserted?.length || 0;
        }
      }

      if (created > 0) {
        notify.success(`${created} colaborador${created !== 1 ? 'es' : ''} cargado${created !== 1 ? 's' : ''}`);
      }

      // Cierra solo si no hay incidencias
      if (duplicates.length === 0 && failed.length === 0) {
        setIsUploadModalOpen(false);
      }
      fetchEmployees();

      return { updated: created, duplicates, failed, notFound: [] };
    } catch {
      notify.error('No se pudieron cargar los datos');
      return { updated: 0, duplicates: [], failed: [], notFound: [] };
    }
  };

  const handleTurnoUpdateConfirm = async (rows) => {
    try {
      // Actualiza turno de cada colaborador por número de empleado.
      const results = await Promise.all(
        rows.map(({ numero_empleado, turno }) =>
          supabase
            .from('empleados')
            .update({ turno })
            .eq('numero_empleado', numero_empleado)
            .select('id')
            .then((r) => ({ ...r, numero_empleado })),
        ),
      );

      const updatedRows  = results.filter((r) => !r.error && r.data && r.data.length > 0);
      const notFoundRows = results.filter((r) => !r.error && (!r.data || r.data.length === 0));
      const failedRows   = results.filter((r) => r.error);

      const updated  = updatedRows.length;
      const notFound = notFoundRows.map((r) => r.numero_empleado);
      const failed   = failedRows.map((r) => r.numero_empleado);

      if (updated > 0) {
        notify.success(`${updated} turno${updated !== 1 ? 's' : ''} actualizado${updated !== 1 ? 's' : ''}`);
      }

      // Si todo salió perfecto, cerramos el modal. Si hay incidencias, lo dejamos
      // abierto para que el usuario vea quiénes no se procesaron.
      if (notFound.length === 0 && failed.length === 0) {
        setIsTurnoUpdateModalOpen(false);
      }
      fetchEmployees();

      return { updated, notFound, failed };
    } catch {
      notify.error('No se pudieron actualizar los turnos');
      return { updated: 0, notFound: [], failed: [] };
    }
  };

  /* ── Multi-select & bulk ── */
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Eliminar ${plural(selectedIds.size, 'empleado')}`,
      message: 'Esta acción es permanente.',
      confirmText: 'Eliminar todos',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, isOpen: false }));
        const ids = Array.from(selectedIds);
        const { data, error } = await supabase.from('empleados').delete().in('id', ids).select();
        if (error) {
          notify.error('No se pudo eliminar');
        } else if (!data || data.length === 0) {
          notify.error('No tienes permisos para eliminar estos registros.');
        } else {
          notify.success(`${data.length} empleado(s) eliminado(s)`);
          setSelectedIds(new Set());
          setSelectMode(false);
          fetchEmployees();
        }
      },
    });
  };

  const handleExportCsv = () => {
    const target = selectedIds.size > 0
      ? employees.filter((e) => selectedIds.has(e.id))
      : employees;
    if (target.length === 0) { notify.info('No hay empleados'); return; }
    exportEmployeesToCsv(target);
    notify.success(`Exportados ${plural(target.length, 'empleado')}`);
  };

  /* ── Filtrado y paginación ── */
  const filteredEmployees = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) =>
      (emp.nombre && emp.nombre.toLowerCase().includes(q)) ||
      (emp.numero_empleado && String(emp.numero_empleado).toLowerCase().includes(q))
    );
  }, [employees, deferredQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / EMPRESA_PAGE_SIZE));
  const currentEmployees = useMemo(
    () => filteredEmployees.slice((currentPage - 1) * EMPRESA_PAGE_SIZE, currentPage * EMPRESA_PAGE_SIZE),
    [filteredEmployees, currentPage],
  );

  return (
    <>
      <style>{`
        @keyframes vp-emp-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        .vp-emp-card .vp-emp-actions { opacity: 0.6; transition: opacity 160ms ease; }
        .vp-emp-card:hover .vp-emp-actions,
        .vp-emp-card:focus-within .vp-emp-actions { opacity: 1; }
        @media (max-width: 600px) {
          .vp-emp-card .vp-emp-actions { opacity: 1; }
        }
        .vp-emp-dropdown-item {
          display: flex; align-items: center; gap: var(--spacing-sm);
          width: 100%; padding: var(--spacing-xs) var(--spacing-sm);
          border: none; background: transparent; border-radius: var(--rounded-md);
          font-family: var(--font-body); font-size: var(--typography-body-sm-size);
          font-weight: 500; color: var(--color-ink); cursor: pointer;
          transition: background 120ms ease; text-align: left;
          white-space: nowrap;
          min-height: 2.5rem;
        }
        .vp-emp-dropdown-item:hover, .vp-emp-dropdown-item:focus-visible {
          background: var(--color-canvas-soft); outline: none;
        }
        .vp-emp-dropdown-item:focus-visible {
          box-shadow: inset 0 0 0 2px rgb(var(--color-accent-raw) / 0.4);
        }
        .vp-emp-dropdown-item--danger { color: var(--color-semantic-error); }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <section data-testid="empresa-portal" aria-labelledby="empresa-title" style={S.page}>

        {/* Header */}
        <header style={S.headerBlock}>
          <div style={S.headerRow}>
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <div>
                <h1 id="empresa-title" style={S.h1}>Colaboradores</h1>
                <p style={S.h1Sub} data-testid="empresa-count">
                  {loading ? '—' : `${plural(employees.length, 'empleado')} registrado${employees.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <PhotoCoverageChip employees={employees} loading={loading} onUpload={() => setIsPhotoModalOpen(true)} />
            </div>

            <div style={S.headerActions}>
              {/* Selector mode toggle */}
              <button
                type="button"
                onClick={() => setSelectMode((v) => !v)}
                aria-pressed={selectMode}
                aria-label={selectMode ? 'Salir de selección' : 'Seleccionar empleados'}
                data-testid="action-select-mode"
                style={{
                  ...S.iconAction,
                  background: selectMode ? 'rgb(var(--color-accent-raw) / 0.1)' : 'transparent',
                  color: selectMode ? 'var(--color-accent)' : 'var(--color-muted)',
                  borderColor: selectMode ? 'rgb(var(--color-accent-raw) / 0.4)' : 'var(--color-hairline-soft)',
                }}
              >
                <Check size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>

              {/* Bulk menu */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
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
                  <MoreVertical size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>

                <DropdownMenu isOpen={bulkMenuOpen} onClose={() => setBulkMenuOpen(false)} label="Acciones masivas">
                  <MenuGroupLabel>Importar</MenuGroupLabel>
                  <MenuItem icon={Upload} onClick={() => { setBulkMenuOpen(false); setIsUploadModalOpen(true); }} testId="bulk-upload">Cargar colaboradores</MenuItem>
                  <MenuItem icon={RefreshCw} onClick={() => { setBulkMenuOpen(false); setIsTurnoUpdateModalOpen(true); }} testId="bulk-turno-update">Actualizar turnos</MenuItem>
                  <MenuItem icon={ImageIcon} onClick={() => { setBulkMenuOpen(false); setIsPhotoModalOpen(true); }} testId="bulk-photos">Cargar fotos</MenuItem>
                  <div style={S.dropdownDivider} aria-hidden="true" />
                  <MenuGroupLabel>Exportar</MenuGroupLabel>
                  <MenuItem icon={QrCode} onClick={() => { setBulkMenuOpen(false); setIsQrModalOpen(true); }} testId="bulk-qr">Generar QRs</MenuItem>
                  <MenuItem icon={Printer} onClick={() => { setBulkMenuOpen(false); navigate('/empresa/imprimir-qr'); }} testId="bulk-print-qr">Imprimir</MenuItem>
                  <MenuItem icon={FileSpreadsheet} onClick={() => { setBulkMenuOpen(false); handleExportCsv(); }} testId="bulk-export-csv">
                    Exportar CSV
                  </MenuItem>
                </DropdownMenu>
              </div>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }}
                aria-label="Añadir empleado"
                data-testid="action-add"
                style={S.addBtn}
              >
                <UserPlus size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>Añadir</span>
              </motion.button>
            </div>
          </div>

          {/* Search */}
          <label style={S.searchWrap}>
            <Search size={15} strokeWidth={1.75} style={S.searchIcon} aria-hidden="true" />
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
                <XIcon size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </label>

          {/* Selection bar */}
          {selectMode && selectedIds.size > 0 && (
            <div style={S.selectionBar} role="region" aria-label="Acciones de selección">
              <span style={S.selectionCount}>{plural(selectedIds.size, 'seleccionado')}</span>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <button type="button" onClick={handleExportCsv} style={S.selectionBtn} data-testid="sel-export">
                  <Download size={14} strokeWidth={1.75} aria-hidden="true" /> Exportar
                </button>
                <button type="button" onClick={handleBulkDelete} style={{ ...S.selectionBtn, color: 'var(--color-semantic-error)' }} data-testid="sel-delete">
                  <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Eliminar
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Grid */}
        <div style={S.grid} role="list" aria-label="Lista de empleados">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          ) : currentEmployees.length === 0 ? (
            <EmptyState hasQuery={deferredQuery.length > 0} />
          ) : (
            <AnimatePresence mode="popLayout">
              {currentEmployees.map((emp, i) => {
                const { apellidos, nombres } = splitName(emp.nombre);
                const isSelected = selectedIds.has(emp.id);
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
                    style={{ ...S.card, borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-hairline-soft)' }}
                  >
                    {selectMode && (
                      <button
                        type="button"
                        onClick={() => toggleSelect(emp.id)}
                        aria-pressed={isSelected}
                        aria-label={isSelected ? 'Deseleccionar' : 'Seleccionar'}
                        data-testid={`empresa-select-${emp.numero_empleado || emp.id}`}
                        style={{
                          ...S.checkbox,
                          background: isSelected ? 'var(--color-accent)' : 'transparent',
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-hairline-strong)',
                          color: isSelected ? 'var(--color-on-primary)' : 'transparent',
                        }}
                      >
                        <Check size={12} strokeWidth={3} aria-hidden="true" />
                      </button>
                    )}

                    <Avatar nombre={emp.nombre || ''} photoUrl={emp.foto_url} />

                    <div style={S.cardBody} title={emp.nombre}>
                      {apellidos && <h3 style={S.cardLastName}>{apellidos}</h3>}
                      {nombres && <p style={S.cardFirstName}>{nombres}</p>}
                      <p style={S.cardNum}>#{emp.numero_empleado}</p>
                    </div>

                    {!selectMode && (
                      <div className="vp-emp-actions" style={S.actionsWrap}>
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === emp.id ? null : emp.id)}
                          aria-label={`Opciones de ${emp.nombre}`}
                          aria-haspopup="menu"
                          aria-expanded={openDropdownId === emp.id}
                          data-testid={`empresa-card-menu-${emp.numero_empleado || emp.id}`}
                          style={{
                            ...S.moreBtn,
                            background: openDropdownId === emp.id ? 'var(--color-canvas-soft)' : 'transparent',
                          }}
                        >
                          <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
                        </button>

                        <DropdownMenu
                          isOpen={openDropdownId === emp.id}
                          onClose={() => setOpenDropdownId(null)}
                          label={`Opciones de ${emp.nombre}`}
                        >
                          <MenuItem
                            icon={Copy}
                            onClick={() => { setOpenDropdownId(null); handleCopyNumero(emp); }}
                            testId="card-action-copy"
                          >Copiar número</MenuItem>
                          {emp.qr_code && (
                            <MenuItem
                              icon={QrCode}
                              onClick={() => { setOpenDropdownId(null); setPreviewEmp(emp); }}
                              testId="card-action-view-qr"
                            >Ver QR</MenuItem>
                          )}
                          <div style={S.dropdownDivider} aria-hidden="true" />
                          <MenuItem
                            icon={Edit2}
                            onClick={() => { setOpenDropdownId(null); setEditingEmployee(emp); setIsModalOpen(true); }}
                            testId="card-action-edit"
                          >Editar datos</MenuItem>
                          <MenuItem
                            icon={Unlock}
                            onClick={() => { setOpenDropdownId(null); handleResetNip(emp); }}
                            testId="card-action-reset-nip"
                          >Resetear NIP</MenuItem>
                          {emp.webauthn_enrolled_at && (
                            <MenuItem
                              icon={Fingerprint}
                              onClick={() => { setOpenDropdownId(null); handleResetBio(emp); }}
                              testId="card-action-reset-bio"
                            >Borrar biometría</MenuItem>
                          )}
                          <div style={S.dropdownDivider} aria-hidden="true" />
                          <MenuItem
                            icon={Trash2}
                            danger
                            onClick={() => { setOpenDropdownId(null); handleDelete(emp); }}
                            testId="card-action-delete"
                          >Eliminar</MenuItem>
                        </DropdownMenu>
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <nav aria-label="Paginación" style={S.pagination}>
            <span style={S.pagInfo} data-testid="pagination-info">
              {plural(filteredEmployees.length, 'resultado')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1} aria-label="Página anterior"
                data-testid="pagination-prev"
                style={{ ...S.pagBtn, opacity: currentPage === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={15} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <span style={S.pagInfo}>{currentPage} / {totalPages}</span>
              <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages} aria-label="Página siguiente"
                data-testid="pagination-next"
                style={{ ...S.pagBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* Modales */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEmployee(null); }}
             title={editingEmployee ? 'Editar empleado' : 'Nuevo empleado'} testId="modal-employee">
        <EmployeeWizard
          initialData={editingEmployee}
          onSave={handleSaveEmployee}
          onCancel={() => { setIsModalOpen(false); setEditingEmployee(null); }}
        />
      </Modal>

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Cargar colaboradores" testId="modal-upload">
        <JsonUploadModal mode="full" onConfirm={handleUploadConfirm} onCancel={() => setIsUploadModalOpen(false)} />
      </Modal>

      <Modal isOpen={isTurnoUpdateModalOpen} onClose={() => setIsTurnoUpdateModalOpen(false)} title="Actualizar turnos" testId="modal-turno-update">
        <JsonUploadModal mode="turnos" onConfirm={handleTurnoUpdateConfirm} onCancel={() => setIsTurnoUpdateModalOpen(false)} />
      </Modal>

      <Modal isOpen={isPhotoModalOpen} onClose={() => setIsPhotoModalOpen(false)} title="Carga de fotos" size="lg" testId="modal-photos">
        <PhotoUploadModal onCancel={() => setIsPhotoModalOpen(false)} onComplete={() => { setIsPhotoModalOpen(false); fetchEmployees(); }} />
      </Modal>

      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Generar QRs" testId="modal-qr">
        <QrGenerateModal onCancel={() => setIsQrModalOpen(false)} onComplete={() => { setIsQrModalOpen(false); fetchEmployees(); }} />
      </Modal>

      <Modal isOpen={!!previewEmp} onClose={() => setPreviewEmp(null)} title={previewEmp ? `QR · ${previewEmp.nombre}` : 'QR'} size="sm" testId="modal-qr-preview">
        {previewEmp && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-base)' }}>
            <img
              src={previewEmp.qr_code}
              alt={`Código QR de ${previewEmp.nombre}`}
              data-testid="qr-preview-img"
              style={{ width: '100%', maxWidth: '16rem', height: 'auto', aspectRatio: '1 / 1', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline-soft)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', width: '100%' }}>
              <button type="button" onClick={() => handleDownloadQr(previewEmp)}
                data-testid="qr-preview-download" style={S.qrActionBtn}>
                <Download size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>Descargar</span>
              </button>
              <button type="button" onClick={() => handleCopyNumero(previewEmp)}
                data-testid="qr-preview-copy" style={S.qrActionBtn}>
                <Copy size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>Copiar número</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
      />
    </>
  );
};

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xxl)' },

  headerBlock: { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' },
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: 'var(--spacing-base)',
  },
  h1: {
    margin: 0, fontFamily: 'var(--font-display)',
    fontSize: 'clamp(var(--typography-title-md-size), 4vw, var(--typography-display-sm-size))',
    fontWeight: 'var(--typography-title-md-weight)',
    color: 'var(--color-ink)', lineHeight: 1.15, letterSpacing: '-0.02em',
  },
  h1Sub: {
    margin: 'var(--spacing-xxs) 0 0', fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)', color: 'var(--color-muted)',
    lineHeight: 'var(--typography-caption-lh)',
  },
  headerActions: { display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' },
  iconAction: {
    width: '2.75rem', height: '2.75rem',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'transparent', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-muted)',
    transition: 'color 120ms ease, border-color 120ms ease, background 120ms ease',
    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },
  addBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)',
    minHeight: '2.75rem', padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid rgb(var(--color-accent-raw) / 0.4)',
    background: 'rgb(var(--color-accent-raw) / 0.08)',
    cursor: 'pointer', color: 'var(--color-accent)',
    fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },

  searchWrap: { position: 'relative', display: 'block', maxWidth: '28rem', width: '100%' },
  searchIcon: {
    position: 'absolute', left: 'var(--spacing-sm)', top: '50%',
    transform: 'translateY(-50%)', color: 'var(--color-muted-soft)', pointerEvents: 'none',
  },
  searchInput: {
    width: '100%', minHeight: '2.75rem',
    paddingLeft: '2.25rem', paddingRight: '2.5rem',
    fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)',
    color: 'var(--color-ink)',
    background: 'var(--color-canvas-soft)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)', outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 120ms ease, background 120ms ease',
  },
  searchClear: {
    position: 'absolute', right: 'var(--spacing-xs)', top: '50%',
    transform: 'translateY(-50%)',
    width: '1.75rem', height: '1.75rem', borderRadius: '50%',
    border: 'none', background: 'var(--color-hairline-soft)',
    color: 'var(--color-muted)', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },

  selectionBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 'var(--spacing-xs) var(--spacing-base)',
    background: 'rgb(var(--color-accent-raw) / 0.08)',
    border: '1px solid rgb(var(--color-accent-raw) / 0.25)',
    borderRadius: 'var(--rounded-md)',
    gap: 'var(--spacing-sm)', flexWrap: 'wrap',
  },
  selectionCount: {
    fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 600, color: 'var(--color-accent)',
  },
  selectionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xxs)',
    minHeight: '2.25rem', padding: '0 var(--spacing-sm)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline)',
    background: 'var(--color-surface-card)',
    color: 'var(--color-ink)', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)',
    fontWeight: 500,
  },

  grid: {
    display: 'grid', gap: 'var(--spacing-sm)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 16rem), 1fr))',
  },

  card: {
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
    position: 'relative', background: 'var(--color-surface-card)',
    minHeight: '4rem', transition: 'border-color 160ms ease',
  },
  checkbox: {
    width: '1.25rem', height: '1.25rem', borderRadius: 'var(--rounded-sm)',
    border: '2px solid var(--color-hairline-strong)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
    transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
    padding: 0,
  },
  cardBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  cardLastName: {
    margin: 0, fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)', color: 'var(--color-ink)',
    textTransform: 'uppercase', letterSpacing: '0.01em',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
  },
  cardFirstName: {
    margin: 0, fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)', fontWeight: 'normal',
    color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.01em',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
  },
  cardNum: {
    margin: 0, fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-size)', color: 'var(--color-muted)',
    fontVariantNumeric: 'tabular-nums', letterSpacing: '0.03em',
  },

  actionsWrap: { position: 'relative', flexShrink: 0 },
  moreBtn: {
    width: '2.25rem', height: '2.25rem', borderRadius: 'var(--rounded-md)',
    border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-muted)', transition: 'background 120ms ease',
    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },
  menuOverlay: { position: 'fixed', inset: 0, zIndex: 9 },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + var(--spacing-xxs))',
    zIndex: 10,
    background: 'var(--color-surface-card)',
    border: '1px solid var(--color-hairline-soft)',
    borderRadius: 'var(--rounded-md)',
    padding: 'var(--spacing-xxs)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
    display: 'flex', flexDirection: 'column',
    width: 'max-content',
    minWidth: '12rem',
    maxWidth: '90vw',
  },
  dropdownDivider: { height: '1px', background: 'var(--color-hairline-soft)', margin: 'var(--spacing-xxs) 0' },
  menuGroupLabel: {
    margin: 'var(--spacing-xxs) var(--spacing-sm) var(--spacing-xxs)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-caption-uppercase-size)',
    fontWeight: 'var(--typography-caption-uppercase-weight)',
    letterSpacing: 'var(--typography-caption-uppercase-ls)',
    textTransform: 'uppercase',
    color: 'var(--color-muted-soft)',
  },

  qrActionBtn: {
    flex: 1, minHeight: '2.75rem',
    padding: '0 var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline)',
    background: 'var(--color-canvas-soft)',
    color: 'var(--color-ink)', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    fontFamily: 'var(--font-body)', fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 500,
    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },

  empty: {
    gridColumn: '1 / -1',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xxl) var(--spacing-lg)', textAlign: 'center',
  },
  emptyIcon: {
    width: '3rem', height: '3rem', borderRadius: '50%',
    background: 'rgb(var(--color-accent-raw) / 0.08)',
    color: 'var(--color-accent)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 'var(--spacing-xxs)',
  },
  emptyTitle: {
    margin: 0, fontFamily: 'var(--font-body)',
    fontSize: 'var(--typography-body-sm-size)',
    fontWeight: 'var(--typography-title-sm-weight)', color: 'var(--color-ink)',
  },
  emptySub: {
    margin: 0, maxWidth: '16rem',
    fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)', lineHeight: 'var(--typography-caption-lh)',
  },

  skeletonCard: {
    padding: 'var(--spacing-sm) var(--spacing-base)',
    borderRadius: 'var(--rounded-md)',
    border: '1px solid var(--color-hairline-soft)',
    display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
    animation: 'vp-emp-pulse 1.4s ease-in-out infinite',
    minHeight: '4rem',
  },

  pagination: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 'var(--spacing-sm)',
    borderTop: '1px solid var(--color-hairline-soft)',
    gap: 'var(--spacing-sm)', flexWrap: 'wrap',
  },
  pagInfo: {
    fontFamily: 'var(--font-body)', fontSize: 'var(--typography-caption-size)',
    color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums',
  },
  pagBtn: {
    width: '2.5rem', height: '2.5rem',
    borderRadius: 'var(--rounded-sm)',
    border: '1px solid var(--color-hairline-soft)',
    background: 'transparent', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-muted)',
    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },
};
