import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import ScheduleConfig from './ScheduleConfig';

interface SchedulePeriod {
  key: string;
  date: string;
  day: number;
  month: number;
  year: number;
  timing: 'quincena' | 'fin_de_mes';
  incomeAvailable: number;
}

interface ScheduleRow {
  id: string;
  name: string;
  kind: 'debt' | 'expense';
  timing: string;
  monthlyAmount: number;
  totalScheduled: number;
  currentBalance?: number;
  remainingInstallments?: number | null;
  totalInstallments?: number | null;
  payoffPeriodKey?: string | null;
  cells: Record<string, number>;
  installmentNumbers?: Record<string, number>;
}

interface ScheduleData {
  periods: SchedulePeriod[];
  rows: ScheduleRow[];
  totals: Record<string, number>;
  remaining: Record<string, number>;
  monthlyIncome: { quincena: number; finDeMes: number };
  monthlyCommitment: { debts: number; expenses: number };
  benefitPayouts?: Record<string, { label: string; amount: number }[]>;
}

interface PaymentRecord {
  id: string;
  debtId: string;
  debtName: string | null;
  amount: number;
  type: string;
  paidAt: string;
  notes: string | null;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  minimum: 'Mínimo',
  extra: 'Extra a capital',
  full: 'Liquidación',
};

interface PayCell {
  debtId: string;
  debtName: string;
  amount: number;
  date: string;
}

const localIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function PaymentsView() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [paid, setPaid] = useState<Record<string, Record<string, number>>>({});
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [showConfig, setShowConfig] = useState(false);

  // Abonar desde una celda del cronograma
  const [payCell, setPayCell] = useState<PayCell | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Editar un pago del historial
  const [editPayment, setEditPayment] = useState<PaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState('minimum');
  const [editNotes, setEditNotes] = useState('');

  const refresh = () => setReload((r) => r + 1);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/schedule?months=${months}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al cargar el cronograma');
        setSchedule(json.data.schedule);
        setPaid(json.data.paid || {});
        setHistory(json.data.history || []);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el cronograma');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [months, reload]);

  const openPayCell = (row: ScheduleRow, periodKey: string, periodDate: string) => {
    const amount = row.cells[periodKey] || 0;
    setPayCell({ debtId: row.id, debtName: row.name, amount, date: periodDate });
    setPayAmount(amount);
    // Fecha sugerida: la del corte, o hoy si el corte aún no llega
    const today = localIso(new Date());
    setPayDate(periodDate <= today ? periodDate : today);
    setPayNotes('');
    setModalError(null);
  };

  const handlePayCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCell) return;
    setSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId: payCell.debtId,
          amount: Number(payAmount),
          type: 'minimum',
          paidAt: payDate,
          notes: payNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al registrar el abono');
      setPayCell(null);
      refresh();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditPayment = (p: PaymentRecord) => {
    setEditPayment(p);
    setEditAmount(p.amount);
    setEditDate(String(p.paidAt).slice(0, 10));
    setEditType(p.type);
    setEditNotes(p.notes || '');
    setModalError(null);
  };

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayment) return;
    setSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch('/api/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editPayment.id,
          debtId: editPayment.debtId,
          amount: Number(editAmount),
          type: editType,
          paidAt: editDate,
          notes: editNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al actualizar el pago');
      setEditPayment(null);
      refresh();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (p: PaymentRecord) => {
    if (
      !confirm(
        `¿Eliminar el pago de ${formatCurrency(p.amount)} a "${p.debtName || 'deuda'}"? El monto se devolverá al saldo de la deuda.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/payments?id=${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Error al eliminar el pago');
        return;
      }
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger-500/20 bg-danger-500/5 p-6 text-sm text-danger-400">
        {error}
      </div>
    );
  }

  if (!schedule) return null;

  const { periods, rows, totals, remaining, monthlyIncome, monthlyCommitment } = schedule;
  const debtRows = rows.filter((r) => r.kind === 'debt');
  const expenseRows = rows.filter((r) => r.kind === 'expense');

  // Agrupar períodos por mes para el encabezado superior
  const monthGroups: { label: string; span: number }[] = [];
  for (const p of periods) {
    const label = `${MONTH_NAMES[p.month]} ${p.year}`;
    const last = monthGroups[monthGroups.length - 1];
    if (last && last.label === label) {
      last.span += 1;
    } else {
      monthGroups.push({ label, span: 1 });
    }
  }

  const minRemaining = periods.length
    ? Math.min(...periods.map((p) => remaining[p.key] ?? 0))
    : 0;
  const totalCommitment = monthlyCommitment.debts + monthlyCommitment.expenses;

  // Corte más próximo (columna resaltada)
  const todayIso = localIso(new Date());
  const nextKey = periods.find((p) => p.date >= todayIso)?.key;
  const hl = (k: string) => (k === nextKey ? ' bg-brand-500/[0.07]' : '');

  const cellPaid = (rowId: string, periodKey: string): number | undefined =>
    paid[rowId]?.[periodKey];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cronograma de Pagos</h2>
          <p className="text-sm text-text-secondary">
            Plan quincenal de deudas y gastos: qué pagar el 15, qué pagar a fin de mes y cuánto
            te queda del sueldo en cada corte.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border-default bg-surface-50 p-1">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                  months === m
                    ? 'bg-brand-500/15 text-brand-400 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {m} meses
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowConfig(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-50 px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:text-text-primary hover:border-border-hover cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configurar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5">
          <span className="text-xs font-medium text-text-muted">Ingreso Quincena (15)</span>
          <div className="mt-2 text-2xl font-bold text-text-primary">
            {formatCurrency(monthlyIncome.quincena)}
          </div>
          <div className="mt-1 text-xs text-text-muted">Anticipo disponible cada 15</div>
        </div>

        <div className="rounded-2xl border border-border-default bg-surface-50 p-5">
          <span className="text-xs font-medium text-text-muted">Ingreso Fin de Mes (30)</span>
          <div className="mt-2 text-2xl font-bold text-text-primary">
            {formatCurrency(monthlyIncome.finDeMes)}
          </div>
          <div className="mt-1 text-xs text-text-muted">Saldo de sueldo a fin de mes</div>
        </div>

        <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5">
          <span className="text-xs font-medium text-warning-400">Compromiso Mensual</span>
          <div className="mt-2 text-2xl font-bold text-warning-400">
            {formatCurrency(totalCommitment)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {formatCurrency(monthlyCommitment.debts)} deudas +{' '}
            {formatCurrency(monthlyCommitment.expenses)} gastos
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            minRemaining < 0
              ? 'border-danger-500/20 bg-danger-500/5'
              : 'border-accent-500/20 bg-accent-500/5'
          }`}
        >
          <span
            className={`text-xs font-medium ${minRemaining < 0 ? 'text-danger-400' : 'text-accent-400'}`}
          >
            Quincena más ajustada
          </span>
          <div
            className={`mt-2 text-2xl font-bold ${minRemaining < 0 ? 'text-danger-400' : 'text-accent-400'}`}
          >
            {formatCurrency(minRemaining)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {minRemaining < 0
              ? 'Hay cortes donde el plan no alcanza'
              : 'Lo mínimo que te queda en un corte'}
          </div>
        </div>
      </div>

      {/* Matriz del cronograma */}
      <div className="rounded-2xl border border-border-default bg-surface-50">
        <div className="border-b border-border-default px-5 py-4">
          <h3 className="font-semibold">Tabla de Pagos por Quincena</h3>
          <p className="text-xs text-text-muted">
            Las celdas en verde ya tienen un abono registrado en ese corte.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="sticky left-0 z-10 bg-surface-50 px-5 py-2 text-left text-xs font-medium text-text-muted">
                  Concepto
                </th>
                {monthGroups.map((g) => (
                  <th
                    key={g.label}
                    colSpan={g.span}
                    className="border-l border-border-default px-3 py-2 text-center text-xs font-semibold text-text-secondary"
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border-default">
                <th className="sticky left-0 z-10 bg-surface-50 px-5 py-2" />
                {periods.map((p) => (
                  <th
                    key={p.key}
                    className={`px-3 py-2 text-center text-xs font-medium ${
                      p.timing === 'quincena' ? 'text-brand-400' : 'text-accent-400'
                    } border-l border-border-default${hl(p.key)}`}
                  >
                    {p.timing === 'quincena' ? 'Día 15' : 'Fin de mes'}
                    {p.key === nextKey && (
                      <div className="text-[9px] font-bold uppercase tracking-wide text-brand-400">próximo</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {debtRows.length > 0 && (
                <tr>
                  <td
                    colSpan={periods.length + 1}
                    className="sticky left-0 bg-surface-100/50 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-danger-400"
                  >
                    Deudas y créditos
                  </td>
                </tr>
              )}
              {debtRows.map((row) => (
                <tr key={row.id} className="border-b border-border-default/50 hover:bg-surface-100/40">
                  <td className="sticky left-0 z-10 bg-surface-50 px-5 py-2.5">
                    <div className="font-medium text-text-primary">{row.name}</div>
                    <div className="text-xs text-text-muted">
                      {row.totalInstallments
                        ? `${row.totalInstallments} cuota(s) de ${formatCurrency(row.monthlyAmount)} · saldo ${formatCurrency(row.currentBalance ?? 0)}`
                        : row.remainingInstallments
                          ? `~${row.remainingInstallments} cuota(s) restante(s) · saldo ${formatCurrency(row.currentBalance ?? 0)}`
                          : `saldo ${formatCurrency(row.currentBalance ?? 0)}`}
                    </div>
                  </td>
                  {periods.map((p) => {
                    const amount = row.cells[p.key];
                    const paidAmount = cellPaid(row.id, p.key);
                    const isPayoff = row.payoffPeriodKey === p.key;
                    const cuotaNum = row.installmentNumbers?.[p.key];
                    const cuotaLabel =
                      cuotaNum && row.totalInstallments
                        ? `${cuotaNum}/${row.totalInstallments}`
                        : null;
                    return (
                      <td key={p.key} className={`border-l border-border-default/50 px-3 py-2.5 text-center${hl(p.key)}`}>
                        {paidAmount !== undefined ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-400">
                            ✓ {formatCurrency(paidAmount)}
                          </span>
                        ) : amount ? (
                          <button
                            onClick={() => openPayCell(row, p.key, p.date)}
                            title="Registrar este pago"
                            className="group cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-brand-500/10"
                          >
                            <span className={isPayoff ? 'font-semibold text-accent-400' : 'text-text-primary'}>
                              {formatCurrency(amount)}
                              {isPayoff && <span className="ml-1 text-xs">🎉</span>}
                            </span>
                            {cuotaLabel && (
                              <div className="text-[10px] leading-tight text-text-muted">cuota {cuotaLabel}</div>
                            )}
                            <div className="hidden text-[10px] font-medium leading-tight text-brand-400 group-hover:block">
                              abonar
                            </div>
                          </button>
                        ) : (
                          <span className="text-text-muted/40">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {expenseRows.length > 0 && (
                <tr>
                  <td
                    colSpan={periods.length + 1}
                    className="sticky left-0 bg-surface-100/50 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-warning-400"
                  >
                    Gastos recurrentes
                  </td>
                </tr>
              )}
              {expenseRows.map((row) => (
                <tr key={row.id} className="border-b border-border-default/50 hover:bg-surface-100/40">
                  <td className="sticky left-0 z-10 bg-surface-50 px-5 py-2.5">
                    <div className="font-medium text-text-primary">{row.name}</div>
                    <div className="text-xs text-text-muted">
                      {formatCurrency(row.monthlyAmount)}/mes
                      {row.timing === 'quincena'
                        ? ' · solo el 15'
                        : row.timing === 'fin_de_mes'
                          ? ' · solo fin de mes'
                          : ' · repartido'}
                    </div>
                  </td>
                  {periods.map((p) => {
                    const amount = row.cells[p.key];
                    return (
                      <td key={p.key} className={`border-l border-border-default/50 px-3 py-2.5 text-center${hl(p.key)}`}>
                        {amount ? (
                          <span className="text-text-secondary">{formatCurrency(amount)}</span>
                        ) : (
                          <span className="text-text-muted/40">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-default bg-surface-100/60">
                <td className="sticky left-0 z-10 bg-surface-100 px-5 py-2.5 text-xs font-semibold text-text-secondary">
                  Total a pagar
                </td>
                {periods.map((p) => (
                  <td key={p.key} className={`border-l border-border-default/50 px-3 py-2.5 text-center font-semibold text-warning-400${hl(p.key)}`}>
                    {formatCurrency(totals[p.key] ?? 0)}
                  </td>
                ))}
              </tr>
              <tr className="bg-surface-100/60">
                <td className="sticky left-0 z-10 bg-surface-100 px-5 py-2.5 text-xs font-semibold text-text-secondary">
                  Ingreso disponible
                </td>
                {periods.map((p) => {
                  const payouts = schedule?.benefitPayouts?.[p.key] || [];
                  return (
                    <td key={p.key} className={`border-l border-border-default/50 px-3 py-2.5 text-center text-text-secondary${hl(p.key)}`}>
                      {formatCurrency(p.incomeAvailable)}
                      {payouts.map((b) => (
                        <div
                          key={b.label}
                          className="mt-0.5 text-[10px] font-semibold text-accent-400"
                          title={`${b.label}: ${formatCurrency(b.amount)} incluidos en este corte`}
                        >
                          🎁 {b.label}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-border-default bg-surface-100">
                <td className="sticky left-0 z-10 bg-surface-100 px-5 py-3 text-xs font-bold text-text-primary">
                  Lo que queda del sueldo
                </td>
                {periods.map((p) => {
                  const value = remaining[p.key] ?? 0;
                  return (
                    <td
                      key={p.key}
                      className={`border-l border-border-default/50 px-3 py-3 text-center font-bold ${
                        value < 0 ? 'text-danger-400' : 'text-accent-400'
                      }${hl(p.key)}`}
                    >
                      {formatCurrency(value)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Historial de pagos */}
      <div className="rounded-2xl border border-border-default bg-surface-50">
        <div className="border-b border-border-default px-5 py-4">
          <h3 className="font-semibold">Historial de Pagos</h3>
          <p className="text-xs text-text-muted">
            Abonos registrados desde la sección de Deudas.
          </p>
        </div>
        {history.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-muted">
            Aún no has registrado pagos. Regístralos desde{' '}
            <a href="/app/debts" className="text-brand-400 hover:underline">
              Deudas
            </a>{' '}
            con el botón "Abonar".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-left text-xs text-text-muted">
                  <th className="px-5 py-2 font-medium">Fecha</th>
                  <th className="px-5 py-2 font-medium">Deuda</th>
                  <th className="px-5 py-2 font-medium">Tipo</th>
                  <th className="px-5 py-2 text-right font-medium">Monto</th>
                  <th className="px-5 py-2 font-medium">Notas</th>
                  <th className="px-5 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-b border-border-default/50 hover:bg-surface-100/40">
                    <td className="px-5 py-2.5 text-text-secondary">
                      {String(p.paidAt).slice(0, 10)}
                    </td>
                    <td className="px-5 py-2.5 font-medium text-text-primary">
                      {p.debtName || '(deuda eliminada)'}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="rounded-md bg-surface-100 px-2 py-0.5 text-xs text-text-secondary">
                        {PAYMENT_TYPE_LABELS[p.type] || p.type}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-accent-400">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="max-w-48 truncate px-5 py-2.5 text-xs text-text-muted">
                      {p.notes || '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditPayment(p)}
                          className="p-1.5 text-text-muted hover:text-brand-400 transition-colors rounded-lg hover:bg-brand-500/10 cursor-pointer"
                          title="Editar pago"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePayment(p)}
                          className="p-1.5 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10 cursor-pointer"
                          title="Eliminar pago (devuelve el monto al saldo)"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Configurar cronograma */}
      {showConfig && (
        <ScheduleConfig onClose={() => setShowConfig(false)} onSaved={refresh} />
      )}

      {/* Modal: Abonar desde una celda */}
      {payCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Registrar Abono</h3>
              <button onClick={() => setPayCell(null)} className="text-text-muted hover:text-text-primary cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-text-secondary">
              Pago programado de <strong className="text-text-primary">{payCell.debtName}</strong> del corte{' '}
              <strong className="text-text-primary">{payCell.date}</strong>
            </p>
            <form onSubmit={handlePayCell} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha de pago</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Notas (opcional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Ej. pago cuota de octubre"
                />
              </div>
              {modalError && (
                <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
                  {modalError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPayCell(null)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-accent-500 px-5 py-2 text-xs font-semibold text-white hover:bg-accent-400 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar pago del historial */}
      {editPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">✏️ Editar Pago</h3>
              <button onClick={() => setEditPayment(null)} className="text-text-muted hover:text-text-primary cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-text-secondary">
              Pago a <strong className="text-text-primary">{editPayment.debtName || 'deuda'}</strong>. El saldo de la
              deuda se ajustará por la diferencia.
            </p>
            <form onSubmit={handleEditPayment} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Tipo</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="minimum">Mínimo</option>
                    <option value="extra">Extra a capital</option>
                    <option value="full">Liquidación</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Notas</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              {modalError && (
                <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
                  {modalError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditPayment(null)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Actualizar Pago 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
