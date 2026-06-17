import React from 'react';
import AvatarComponent from 'boring-avatars';
import { Shield, Truck, Edit2, Trash2 } from 'lucide-react';
import { IconButton } from './IconButton';

/* ─── Avatar ──────────────────────────────────────────────── */
const Avatar = ({ name, size = 36 }) => (
  <div
    className="vp-user-card__avatar"
    aria-hidden="true"
    style={{ width: `${size}px`, height: `${size}px` }}
  >
    <AvatarComponent
      size={size}
      name={name || 'Unknown'}
      variant="beam"
      colors={['#0A0310', '#49007E', '#FF005B', '#FF7D10', '#FFB238']}
    />
  </div>
);

/* ─── Role badge ──────────────────────────────────────────── */
const RoleBadge = ({ role }) => {
  const isAdmin = role === 'admin';
  const Icon = isAdmin ? Shield : Truck;
  return (
    <span className={`vp-user-card__badge ${isAdmin ? 'is-admin' : 'is-chofer'}`}>
      <Icon size={12} aria-hidden="true" strokeWidth={2.25} />
      {isAdmin ? 'Admin' : 'Chofer'}
    </span>
  );
};

/**
 * UserCard — card minimalista con info de usuario y acciones.
 *
 * Props
 *  - user: { id, nombre, email, role }
 *  - onEdit(user)
 *  - onDelete(user)
 *  - testId
 */
export const UserCard = ({ user, onEdit, onDelete, testId }) => {
  const name = user.nombre || 'Sin nombre';
  return (
    <article
      className="vp-user-card"
      data-testid={testId || `user-card-${user.id}`}
      aria-label={`Usuario ${name}`}
    >
      <style>{CSS}</style>

      <div className="vp-user-card__main">
        <Avatar name={name} />
        <div className="vp-user-card__info">
          <h3 className="vp-user-card__name" title={name}>{name}</h3>
          <p className="vp-user-card__email" title={user.email}>{user.email}</p>
        </div>
        <div className="vp-user-card__role">
          <RoleBadge role={user.role} />
        </div>
      </div>

      <div className="vp-user-card__actions" role="group" aria-label="Acciones del usuario">
        <IconButton
          icon={<Edit2 size={15} strokeWidth={2} />}
          label={`Editar a ${name}`}
          onClick={() => onEdit?.(user)}
          testId={`user-card-edit-${user.id}`}
        />
        <IconButton
          icon={<Trash2 size={15} strokeWidth={2} />}
          label={`Eliminar a ${name}`}
          variant="danger"
          onClick={() => onDelete?.(user)}
          testId={`user-card-delete-${user.id}`}
        />
      </div>
    </article>
  );
};

/* ── Scoped styles ────────────────────────────────────────── */
const CSS = /* css */ `
.vp-user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-base);
  padding: var(--spacing-base) var(--spacing-lg);
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--rounded-lg);
  transition: border-color 120ms ease, background-color 120ms ease;
}
.vp-user-card:hover {
  border-color: var(--color-hairline);
  background: rgb(var(--color-canvas-raw) / 0.5);
}

.vp-user-card__main {
  display: flex;
  align-items: center;
  gap: var(--spacing-base);
  min-width: 0;
  flex: 1;
}

.vp-user-card__avatar {
  border-radius: var(--rounded-full);
  overflow: hidden;
  flex-shrink: 0;
}

.vp-user-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
  min-width: 0;
  flex: 1;
}

.vp-user-card__name {
  font-family: var(--font-display);
  font-size: var(--typography-body-md-size);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: var(--ls-tight-3);
  color: var(--color-ink);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-user-card__email {
  font-family: var(--font-body);
  font-size: var(--typography-body-sm-size);
  font-weight: var(--typography-body-sm-weight);
  line-height: var(--typography-body-sm-lh);
  color: var(--color-ink-muted);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vp-user-card__role { flex-shrink: 0; }

.vp-user-card__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xxs);
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
.vp-user-card__badge.is-admin {
  background: rgb(var(--color-semantic-error-raw) / 0.08);
  color: var(--color-semantic-error);
}
.vp-user-card__badge.is-chofer {
  background: rgb(var(--color-primary-raw) / 0.1);
  color: var(--color-primary);
}

.vp-user-card__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xxs);
  flex-shrink: 0;
}

/* Mobile (< 640 px): apila info + acciones */
@media (max-width: 39.99rem) {
  .vp-user-card {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
    padding: var(--spacing-base);
  }
  .vp-user-card__main {
    align-items: flex-start;
  }
  .vp-user-card__role {
    align-self: flex-start;
  }
  .vp-user-card__actions {
    justify-content: flex-end;
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--color-hairline-soft);
  }
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce) {
  .vp-user-card { transition: none; }
}
`;
