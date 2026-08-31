import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';
import { generateIcsCalendar, downloadIcsFile } from '@/lib/calendar';

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
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [paid, setPaid] = useState<Record<string, Record<string, number>>>({});
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
      }
    } catch (e) {
      console.error('Error fetching schedule for notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
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
  const activeExpensesInCut = expenseRows.filter((r) => (r.cells[nextKey] || 0) > 0);

  const paidDebtsInCut = activeDebtsInCut.filter((r) => paid[r.id]?.[nextKey] !== undefined);
  const pendingDebtsInCut = activeDebtsInCut.filter((r) => paid[r.id]?.[nextKey] === undefined);

  const totalToPayInCut = schedule?.totals[nextKey] ?? 0;
  const incomeInCut = nextPeriod?.incomeAvailable ?? 0;
  const remainingInCut = schedule?.remaining[nextKey] ?? 0;

  // Conteo de notificaciones / alertas
  const pendingCount = pendingDebtsInCut.length;
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
        new Notification('🔔 ProyecAhorro: Alertas activadas', {
          body: `Próximo corte: ${nextPeriod.day} de ${MONTH_SHORT[nextPeriod.month]}. Tienes ${pendingCount} pagos pendientes. Te quedarán ${formatCurrency(remainingInCut)} libres.`,
          icon: '/images/logo-icon.png',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCalendar = () => {
    if (!schedule) return;
    const events = schedule.periods.map((p) => {
      const pDebts = debtRows.filter((r) => (r.cells[p.key] || 0) > 0);
      const pExp = expenseRows.filter((r) => (r.cells[p.key] || 0) > 0);
      const toPay = schedule.totals[p.key] || 0;
      const left = schedule.remaining[p.key] || 0;

      const debtList = pDebts.map((d) => `• ${d.name}: ${formatCurrency(d.cells[p.key])}`).join('\n');
      const expList = pExp.map((e) => `• ${e.name}: ${formatCurrency(e.cells[p.key])}`).join('\n');

      const desc = [
        `📅 Corte de Pagos ProyecAhorro (${p.timing === 'quincena' ? 'Día 15' : 'Fin de mes'})`,
        `💰 Ingreso disponible: ${formatCurrency(p.incomeAvailable)}`,
        `💳 Total a pagar: ${formatCurrency(toPay)}`,
        `💵 Lo que te queda: ${formatCurrency(left)}`,
        '',
        '--- DEUDAS ---',
        debtList || 'Ninguna',
        '',
        '--- GASTOS ---',
        expList || 'Ninguno',
      ].join('\n');

      return {
        title: `💳 ProyecAhorro: Corte de Pagos (${formatCurrency(toPay)})`,
        description: desc,
        date: p.date,
        amount: toPay,
      };
    });

    const ics = generateIcsCalendar(events);
    downloadIcsFile(ics);
  };

  const openQuickPay = (row: ScheduleRow) => {
    if (!nextPeriod) return;
    const amount = row.cells[nextKey] || 0;
    setQuickPayDebt({ id: row.id, name: row.name, amount, date: nextPeriod.date });
    setQuickPayAmount(amount);
    setQuickPayDate(todayIso);
    setQuickPayNotes('');
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
        fetchSchedule();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingPay(false);
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
        {pendingCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ${
              hasUrgentAlert ? 'bg-danger-500 animate-pulse' : 'bg-brand-500'
            }`}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable / Modal de Notificaciones */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full z-50 mt-1 w-[calc(100vw-1rem)] sm:w-96 max-w-sm rounded-2xl border border-border-default bg-surface-50 shadow-2xl overflow-hidden animate-fade-up">
          {/* Header del panel */}
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3 bg-surface-100/50">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-brand-500"></span>
              <h3 className="font-bold text-sm text-text-primary">Alertas y Recordatorios</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-text-primary text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="py-6 text-center text-xs text-text-muted">Cargando alertas...</div>
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
                          : `📅 Corte en ${daysDiff} días`}
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
                      <>
                        🎉 Te quedarán <strong className="text-accent-400 font-bold">{formatCurrency(remainingInCut)}</strong> libres en tu cuenta tras cumplir los compromisos de esta quincena.
                      </>
                    ) : (
                      <>
                        ⚠️ <strong className="text-danger-400 font-bold">Atención:</strong> Faltan {formatCurrency(Math.abs(remainingInCut))} para cubrir todos los pagos de este corte.
                      </>
                    )}
                  </p>
                </div>

                {/* Pagos Pendientes del Corte */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">
                      Pagos que debes realizar ({pendingDebtsInCut.length} pendientes)
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
                    <div className="space-y-1.5">
                      {activeDebtsInCut.map((debt) => {
                        const amount = debt.cells[nextKey] || 0;
                        const isPaid = paid[debt.id]?.[nextKey] !== undefined;

                        return (
                          <div
                            key={debt.id}
                            className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors ${
                              isPaid
                                ? 'border-accent-500/20 bg-accent-500/5'
                                : 'border-border-default bg-surface-100/60'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold text-text-primary truncate">{debt.name}</div>
                              <div className="text-[10px] text-text-muted">
                                Cuota: {formatCurrency(amount)}
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/15 px-2 py-0.5 text-[10px] font-bold text-accent-400">
                                  ✓ Pagado
                                </span>
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
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Botones de acción útiles */}
                <div className="space-y-2 pt-1 border-t border-border-default/60">
                  {/* Activar notificaciones del navegador */}
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

                  {/* Exportar a Calendario con alarmas */}
                  <button
                    onClick={handleExportCalendar}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Exportar Alarmas a Google / Apple Calendar
                  </button>

                  {/* Enlace al Cronograma completo */}
                  <a
                    href="/app/payments"
                    className="block text-center text-xs font-semibold text-brand-400 hover:underline pt-1"
                  >
                    Ver Cronograma Completo →
                  </a>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal de Abono Rápido */}
      {quickPayDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Registrar Abono</h3>
              <button onClick={() => setQuickPayDebt(null)} className="text-text-muted hover:text-text-primary cursor-pointer p-1">✕</button>
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
