import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Users, Edit2, Trash2, Shield, Truck } from 'lucide-react';
import { notify } from '../lib/notify';
import { adminUsersApi } from '../lib/adminApi';
import { APP_ROUTES } from '../lib/choferConfig';
import AvatarComponent from 'boring-avatars';

/* ─── Skeleton ────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="cfg-skeleton-card" aria-hidden="true">
    <div className="cfg-skeleton-line cfg-skeleton-line--avatar" />
    <div className="cfg-skeleton-body">
      <div className="cfg-skeleton-line cfg-skeleton-line--name" />
      <div className="cfg-skeleton-line cfg-skeleton-line--email" />
    </div>
    <div className="cfg-skeleton-line cfg-skeleton-line--badge" />
  </div>
);

/* ─── Avatar ──────────────────────────────────────────────── */
const Avatar = ({ name }) => (
  <div className="cfg-avatar" aria-hidden="true" style={{ background: 'transparent' }}>
    <AvatarComponent
      size={32}
      name={name || 'Unknown'}
      variant="beam"
      colors={['#0A0310', '#49007E', '#FF005B', '#FF7D10', '#FFB238']}
    />
  </div>
);

/* ─── Role badge ──────────────────────────────────────────── */
const RoleBadge = ({ role }) =>
  role === 'admin' ? (
    <span className="cfg-badge cfg-badge--admin">
      <Shield size={12} aria-hidden="true" />
      Admin
    </span>
  ) : (
    <span className="cfg-badge cfg-badge--chofer">
      <Truck size={12} aria-hidden="true" />
      Chofer
    </span>
  );

