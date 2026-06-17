import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SectionHeader } from '../components/SectionHeader';
import { UserCard } from '../components/UserCard';
import { Plus, Users } from 'lucide-react';
import { notify } from '../lib/notify';
import { adminUsersApi } from '../lib/adminApi';

/* ─── Skeleton ────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="cfg-skel" aria-hidden="true">
    <div className="cfg-skel__avatar" />
    <div className="cfg-skel__body">
      <div className="cfg-skel__line cfg-skel__line--lg" />
      <div className="cfg-skel__line cfg-skel__line--sm" />
    </div>
    <div className="cfg-skel__badge" />
  </div>
);

/* ─── Empty State ─────────────────────────────────────────── */
const EmptyState = ({ onCreate }) => (
  <div className="cfg-empty" role="status">
    <div className="cfg-empty__icon" aria-hidden="true">
      <Users size={28} strokeWidth={1.5} />
    </div>
    <h2 className="cfg-empty__title">Aún no hay accesos configurados</h2>
    <p className="cfg-empty__sub">
      Crea el primer usuario para habilitar el acceso al portal.
    </p>
    <button
      type="button"
      className="cfg-btn cfg-btn--primary"
      onClick={onCreate}
      data-testid="empty-create-user-btn"
    >
      <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
      <span>Crear primer usuario</span>
    </button>
  </div>
);

