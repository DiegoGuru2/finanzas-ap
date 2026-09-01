/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Payment Schedule (Cronograma)
 * ═══════════════════════════════════════════
 *
 * Builds a biweekly payment schedule (Quincena 15 + Fin de Mes 30)
 * mapping each debt and recurring expense to the pay period where it
 * should be covered, and computes what remains of the salary on each
 * period ("Lo que queda del sueldo").
 */

import { calculateBenefits } from './benefits';
import { calculateSalaryDetails, normalizeToMonthly } from './cashflow';
import { round } from './constants';
import type { Debt, Expense, Income } from './types';

export type PeriodTiming = 'quincena' | 'fin_de_mes';

export interface ScheduleInput {
  debts: Debt[];
  incomes: Income[];
  expenses: Expense[];
  months?: number; // Horizonte en meses (default 6)
  startDate?: string; // ISO date; default hoy
  includePastCuts?: number; // Cantidad de cortes pasados inmediatos a incluir (default 1)
}

export interface SchedulePeriod {
  key: string; // '2026-09-15'
  date: string; // ISO date
  day: number; // 15 o día de fin de mes
  month: number; // 0-11
  year: number;
  timing: PeriodTiming;
  incomeAvailable: number; // Ingreso que cae en este corte
}

export interface ScheduleRow {
  id: string;
  name: string;
  kind: 'debt' | 'expense';
  category?: string; // Categoría del gasto (para colorear por catálogo en la UI)
  timing: PeriodTiming | 'ambas';
  monthlyAmount: number; // Compromiso mensual
  totalScheduled: number; // Suma en el horizonte
  currentBalance?: number; // Solo deudas
  remainingInstallments?: number | null; // Cuotas restantes estimadas (solo deudas)
  totalInstallments?: number | null; // Cuotas del plan si hasInstallmentPlan (solo deudas)
  payoffPeriodKey?: string | null; // Período donde la deuda queda en 0 (solo deudas)
  cells: Record<string, number>; // periodKey -> monto programado
  installmentNumbers?: Record<string, number>; // periodKey -> número de cuota (solo deudas)
}

export interface PaymentScheduleResult {
  periods: SchedulePeriod[];
  rows: ScheduleRow[];
  totals: Record<string, number>; // periodKey -> total a pagar
  remaining: Record<string, number>; // periodKey -> lo que queda del sueldo
  monthlyIncome: { quincena: number; finDeMes: number };
  monthlyCommitment: { debts: number; expenses: number };
  /** periodKey -> beneficios anuales (décimos, utilidades) que caen en ese corte */
  benefitPayouts: Record<string, { label: string; amount: number }[]>;
}

/**
 * Resolve on which period of the month an item should be paid.
 */
export function resolveTiming(
  paymentTiming: Debt['paymentTiming'],
  dueDay: number
): PeriodTiming {
  if (paymentTiming === 'quincena') return 'quincena';
  if (paymentTiming === 'fin_de_mes') return 'fin_de_mes';
  // 'any' u omitido: se alinea al corte más cercano según el día de vencimiento
  return dueDay >= 1 && dueDay <= 15 ? 'quincena' : 'fin_de_mes';
}

/**
 * Generate the biweekly pay periods (15 y fin de mes) for the horizon.
 */
