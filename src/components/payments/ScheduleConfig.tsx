import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">⚙️ Configurar Cronograma</h3>
            <p className="text-xs text-text-muted">
              Ajusta en qué corte cae cada concepto, las cuotas de tus deudas y la vigencia de cada gasto.
            </p>
          </div>
          <button onClick={handleClose} className="text-text-muted hover:text-text-primary cursor-pointer">✕</button>
        </div>

        {error && (
          <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-sm text-text-muted">Cargando...</div>
        ) : (
          <>
            {/* Deudas */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger-400">
                Deudas y créditos
              </h4>
              <div className="space-y-2">
                {debts.length === 0 && (
                  <p className="text-xs text-text-muted">No tienes deudas activas.</p>
                )}
                {debts.map((d) => (
                  <div
                    key={d.id}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-border-default bg-surface-100/50 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end"
                  >
                    <div>
                      <div className="text-sm font-medium text-text-primary">{d.name}</div>
                      <div className="text-[11px] text-text-muted">
                        saldo {formatCurrency(d.currentBalance)}
                        {d.hasInstallmentPlan && d.termMonths
                          ? ` · ${d.termMonths} cuotas de ${formatCurrency(Math.round((d.currentBalance / d.termMonths) * 100) / 100)}`
                          : ` · pago ${formatCurrency(d.minimumPayment)}`}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-muted mb-0.5">Corte</span>
                      <select
                        value={d.paymentTiming || 'fin_de_mes'}
                        onChange={(e) => updateDebt(d.id, { paymentTiming: e.target.value })}
                        className={inputCls}
                      >
                        <option value="quincena">Día 15</option>
                        <option value="fin_de_mes">Fin de mes</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5 pb-1.5">
                      <input
                        type="checkbox"
                        id={`plan-${d.id}`}
                        checked={!!d.hasInstallmentPlan}
                        onChange={(e) => updateDebt(d.id, { hasInstallmentPlan: e.target.checked })}
                        className="rounded border-border-default text-brand-500"
                      />
                      <label htmlFor={`plan-${d.id}`} className="text-[11px] text-text-secondary cursor-pointer">
                        Cuotas
                      </label>
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-muted mb-0.5"># Cuotas</span>
                      <input
                        type="number"
                        min="1"
                        max="360"
                        disabled={!d.hasInstallmentPlan}
                        value={d.termMonths || ''}
                        onChange={(e) => updateDebt(d.id, { termMonths: parseInt(e.target.value) || null })}
                        className={`${inputCls} w-20 disabled:opacity-40`}
                      />
                    </div>
                    <button
                      onClick={() => saveDebt(d)}
                      disabled={savingId === d.id}
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 cursor-pointer"
                    >
                      {savingId === d.id ? '...' : 'Guardar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Gastos */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-warning-400">
                Gastos recurrentes
              </h4>
              <div className="space-y-2">
                {expenses.length === 0 && (
                  <p className="text-xs text-text-muted">No tienes gastos registrados.</p>
                )}
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    className="grid grid-cols-2 gap-2 rounded-xl border border-border-default bg-surface-100/50 p-3 sm:grid-cols-[1fr_5rem_auto_auto_auto_auto] sm:items-end"
                  >
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-sm font-medium text-text-primary">{e.name}</div>
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-muted mb-0.5">Monto/mes</span>
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
                      <span className="block text-[10px] text-text-muted mb-0.5">Corte</span>
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
                      <span className="block text-[10px] text-text-muted mb-0.5">Desde</span>
                      <input
                        type="date"
                        value={isoDay(e.activeFrom)}
                        onChange={(ev) => updateExpense(e.id, { activeFrom: ev.target.value || null })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-muted mb-0.5">Hasta</span>
                      <input
                        type="date"
                        value={isoDay(e.activeUntil)}
                        onChange={(ev) => updateExpense(e.id, { activeUntil: ev.target.value || null })}
                        className={inputCls}
                      />
                    </div>
                    <button
                      onClick={() => saveExpense(e)}
                      disabled={savingId === e.id}
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 cursor-pointer"
                    >
                      {savingId === e.id ? '...' : 'Guardar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="rounded-xl bg-surface-100 border border-border-default px-5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-200 cursor-pointer"
              >
                Cerrar y actualizar cronograma
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
