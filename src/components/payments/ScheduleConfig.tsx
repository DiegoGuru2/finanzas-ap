import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { catalogTint, fetchCatalog, type CatalogOption } from '@/lib/catalogs';

interface DebtRow {
  id: string;
  name: string;
  creditor?: string;
  currentBalance: number;
  originalBalance: number;
  apr: number;
  minimumPayment: number;
  dueDay: number;
  type: string;
  paymentTiming?: string;
  status: string;
  hasInstallmentPlan?: boolean;
  termMonths?: number | null;
}

interface ExpenseRow {
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

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const isoDay = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

/**
 * Panel para configurar el cronograma sin salir de la página de Pagos:
 * corte y cuotas de cada deuda, y corte / monto / vigencia de cada gasto.
 */
export default function ScheduleConfig({ onClose, onSaved }: Props) {
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [expenseCatalog, setExpenseCatalog] = useState<CatalogOption[]>([]);

  useEffect(() => {
    fetchCatalog('expense_category').then(setExpenseCatalog);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [dRes, eRes] = await Promise.all([fetch('/api/debts'), fetch('/api/expenses')]);
        const dJson = await dRes.json();
        const eJson = await eRes.json();
        setDebts((dJson.data || []).filter((d: DebtRow) => d.status !== 'paid_off'));
        setExpenses(eJson.data || []);
      } catch {
        setError('No se pudieron cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateDebt = (id: string, patch: Partial<DebtRow>) => {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const updateExpense = (id: string, patch: Partial<ExpenseRow>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const saveDebt = async (debt: DebtRow) => {
    setSavingId(debt.id);
    setError(null);
    try {
      const hasPlan = !!debt.hasInstallmentPlan && (debt.termMonths ?? 0) > 0;
      const minimumPayment = hasPlan
        ? Math.round((debt.currentBalance / (debt.termMonths as number)) * 100) / 100
        : debt.minimumPayment;

      const res = await fetch('/api/debts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: debt.id,
          name: debt.name,
          creditor: debt.creditor || '',
          currentBalance: debt.currentBalance,
          originalBalance: debt.originalBalance,
          apr: debt.apr,
          minimumPayment,
          dueDay: debt.dueDay,
          type: debt.type,
          paymentTiming: debt.paymentTiming || 'fin_de_mes',
          hasInstallmentPlan: !!debt.hasInstallmentPlan,
          termMonths: hasPlan ? debt.termMonths : null,
          currency: 'USD',
          status: 'active',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      setDirty(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const saveExpense = async (exp: ExpenseRow) => {
    setSavingId(exp.id);
    setError(null);
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: exp.id,
          name: exp.name,
          amount: exp.amount,
          category: exp.category,
          isEssential: exp.isEssential,
          frequency: exp.frequency || 'monthly',
          paymentTiming: exp.paymentTiming || 'ambas',
          activeFrom: isoDay(exp.activeFrom) || null,
          activeUntil: isoDay(exp.activeUntil) || null,
          description: exp.description || '',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      setDirty(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleClose = () => {
    if (dirty) onSaved();
    onClose();
  };

  const inputCls =
    'w-full rounded-lg border border-border-default bg-surface-100 px-2.5 py-1.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border-default bg-surface-50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-5 py-4 bg-surface-50 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary">⚙️ Configurar Cronograma</h3>
            <p className="text-xs text-text-muted">
              Ajusta el corte de cada concepto, cuotas de deudas y vigencia de gastos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-sm text-text-muted">Cargando datos...</div>
          ) : (
            <>
              {/* Deudas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-danger-400">
                    Deudas y Créditos
                  </h4>
                  <span className="text-[11px] text-text-muted">{debts.length} activas</span>
                </div>
                <div className="space-y-3">
                  {debts.length === 0 && (
                    <p className="text-xs text-text-muted py-2">No tienes deudas activas registradas.</p>
                  )}
                  {debts.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-border-default bg-surface-100/50 p-3.5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="font-medium text-sm text-text-primary">{d.name}</div>
                        <div className="text-xs text-text-muted">
                          Saldo actual: <strong className="text-text-primary">{formatCurrency(d.currentBalance)}</strong>
                          {d.hasInstallmentPlan && d.termMonths
                            ? ` · ${d.termMonths} cuotas de ${formatCurrency(Math.round((d.currentBalance / d.termMonths) * 100) / 100)}`
                            : ` · pago ${formatCurrency(d.minimumPayment)}`}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end pt-1">
                        <div>
                          <span className="block text-[10px] text-text-muted mb-1 font-medium">Corte de pago</span>
                          <select
                            value={d.paymentTiming || 'fin_de_mes'}
                            onChange={(e) => updateDebt(d.id, { paymentTiming: e.target.value })}
                            className={inputCls}
                          >
                            <option value="quincena">Día 15</option>
                            <option value="fin_de_mes">Fin de mes</option>
                          </select>
                        </div>

                        <div>
                          <span className="block text-[10px] text-text-muted mb-1 font-medium">Modalidad</span>
                          <label className="flex items-center gap-1.5 h-[34px] px-2.5 rounded-lg border border-border-default bg-surface-100 text-xs text-text-secondary cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!d.hasInstallmentPlan}
                              onChange={(e) => updateDebt(d.id, { hasInstallmentPlan: e.target.checked })}
                              className="rounded border-border-default text-brand-500"
                            />
                            <span>Por Cuotas</span>
                          </label>
                        </div>

                        <div>
                          <span className="block text-[10px] text-text-muted mb-1 font-medium"># Cuotas restantes</span>
                          <input
                            type="number"
                            min="1"
                            max="360"
                            placeholder="Ej. 12"
                            disabled={!d.hasInstallmentPlan}
                            value={d.termMonths || ''}
                            onChange={(e) => updateDebt(d.id, { termMonths: parseInt(e.target.value) || null })}
                            className={`${inputCls} disabled:opacity-40`}
                          />
                        </div>

                        <button
                          onClick={() => saveDebt(d)}
                          disabled={savingId === d.id}
                          className="w-full rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {savingId === d.id ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gastos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-warning-400">
                    Gastos Recurrentes
                  </h4>
                  <span className="text-[11px] text-text-muted">{expenses.length} registrados</span>
                </div>
                <div className="space-y-3">
                  {expenses.length === 0 && (
                    <p className="text-xs text-text-muted py-2">No tienes gastos recurrentes registrados.</p>
                  )}
                  {expenses.map((e) => {
                    const catOpt = expenseCatalog.find((c) => c.value === e.category);
                    return (
                    <div
                      key={e.id}
                      className={`rounded-xl border p-3.5 space-y-3 ${
                        catOpt?.color ? 'cat-tint' : 'border-border-default bg-surface-100/50'
                      }`}
                      style={catalogTint(catOpt?.color)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex items-center gap-2 font-medium text-sm text-text-primary">
                          {catOpt?.color && <span className="cat-dot h-2.5 w-2.5 rounded-full shrink-0" />}
                          {e.name}
                        </div>
                        <div className="text-xs text-text-muted">
                          Categoría: <span className="text-text-secondary">{catOpt ? `${catOpt.icon ? catOpt.icon + ' ' : ''}${catOpt.label}` : e.category}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end pt-1">
                        <div>
                          <span className="block text-[10px] text-text-muted mb-1 font-medium">Monto / mes</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={e.amount}
                            onChange={(ev) => updateExpense(e.id, { amount: parseFloat(ev.target.value) || 0 })}
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <span className="block text-[10px] text-text-muted mb-1 font-medium">Corte</span>
                          <select
                            value={e.paymentTiming || 'ambas'}
                            onChange={(ev) => updateExpense(e.id, { paymentTiming: ev.target.value })}
                            className={inputCls}
                          >
                            <option value="quincena">Día 15</option>
                            <option value="fin_de_mes">Fin de mes</option>
                            <option value="ambas">Repartido</option>
                          </select>
                        </div>

                        <div>
                          <span className="block text-[10px] text-text-muted mb-1 font-medium">Vigente desde</span>
                          <input
                            type="date"
                            value={isoDay(e.activeFrom)}
                            onChange={(ev) => updateExpense(e.id, { activeFrom: ev.target.value || null })}
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <span className="block text-[10px] text-text-muted mb-1 font-medium">Vigente hasta</span>
                          <input
                            type="date"
                            value={isoDay(e.activeUntil)}
                            onChange={(ev) => updateExpense(e.id, { activeUntil: ev.target.value || null })}
                            className={inputCls}
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <button
                            onClick={() => saveExpense(e)}
                            disabled={savingId === e.id}
                            className="w-full rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {savingId === e.id ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="border-t border-border-default px-5 py-3 bg-surface-50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={handleClose}
            className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-400 transition-colors cursor-pointer"
          >
            Listo y actualizar cronograma
          </button>
        </div>
      </div>
    </div>
  );
}