/* ─── Main page ───────────────────────────────────────────── */
export const ConfiguracionAdmin = () => {
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

  const totalLabel = users.length === 1 ? '1 usuario' : `${users.length} usuarios`;

  return (
    <div className="cfg-page" data-testid="configuracion-admin-page">
      <style>{CSS}</style>

      <SectionHeader
        eyebrow="Configuración"
        title="Gestión de accesos"
        description="Administra quién puede ingresar al portal y con qué rol."
        testId="cfg-section-header"
        action={
          !loading && users.length > 0 ? (
            <button
              type="button"
              className="cfg-btn cfg-btn--primary"
              onClick={() => handleOpenModal()}
              data-testid="create-user-btn"
            >
              <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
              <span>Nuevo usuario</span>
            </button>
          ) : null
        }
      />

      <section aria-label="Lista de usuarios" className="cfg-section">
        {!loading && users.length > 0 && (
          <p className="cfg-count" aria-live="polite">{totalLabel}</p>
        )}

        {loading ? (
          <div className="cfg-list" aria-busy="true" aria-label="Cargando usuarios">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : users.length === 0 ? (
          <EmptyState onCreate={() => handleOpenModal()} />
        ) : (
          <ul className="cfg-list" role="list">
            {users.map((user) => (
              <li key={user.id}>
                <UserCard
                  user={user}
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteClick}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Modal crear / editar ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
        testId="user-form-modal"
      >
        <form onSubmit={handleSubmit} className="cfg-form" noValidate>
          <div className="cfg-field">
            <label className="cfg-label" htmlFor="cfg-nombre">Nombre completo</label>
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
              data-testid="user-form-nombre"
            />
          </div>

          <div className="cfg-field">
            <label className="cfg-label" htmlFor="cfg-email">Correo electrónico</label>
            <input
              id="cfg-email"
              className="cfg-input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@empresa.com"
              autoComplete="email"
              required
              data-testid="user-form-email"
            />
          </div>

          <div className="cfg-field">
            <label className="cfg-label" htmlFor="cfg-password">
              {editingUser ? 'Nueva contraseña' : 'Contraseña'}
              {editingUser && <span className="cfg-label__hint"> · opcional</span>}
            </label>
            <input
              id="cfg-password"
              className="cfg-input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
              autoComplete="new-password"
              minLength={6}
              {...(!editingUser && { required: true })}
              data-testid="user-form-password"
            />
          </div>

          <div className="cfg-field">
            <label className="cfg-label" htmlFor="cfg-role">Rol de acceso</label>
            <select
              id="cfg-role"
              className="cfg-input cfg-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              data-testid="user-form-role"
            >
              <option value="chofer">Chofer</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="cfg-modal-actions">
            <button
              type="button"
              className="cfg-btn cfg-btn--ghost"
              onClick={handleCloseModal}
              data-testid="user-form-cancel"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cfg-btn cfg-btn--solid"
              disabled={isSubmitting}
              data-testid="user-form-submit"
            >
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

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
   Scoped CSS — 100 % tokens del design system
   ═══════════════════════════════════════════════════════════ */
const CSS = /* css */ `
.cfg-page {
  width: 100%;
  max-width: 56rem;
  margin-inline: auto;
}

.cfg-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.cfg-count {
  font-family: var(--font-body);
  font-size: var(--typography-eyebrow-size);
  font-weight: var(--typography-eyebrow-weight);
  line-height: var(--typography-eyebrow-lh);
  letter-spacing: var(--typography-eyebrow-ls);
  text-transform: uppercase;
  color: var(--color-ink-faint);
  margin: 0 0 var(--spacing-xs);
}

/* ── List ───────────────────────────────────────────────── */
.cfg-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* ── Buttons (cohesivos con el resto del portal) ───────── */
.cfg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  font-family: var(--font-body);
  font-size: var(--typography-body-sm-size);
  font-weight: 600;
  line-height: var(--typography-button-lh);
  letter-spacing: var(--typography-button-ls);
  min-height: var(--button-height-lg);
  padding-inline: var(--spacing-base);
  border: 1px solid transparent;
  border-radius: var(--rounded-md);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 120ms ease, color 120ms ease, transform 80ms ease, border-color 120ms ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.cfg-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.cfg-btn:disabled { opacity: 0.55; cursor: not-allowed; pointer-events: none; }
.cfg-btn:active { transform: scale(0.97); }

/* Primary — soft tint (abre modales / añade)  */
.cfg-btn--primary {
  background: rgb(var(--color-primary-raw) / 0.08);
  color: var(--color-primary);
  border-color: rgb(var(--color-primary-raw) / 0.4);
}
.cfg-btn--primary:hover {
  background: rgb(var(--color-primary-raw) / 0.14);
  border-color: rgb(var(--color-primary-raw) / 0.55);
}

/* Solid primary — CTA final (guardar) */
.cfg-btn--solid {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}
.cfg-btn--solid:hover {
  background: var(--color-primary-active);
  border-color: var(--color-primary-active);
}

.cfg-btn--ghost {
  background: transparent;
  color: var(--color-ink-muted);
  border-color: var(--color-hairline);
}
.cfg-btn--ghost:hover {
  color: var(--color-ink);
  background: var(--color-hairline-soft);
}

/* ── Empty state ───────────────────────────────────────── */
.cfg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-section) var(--spacing-lg);
  background: var(--color-surface-card);
  border: 1px dashed var(--color-hairline);
  border-radius: var(--rounded-xl);
}
.cfg-empty__icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--rounded-full);
  background: var(--color-hairline-soft);
  color: var(--color-ink-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-xs);
}
.cfg-empty__title {
  font-family: var(--font-display);
  font-size: var(--typography-title-size);
  font-weight: var(--typography-title-weight);
  line-height: var(--typography-title-lh);
  letter-spacing: var(--typography-title-ls);
  color: var(--color-ink);
  margin: 0;
}
.cfg-empty__sub {
  font-family: var(--font-body);
  font-size: var(--typography-body-sm-size);
  color: var(--color-ink-muted);
  margin: 0 0 var(--spacing-sm);
  max-width: 36ch;
}

/* ── Skeleton ──────────────────────────────────────────── */
.cfg-skel {
  display: flex;
  align-items: center;
  gap: var(--spacing-base);
  padding: var(--spacing-base) var(--spacing-lg);
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--rounded-lg);
  animation: cfg-pulse 1.4s ease-in-out infinite;
}
.cfg-skel__avatar {
  width: 2.25rem; height: 2.25rem;
  border-radius: var(--rounded-full);
  background: var(--color-hairline-soft);
  flex-shrink: 0;
}
.cfg-skel__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}
.cfg-skel__line {
  border-radius: var(--rounded-xs);
  background: var(--color-hairline-soft);
}
.cfg-skel__line--lg { height: 0.875rem; width: 35%; }
.cfg-skel__line--sm { height: 0.75rem; width: 60%; }
.cfg-skel__badge {
  width: 4rem; height: 1.25rem;
  border-radius: var(--rounded-pill);
  background: var(--color-hairline-soft);
  flex-shrink: 0;
}
@keyframes cfg-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

/* ── Form ──────────────────────────────────────────────── */
.cfg-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-base);
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
.cfg-label__hint {
  font-weight: 400;
  color: var(--color-ink-faint);
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
.cfg-input:hover { border-color: var(--color-hairline-strong); }
.cfg-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(var(--color-primary-raw) / 0.12);
}
.cfg-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23615d59' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-base) center;
  padding-right: calc(var(--spacing-base) * 2.5);
  cursor: pointer;
}

.cfg-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-xs);
}

@media (max-width: 37.5rem) {
  .cfg-modal-actions { flex-direction: column-reverse; }
  .cfg-modal-actions .cfg-btn { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .cfg-skel { animation: none; opacity: 0.7; }
  .cfg-btn { transition: none; }
}
`;
