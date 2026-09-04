import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_CATALOGS, fetchCatalog, type CatalogOption } from '@/lib/catalogs';

interface BudgetItem {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}

interface BudgetSummary {
  totalLimit: number;
  totalSpent: number;
  totalPercentage: number;
  categoriesOverBudget: number;
  categoriesWarning: number;
}

export default function BudgetsManager() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CatalogOption[]>(DEFAULT_CATALOGS.expense_category);
  const [showModal, setShowModal] = useState(false);
  const [modalCategory, setModalCategory] = useState('');
  const [modalLimit, setModalLimit] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCatalog('expense_category').then(setCategories);
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/budgets');
      const json = await res.json();
      if (json.data) setBudgets(json.data);
      if (json.summary) setSummary(json.summary);
    } catch (err) {
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (value: string) => {
    return categories.find((c) => c.value === value) || { value, label: value, icon: '📦', color: '#C9CDD6' };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCategory || !modalLimit) return;
    setSaving(true);
    try {
      await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: modalCategory, monthlyLimit: parseFloat(modalLimit) }),
      });
      setShowModal(false);
      setModalCategory('');
      setModalLimit('');
      await fetchBudgets();
    } catch (err) {
      console.error('Error saving budget:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    try {
      await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
      await fetchBudgets();
    } catch (err) {
      console.error('Error deleting budget:', err);
    }
  };

  const getBarColor = (status: string, pct: number) => {
    if (status === 'exceeded') return 'bg-danger-500';
    if (status === 'warning') return 'bg-warning-500';
    if (pct >= 50) return 'bg-brand-500';
    return 'bg-accent-500';
  };

  const getBarBg = (status: string) => {
    if (status === 'exceeded') return 'bg-danger-500/10';
    if (status === 'warning') return 'bg-warning-500/10';
    return 'bg-accent-500/10';
  };

  // Categorías sin presupuesto asignado aún
  const assignedCategories = new Set(budgets.map((b) => b.category));
  const unassignedCategories = categories.filter((c) => !assignedCategories.has(c.value));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-text-muted">Cargando presupuestos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Presupuestos Mensuales</h2>
          <p className="text-xs text-text-secondary mt-1">
            Asigna techos de gasto por categoría y monitorea tu disciplina financiera en tiempo real.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Asignar Presupuesto
        </button>
      </div>

      {/* Resumen Global */}
      {summary && budgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border-default bg-surface-50 p-5">
            <div className="text-xs font-medium text-text-muted">Presupuesto Total</div>
            <div className="mt-2 text-2xl font-extrabold text-text-primary">{formatCurrency(summary.totalLimit)}</div>
            <div className="mt-1 text-xs text-text-secondary">{budgets.length} categorías asignadas</div>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface-50 p-5">
            <div className="text-xs font-medium text-text-muted">Gasto Actual</div>
            <div className={`mt-2 text-2xl font-extrabold ${summary.totalPercentage > 90 ? 'text-danger-400' : summary.totalPercentage > 70 ? 'text-warning-400' : 'text-accent-400'}`}>
              {formatCurrency(summary.totalSpent)}
            </div>
            <div className="mt-1 text-xs text-text-secondary">{summary.totalPercentage}% del presupuesto</div>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface-50 p-5">
            <div className="text-xs font-medium text-text-muted">Estado General</div>
            <div className="mt-2 flex items-center gap-2">
              {summary.categoriesOverBudget > 0 ? (
                <span className="rounded-full bg-danger-500/10 px-3 py-1 text-xs font-bold text-danger-400">
                  {summary.categoriesOverBudget} excedida{summary.categoriesOverBudget > 1 ? 's' : ''}
                </span>
              ) : summary.categoriesWarning > 0 ? (
                <span className="rounded-full bg-warning-500/10 px-3 py-1 text-xs font-bold text-warning-400">
                  {summary.categoriesWarning} en alerta
                </span>
              ) : (
                <span className="rounded-full bg-accent-500/10 px-3 py-1 text-xs font-bold text-accent-400">
                  ✓ Todo en orden
                </span>
              )}
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-surface-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${summary.totalPercentage > 90 ? 'bg-danger-500' : summary.totalPercentage > 70 ? 'bg-warning-500' : 'bg-accent-500'}`}
                style={{ width: `${Math.min(summary.totalPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lista de Presupuestos */}
      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default bg-surface-50 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-3xl mb-4">📊</div>
          <h3 className="text-base font-bold text-text-primary">Sin presupuestos asignados</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm">
            Asigna un techo de gasto mensual a cada categoría para monitorear tu disciplina financiera y recibir alertas cuando estés por superar el límite.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-400 transition-all cursor-pointer"
          >
            Crear Primer Presupuesto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const cat = getCategoryInfo(b.category);
            return (
              <div
                key={b.id}
                className={`rounded-2xl border p-5 space-y-3 transition-all ${
                  b.status === 'exceeded'
                    ? 'border-danger-500/30 bg-danger-500/5'
                    : b.status === 'warning'
                      ? 'border-warning-500/30 bg-warning-500/5'
                      : 'border-border-default bg-surface-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-bold text-text-primary">{cat.label}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:text-danger-400 hover:bg-danger-500/10 transition-colors cursor-pointer"
                    title="Eliminar presupuesto"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <span className={`text-xl font-extrabold ${
                      b.status === 'exceeded' ? 'text-danger-400' : b.status === 'warning' ? 'text-warning-400' : 'text-text-primary'
                    }`}>
                      {formatCurrency(b.spent)}
                    </span>
                    <span className="text-xs text-text-muted ml-1">/ {formatCurrency(b.monthlyLimit)}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    b.status === 'exceeded'
                      ? 'bg-danger-500/20 text-danger-400'
                      : b.status === 'warning'
                        ? 'bg-warning-500/20 text-warning-400'
                        : 'bg-accent-500/20 text-accent-400'
                  }`}>
                    {b.percentage}%
                  </span>
                </div>

                {/* Barra de progreso */}
                <div className={`h-2.5 w-full rounded-full overflow-hidden ${getBarBg(b.status)}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(b.status, b.percentage)}`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>

                {b.status === 'exceeded' && (
                  <div className="text-[11px] font-semibold text-danger-400 flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Excedido por {formatCurrency(b.spent - b.monthlyLimit)}
                  </div>
                )}
                {b.status === 'warning' && (
                  <div className="text-[11px] font-semibold text-warning-400 flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Te quedan {formatCurrency(b.monthlyLimit - b.spent)} de este presupuesto</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Asignación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-brand-500/30 bg-surface-50 p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary cursor-pointer transition-colors"
              title="Cerrar modal"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center space-y-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text-primary">Asignar Presupuesto</h3>
              <p className="text-xs text-text-secondary">Define un techo mensual para una categoría de gasto.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Categoría</label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Seleccionar categoría...</option>
                  {unassignedCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                  {/* También mostrar las ya asignadas para actualizar */}
                  {budgets.map((b) => {
                    const cat = getCategoryInfo(b.category);
                    return (
                      <option key={b.category} value={b.category}>
                        {cat.icon} {cat.label} (actualizar: {formatCurrency(b.monthlyLimit)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Límite Mensual ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={modalLimit}
                  onChange={(e) => setModalLimit(e.target.value)}
                  required
                  placeholder="200.00"
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-400 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Presupuesto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
