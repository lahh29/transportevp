import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Users, Edit2, Trash2, Shield, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { notify } from '../lib/notify';
import { adminUsersApi } from '../lib/adminApi';
import { APP_ROUTES } from '../lib/choferConfig';

const SkeletonRow = () => (
  <div style={S.skeletonRow} aria-hidden="true">
    <div style={{ height: '1.2rem', width: '25%', borderRadius: '4px', background: 'var(--color-hairline-soft)' }} />
    <div style={{ height: '1.2rem', width: '35%', borderRadius: '4px', background: 'var(--color-hairline-soft)' }} />
    <div style={{ height: '1.2rem', width: '15%', borderRadius: '4px', background: 'var(--color-hairline-soft)' }} />
  </div>
);

export const ConfiguracionAdmin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', role: 'chofer' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm delete state
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(APP_ROUTES.login);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ nombre: user.nombre || '', email: user.email || '', password: '', role: user.role || 'chofer' });
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
      notify.error("Nombre y correo son requeridos");
      return;
    }
    if (!editingUser && !formData.password) {
      notify.error("La contraseña es requerida para nuevos usuarios");
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
          role: formData.role
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
    setConfirmDelete({
      isOpen: true,
      user
    });
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
    <div style={S.page}>
      <style>{`
        .admin-table-container {
          background: var(--color-surface, #fff);
          border-radius: var(--rounded-xl, 1rem);
          border: 1px solid var(--color-hairline-soft);
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          overflow: hidden;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-table th {
          padding: 1rem;
          border-bottom: 2px solid var(--color-hairline-soft);
          color: var(--color-ink-muted);
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .admin-table td {
          padding: 1rem;
          color: var(--color-ink);
          font-size: 0.95rem;
          border-bottom: 1px solid var(--color-hairline-soft);
        }
        
        /* Mobile First: Card View */
        @media (max-width: 768px) {
          .admin-table-container {
            background: transparent;
            border: none;
            box-shadow: none;
            overflow: visible;
          }
          .admin-table thead {
            display: none;
          }
          .admin-table, .admin-table tbody, .admin-table tr, .admin-table td {
            display: block;
            width: 100%;
          }
          .admin-table tr {
            margin-bottom: 1rem;
            background: var(--color-surface, #fff);
            border: 1px solid var(--color-hairline-soft);
            border-radius: var(--rounded-lg, 0.75rem);
            padding: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          }
          .admin-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: none;
            text-align: right;
          }
          .admin-table td::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            color: var(--color-ink-muted);
            margin-right: 1rem;
          }
          .admin-table td[data-label="Nombre"] {
            justify-content: flex-start;
          }
          .admin-table td[data-label="Nombre"]::before {
            display: none;
          }
          .admin-table td[data-label="Acciones"] {
            justify-content: flex-end;
            margin-top: 0.5rem;
            padding-top: 1rem;
            border-top: 1px solid var(--color-hairline-soft);
          }
          .admin-table td[data-label="Acciones"]::before {
            display: none;
          }
        }
      `}</style>
      <main style={S.main}>
        <div style={S.toolbar}>
          <h1 style={S.title}><Users size={24} style={{ color: 'var(--color-primary)' }}/> Gestión de Accesos</h1>
          <button style={S.addBtn} onClick={() => handleOpenModal()}>
            <Plus size={18} strokeWidth={2.5} />
            <span>Nuevo Usuario</span>
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <tr><td colSpan="4"><SkeletonRow /></td></tr>
                  <tr><td colSpan="4"><SkeletonRow /></td></tr>
                  <tr><td colSpan="4"><SkeletonRow /></td></tr>
                </>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" style={S.emptyCell}>No hay usuarios configurados.</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td data-label="Nombre">
                      <div style={S.userCell}>
                        <div style={S.avatar}>{user.nombre?.charAt(0).toUpperCase() || '?'}</div>
                        <span style={S.userName}>{user.nombre || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td data-label="Correo">{user.email}</td>
                    <td data-label="Rol">
                      <span style={user.role === 'admin' ? S.badgeAdmin : S.badgeChofer}>
                        {user.role === 'admin' ? <Shield size={12} /> : <Truck size={12} />}
                        {user.role === 'admin' ? 'Admin' : 'Chofer'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div style={S.actionBtns}>
                        <button style={S.iconBtn} onClick={() => handleOpenModal(user)} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button style={{...S.iconBtn, color: 'var(--color-semantic-error)'}} onClick={() => handleDeleteClick(user)} title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal Crear/Editar */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}>
        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.formGroup}>
            <label style={S.label}>Nombre completo</label>
            <input 
              style={S.input} 
              type="text" 
              value={formData.nombre} 
              onChange={e => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej. Juan Pérez"
              autoFocus
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Correo Electrónico</label>
            <input 
              style={S.input} 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="usuario@vinoplastic.com"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>{editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
            <input 
              style={S.input} 
              type="password" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})}
              placeholder={editingUser ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
              minLength={6}
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Rol de Acceso</label>
            <select 
              style={S.input} 
              value={formData.role} 
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="chofer">Chofer</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div style={S.modalActions}>
            <button type="button" onClick={handleCloseModal} style={S.cancelBtn}>Cancelar</button>
            <button type="submit" disabled={isSubmitting} style={S.saveBtn}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialogo Confirmar Eliminar */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar a ${confirmDelete.user?.nombre}? Esta acción no se puede deshacer y el usuario perderá su acceso.`}
        confirmText="Eliminar"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, user: null })}
      />
    </div>
  );
};

const S = {
  page: { minHeight: '100dvh', background: 'var(--color-canvas)', paddingBottom: 'var(--spacing-xl)' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-xl) var(--spacing-base)' },
  headerBtn: {
    width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'transparent',
    border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', color: 'var(--color-ink-muted)'
  },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' },
  title: { display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-ink)' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary)',
    color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: 'var(--rounded-lg)',
    fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(9, 30, 66, 0.15)'
  },
  emptyCell: { padding: '3rem', textAlign: 'center', color: 'var(--color-muted)', fontStyle: 'italic' },
  userCell: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(9, 30, 66, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--color-primary)' },
  userName: { fontWeight: 500 },
  badgeAdmin: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(207,45,86,0.1)', color: 'var(--color-semantic-error)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 },
  badgeChofer: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(38,132,255,0.1)', color: '#2684FF', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 },
  actionBtns: { display: 'flex', gap: '0.5rem' },
  iconBtn: { background: 'transparent', border: 'none', padding: '0.5rem', cursor: 'pointer', borderRadius: '6px', color: 'var(--color-ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)' },
  input: { width: '100%', padding: '0.75rem', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline)', fontSize: '0.95rem', fontFamily: 'var(--font-body)', background: '#fff' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' },
  cancelBtn: { padding: '0.75rem 1.25rem', background: 'transparent', border: 'none', color: 'var(--color-ink-muted)', fontWeight: 600, cursor: 'pointer' },
  saveBtn: { padding: '0.75rem 1.5rem', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: 'var(--rounded-lg)', fontWeight: 600, cursor: 'pointer' },
  skeletonRow: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' },
};