export function generatePeriods(
  startDateInput: Date,
  months: number,
  monthlyIncome: { quincena: number; finDeMes: number },
  includePastCuts: number = 0
): SchedulePeriod[] {
  const periods: SchedulePeriod[] = [];
  const target = months * 2 + includePastCuts;

  const startDate = new Date(
    startDateInput.getFullYear(),
    startDateInput.getMonth(),
    startDateInput.getDate()
  );

  // Calcular el punto de partida efectivo retrocediendo la cantidad de cortes pasados solicitados
  let effectiveStartDate = new Date(startDate);
  for (let i = 0; i < includePastCuts; i++) {
    const curDay = effectiveStartDate.getDate();
    const curMonth = effectiveStartDate.getMonth();
    const curYear = effectiveStartDate.getFullYear();

    if (curDay > 15) {
      effectiveStartDate = new Date(curYear, curMonth, 15);
    } else {
      const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
      const prevYear = curMonth === 0 ? curYear - 1 : curYear;
      const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      effectiveStartDate = new Date(prevYear, prevMonth, prevMonthLastDay);
    }
  }

  let year = effectiveStartDate.getFullYear();
  let month = effectiveStartDate.getMonth();

  while (periods.length < target) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const finDeMesDay = daysInMonth;

    for (const [day, timing] of [
      [15, 'quincena'],
      [finDeMesDay, 'fin_de_mes'],
    ] as [number, PeriodTiming][]) {
      const date = new Date(year, month, day);
      if (date < effectiveStartDate || periods.length >= target) continue;
      periods.push({
        key: toKey(date),
        date: toKey(date),
        day,
        month,
        year,
        timing,
        incomeAvailable:
          timing === 'quincena' ? monthlyIncome.quincena : monthlyIncome.finDeMes,
      });
    }

    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return periods;
}

/**
 * Build the full payment schedule (Cronograma de pagos).
 */
