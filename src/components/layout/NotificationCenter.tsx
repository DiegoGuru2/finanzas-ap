import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';
import { notifyFinancialSync } from '@/stores/sync';
import { Calendar, Bell, AlertTriangle, AlertCircle, Clock, Sparkles } from 'lucide-react';

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

interface SystemAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const localIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'cut' | 'alerts'>('cut');
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [paid, setPaid] = useState<Record<string, Record<string, number>>>({});
  const [paidExpenses, setPaidExpenses] = useState<Record<string, Record<string, number>>>({});
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const containerRef = useRef<HTMLDivElement>(null);

  // Modal para abonar rápido desde la notificación
  const [quickPayDebt, setQuickPayDebt] = useState<{ id: string; name: string; amount: number; date: string } | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState(0);
  const [quickPayDate, setQuickPayDate] = useState('');
  const [quickPayNotes, setQuickPayNotes] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedule?months=3');
      const json = await res.json();
      if (res.ok && json.data) {
        setSchedule(json.data.schedule);
        setPaid(json.data.paid || {});
        setPaidExpenses(json.data.paidExpenses || {});
      }
    } catch (e) {
      console.error('Error fetching schedule for notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const json = await res.json();
      if (res.ok && json.data) {
        setSystemAlerts(json.data);
        setUnreadAlertsCount(json.unreadCount || 0);
      }
    } catch (e) {
      console.error('Error fetching alerts:', e);
    }
  };

  const handleMarkAllAlertsRead = async () => {
    try {
      await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchAlerts();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    // Escuchar el bus de sincronización reactivo entre islas
    const handleSync = () => {
      fetchSchedule();
      fetchAlerts();
    };

    window.addEventListener('finanzas:sync', handleSync);
    return () => window.removeEventListener('finanzas:sync', handleSync);
  }, []);

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calcular datos del próximo corte y alertas
  const todayIso = localIso(new Date());
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const nextPeriod = schedule?.periods.find((p) => p.date >= todayIso) || schedule?.periods[0];
  const nextKey = nextPeriod?.key || '';

  // Calcular diferencia en días
  let daysDiff = 0;
  if (nextPeriod) {
    const pDate = new Date(`${nextPeriod.date}T00:00:00`);
    const diffTime = pDate.getTime() - todayDate.getTime();
    daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Deudas y compromisos del próximo corte
  const debtRows = schedule?.rows.filter((r) => r.kind === 'debt') || [];
  const expenseRows = schedule?.rows.filter((r) => r.kind === 'expense') || [];

  const activeDebtsInCut = debtRows.filter((r) => (r.cells[nextKey] || 0) > 0 || paid[r.id]?.[nextKey] !== undefined);
  const activeExpensesInCut = expenseRows.filter((r) => (r.cells[nextKey] || 0) > 0 || paidExpenses[r.id]?.[nextKey] !== undefined);

  const isDebtCompleted = (r: ScheduleRow) => {
    const cellAmount = r.cells[nextKey] || 0;
    const paidVal = paid[r.id]?.[nextKey];
    if (paidVal === undefined) return false;
    if (cellAmount === 0) return true;
    return paidVal >= cellAmount - 0.01;
  };

  const paidDebtsInCut = activeDebtsInCut.filter(isDebtCompleted);
  const pendingDebtsInCut = activeDebtsInCut.filter((r) => !isDebtCompleted(r));

  const totalToPayInCut = schedule?.totals[nextKey] ?? 0;
  const incomeInCut = nextPeriod?.incomeAvailable ?? 0;
  const remainingInCut = schedule?.remaining[nextKey] ?? 0;

  // Conteo total de notificaciones pendientes
  const pendingCount = pendingDebtsInCut.length;
  const totalBadgeCount = pendingCount + unreadAlertsCount;
  const hasUrgentAlert = daysDiff <= 3 && pendingCount > 0;

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones de escritorio.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted' && nextPeriod) {
        new Notification('ProyecAhorro: Alertas activadas', {
          body: `Próximo corte: ${nextPeriod.day} de ${MONTH_SHORT[nextPeriod.month]}. Tienes ${pendingCount} pagos pendientes. Te quedarán ${formatCurrency(remainingInCut)} libres.`,
          icon: '/images/logo-icon.png',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openQuickPay = (row: ScheduleRow, defaultAmount?: number) => {
    if (!nextPeriod) return;
    const fullAmount = row.cells[nextKey] || 0;
    const paidVal = paid[row.id]?.[nextKey] || 0;
    const rem =
      defaultAmount !== undefined
        ? defaultAmount
        : paidVal > 0
          ? Math.max(0, Math.round((fullAmount - paidVal) * 100) / 100)
          : fullAmount;
    const amount = rem > 0 ? rem : fullAmount;
    setQuickPayDebt({ id: row.id, name: row.name, amount, date: nextPeriod.date });
    setQuickPayAmount(amount);
    setQuickPayDate(todayIso);
    setQuickPayNotes(paidVal > 0 ? `Abono restante (${formatCurrency(paidVal)} ya abonados)` : '');
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayDebt) return;
    setSubmittingPay(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId: quickPayDebt.id,
          amount: Number(quickPayAmount),
          type: 'minimum',
          paidAt: quickPayDate,
          notes: quickPayNotes,
        }),
      });
      if (res.ok) {
        setQuickPayDebt(null);
        await Promise.all([fetchSchedule(), fetchAlerts()]);
        // Emitir sincronización a las demás islas (DebtsManager, PaymentsView, Dashboard)
        notifyFinancialSync();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleToggleExpensePay = async (expenseId: string, amount: number) => {
    if (!nextPeriod) return;
    try {
      const isPaid = paidExpenses[expenseId]?.[nextKey] !== undefined;
      setPaidExpenses((prev) => {
        const next = { ...prev };
        if (isPaid) {
          if (next[expenseId]) {
            const copy = { ...next[expenseId] };
            delete copy[nextKey];
            next[expenseId] = copy;
          }
        } else {
          next[expenseId] = { ...(next[expenseId] || {}), [nextKey]: amount };
        }
        return next;
      });

      await fetch('/api/expenses/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId,
          periodKey: nextKey,
          amount,
          paidAt: nextPeriod.date,
          toggle: true,
        }),
      });
      await fetchSchedule();
      notifyFinancialSync();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Botón Campana con Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-100 hover:text-text-primary cursor-pointer"
        title="Centro de Notificaciones y Alertas Financieras"
        aria-label="Ver alertas"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge contador de alertas pendientes */}
        {totalBadgeCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ${
              hasUrgentAlert ? 'bg-danger-500 animate-pulse' : 'bg-brand-500'
            }`}
          >
            {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable / Modal de Notificaciones */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full z-[100] mt-1 w-[calc(100vw-1rem)] sm:w-[420px] max-w-sm rounded-2xl border border-border-default bg-surface-50 shadow-2xl overflow-hidden animate-fade-up">
          {/* Header del panel con Selector de Tabs */}
          <div className="border-b border-border-default bg-surface-100/50">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-ping"></span>
                <h3 className="font-bold text-sm text-text-primary">Notificaciones y Alertas</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar notificaciones"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Pestañas / Tabs */}
            <div className="flex border-t border-border-default/60 px-2 pt-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('cut')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer ${
                  activeTab === 'cut'
                    ? 'bg-surface-50 text-brand-400 border-t-2 border-brand-500'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Próximo Corte</span>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-brand-500/20 px-1.5 py-0.2 text-[10px] font-bold text-brand-400">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer ${
                  activeTab === 'alerts'
                    ? 'bg-surface-50 text-brand-400 border-t-2 border-brand-500'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Alertas del Sistema</span>
                {unreadAlertsCount > 0 && (
                  <span className="rounded-full bg-danger-500/20 px-1.5 py-0.2 text-[10px] font-bold text-danger-400">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-4 space-y-4">
            {activeTab === 'cut' ? (
              loading ? (
                <div className="py-6 text-center text-xs text-text-muted">Cargando compromisos del corte...</div>
              ) : nextPeriod ? (
                <>
                  {/* Banner de Estado del Próximo Corte */}
                  <div
                    className={`rounded-xl border p-3.5 space-y-2.5 ${
                      daysDiff === 0
                        ? 'border-danger-500/30 bg-danger-500/10'
                        : daysDiff <= 3
                          ? 'border-warning-500/30 bg-warning-500/10'
                          : 'border-brand-500/30 bg-brand-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          daysDiff === 0
                            ? 'text-danger-400'
                            : daysDiff <= 3
                              ? 'text-warning-400'
                              : 'text-brand-400'
                        }`}
                      >
                        {daysDiff === 0 ? (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            <span>¡Hoy es el corte de pago!</span>
                          </>
                        ) : daysDiff === 1 ? (
                          <>
                            <Clock className="h-4 w-4" />
                            <span>El corte es mañana</span>
                          </>
                        ) : (
                          <>
                            <Calendar className="h-4 w-4" />
                            <span>Corte en {daysDiff} días</span>
                          </>
                        )}
                      </span>
                      <span className="text-[11px] font-semibold text-text-secondary">
                        {nextPeriod.day} de {MONTH_NAMES[nextPeriod.month]}
                      </span>
                    </div>

                    {/* Resumen monetario del corte */}
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-50/80 p-2 text-center text-[11px] border border-border-default/60">
                      <div>
                        <span className="text-text-muted block text-[10px]">Ingreso</span>
                        <span className="font-bold text-text-primary block">{formatCurrency(incomeInCut)}</span>
                      </div>
                      <div>
                        <span className="text-warning-400 block text-[10px]">Total a pagar</span>
                        <span className="font-bold text-warning-400 block">{formatCurrency(totalToPayInCut)}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Te sobra</span>
                        <span
                          className={`font-bold block ${
                            remainingInCut < 0 ? 'text-danger-400' : 'text-accent-400'
                          }`}
                        >
                          {formatCurrency(remainingInCut)}
                        </span>
                      </div>
                    </div>

                    {/* Frase explicativa del saldo */}
                    <p className="text-xs text-text-secondary leading-snug">
                      {remainingInCut >= 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-accent-400 shrink-0" />
                          <span>Te quedarán <strong className="text-accent-400 font-bold">{formatCurrency(remainingInCut)}</strong> libres en tu cuenta tras cumplir los compromisos de esta quincena.</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-danger-400 shrink-0" />
                          <span><strong className="text-danger-400 font-bold">Atención:</strong> Faltan {formatCurrency(Math.abs(remainingInCut))} para cubrir todos los pagos de este corte.</span>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Deudas del Corte */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text-primary">
                        Deudas a pagar ({pendingDebtsInCut.length} pendientes)
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {paidDebtsInCut.length}/{activeDebtsInCut.length} listos
                      </span>
                    </div>

                    {activeDebtsInCut.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border-default p-3 text-center text-xs text-text-muted">
                        No tienes deudas programadas en este corte.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeDebtsInCut.map((debt) => {
                          const amount = debt.cells[nextKey] || 0;
                          const paidAmount = paid[debt.id]?.[nextKey];
                          const isPaid = paidAmount !== undefined;
                          const isPartial = isPaid && amount > 0 && paidAmount < amount;

                          return (
                            <div
                              key={debt.id}
                              className={`flex flex-col rounded-xl border p-2.5 text-xs transition-colors gap-1.5 ${
                                isPaid
                                  ? 'border-accent-500/30 bg-accent-500/5'
                                  : 'border-border-default bg-surface-100/60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                  <div className="font-semibold text-text-primary truncate">{debt.name}</div>
                                  <div className="text-[10px] text-text-muted">
                                    {amount > 0 ? `Cuota programada: ${formatCurrency(amount)}` : 'Sin cuota fija requerida'}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5">
                                  {isPaid && !isPartial ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/15 border border-accent-500/30 px-2 py-0.5 text-[10px] font-bold text-accent-400">
                                      ✓ Pagado ({formatCurrency(paidAmount)})
                                    </span>
                                  ) : isPaid && isPartial ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 rounded-md bg-warning-500/15 border border-warning-500/30 px-2 py-0.5 text-[10px] font-bold text-warning-400">
                                        ✓ Abono: {formatCurrency(paidAmount)}
                                      </span>
                                      <button
                                        onClick={() =>
                                          openQuickPay(debt, Math.max(0, Math.round((amount - paidAmount) * 100) / 100))
                                        }
                                        className="rounded-lg bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-brand-400 transition-colors cursor-pointer"
                                        title="Abonar el resto"
                                      >
                                        Abonar resto
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => openQuickPay(debt)}
                                      className="rounded-lg bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-400 transition-colors cursor-pointer"
                                    >
                                      Abonar
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Información detallada de abono y saldo restante */}
                              {isPaid && isPartial && (
                                <div className="flex items-center justify-between text-[10px] bg-warning-500/10 border border-warning-500/20 rounded-lg px-2 py-1 text-warning-400 font-medium">
                                  <span>Resta por cubrir en corte:</span>
                                  <strong>{formatCurrency(amount - paidAmount)}</strong>
                                </div>
                              )}

                              {debt.currentBalance !== undefined && (
                                <div className="text-[10px] text-text-muted flex items-center justify-between border-t border-border-default/40 pt-1">
                                  <span>Saldo pendiente total deuda:</span>
                                  <span className="font-semibold text-text-secondary">{formatCurrency(debt.currentBalance)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Gastos Recurrentes del Corte */}
                  {activeExpensesInCut.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border-default/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-primary">
                          Gastos Recurrentes ({activeExpensesInCut.length})
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {activeExpensesInCut.map((exp) => {
                          const amount = exp.cells[nextKey] || 0;
                          const isPaid = paidExpenses[exp.id]?.[nextKey] !== undefined;

                          return (
                            <div
                              key={exp.id}
                              className={`flex items-center justify-between rounded-xl border p-2 text-xs transition-colors ${
                                isPaid
                                  ? 'border-accent-500/30 bg-accent-500/5'
                                  : 'border-border-default bg-surface-100/60'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className={`font-semibold truncate ${isPaid ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                  {exp.name}
                                </div>
                                <div className="text-[10px] text-text-muted">
                                  {formatCurrency(amount)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleExpensePay(exp.id, amount)}
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  isPaid
                                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                                    : 'bg-surface-200 text-text-secondary hover:bg-accent-500/15 hover:text-accent-400 border border-border-default'
                                }`}
                              >
                                {isPaid ? '✓ Pagado' : 'Marcar pagado'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Botones de acción útiles */}
                  <div className="space-y-2 pt-1 border-t border-border-default/60">
                    {permissionStatus !== 'granted' && (
                      <button
                        onClick={requestNotificationPermission}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-400 hover:bg-brand-500/20 transition-colors cursor-pointer"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Activar Alertas en el Navegador
                      </button>
                    )}

                    <a
                      href="/app/payments"
                      className="block text-center text-xs font-semibold text-brand-400 hover:underline pt-1"
                    >
                      Ver Cronograma Completo →
                    </a>
                  </div>
                </>
              ) : null
            ) : (
              /* Pestaña: Alertas del Sistema Persistidas */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-text-secondary">
                    Alertas Registradas ({systemAlerts.length})
                  </span>
                  {unreadAlertsCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAlertsRead}
                      className="text-[11px] font-bold text-brand-400 hover:underline cursor-pointer"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>

                {systemAlerts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-muted rounded-xl border border-dashed border-border-default">
                    No tienes alertas registradas en este momento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {systemAlerts.map((al) => {
                      const getAlertIcon = (type: string) => {
                        switch (type) {
                          case 'debt_cleared':
                            return (
                              <span className="p-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </span>
                            );
                          case 'payment':
                          case 'expense_paid':
                            return (
                              <span className="p-1 rounded-lg bg-accent-500/15 text-accent-400 border border-accent-500/30 shrink-0">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </span>
                            );
                          case 'due_reminder':
                            return (
                              <span className="p-1 rounded-lg bg-warning-500/15 text-warning-400 border border-warning-500/30 shrink-0">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                  <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </span>
                            );
                          case 'payment_reversed':
                          case 'expense_unpaid':
                            return (
                              <span className="p-1 rounded-lg bg-danger-500/15 text-danger-400 border border-danger-500/30 shrink-0">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </span>
                            );
                          default:
                            return (
                              <span className="p-1 rounded-lg bg-brand-500/15 text-brand-400 border border-brand-500/30 shrink-0">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                              </span>
                            );
                        }
                      };

                      return (
                        <div
                          key={al.id}
                          className={`relative flex flex-col gap-1 rounded-xl border p-3 text-xs transition-colors ${
                            al.isRead
                              ? 'border-border-default bg-surface-100/40 opacity-75'
                              : 'border-brand-500/30 bg-brand-500/5 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-text-primary flex items-center gap-2">
                              {getAlertIcon(al.type)}
                              {!al.isRead && (
                                <span className="h-2 w-2 rounded-full bg-brand-400 shrink-0 animate-pulse" />
                              )}
                              <span>{al.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteAlert(al.id)}
                              className="text-text-muted hover:text-danger-400 p-0.5 rounded cursor-pointer transition-colors"
                              title="Eliminar alerta"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-text-secondary leading-snug pl-7">{al.message}</p>
                          <div className="text-[10px] text-text-muted pt-1 pl-7">
                            {new Date(al.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Abono Rápido */}
      {quickPayDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Registrar Abono</h3>
              <button
                onClick={() => setQuickPayDebt(null)}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1 rounded-lg hover:bg-surface-100 transition-colors"
                title="Cerrar"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              Abono de <strong className="text-text-primary">{quickPayDebt.name}</strong> para el corte actual.
            </p>
            <form onSubmit={handleQuickPaySubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha</label>
                <input
                  type="date"
                  value={quickPayDate}
                  onChange={(e) => setQuickPayDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickPayDebt(null)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="rounded-xl bg-accent-500 px-4 py-2 text-xs font-semibold text-white hover:bg-accent-400 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submittingPay ? 'Guardando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