/* ─── Main component ──────────────────────────────────────── */
export const ConfiguracionAdmin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    role: 'chofer',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, user: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminUsersApi.listUsers();
      setUsers(data || []);
    } catch (err) {
      notify.error(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre || '',
        email: user.email || '',
        password: '',
        role: user.role || 'chofer',
      });
    } else {
      setEditingUser(null);
      setFormData({ nombre: '', email: '', password: '', role: 'chofer' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.nombre) {
      notify.error('Nombre y correo son requeridos');
      return;
    }
    if (!editingUser && !formData.password) {
      notify.error('La contraseña es requerida para nuevos usuarios');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await adminUsersApi.updateUser({
          id: editingUser.id,
          email: formData.email,
          ...(formData.password && { password: formData.password }),
          nombre: formData.nombre,
          role: formData.role,
        });
        notify.success('Usuario actualizado');
      } else {
        await adminUsersApi.createUser(formData);
        notify.success('Usuario creado');
      }
      handleCloseModal();
      fetchUsers();
    } catch (err) {
      notify.error(err.message || 'Error al guardar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (user) => {
    setConfirmDelete({ isOpen: true, user });
  };

  const confirmDeleteAction = async () => {
    const user = confirmDelete.user;
    setConfirmDelete({ isOpen: false, user: null });
    try {
      await adminUsersApi.deleteUser(user.id);
      notify.success('Usuario eliminado');
      fetchUsers();
    } catch (err) {
      notify.error(err.message || 'Error al eliminar usuario');
    }
  };

  return (
    <div className="cfg-page">
      <style>{CSS}</style>

      <main className="cfg-main">
        {/* ── Toolbar ── */}
        <div className="cfg-toolbar">
          <h1 className="cfg-page-title">
            <Users size={22} aria-hidden="true" />
            Gestión de Accesos
          </h1>
          <button className="cfg-btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
            <span>Nuevo usuario</span>
          </button>
        </div>

        {/* ── Table / Card list ── */}
        {loading ? (
          <div className="cfg-skeleton-list" aria-label="Cargando usuarios…" aria-busy="true">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : users.length === 0 ? (
          <div className="cfg-empty">
            <Users size={36} aria-hidden="true" />
            <p className="cfg-empty-title">Sin usuarios configurados</p>
            <p className="cfg-empty-sub">
              Agrega el primer usuario con el botón de arriba.
            </p>
          </div>
        ) : (
          <div className="cfg-table-shell">
            {/* Desktop header */}
            <div className="cfg-table-head" aria-hidden="true">
              <span>Nombre</span>
              <span>Correo electrónico</span>
              <span>Rol</span>
              <span className="cfg-col-actions">Acciones</span>
            </div>

            <ul className="cfg-table-body" role="list" aria-label="Lista de usuarios">
              {users.map((user) => (
                <li key={user.id} className="cfg-row">
                  {/* Nombre */}
                  <div className="cfg-cell cfg-cell--name">
                    <Avatar name={user.nombre} />
                    <span className="cfg-user-name">{user.nombre || 'Sin nombre'}</span>
                  </div>

                  {/* Correo */}
                  <div className="cfg-cell cfg-cell--email" data-label="Correo">
                    {user.email}
                  </div>

                  {/* Rol */}
                  <div className="cfg-cell cfg-cell--role" data-label="Rol">
                    <RoleBadge role={user.role} />
                  </div>

                  {/* Acciones */}
                  <div className="cfg-cell cfg-cell--actions">
                    <button
                      className="cfg-icon-btn"
                      onClick={() => handleOpenModal(user)}
                      aria-label={`Editar a ${user.nombre}`}
                      title="Editar"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="cfg-icon-btn cfg-icon-btn--danger"
                      onClick={() => handleDeleteClick(user)}
                      aria-label={`Eliminar a ${user.nombre}`}
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* ── Modal crear / editar ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
      >
        <form onSubmit={handleSubmit} className="cfg-form" noValidate>
          <div className="cfg-field">
            <label className="cfg-label" htmlFor="cfg-nombre">
              Nombre completo
            </label>
            <input
              id="cfg-nombre"
              className="cfg-input"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Juan Pérez"
              autoComplete="name"
              autoFocus
              required
            />
          </div>

          <div className="cfg-field">
            <label className="cfg-label" htmlFor="cfg-email">
              Correo electrónico
            </label>
            <input
              id="cfg-email"
              className="cfg-input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@empresa.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="cfg-field">
            <label className="cfg-label" htmlFor="cfg-password">
              {editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            </label>
            <input
              id="cfg-password"
              className="cfg-input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={
                editingUser ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'
              }
              autoComplete={editingUser ? 'new-password' : 'new-password'}
              minLength={6}
              {...(!editingUser && { required: true })}
            />
          </div>

          <div className="cfg-field">
            <label className="cfg-label" htmlFor="cfg-role">
              Rol de acceso
            </label>
            <select
              id="cfg-role"
              className="cfg-input cfg-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="chofer">Chofer</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="cfg-modal-actions">
            <button type="button" className="cfg-btn-ghost" onClick={handleCloseModal}>
              Cancelar
            </button>
            <button type="submit" className="cfg-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirmar eliminación ── */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Eliminar usuario"
        message={`¿Eliminar a ${confirmDelete.user?.nombre}? Esta acción no se puede deshacer y el usuario perderá su acceso inmediatamente.`}
        confirmText="Eliminar"
        isDestructive
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, user: null })}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCOPED CSS — 100 % design-system tokens, zero hardcoded values
   Mobile-first: card list por defecto → tabla en ≥ 768 px
   ═══════════════════════════════════════════════════════════ */
const CSS = /* css */ `

/* ── Page shell ───────────────────────────────────────────── */
.cfg-page {
  min-height: 100dvh;
  background: var(--color-canvas);
  padding-bottom: var(--spacing-section);
}

.cfg-main {
  max-width: 75rem;
  margin-inline: auto;
  padding: var(--spacing-xl) var(--spacing-base);
}

/* ── Toolbar ──────────────────────────────────────────────── */
.cfg-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-base);
  margin-bottom: var(--spacing-lg);
}

.cfg-page-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--typography-heading-2-size);
  font-weight: var(--typography-heading-2-weight);
  line-height: var(--typography-heading-2-lh);
  letter-spacing: var(--typography-heading-2-ls);
  color: var(--color-ink);
  margin: 0;
}

.cfg-page-title svg {
  color: var(--color-primary);
  flex-shrink: 0;
}

/* ── Buttons ──────────────────────────────────────────────── */
.cfg-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-family: var(--font-body);
  font-size: var(--typography-button-size);
  font-weight: var(--typography-button-weight);
  line-height: var(--typography-button-lh);
  height: var(--button-height-lg);
  padding-inline: var(--spacing-lg);
  border: none;
  border-radius: var(--rounded-lg);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 120ms ease, transform 80ms ease, opacity 120ms ease;
}
.cfg-btn-primary:hover  { background: var(--color-primary-active); }
.cfg-btn-primary:active { transform: scale(0.97); }
.cfg-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.cfg-btn-ghost {
  display: inline-flex;
  align-items: center;
  background: transparent;
  color: var(--color-ink-muted);
  font-family: var(--font-body);
  font-size: var(--typography-button-size);
  font-weight: var(--typography-button-weight);
  height: var(--button-height-lg);
  padding-inline: var(--spacing-base);
  border: none;
  border-radius: var(--rounded-lg);
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
}
.cfg-btn-ghost:hover { color: var(--color-ink); background: var(--color-hairline-soft); }

/* ── Icon action buttons ──────────────────────────────────── */
.cfg-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.125rem;
  height: 2.125rem;
  border: none;
  border-radius: var(--rounded-md);
  background: transparent;
  color: var(--color-ink-muted);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.cfg-icon-btn:hover {
  background: var(--color-hairline-soft);
  color: var(--color-ink);
}
.cfg-icon-btn--danger:hover {
  background: rgb(var(--color-semantic-error-raw) / 0.08);
  color: var(--color-semantic-error);
}
.cfg-icon-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ── Role badges ──────────────────────────────────────────── */
.cfg-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: var(--rounded-pill);
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  font-weight: var(--typography-eyebrow-weight);
  line-height: var(--typography-eyebrow-lh);
  letter-spacing: var(--typography-eyebrow-ls);
  text-transform: uppercase;
  white-space: nowrap;
}
.cfg-badge--admin {
  background: rgb(var(--color-semantic-error-raw) / 0.08);
  color: var(--color-semantic-error);
}
.cfg-badge--chofer {
  background: rgb(var(--color-primary-raw) / 0.1);
  color: var(--color-primary);
}

/* ── Avatar ───────────────────────────────────────────────── */
.cfg-avatar {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: var(--rounded-full);
  background: rgb(var(--color-primary-raw) / 0.1);
  color: var(--color-primary);
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0;
}

/* ═══════════════════════════════════════════════════════════
   TABLE — Mobile: stack cards / Desktop: real table grid
   ═══════════════════════════════════════════════════════════ */

/* Shared shell */
.cfg-table-shell {
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--rounded-xl);
  overflow: hidden;
}

/* Desktop-only header row */
.cfg-table-head {
  display: none;
}

/* Row = card on mobile */
.cfg-table-body {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cfg-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-base);
  border-bottom: 1px solid var(--color-hairline-soft);
  transition: background 120ms ease;
}
.cfg-row:last-child { border-bottom: none; }
.cfg-row:hover { background: rgb(var(--color-canvas-raw) / 0.6); }

/* Cells */
.cfg-cell {
  display: flex;
  align-items: center;
}

/* Mobile: label prefix via data-label */
.cfg-cell--email::before,
.cfg-cell--role::before {
  content: attr(data-label);
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  font-weight: var(--typography-eyebrow-weight);
  line-height: var(--typography-eyebrow-lh);
  letter-spacing: var(--typography-eyebrow-ls);
  text-transform: uppercase;
  color: var(--color-ink-faint);
  margin-right: var(--spacing-sm);
  min-width: 4.5rem;
}

.cfg-cell--name {
  gap: var(--spacing-sm);
  font-weight: 500;
  font-size: var(--typography-body-md-size);
  color: var(--color-ink);
}

.cfg-cell--email {
  font-size: var(--typography-body-sm-size);
  color: var(--color-ink-muted);
}

.cfg-cell--actions {
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-hairline-soft);
  justify-content: flex-end;
}

/* ── Mobile cards (< 768 px) ─────────────────────────────── */
@media (max-width: 47.99rem) {
  .cfg-table-shell {
    background: transparent;
    border: none;
    border-radius: 0;
    overflow: visible;
  }
  .cfg-row {
    background: var(--color-surface-card, #fff);
    border: 1px solid var(--color-hairline-soft);
    border-radius: var(--rounded-xl);
    margin-bottom: var(--spacing-base, 1rem);
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }
  .cfg-row:last-child {
    margin-bottom: 0;
  }
}

/* ── Desktop table (≥ 768 px) ─────────────────────────────── */
@media (min-width: 48rem) {
  .cfg-table-head {
    display: grid;
    grid-template-columns: 1fr 1.6fr 0.8fr 5.5rem;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-base);
    border-bottom: 2px solid var(--color-hairline-soft);
    background: var(--color-canvas);
    font-family: var(--font-body);
    font-size: var(--typography-eyebrow-size);
    font-weight: var(--typography-eyebrow-weight);
    line-height: var(--typography-eyebrow-lh);
    letter-spacing: var(--typography-eyebrow-ls);
    text-transform: uppercase;
    color: var(--color-ink-muted);
  }
  .cfg-col-actions { text-align: right; }

  .cfg-row {
    display: grid;
    grid-template-columns: 1fr 1.6fr 0.8fr 5.5rem;
    align-items: center;
    flex-direction: unset;
    gap: 0;
    padding: 0.875rem var(--spacing-base);
  }

  /* Hide pseudo-element labels on desktop */
  .cfg-cell--email::before,
  .cfg-cell--role::before { display: none; }

  .cfg-cell--email {
    font-size: var(--typography-body-md-size);
    color: var(--color-ink-secondary);
  }

  .cfg-cell--actions {
    justify-content: flex-end;
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }
}

/* ── Empty state ──────────────────────────────────────────── */
.cfg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-section) var(--spacing-base);
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--rounded-xl);
  color: var(--color-ink-faint);
  text-align: center;
}
.cfg-empty svg { opacity: 0.35; }
.cfg-empty-title {
  font-size: var(--typography-title-size);
  font-weight: var(--typography-title-weight);
  color: var(--color-ink-muted);
  margin: 0;
}
.cfg-empty-sub {
  font-size: var(--typography-body-sm-size);
  color: var(--color-ink-faint);
  margin: 0;
}

/* ── Skeleton ─────────────────────────────────────────────── */
.cfg-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.cfg-skeleton-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-base);
  padding: var(--spacing-base);
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--rounded-xl);
  animation: cfg-pulse 1.4s ease-in-out infinite;
}

.cfg-skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.cfg-skeleton-line {
  border-radius: var(--rounded-xs);
  background: var(--color-hairline-soft);
}
.cfg-skeleton-line--avatar  { width: 2rem; height: 2rem; border-radius: var(--rounded-full); flex-shrink: 0; }
.cfg-skeleton-line--name    { height: 0.875rem; width: 40%; }
.cfg-skeleton-line--email   { height: 0.75rem; width: 65%; }
.cfg-skeleton-line--badge   { height: 1.25rem; width: 3.5rem; border-radius: var(--rounded-pill); margin-left: auto; }

@keyframes cfg-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}

/* ── Form (inside Modal) ──────────────────────────────────── */
.cfg-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-sm);
}

.cfg-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}

.cfg-label {
  font-family: var(--font-body);
  font-size: var(--typography-caption-size);
  font-weight: 600;
  color: var(--color-ink);
  line-height: var(--typography-caption-lh);
}

.cfg-input {
  box-sizing: border-box;
  width: 100%;
  font-family: var(--font-body);
  font-size: var(--typography-body-md-size);
  color: var(--color-ink);
  background: var(--color-canvas-soft);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-md);
  height: var(--input-height-lg);
  padding-inline: var(--spacing-base);
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
  -webkit-appearance: none;
  appearance: none;
}
.cfg-input::placeholder { color: var(--color-ink-faint); }
.cfg-input:hover  { border-color: var(--color-hairline-strong); }
.cfg-input:focus  {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(var(--color-primary-raw) / 0.12);
}

/* Native select arrow */
.cfg-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23615d59' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-base) center;
  padding-right: calc(var(--spacing-base) * 2.5);
  cursor: pointer;
}

/* ── Modal actions ────────────────────────────────────────── */
.cfg-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-xs);
}

/* ── Responsive tweaks ────────────────────────────────────── */
@media (max-width: 37.5rem) {
  .cfg-modal-actions {
    flex-direction: column-reverse;
  }
  .cfg-modal-actions .cfg-btn-primary,
  .cfg-modal-actions .cfg-btn-ghost {
    width: 100%;
    justify-content: center;
  }
}

/* ── Reduced motion ───────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .cfg-skeleton-card  { animation: none; opacity: 0.7; }
  .cfg-btn-primary,
  .cfg-btn-ghost,
  .cfg-icon-btn,
  .cfg-input,
  .cfg-row            { transition: none; }
}
`;