export function buildPaymentSchedule(input: ScheduleInput): PaymentScheduleResult {
  const months = Math.min(Math.max(input.months ?? 6, 1), 24);
  const startDate = input.startDate ? new Date(`${input.startDate}T00:00:00`) : new Date();
  startDate.setHours(0, 0, 0, 0);
  const includePastCuts =
    input.includePastCuts !== undefined
      ? input.includePastCuts
      : input.startDate
        ? 0
        : 1;

  // ─── Ingreso por corte ───
  let quincenaIncome = 0;
  let finDeMesIncome = 0;
  for (const inc of input.incomes) {
    if (inc.frequency === 'once') continue; // Los únicos se colocan por fecha más abajo
    if (inc.isSalary) {
      const details = calculateSalaryDetails(inc);
      quincenaIncome += details.quincenaAmount;
      finDeMesIncome += details.finDeMesAmount;
      // Beneficios de ley mensualizados llegan con el rol de fin de mes
      finDeMesIncome += calculateBenefits(inc).monthlyRecurring;
    } else {
      finDeMesIncome += normalizeToMonthly(inc.amount, inc.frequency);
    }
  }

  const periods = generatePeriods(
    startDate,
    months,
    {
      quincena: round(quincenaIncome),
      finDeMes: round(finDeMesIncome),
    },
    includePastCuts
  );

  // ─── Beneficios anuales (décimos no mensualizados, utilidades) en su mes legal ───
  const benefitPayouts: Record<string, { label: string; amount: number }[]> = {};
  for (const inc of input.incomes) {
    if (inc.frequency === 'once' || !inc.isSalary) continue;
    for (const payout of calculateBenefits(inc).annualPayouts) {
      for (const period of periods) {
        if (period.month !== payout.month || period.timing !== payout.timing) continue;
        period.incomeAvailable = round(period.incomeAvailable + payout.amount);
        (benefitPayouts[period.key] ??= []).push({
          label: payout.label,
          amount: payout.amount,
        });
      }
    }
  }

  // ─── Ingresos únicos (décimos, fondos de reserva, bonos) en su corte ───
  for (const inc of input.incomes) {
    if (inc.frequency !== 'once' || !inc.date || inc.amount <= 0) continue;
    const d = new Date(`${String(inc.date).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const timing: PeriodTiming = d.getDate() <= 15 ? 'quincena' : 'fin_de_mes';
    const period = periods.find(
      (p) => p.year === d.getFullYear() && p.month === d.getMonth() && p.timing === timing
    );
    if (period) period.incomeAvailable = round(period.incomeAvailable + inc.amount);
  }

  const rows: ScheduleRow[] = [];

  // ─── Deudas: una cuota al mes en su corte ───
  // Con plan de cuotas activo, la cuota mensual es saldo / número de cuotas;
  // si no, se usa el pago mínimo registrado.
  for (const debt of input.debts) {
    const hasPlan = !!debt.hasInstallmentPlan && (debt.termMonths ?? 0) > 0;
    const planMonths = hasPlan ? (debt.termMonths as number) : 0;
    const monthlyDue = hasPlan
      ? round(debt.currentBalance / planMonths)
      : debt.minimumPayment;

    if (debt.currentBalance <= 0 || monthlyDue <= 0) continue;

    const timing = resolveTiming(debt.paymentTiming, debt.dueDay);
    const cells: Record<string, number> = {};
    const installmentNumbers: Record<string, number> = {};
    let remaining = debt.currentBalance;
    let totalScheduled = 0;
    let payoffPeriodKey: string | null = null;
    let installment = 0;

    for (const period of periods) {
      if (period.timing !== timing || remaining <= 0) continue;
      installment += 1;
      // La última cuota del plan absorbe el residuo de redondeo
      const isLastPlanInstallment = hasPlan && installment === planMonths;
      const amount = isLastPlanInstallment
        ? round(remaining)
        : round(Math.min(monthlyDue, remaining));
      cells[period.key] = amount;
      installmentNumbers[period.key] = installment;
      totalScheduled += amount;
      remaining = round(remaining - amount);
      if (remaining <= 0) payoffPeriodKey = period.key;
    }

    rows.push({
      id: debt.id,
      name: debt.name,
      kind: 'debt',
      timing,
      monthlyAmount: round(monthlyDue),
      totalScheduled: round(totalScheduled),
      currentBalance: round(debt.currentBalance),
      remainingInstallments: hasPlan
        ? planMonths
        : Math.ceil(debt.currentBalance / monthlyDue),
      totalInstallments: hasPlan ? planMonths : null,
      payoffPeriodKey,
      cells,
      installmentNumbers,
    });
  }

  // ─── Gastos recurrentes: según su corte de pago ───
  // 'quincena': todo el 15 · 'fin_de_mes': todo el 30 · 'ambas': repartido 50/50
  for (const expense of input.expenses) {
    const monthly = round(normalizeToMonthly(expense.amount, expense.frequency));
    if (monthly <= 0) continue;

    const timing = expense.paymentTiming ?? 'ambas';
    const half = round(monthly / 2);
    const cells: Record<string, number> = {};
    let totalScheduled = 0;

    // Vigencia: el gasto solo aparece dentro de su rango de fechas
    const from = expense.activeFrom ? String(expense.activeFrom).slice(0, 10) : null;
    const until = expense.activeUntil ? String(expense.activeUntil).slice(0, 10) : null;

    for (const period of periods) {
      if (from && period.date < from) continue;
      if (until && period.date > until) continue;
      let amount = 0;
      if (timing === 'ambas') {
        amount = period.timing === 'quincena' ? half : round(monthly - half);
      } else if (period.timing === timing) {
        amount = monthly;
      }
      if (amount <= 0) continue;
      cells[period.key] = amount;
      totalScheduled += amount;
    }

    rows.push({
      id: expense.id,
      name: expense.name,
      kind: 'expense',
      category: expense.category,
      timing,
      monthlyAmount: monthly,
      totalScheduled: round(totalScheduled),
      cells,
    });
  }

  // ─── Totales y "Lo que queda del sueldo" por corte ───
  const totals: Record<string, number> = {};
  const remaining: Record<string, number> = {};
  for (const period of periods) {
    const total = rows.reduce((sum, row) => sum + (row.cells[period.key] ?? 0), 0);
    totals[period.key] = round(total);
    remaining[period.key] = round(period.incomeAvailable - total);
  }

  const monthlyDebts = rows
    .filter((r) => r.kind === 'debt')
    .reduce((sum, r) => sum + r.monthlyAmount, 0);
  const monthlyExpenses = rows
    .filter((r) => r.kind === 'expense')
    .reduce((sum, r) => sum + r.monthlyAmount, 0);

  return {
    periods,
    rows,
    totals,
    remaining,
    monthlyIncome: { quincena: round(quincenaIncome), finDeMes: round(finDeMesIncome) },
    monthlyCommitment: { debts: round(monthlyDebts), expenses: round(monthlyExpenses) },
    benefitPayouts,
  };
}

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
