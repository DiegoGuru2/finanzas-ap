import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';
import { catalogTint, fetchCatalog, type CatalogOption } from '@/lib/catalogs';
import ScheduleConfig from './ScheduleConfig';
import { exportScheduleToExcel } from '@/lib/excel-export';

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
  category?: string;
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

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
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
  // Colores pastel por categoría de gasto (catálogo administrable)
  const [expenseColors, setExpenseColors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCatalog('expense_category').then((opts: CatalogOption[]) => {
      const map: Record<string, string> = {};
      for (const o of opts) if (o.color) map[o.value] = o.color;
      setExpenseColors(map);
    });
  }, []);
  const [paid, setPaid] = useState<Record<string, Record<string, number>>>({});
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [showConfig, setShowConfig] = useState(false);

  // Modo de visualización: 'cards' (Por corte) o 'table' (Matriz)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
  const [showAllCards, setShowAllCards] = useState(false);

  // Filtro de mes para la Matriz (permite enfocar 1 mes o ver todos sin scroll masivo en móvil)
  const [matrixMonthFilter, setMatrixMonthFilter] = useState<'all' | string>('all');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Modal: Abonar desde una celda del cronograma
  const [payCell, setPayCell] = useState<PayCell | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal: Editar un pago del historial
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

  // Selección inicial del próximo corte
  useEffect(() => {
    if (schedule?.periods.length && !selectedPeriodKey) {
      const todayIso = localIso(new Date());
      const nextP = schedule.periods.find((p) => p.date >= todayIso) || schedule.periods[0];
      setSelectedPeriodKey(nextP.key);
    }
  }, [schedule]);

  const openPayCell = (row: ScheduleRow, periodKey: string, periodDate: string) => {
    const amount = row.cells[periodKey] || 0;
    setPayCell({ debtId: row.id, debtName: row.name, amount, date: periodDate });
    setPayAmount(amount);
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

  const scrollToNextCut = () => {
    if (!nextKey) return;
    const target = document.getElementById(`matrix-col-${nextKey}`);
    if (target && tableContainerRef.current) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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

  // Corte más próximo
  const todayIso = localIso(new Date());
  const nextPeriod = periods.find((p) => p.date >= todayIso) || periods[0];
  const nextKey = nextPeriod?.key;
  const hl = (k: string) => (k === nextKey ? ' bg-brand-500/[0.08]' : '');

  const cellPaid = (rowId: string, periodKey: string): number | undefined =>
    paid[rowId]?.[periodKey];

  // Lista única de meses disponibles en el cronograma
  const uniqueMonths: { key: string; label: string; month: number; year: number }[] = [];
  periods.forEach((p) => {
    const k = `${p.month}-${p.year}`;
    if (!uniqueMonths.some((m) => m.key === k)) {
      uniqueMonths.push({
        key: k,
        label: `${MONTH_SHORT[p.month]} ${p.year}`,
        month: p.month,
        year: p.year,
      });
    }
  });

  // Períodos filtrados para la Matriz
  const filteredMatrixPeriods =
    matrixMonthFilter === 'all'
      ? periods
      : matrixMonthFilter === 'next'
        ? periods.filter((p) => nextPeriod && p.month === nextPeriod.month && p.year === nextPeriod.year)
        : periods.filter((p) => `${p.month}-${p.year}` === matrixMonthFilter);

  // Agrupar períodos por mes para el encabezado superior de la Matriz filtrada
  const filteredMonthGroups: { label: string; span: number }[] = [];
  for (const p of filteredMatrixPeriods) {
    const label = `${MONTH_NAMES[p.month]} ${p.year}`;
    const last = filteredMonthGroups[filteredMonthGroups.length - 1];
    if (last && last.label === label) {
      last.span += 1;
    } else {
      filteredMonthGroups.push({ label, span: 1 });
    }
  }

  const minRemaining = periods.length
    ? Math.min(...periods.map((p) => remaining[p.key] ?? 0))
    : 0;
  const totalCommitment = monthlyCommitment.debts + monthlyCommitment.expenses;

  const handleExportExcel = async () => {
    if (!schedule) return;
    try {
      await exportScheduleToExcel(schedule);
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      alert('Error al generar el archivo Excel');
    }
  };

  // Diferencia de días al próximo corte
  let daysDiff = 0;
  if (nextPeriod) {
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    const pDate = new Date(`${nextPeriod.date}T00:00:00`);
    daysDiff = Math.ceil((pDate.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Períodos a renderizar en vista de Tarjetas
  const activePeriod = periods.find((p) => p.key === selectedPeriodKey) || periods[0];
  const periodsToRenderCards = showAllCards ? periods : activePeriod ? [activePeriod] : [];

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Cronograma de Pagos</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Plan quincenal de deudas y gastos: cortes del día 15, fin de mes y saldo disponible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de vista: Tarjetas (Por corte) o Matriz */}
          <div className="flex items-center gap-1 rounded-xl border border-border-default bg-surface-50 p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-100'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Por Corte
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-100'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18M10 3v18M14 3v18" />
              </svg>
              Matriz
            </button>
          </div>

          {/* Selector de meses */}
          <div className="flex items-center gap-1 rounded-xl border border-border-default bg-surface-50 p-1">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  months === m
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>

          {/* Botón Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50 cursor-pointer shadow-sm"
            title="Descargar plantilla profesional en Excel (.xlsx) con matriz y resumen financiero"
          >
            <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Exportar Excel (.xlsx)</span>
          </button>

          {/* Botón Configurar */}
          <button
            onClick={() => setShowConfig(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-semibold text-text-secondary transition-all hover:text-text-primary hover:border-border-hover cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden xs:inline">Configurar</span>
          </button>
        </div>
      </div>

      {/* Banner de Alerta Inteligente del Corte */}
      {nextPeriod && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
            daysDiff === 0
              ? 'border-danger-500/30 bg-danger-500/10'
              : daysDiff <= 3
                ? 'border-warning-500/30 bg-warning-500/10'
                : 'border-brand-500/30 bg-brand-500/10'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                daysDiff === 0
                  ? 'bg-danger-500/20 text-danger-400'
                  : daysDiff <= 3
                    ? 'bg-warning-500/20 text-warning-400'
                    : 'bg-brand-500/20 text-brand-400'
              }`}
            >
              🔔
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    daysDiff === 0
                      ? 'text-danger-400'
                      : daysDiff <= 3
                        ? 'text-warning-400'
                        : 'text-brand-400'
                  }`}
                >
                  {daysDiff === 0
                    ? '🚨 ¡Hoy es el corte de pago!'
                    : daysDiff === 1
                      ? '⏰ El corte es mañana'
                      : `📅 Próximo corte en ${daysDiff} días`}
                </span>
                <span className="text-xs font-semibold text-text-primary">
                  ({nextPeriod.day} de {MONTH_NAMES[nextPeriod.month]})
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {(remaining[nextKey] ?? 0) >= 0 ? (
                  <>
                    Compromisos: <strong className="text-text-primary">{formatCurrency(totals[nextKey] || 0)}</strong>. Te quedarán{' '}
                    <strong className="text-accent-400 font-bold">{formatCurrency(remaining[nextKey] || 0)}</strong> libres de tu ingreso en este corte.
                  </>
                ) : (
                  <>
                    Compromisos: <strong className="text-text-primary">{formatCurrency(totals[nextKey] || 0)}</strong>. Atención:{' '}
                    <strong className="text-danger-400 font-bold">Faltan {formatCurrency(Math.abs(remaining[nextKey] || 0))}</strong> para cubrir los pagos.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border-default bg-surface-50 p-3.5 sm:p-5">
          <span className="text-[11px] sm:text-xs font-medium text-text-muted">Ingreso Quincena (15)</span>
          <div className="mt-1.5 text-lg sm:text-2xl font-bold text-text-primary">
            {formatCurrency(monthlyIncome.quincena)}
          </div>
          <div className="mt-0.5 text-[10px] sm:text-xs text-text-muted">Anticipo quincenal</div>
        </div>

        <div className="rounded-2xl border border-border-default bg-surface-50 p-3.5 sm:p-5">
          <span className="text-[11px] sm:text-xs font-medium text-text-muted">Ingreso Fin de Mes (30)</span>
          <div className="mt-1.5 text-lg sm:text-2xl font-bold text-text-primary">
            {formatCurrency(monthlyIncome.finDeMes)}
          </div>
          <div className="mt-0.5 text-[10px] sm:text-xs text-text-muted">Saldo fin de mes</div>
        </div>

        <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-3.5 sm:p-5">
          <span className="text-[11px] sm:text-xs font-medium text-warning-400">Compromiso Mensual</span>
          <div className="mt-1.5 text-lg sm:text-2xl font-bold text-warning-400">
            {formatCurrency(totalCommitment)}
          </div>
          <div className="mt-0.5 text-[10px] sm:text-xs text-text-muted truncate">
            {formatCurrency(monthlyCommitment.debts)} deudas + {formatCurrency(monthlyCommitment.expenses)} gastos
          </div>
        </div>

        <div
          className={`rounded-2xl border p-3.5 sm:p-5 ${
            minRemaining < 0
              ? 'border-danger-500/20 bg-danger-500/5'
              : 'border-accent-500/20 bg-accent-500/5'
          }`}
        >
          <span
            className={`text-[11px] sm:text-xs font-medium ${minRemaining < 0 ? 'text-danger-400' : 'text-accent-400'}`}
          >
            Quincena más ajustada
          </span>
          <div
            className={`mt-1.5 text-lg sm:text-2xl font-bold ${minRemaining < 0 ? 'text-danger-400' : 'text-accent-400'}`}
          >
            {formatCurrency(minRemaining)}
          </div>
          <div className="mt-0.5 text-[10px] sm:text-xs text-text-muted truncate">
            {minRemaining < 0 ? 'Cortes con saldo negativo' : 'Mínimo remanente'}
          </div>
        </div>
      </div>

      {/* ═══ VISTA 1: POR CORTE / TARJETAS ═══ */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {/* Navegador horizontal de cortes */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              {periods.map((p) => {
                const isSelected = p.key === selectedPeriodKey;
                const isNext = p.key === nextKey;
                const isNegative = (remaining[p.key] ?? 0) < 0;
                return (
                  <button
                    key={p.key}
                    onClick={() => {
                      setSelectedPeriodKey(p.key);
                      setShowAllCards(false);
                    }}
                    className={`relative flex flex-col items-center rounded-xl px-3 py-2 text-xs transition-all cursor-pointer ${
                      isSelected && !showAllCards
                        ? 'bg-brand-500 text-white shadow-md scale-102 ring-2 ring-brand-400/40'
                        : 'border border-border-default bg-surface-50 text-text-secondary hover:border-border-hover hover:text-text-primary'
                    }`}
                  >
                    {isNext && (
                      <span className="absolute -top-1.5 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                      </span>
                    )}
                    <span className="font-bold">
                      {p.day} {MONTH_SHORT[p.month]}
                    </span>
                    <span className="text-[10px] opacity-80">
                      {p.timing === 'quincena' ? '15' : 'Fin mes'}
                    </span>
                    {isNegative && (
                      <span className="mt-0.5 h-1 w-1 rounded-full bg-danger-400"></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="shrink-0 pl-2">
              <button
                onClick={() => setShowAllCards(!showAllCards)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  showAllCards
                    ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                    : 'border-border-default bg-surface-50 text-text-secondary hover:text-text-primary'
                }`}
              >
                {showAllCards ? 'Ver corte activo' : 'Ver todos'}
              </button>
            </div>
          </div>

          {/* Tarjetas de cortes */}
          <div className="space-y-4">
            {periodsToRenderCards.map((p) => {
              const isNext = p.key === nextKey;
              const periodTotals = totals[p.key] ?? 0;
              const periodRemaining = remaining[p.key] ?? 0;
              const payouts = schedule?.benefitPayouts?.[p.key] || [];

              const activeDebtsInPeriod = debtRows.filter(
                (r) => (r.cells[p.key] || 0) > 0 || cellPaid(r.id, p.key) !== undefined
              );
              const activeExpensesInPeriod = expenseRows.filter((r) => (r.cells[p.key] || 0) > 0);

              return (
                <div
                  key={p.key}
                  className={`rounded-2xl border transition-all ${
                    isNext
                      ? 'border-brand-500/40 bg-surface-50 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500/20'
                      : 'border-border-default bg-surface-50'
                  }`}
                >
                  {/* Encabezado del corte */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border-default p-4 sm:p-5 gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                          p.timing === 'quincena'
                            ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                            : 'bg-accent-500/15 text-accent-400 border border-accent-500/20'
                        }`}
                      >
                        {p.day}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-text-primary">
                            {p.day} de {MONTH_NAMES[p.month]}, {p.year}
                          </h3>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              p.timing === 'quincena'
                                ? 'bg-brand-500/15 text-brand-400'
                                : 'bg-accent-500/15 text-accent-400'
                            }`}
                          >
                            {p.timing === 'quincena' ? 'Quincena (15)' : 'Fin de Mes'}
                          </span>
                          {isNext && (
                            <span className="rounded-md bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                              ⚡ Próximo corte
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          Fecha estimada: {p.date}
                        </p>
                      </div>
                    </div>

                    {/* Beneficios especiales */}
                    {payouts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {payouts.map((b) => (
                          <div
                            key={b.label}
                            className="inline-flex items-center gap-1 rounded-lg bg-accent-500/10 border border-accent-500/20 px-2.5 py-1 text-xs font-semibold text-accent-400"
                          >
                            🎁 {b.label}: {formatCurrency(b.amount)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resumen financiero */}
                  <div className="grid grid-cols-3 border-b border-border-default/60 bg-surface-100/30 p-3 sm:p-4 text-center divide-x divide-border-default/60">
                    <div className="px-1 sm:px-2">
                      <span className="block text-[10px] sm:text-xs text-text-muted font-medium">Ingreso</span>
                      <span className="text-xs sm:text-base font-bold text-text-primary mt-0.5 block">
                        {formatCurrency(p.incomeAvailable)}
                      </span>
                    </div>
                    <div className="px-1 sm:px-2">
                      <span className="block text-[10px] sm:text-xs text-warning-400 font-medium">A pagar</span>
                      <span className="text-xs sm:text-base font-bold text-warning-400 mt-0.5 block">
                        {formatCurrency(periodTotals)}
                      </span>
                    </div>
                    <div className="px-1 sm:px-2">
                      <span className="block text-[10px] sm:text-xs text-text-muted font-medium">Te queda</span>
                      <span
                        className={`text-xs sm:text-base font-bold mt-0.5 block ${
                          periodRemaining < 0 ? 'text-danger-400' : 'text-accent-400'
                        }`}
                      >
                        {formatCurrency(periodRemaining)}
                      </span>
                    </div>
                  </div>

                  {/* Detalle */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Deudas */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-danger-400 mb-2">
                        Deudas a pagar ({activeDebtsInPeriod.length})
                      </h4>

                      {activeDebtsInPeriod.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border-default p-3 text-center text-xs text-text-muted">
                          Sin pagos de deuda en este corte 🎉
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeDebtsInPeriod.map((debt) => {
                            const amount = debt.cells[p.key] || 0;
                            const paidAmount = cellPaid(debt.id, p.key);
                            const cuotaNum = debt.installmentNumbers?.[p.key];
                            const isPayoff = debt.payoffPeriodKey === p.key;

                            return (
                              <div
                                key={debt.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border-default/80 bg-surface-100/60 p-3 sm:p-3.5 gap-2.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-text-primary">{debt.name}</span>
                                    {isPayoff && (
                                      <span className="rounded bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-bold text-accent-400">
                                        🎉 Última cuota
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-text-muted mt-0.5">
                                    {cuotaNum && debt.totalInstallments
                                      ? `Cuota ${cuotaNum} de ${debt.totalInstallments}`
                                      : 'Pago mensual'}
                                    {debt.currentBalance ? ` · Saldo pendiente: ${formatCurrency(debt.currentBalance)}` : ''}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-border-default/50">
                                  <div className="text-right">
                                    <div className="text-sm sm:text-base font-bold text-text-primary">
                                      {formatCurrency(amount)}
                                    </div>
                                  </div>

                                  <div>
                                    {paidAmount !== undefined ? (
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-accent-500/15 border border-accent-500/20 px-3 py-1.5 text-xs font-semibold text-accent-400">
                                        ✓ Pagado ({formatCurrency(paidAmount)})
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => openPayCell(debt, p.key, p.date)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-400 transition-colors cursor-pointer"
                                      >
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Abonar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Gastos */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-warning-400 mb-2">
                        Gastos recurrentes ({activeExpensesInPeriod.length})
                      </h4>

                      {activeExpensesInPeriod.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border-default p-3 text-center text-xs text-text-muted">
                          Sin gastos en este corte
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeExpensesInPeriod.map((exp) => {
                            const amount = exp.cells[p.key] || 0;
                            const color = exp.category ? expenseColors[exp.category] : undefined;
                            return (
                              <div
                                key={exp.id}
                                className={`flex items-center justify-between rounded-xl border p-3 ${
                                  color ? 'cat-tint' : 'border-border-default/60 bg-surface-100/40'
                                }`}
                                style={catalogTint(color)}
                              >
                                <div className="min-w-0 pr-2 flex items-center gap-2">
                                  {color && <span className="cat-dot h-2.5 w-2.5 rounded-full shrink-0" />}
                                  <div className="min-w-0">
                                    <div className="font-medium text-xs sm:text-sm text-text-primary truncate">{exp.name}</div>
                                    <div className="text-[10px] text-text-muted">
                                      {exp.timing === 'quincena'
                                        ? 'Solo el 15'
                                        : exp.timing === 'fin_de_mes'
                                          ? 'Solo fin de mes'
                                          : 'Repartido'}
                                    </div>
                                  </div>
                                </div>
                                <span className="font-semibold text-xs sm:text-sm text-text-secondary shrink-0">
                                  {formatCurrency(amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ VISTA 2: MATRIZ DE CRONOGRAMA 100% RESPONSIVE ═══ */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden shadow-sm">
          {/* Header de la matriz con barra de filtros rápidos por mes */}
          <div className="border-b border-border-default p-4 sm:p-5 space-y-3 bg-surface-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-text-primary">Matriz de Pagos Quincenales</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Visualiza y proyecta todos los cortes. Clic en cualquier celda para abonar.
                </p>
              </div>

              {/* Botón rápido para saltar al corte actual */}
              {matrixMonthFilter === 'all' && (
                <button
                  onClick={scrollToNextCut}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-400 hover:bg-brand-500/20 transition-all cursor-pointer"
                >
                  <span>⚡ Ir al corte próximo</span>
                </button>
              )}
            </div>

            {/* Selector de meses para móvil / desktop */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              <span className="text-[11px] font-semibold text-text-muted mr-1 shrink-0">Filtrar vista:</span>
              <button
                onClick={() => setMatrixMonthFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  matrixMonthFilter === 'all'
                    ? 'bg-brand-500 text-white shadow-sm font-semibold'
                    : 'border border-border-default bg-surface-100 text-text-secondary hover:text-text-primary'
                }`}
              >
                Todos ({periods.length} cortes)
              </button>

              <button
                onClick={() => setMatrixMonthFilter('next')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  matrixMonthFilter === 'next'
                    ? 'bg-brand-500 text-white shadow-sm font-semibold'
                    : 'border border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20'
                }`}
              >
                ⚡ Mes actual
              </button>

              {uniqueMonths.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMatrixMonthFilter(m.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    matrixMonthFilter === m.key
                      ? 'bg-brand-500 text-white shadow-sm font-semibold'
                      : 'border border-border-default bg-surface-100 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Banner indicador de scroll horizontal solo si hay más de 2 columnas visibles */}
          {filteredMatrixPeriods.length > 2 && (
            <div className="flex items-center justify-between border-b border-border-default bg-surface-100/80 px-4 py-2 text-[11px] text-text-secondary md:hidden">
              <span className="flex items-center gap-1.5">
                <span>👉</span> Desliza horizontalmente para ver todos los cortes
              </span>
              <span className="font-mono text-xs">↔</span>
            </div>
          )}

          {/* Contenedor de la tabla con scroll suave y sticky headers */}
          <div ref={tableContainerRef} className="overflow-x-auto relative max-h-[70vh] overscroll-x-contain">
            <table className="w-full text-xs sm:text-sm border-collapse">
              {/* Encabezados Sticky */}
              <thead className="sticky top-0 z-30 bg-surface-50 shadow-sm">
                <tr className="border-b border-border-default bg-surface-50">
                  {/* Celda superior izquierda fija dual (horizontal & vertical) */}
                  <th className="sticky left-0 top-0 z-40 bg-surface-50 px-3 sm:px-4 py-2.5 text-left text-xs font-bold text-text-primary min-w-[125px] sm:min-w-[170px] max-w-[145px] sm:max-w-[210px] border-r border-border-default shadow-[3px_0_10px_-2px_rgba(0,0,0,0.4)]">
                    Concepto
                  </th>
                  {filteredMonthGroups.map((g) => (
                    <th
                      key={g.label}
                      colSpan={g.span}
                      className="border-l border-border-default px-3 py-2 text-center text-xs font-bold text-text-primary bg-surface-100/50"
                    >
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-border-default bg-surface-50">
                  <th className="sticky left-0 top-[37px] z-40 bg-surface-50 px-3 sm:px-4 py-2 min-w-[125px] sm:min-w-[170px] max-w-[145px] sm:max-w-[210px] border-r border-border-default shadow-[3px_0_10px_-2px_rgba(0,0,0,0.4)]" />
                  {filteredMatrixPeriods.map((p) => {
                    const isNext = p.key === nextKey;
                    return (
                      <th
                        id={`matrix-col-${p.key}`}
                        key={p.key}
                        className={`px-2 sm:px-3 py-2 text-center text-xs font-semibold min-w-[88px] sm:min-w-[105px] ${
                          p.timing === 'quincena' ? 'text-brand-400' : 'text-accent-400'
                        } border-l border-border-default${isNext ? ' bg-brand-500/15 ring-1 ring-inset ring-brand-500/30' : ''}`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{p.timing === 'quincena' ? 'Día 15' : 'Fin mes'}</span>
                          <span className="text-[10px] text-text-muted font-normal">{p.day} {MONTH_SHORT[p.month]}</span>
                          {isNext && (
                            <span className="mt-0.5 rounded bg-brand-500 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-white">
                              Próximo
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Filas del cuerpo */}
              <tbody>
                {/* Sección Deudas */}
                {debtRows.length > 0 && (
                  <tr>
                    <td
                      colSpan={filteredMatrixPeriods.length + 1}
                      className="sticky left-0 z-10 bg-surface-100/90 px-3 sm:px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-danger-400 border-b border-border-default/80"
                    >
                      💳 Deudas y Créditos
                    </td>
                  </tr>
                )}
                {debtRows.map((row) => (
                  <tr key={row.id} className="border-b border-border-default/50 hover:bg-surface-100/50 transition-colors">
                    {/* Columna Concepto Fija */}
                    <td className="sticky left-0 z-20 bg-surface-50 px-3 sm:px-4 py-2.5 min-w-[125px] sm:min-w-[170px] max-w-[145px] sm:max-w-[210px] border-r border-border-default shadow-[3px_0_10px_-2px_rgba(0,0,0,0.4)]">
                      <div className="font-semibold text-text-primary text-xs sm:text-sm truncate" title={row.name}>
                        {row.name}
                      </div>
                      <div className="text-[10px] text-text-muted truncate mt-0.5">
                        {row.totalInstallments
                          ? `${row.totalInstallments} cuotas · ${formatCurrency(row.monthlyAmount)}`
                          : `saldo ${formatCurrency(row.currentBalance ?? 0)}`}
                      </div>
                    </td>

                    {/* Celdas de cada corte */}
                    {filteredMatrixPeriods.map((p) => {
                      const amount = row.cells[p.key];
                      const paidAmount = cellPaid(row.id, p.key);
                      const isPayoff = row.payoffPeriodKey === p.key;
                      const cuotaNum = row.installmentNumbers?.[p.key];
                      const cuotaLabel =
                        cuotaNum && row.totalInstallments
                          ? `${cuotaNum}/${row.totalInstallments}`
                          : null;
                      const isNext = p.key === nextKey;

                      return (
                        <td
                          key={p.key}
                          className={`border-l border-border-default/50 px-1.5 sm:px-2.5 py-2 text-center align-middle${isNext ? ' bg-brand-500/[0.04]' : ''}`}
                        >
                          {paidAmount !== undefined ? (
                            <span className="inline-flex items-center gap-0.5 rounded-lg bg-accent-500/15 border border-accent-500/25 px-2 py-1 text-[11px] sm:text-xs font-bold text-accent-400 shadow-2xs">
                              ✓ {formatCurrency(paidAmount)}
                            </span>
                          ) : amount ? (
                            <button
                              onClick={() => openPayCell(row, p.key, p.date)}
                              title="Toca para registrar abono"
                              className="group w-full min-h-[36px] flex flex-col items-center justify-center rounded-lg p-1 transition-all hover:bg-brand-500/15 active:scale-95 border border-transparent hover:border-brand-500/30 cursor-pointer bg-surface-100/40"
                            >
                              <span
                                className={`text-[11px] sm:text-xs font-bold ${
                                  isPayoff ? 'text-accent-400' : 'text-text-primary'
                                }`}
                              >
                                {formatCurrency(amount)}
                                {isPayoff && <span className="ml-0.5 text-[10px]">🎉</span>}
                              </span>
                              {cuotaLabel && (
                                <span className="text-[9px] text-text-muted leading-tight font-medium">
                                  cta {cuotaLabel}
                                </span>
                              )}
                              <span className="hidden text-[9px] font-bold text-brand-400 group-hover:block leading-tight">
                                abonar
                              </span>
                            </button>
                          ) : (
                            <span className="text-text-muted/30 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Sección Gastos */}
                {expenseRows.length > 0 && (
                  <tr>
                    <td
                      colSpan={filteredMatrixPeriods.length + 1}
                      className="sticky left-0 z-10 bg-surface-100/90 px-3 sm:px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-warning-400 border-b border-border-default/80"
                    >
                      🧾 Gastos Recurrentes
                    </td>
                  </tr>
                )}
                {expenseRows.map((row) => (
                  <tr key={row.id} className="border-b border-border-default/50 hover:bg-surface-100/50 transition-colors">
                    <td className="sticky left-0 z-20 bg-surface-50 px-3 sm:px-4 py-2 min-w-[125px] sm:min-w-[170px] max-w-[145px] sm:max-w-[210px] border-r border-border-default shadow-[3px_0_10px_-2px_rgba(0,0,0,0.4)]">
                      <div className="flex items-center gap-1.5 font-semibold text-text-primary text-xs sm:text-sm" title={row.name}>
                        {row.category && expenseColors[row.category] && (
                          <span
                            className="cat-dot h-2 w-2 rounded-full shrink-0"
                            style={catalogTint(expenseColors[row.category])}
                          />
                        )}
                        <span className="truncate">{row.name}</span>
                      </div>
                      <div className="text-[10px] text-text-muted truncate">
                        {formatCurrency(row.monthlyAmount)}/mes
                      </div>
                    </td>
                    {filteredMatrixPeriods.map((p) => {
                      const amount = row.cells[p.key];
                      const isNext = p.key === nextKey;
                      return (
                        <td
                          key={p.key}
                          className={`border-l border-border-default/50 px-1.5 sm:px-2.5 py-2 text-center text-xs text-text-secondary${isNext ? ' bg-brand-500/[0.04]' : ''}`}
                        >
                          {amount ? (
                            <span className="font-medium">{formatCurrency(amount)}</span>
                          ) : (
                            <span className="text-text-muted/30">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              {/* Totales y Resultados */}
              <tfoot>
                {/* Total a pagar */}
                <tr className="border-t-2 border-border-default bg-surface-100/70 font-semibold">
                  <td className="sticky left-0 z-20 bg-surface-100 px-3 sm:px-4 py-2.5 text-xs text-text-secondary min-w-[125px] sm:min-w-[170px] max-w-[145px] sm:max-w-[210px] border-r border-border-default shadow-[3px_0_10px_-2px_rgba(0,0,0,0.4)] font-bold">
                    Total a pagar
                  </td>
                  {filteredMatrixPeriods.map((p) => {
                    const isNext = p.key === nextKey;
                    return (
                      <td
                        key={p.key}
                        className={`border-l border-border-default/50 px-2 sm:px-3 py-2.5 text-center font-bold text-warning-400 text-xs sm:text-sm${isNext ? ' bg-brand-500/[0.06]' : ''}`}
                      >
                        {formatCurrency(totals[p.key] ?? 0)}
                      </td>
                    );
                  })}
                </tr>

                {/* Ingreso disponible */}
                <tr className="border-t border-border-default/50 bg-surface-100/50">
                  <td className="sticky left-0 z-20 bg-surface-100 px-3 sm:px-4 py-2.5 text-xs text-text-secondary min-w-[125px] sm:min-w-[170px] max-w-[145px] sm:max-w-[210px] border-r border-border-default shadow-[3px_0_10px_-2px_rgba(0,0,0,0.4)]">
                    Ingreso disponible
                  </td>
                  {filteredMatrixPeriods.map((p) => {
                    const payouts = schedule?.benefitPayouts?.[p.key] || [];
                    const isNext = p.key === nextKey;
                    return (
                      <td
                        key={p.key}
                        className={`border-l border-border-default/50 px-2 sm:px-3 py-2 text-center text-xs text-text-secondary${isNext ? ' bg-brand-500/[0.06]' : ''}`}
                      >
                        <div className="font-semibold text-text-primary">{formatCurrency(p.incomeAvailable)}</div>
                        {payouts.map((b) => (
                          <div
                            key={b.label}
                            className="mt-0.5 text-[9px] font-bold text-accent-400 truncate"
                            title={`${b.label}: ${formatCurrency(b.amount)}`}
                          >
                            🎁 {b.label}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>

                {/* Saldo neto restante */}
                <tr className="border-t-2 border-border-default bg-surface-100">
                  <td className="sticky left-0 z-20 bg-surface-100 px-3 sm:px-4 py-3 text-xs font-bold text-text-primary min-w-[125px] sm:min-w-[170px] max-w-[145px] sm:max-w-[210px] border-r border-border-default shadow-[3px_0_10px_-2px_rgba(0,0,0,0.4)]">
                    Te queda del sueldo
                  </td>
                  {filteredMatrixPeriods.map((p) => {
                    const value = remaining[p.key] ?? 0;
                    const isNext = p.key === nextKey;
                    return (
                      <td
                        key={p.key}
                        className={`border-l border-border-default/50 px-2 sm:px-3 py-3 text-center font-black text-xs sm:text-sm ${
                          value < 0 ? 'text-danger-400 bg-danger-500/10' : 'text-accent-400'
                        }${isNext && value >= 0 ? ' bg-brand-500/[0.08]' : ''}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Leyenda y notas al pie de la matriz */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default bg-surface-100/40 p-3 sm:p-4 text-[11px] text-text-muted">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-accent-500"></span>
                <span>Verde: Pago realizado</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                <span>Próximo corte activo</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span>🎉</span>
                <span>Última cuota programada</span>
              </span>
            </div>
            <span>💡 Haz clic sobre cualquier valor de deuda para abonar.</span>
          </div>
        </div>
      )}

      {/* ═══ HISTORIAL DE PAGOS RESPONSIVE ═══ */}
      <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden shadow-sm">
        <div className="border-b border-border-default px-4 sm:px-5 py-4">
          <h3 className="font-bold text-base sm:text-lg text-text-primary">Historial de Pagos</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Abonos registrados a tus deudas y créditos.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-muted">
            Aún no has registrado pagos. Puedes abonar directamente desde el cronograma o en{' '}
            <a href="/app/debts" className="text-brand-400 font-semibold hover:underline">
              Deudas
            </a>.
          </div>
        ) : (
          <>
            {/* Vista móvil: Tarjetas */}
            <div className="divide-y divide-border-default/60 md:hidden">
              {history.map((p) => (
                <div key={p.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-secondary">
                        {String(p.paidAt).slice(0, 10)}
                      </span>
                      <span className="rounded-md bg-surface-100 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                        {PAYMENT_TYPE_LABELS[p.type] || p.type}
                      </span>
                    </div>
                    <span className="text-base font-bold text-accent-400">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">
                        {p.debtName || '(deuda eliminada)'}
                      </div>
                      {p.notes && (
                        <div className="text-xs text-text-muted italic mt-0.5">"{p.notes}"</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditPayment(p)}
                        className="p-2 text-text-muted hover:text-brand-400 transition-colors rounded-lg hover:bg-brand-500/10 cursor-pointer"
                        title="Editar pago"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePayment(p)}
                        className="p-2 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10 cursor-pointer"
                        title="Eliminar pago"
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

            {/* Vista desktop: Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-left text-xs text-text-muted">
                    <th className="px-5 py-2.5 font-semibold">Fecha</th>
                    <th className="px-5 py-2.5 font-semibold">Deuda</th>
                    <th className="px-5 py-2.5 font-semibold">Tipo</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Monto</th>
                    <th className="px-5 py-2.5 font-semibold">Notas</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.id} className="border-b border-border-default/50 hover:bg-surface-100/40 transition-colors">
                      <td className="px-5 py-2.5 text-text-secondary">
                        {String(p.paidAt).slice(0, 10)}
                      </td>
                      <td className="px-5 py-2.5 font-semibold text-text-primary">
                        {p.debtName || '(deuda eliminada)'}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="rounded-md bg-surface-100 px-2 py-0.5 text-xs text-text-secondary font-medium">
                          {PAYMENT_TYPE_LABELS[p.type] || p.type}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-bold text-accent-400">
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
                            title="Eliminar pago"
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
          </>
        )}
      </div>

      {/* Modal: Configurar cronograma */}
      {showConfig && (
        <ScheduleConfig onClose={() => setShowConfig(false)} onSaved={refresh} />
      )}

      {/* Modal: Abonar desde una celda / tarjeta */}
      {payCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-text-primary">Registrar Abono</h3>
              <button
                type="button"
                onClick={() => setPayCell(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                ✕
              </button>
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
                  placeholder="Ej. pago de cuota quincenal"
                />
              </div>
              {modalError && (
                <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
                  {modalError}
                </div>
              )}
              <div className="flex justify-end gap-2.5 pt-2">
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
                  className="rounded-xl bg-accent-500 px-5 py-2 text-xs font-semibold text-white hover:bg-accent-400 disabled:opacity-50 transition-colors cursor-pointer"
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
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-text-primary">✏️ Editar Pago</h3>
              <button
                type="button"
                onClick={() => setEditPayment(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              Pago a <strong className="text-text-primary">{editPayment.debtName || 'deuda'}</strong>. El saldo se recalculará automáticamente.
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
              <div className="flex justify-end gap-2.5 pt-2">
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
                  className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
