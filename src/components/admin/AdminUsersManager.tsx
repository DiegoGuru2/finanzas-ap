import React, { useState, useEffect } from 'react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  birthDate?: string | null;
  emailVerified: boolean;
  createdAt: string;
  debtsCount: number;
  savingsCount: number;
}

export default function AdminUsersManager() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit modal state
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar usuarios');
      setUsers(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (u: UserRecord) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditBirthDate(u.birthDate || '');
    setNewPassword('');
    setEditMsg(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSavingEdit(true);
      setEditMsg(null);
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editName,
          email: editEmail,
          role: editRole,
          birthDate: editBirthDate || null,
          newPassword: newPassword.trim() ? newPassword.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al actualizar usuario');
      
      setEditMsg('✓ Usuario actualizado exitosamente');
      fetchUsers();
      setTimeout(() => {
        setEditingUser(null);
      }, 1200);
    } catch (err: any) {
      setEditMsg(`Error: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${email}? Se eliminarán todas sus deudas y datos asociados.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al eliminar usuario');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Gestión de Usuarios y Roles</h2>
          <p className="text-xs text-text-secondary mt-1">
            Administra usuarios registrados, modifica sus datos, cambia contraseñas y asigna roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border border-border-default bg-surface-50 px-3.5 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none w-64"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger-500/20 bg-danger-500/5 p-6 text-sm text-danger-400">
          {error}
        </div>
      ) : (
        <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border-default bg-surface-100/70 text-text-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Usuario</th>
                  <th className="px-5 py-3.5">Correo</th>
                  <th className="px-5 py-3.5">Rol</th>
                  <th className="px-5 py-3.5">Fecha Nac.</th>
                  <th className="px-5 py-3.5">Deudas / Metas</th>
                  <th className="px-5 py-3.5">Registro</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/60">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-100/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-brand-400 font-bold">
                          {u.name ? u.name[0].toUpperCase() : 'U'}
                        </div>
                        <span className="font-bold text-text-primary">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{u.email}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                            : 'bg-surface-100 text-text-secondary border border-border-default'
                        }`}
                      >
                        {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-text-muted">
                      {u.birthDate ? u.birthDate : '—'}
                    </td>
                    <td className="px-5 py-4 text-text-muted">
                      <span className="font-semibold text-text-primary">{u.debtsCount}</span> deudas •{' '}
                      <span className="font-semibold text-accent-400">{u.savingsCount}</span> metas
                    </td>
                    <td className="px-5 py-4 text-text-muted">
                      {new Date(u.createdAt).toLocaleDateString('es-ES', { dateStyle: 'short' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="rounded-lg bg-surface-100 border border-border-default px-2.5 py-1 text-[11px] font-semibold text-brand-400 hover:bg-brand-500/10 hover:border-brand-500/30 transition-colors cursor-pointer"
                          title="Editar datos y contraseña"
                        >
                          ✏️ Modificar
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="rounded-lg border border-danger-500/30 px-2.5 py-1 text-[11px] font-semibold text-danger-400 hover:bg-danger-500/10 transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User & Password Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-text-primary">Modificar Usuario</h3>
                <p className="text-xs text-text-secondary">Edita datos de la cuenta o asigna una nueva contraseña</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editMsg && (
              <div
                className={`rounded-xl p-3 text-xs font-semibold ${
                  editMsg.startsWith('✓')
                    ? 'bg-accent-500/15 border border-accent-500/30 text-accent-400'
                    : 'bg-danger-500/15 border border-danger-500/30 text-danger-400'
                }`}
              >
                {editMsg}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nombre */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-semibold text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                {/* Correo */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-semibold text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                {/* Rol */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Rol de Acceso</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-semibold text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="user">Usuario (Finanzas Personales)</option>
                    <option value="admin">Administrador (Panel Admin)</option>
                  </select>
                </div>

                {/* Fecha de nacimiento */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cambiar Contraseña */}
              <div className="rounded-xl border border-border-default bg-surface-100/60 p-3.5 space-y-2">
                <label className="block text-xs font-bold text-text-primary">
                  🔑 Cambiar Contraseña del Usuario <span className="text-[10px] text-text-muted font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Escribe la nueva contraseña (mínimo 8 caracteres)..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-text-muted">
                  Deja este campo en blanco si no deseas modificar la contraseña actual.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
