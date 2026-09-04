import { useState, useEffect, useCallback } from 'react';
import { CATALOG_KEYS, CATALOG_META, PASTEL_PALETTE, type CatalogKey } from '@/lib/catalogs';

interface CatalogRow {
  id: string;
  catalog: string;
  value: string;
  label: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminCatalogsManager() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CatalogKey>('expense_category');

  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formOrder, setFormOrder] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/catalogs');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar catálogos');
      setRows(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const tabRows = rows
    .filter((r) => r.catalog === activeTab)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label));

  const openCreate = () => {
    setEditingId(null);
    setFormValue('');
    setFormLabel('');
    setFormIcon('');
    setFormColor(PASTEL_PALETTE[tabRows.length % PASTEL_PALETTE.length].hex);
    setFormOrder(String(tabRows.length));
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (r: CatalogRow) => {
    setEditingId(r.id);
    setFormValue(r.value);
    setFormLabel(r.label);
    setFormIcon(r.icon || '');
    setFormColor(r.color || '');
    setFormOrder(String(r.sortOrder ?? 0));
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const isEdit = !!editingId;
      const res = await fetch(isEdit ? `/api/admin/catalogs?id=${editingId}` : '/api/admin/catalogs', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit
            ? { label: formLabel, icon: formIcon, color: formColor || null, sortOrder: Number(formOrder) }
            : { catalog: activeTab, value: formValue.trim(), label: formLabel, icon: formIcon, color: formColor || null, sortOrder: Number(formOrder) }
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');
      setShowModal(false);
      await fetchRows();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: CatalogRow) => {
    await fetch(`/api/admin/catalogs?id=${r.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    await fetchRows();
  };

  const handleDelete = async (r: CatalogRow) => {
    if (!confirm(`¿Eliminar la opción "${r.label}"?\n\nLos registros existentes que la usan conservarán su valor, pero ya no aparecerá en los selects. Si solo quieres ocultarla, usa "Desactivar".`)) return;
    await fetch(`/api/admin/catalogs?id=${r.id}`, { method: 'DELETE' });
    await fetchRows();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-3" />
        Cargando catálogos...
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-danger-500/20 bg-danger-500/5 p-6 text-sm text-danger-400">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary">🗂️ Catálogos de la Aplicación</h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Administra las opciones que ven los usuarios en los selects de Gastos, Deudas y Ahorro.
          Los cambios aplican de inmediato para todos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATALOG_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === key
                ? 'bg-brand-500/15 text-brand-400 border border-brand-500 shadow-sm'
                : 'bg-surface-100 text-text-muted border border-border-default hover:border-border-hover'
            }`}
          >
            {CATALOG_META[key].title}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-default px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary">{CATALOG_META[activeTab].title}</h3>
            <p className="text-[11px] text-text-muted">{CATALOG_META[activeTab].description}</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-400 transition-all cursor-pointer"
          >
            + Agregar opción
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="border-b border-border-default text-[10px] uppercase tracking-wide text-text-muted">
                <th className="px-5 py-2.5 text-left font-semibold">Opción</th>
                <th className="px-3 py-2.5 text-left font-semibold">Clave interna</th>
                <th className="px-3 py-2.5 text-center font-semibold">Orden</th>
                <th className="px-3 py-2.5 text-center font-semibold">Estado</th>
                <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tabRows.map((r) => (
                <tr key={r.id} className={`border-b border-border-default/50 ${!r.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-2.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full mr-2 align-middle border border-black/10"
                      style={{ background: r.color || 'transparent' }}
                      title={r.color || 'Sin color'}
                    />
                    <span className="text-base mr-2 align-middle">{r.icon || '·'}</span>
                    <span className="font-semibold text-text-primary align-middle">{r.label}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-text-muted">{r.value}</td>
                  <td className="px-3 py-2.5 text-center text-text-secondary">{r.sortOrder}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => toggleActive(r)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold cursor-pointer transition-colors ${
                        r.isActive
                          ? 'bg-accent-500/15 text-accent-400 hover:bg-accent-500/25'
                          : 'bg-surface-200 text-text-muted hover:bg-surface-300'
                      }`}
                      title={r.isActive ? 'Clic para desactivar (se oculta del select)' : 'Clic para activar'}
                    >
                      {r.isActive ? '✓ Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-5 py-2.5 text-right space-x-1.5">
                    <button onClick={() => openEdit(r)} className="rounded-lg border border-border-default px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-100 cursor-pointer">✏️</button>
                    <button onClick={() => handleDelete(r)} className="rounded-lg border border-danger-500/30 px-2.5 py-1 text-[11px] text-danger-400 hover:bg-danger-500/10 cursor-pointer">🗑️</button>
                  </td>
                </tr>
              ))}
              {tabRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-text-muted">Sin opciones en este catálogo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                {editingId ? (
                  <>
                    <svg className="h-4 w-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Editar opción</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Nueva opción · {CATALOG_META[activeTab].title}</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-danger-500/20 bg-danger-500/10 p-3 text-xs text-danger-400">{formError}</div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Etiqueta visible</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  required
                  maxLength={150}
                  placeholder="Ej. Mascotas"
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Clave interna {editingId && <span className="text-text-muted">(fija)</span>}
                  </label>
                  <input
                    type="text"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, '_'))}
                    required
                    disabled={!!editingId}
                    maxLength={100}
                    placeholder="mascotas"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Emoji</label>
                    <input
                      type="text"
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      maxLength={4}
                      placeholder="🐶"
                      className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-center focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Orden</label>
                    <input
                      type="number"
                      value={formOrder}
                      onChange={(e) => setFormOrder(e.target.value)}
                      min={0}
                      className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-center focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Color pastel</label>
                <div className="flex flex-wrap items-center gap-2">
                  {PASTEL_PALETTE.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setFormColor(p.hex)}
                      title={p.name}
                      className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer ${
                        formColor === p.hex
                          ? 'border-brand-500 scale-110 shadow-md'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ background: p.hex }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormColor('')}
                    title="Sin color"
                    className={`h-7 w-7 rounded-full border-2 text-[10px] text-text-muted bg-surface-100 cursor-pointer flex items-center justify-center ${
                      formColor === '' ? 'border-brand-500 scale-110' : 'border-border-default hover:scale-105'
                    }`}
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-text-muted">
                La clave interna es la que se guarda en los registros de los usuarios — no cambia al editar la etiqueta.
                El color pinta las tarjetas de esa categoría en toda la app.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-border-default px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-brand-400 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
