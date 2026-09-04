import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { catalogTint, DEFAULT_CATALOGS, fetchCatalog, type CatalogOption } from '@/lib/catalogs';

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  isEssential: boolean;
  frequency: string;
  paymentTiming?: string;
  activeFrom?: string | null;
  activeUntil?: string | null;
  description?: string;
}

const isoDay = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

export default function ExpensesManager() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Categorías administrables desde el panel de admin
  const [categories, setCategories] = useState<CatalogOption[]>(DEFAULT_CATALOGS.expense_category);

  useEffect(() => {
    fetchCatalog('expense_category').then(setCategories);
  }, []);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(150);
  const [category, setCategory] = useState('housing');
  const [isEssential, setIsEssential] = useState(true);
  const [paymentTiming, setPaymentTiming] = useState('ambas');
  const [activeFrom, setActiveFrom] = useState('');
  const [activeUntil, setActiveUntil] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setName('');
    setAmount(150);
    setCategory('housing');
    setIsEssential(true);
    setPaymentTiming('ambas');
    setActiveFrom('');
    setActiveUntil('');
    setDescription('');
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (exp: ExpenseItem) => {
    setEditingId(exp.id);
    setName(exp.name);
    setAmount(exp.amount);
    setCategory(exp.category);
    setIsEssential(exp.isEssential);
    setPaymentTiming(exp.paymentTiming || 'ambas');
    setActiveFrom(isoDay(exp.activeFrom));
    setActiveUntil(isoDay(exp.activeUntil));
    setDescription(exp.description || '');
    setErrorMessage(null);
    setShowModal(true);
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/expenses');
      const json = await res.json();
      if (json.data) {
        setExpenses(json.data);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        name,
        amount: Number(amount),
        category,
        isEssential,
        frequency: 'monthly',
        paymentTiming,
        activeFrom: activeFrom || null,
        activeUntil: activeUntil || null,
        description,
      };
      if (editingId) payload.id = editingId;

      const res = await fetch('/api/expenses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar gasto');
      }

      setShowModal(false);
      setEditingId(null);
      await fetchExpenses();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Deseas eliminar este gasto?')) return;
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      await fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const essentialExpenses = expenses.filter((e) => e.isEssential).reduce((sum, e) => sum + e.amount, 0);
  const nonEssentialExpenses = expenses.filter((e) => !e.isEssential).reduce((sum, e) => sum + e.amount, 0);

  // Etiquetas desde el catálogo administrable
  const categoryLabels: Record<string, string> = Object.fromEntries(
    categories.map((c) => [c.value, `${c.icon ? c.icon + ' ' : ''}${c.label}`])
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gastos Mensuales Recurrentes</h2>
          <p className="text-sm text-text-secondary">
            Registra tus gastos fijos y variables para calcular con precisión tu excedente para deudas.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Gasto Recurrente
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5">
          <span className="text-xs font-medium text-text-muted">Total Gastos Mensuales</span>
          <div className="mt-2 text-2xl font-bold text-text-primary">{formatCurrency(totalExpenses)}</div>
          <div className="mt-1 text-xs text-text-muted">{expenses.length} categorías registradas</div>
        </div>

        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5">
          <span className="text-xs font-medium text-brand-400">Gastos Esenciales (Fijos)</span>
          <div className="mt-2 text-2xl font-bold text-brand-400">{formatCurrency(essentialExpenses)}</div>
          <div className="mt-1 text-xs text-text-muted">Vivienda, comida, servicios</div>
        </div>

        <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5">
          <span className="text-xs font-medium text-warning-400">Gastos Prescindibles</span>
          <div className="mt-2 text-2xl font-bold text-warning-400">{formatCurrency(nonEssentialExpenses)}</div>
          <div className="mt-1 text-xs text-text-muted">Potencial de ahorro para deudas</div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden">
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Desglose de Gastos</h3>
          <span className="text-xs text-text-muted">{expenses.length} registro(s)</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted">Cargando gastos...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-text-muted">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h4 className="mt-4 font-semibold text-text-primary">No tienes gastos registrados</h4>
            <p className="mt-1 text-sm text-text-muted">Registra tu arriendo, comida y servicios para que el motor calcule tu disponible real.</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Registrar Primer Gasto
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-3">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="rounded-2xl border border-border-default bg-surface-100/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-500/40 hover:bg-surface-100/70 transition-all shadow-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-semibold text-text-primary text-sm sm:text-base">{exp.name}</span>
                    {(() => {
                      const color = categories.find((c) => c.value === exp.category)?.color;
                      return (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-lg text-text-secondary border ${
                            color ? 'cat-tint' : 'bg-surface-200 border-border-default/60'
                          }`}
                          style={catalogTint(color)}
                        >
                          {categoryLabels[exp.category] || exp.category}
                        </span>
                      );
                    })()}
                    {exp.isEssential ? (
                      <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2.5 py-0.5 rounded-lg font-medium">
                        Esencial
                      </span>
                    ) : (
                      <span className="text-xs bg-warning-500/10 text-warning-400 border border-warning-500/20 px-2.5 py-0.5 rounded-lg font-medium">
                        Flexible
                      </span>
                    )}
                    <span className="text-xs bg-surface-200/80 border border-border-default/50 px-2.5 py-0.5 rounded-lg text-text-secondary">
                      {exp.paymentTiming === 'quincena'
                        ? 'Paga el 15'
                        : exp.paymentTiming === 'fin_de_mes'
                          ? 'Paga a fin de mes'
                          : 'Repartido 15/30'}
                    </span>
                  </div>
                  {(exp.activeFrom || exp.activeUntil) && (
                    <p className="text-xs text-warning-400 mt-1.5 font-medium">
                      Vigente {exp.activeFrom ? `desde ${isoDay(exp.activeFrom)}` : ''}
                      {exp.activeFrom && exp.activeUntil ? ' ' : ''}
                      {exp.activeUntil ? `hasta ${isoDay(exp.activeUntil)}` : ''}
                    </p>
                  )}
                  {exp.description && <p className="text-xs text-text-muted mt-1.5">{exp.description}</p>}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-default/60">
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-extrabold text-text-primary">{formatCurrency(exp.amount)}</div>
                    <div className="text-xs text-text-muted">al mes</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(exp)}
                      className="p-2 text-text-muted hover:text-brand-400 transition-colors rounded-xl hover:bg-brand-500/10 cursor-pointer border border-border-default/60 bg-surface-50"
                      title="Editar gasto"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-2 text-text-muted hover:text-danger-400 transition-colors rounded-xl hover:bg-danger-500/10 cursor-pointer border border-border-default/60 bg-surface-50"
                      title="Eliminar gasto"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear Gasto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                {editingId ? (
                  <>
                    <svg className="h-5 w-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Editar Gasto</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Registrar Gasto Recurrente</span>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Concepto del Gasto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Ej. Arriendo Departamento / Supermercado"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Monto Mensual ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon ? `${c.icon} ` : ''}{c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">¿En qué corte lo pagas?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'quincena', label: 'Quincena (15)' },
                    { value: 'fin_de_mes', label: 'Fin de Mes (30)' },
                    { value: 'ambas', label: 'Repartido 50/50' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentTiming(opt.value)}
                      className={`rounded-xl border p-2 text-xs font-medium cursor-pointer ${
                        paymentTiming === opt.value
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-border-default bg-surface-100 text-text-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Vigencia en el cronograma (opcional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] text-text-muted mb-1">Desde</span>
                    <input
                      type="date"
                      value={activeFrom}
                      onChange={(e) => setActiveFrom(e.target.value)}
                      className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-text-muted mb-1">Hasta</span>
                    <input
                      type="date"
                      value={activeUntil}
                      onChange={(e) => setActiveUntil(e.target.value)}
                      className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-text-muted">
                  Ej. un gasto que termina en diciembre o empieza el próximo mes. Vacío = siempre.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-100 p-3">
                <input
                  type="checkbox"
                  id="isEssential"
                  checked={isEssential}
                  onChange={(e) => setIsEssential(e.target.checked)}
                  className="rounded border-border-default text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="isEssential" className="text-xs font-medium text-text-primary cursor-pointer">
                  Este es un gasto esencial e imprescindible
                </label>
              </div>

              {errorMessage && (
                <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingId ? 'Actualizar Gasto 💾' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
