import React, { useState, useEffect } from 'react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setUpdatingId(userId);
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al actualizar rol');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${email}? Se eliminarán todas sus deudas y configuraciones.`)) {
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
            Administra los usuarios registrados, asigna roles de administrador o usuario regular.
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
                  <th className="px-5 py-3.5">Rol Actual</th>
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
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold border transition-colors cursor-pointer ${
                          u.role === 'admin'
                            ? 'bg-brand-500/15 border-brand-500/30 text-brand-400'
                            : 'bg-surface-100 border-border-default text-text-secondary'
                        }`}
                      >
                        <option value="user">Usuario (Estándar)</option>
                        <option value="admin">Administrador (Admin)</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 text-text-muted">
                      <span className="font-semibold text-text-primary">{u.debtsCount}</span> deudas •{' '}
                      <span className="font-semibold text-accent-400">{u.savingsCount}</span> metas
                    </td>
                    <td className="px-5 py-4 text-text-muted">
                      {new Date(u.createdAt).toLocaleDateString('es-ES', { dateStyle: 'short' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="rounded-lg border border-danger-500/30 px-2.5 py-1 text-[11px] font-semibold text-danger-400 hover:bg-danger-500/10 transition-colors cursor-pointer"
                        title="Eliminar usuario"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
