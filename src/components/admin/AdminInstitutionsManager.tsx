import React, { useState, useEffect } from 'react';

interface Institution {
  id: string;
  name: string;
  type: string;
  code: string;
  defaultApr: number;
  maxTermMonths: number;
  status: string;
}

export default function AdminInstitutionsManager() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState('Banco');
  const [code, setCode] = useState('');
  const [defaultApr, setDefaultApr] = useState('16.06');
  const [maxTermMonths, setMaxTermMonths] = useState('60');

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/institutions');
      const json = await res.json();
      if (res.ok) setInstitutions(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          code,
          defaultApr: Number(defaultApr),
          maxTermMonths: Number(maxTermMonths),
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setName('');
        setCode('');
        fetchInstitutions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta institución del catálogo?')) return;
    try {
      await fetch(`/api/admin/institutions?id=${id}`, { method: 'DELETE' });
      fetchInstitutions();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Catálogo de Entidades Financieras</h2>
          <p className="text-xs text-text-secondary mt-1">
            Gestiona los bancos, cooperativas y emisoras de crédito con tasas de interés referenciales para Ecuador.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-400 transition-colors cursor-pointer"
        >
          <span>➕ Nueva Entidad</span>
        </button>
      </div>

      {/* Grid of institutions */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map((inst) => (
            <div
              key={inst.id}
              className="rounded-2xl border border-border-default bg-surface-50 p-4 space-y-3 hover:border-brand-500/30 transition-all shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-text-primary text-sm">{inst.name}</h3>
                  <span className="inline-block rounded-md bg-surface-100 text-text-muted px-2 py-0.5 text-[10px] font-semibold mt-1">
                    {inst.type} {inst.code ? `• ${inst.code}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(inst.id)}
                  className="rounded-lg text-text-muted hover:text-danger-400 hover:bg-danger-500/10 p-1 transition-colors cursor-pointer"
                  title="Eliminar"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-default/60 text-xs">
                <div>
                  <span className="text-[10px] text-text-muted block">Tasa APR Ref.</span>
                  <strong className="text-brand-400 font-bold text-sm">{inst.defaultApr}%</strong>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Plazo Máx.</span>
                  <strong className="text-text-primary font-bold text-sm">{inst.maxTermMonths} meses</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Nueva Entidad Financiera</h3>
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

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre de la Entidad</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Banco Bolivariano"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="Banco">Banco Privado</option>
                    <option value="Cooperativa">Cooperativa</option>
                    <option value="Pública">Entidad Pública / BIESS</option>
                    <option value="Tarjeta">Emisora de Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Código / Siglas</label>
                  <input
                    type="text"
                    placeholder="Ej. BBOL"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Tasa APR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={defaultApr}
                    onChange={(e) => setDefaultApr(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Plazo Máximo (Meses)</label>
                  <input
                    type="number"
                    required
                    value={maxTermMonths}
                    onChange={(e) => setMaxTermMonths(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-400 cursor-pointer"
                >
                  Guardar Entidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
