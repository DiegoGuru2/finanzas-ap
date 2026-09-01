/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Payment Schedule Tests
 * ═══════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  buildPaymentSchedule,
  generatePeriods,
  resolveTiming,
} from '@/modules/financial-engine/schedule';
import type { Debt, Expense, Income } from '@/modules/financial-engine/types';

const salary: Income = {
  id: 'inc-1',
  name: 'Sueldo',
  amount: 900,
  frequency: 'monthly',
  isSalary: true,
  deductIess: true,
  iessPercentage: 9.45,
  paymentScheme: 'quincena_fin_mes',
  quincenaAmount: 360,
};

const baseDebt: Debt = {
  id: 'debt-1',
  name: 'Maestría UNIR',
  currentBalance: 3018.34,
  originalBalance: 3018.34,
  apr: 0,
  minimumPayment: 219.54,
  dueDay: 25,
  type: 'student_loan',
  paymentTiming: 'fin_de_mes',
};

describe('resolveTiming', () => {
  it('respects explicit quincena/fin_de_mes timing', () => {
    expect(resolveTiming('quincena', 28)).toBe('quincena');
    expect(resolveTiming('fin_de_mes', 5)).toBe('fin_de_mes');
  });

  it('maps "any" by due day: 1-15 quincena, 16+ fin de mes', () => {
    expect(resolveTiming('any', 10)).toBe('quincena');
    expect(resolveTiming('any', 25)).toBe('fin_de_mes');
  });
});

describe('generatePeriods', () => {
  it('generates two periods per month starting from startDate', () => {
    const periods = generatePeriods(new Date(2026, 8, 1), 3, { quincena: 360, finDeMes: 400 });

    expect(periods).toHaveLength(6);
    expect(periods[0].key).toBe('2026-09-15');
    expect(periods[0].timing).toBe('quincena');
    expect(periods[1].key).toBe('2026-09-30');
    expect(periods[1].timing).toBe('fin_de_mes');
    expect(periods[periods.length - 1].key).toBe('2026-11-30');
  });

  it('skips periods before startDate but still returns the full horizon', () => {
    const periods = generatePeriods(new Date(2026, 8, 20), 2, { quincena: 360, finDeMes: 400 });

    expect(periods).toHaveLength(4);
    expect(periods[0].key).toBe('2026-09-30');
    expect(periods[1].key).toBe('2026-10-15');
  });

  it('uses the last day of February for fin de mes', () => {
    const periods = generatePeriods(new Date(2027, 1, 1), 1, { quincena: 0, finDeMes: 0 });

    expect(periods[1].key).toBe('2027-02-28');
    expect(periods[1].timing).toBe('fin_de_mes');
  });

  it('assigns quincena and fin de mes income to their periods', () => {
    const periods = generatePeriods(new Date(2026, 8, 1), 1, { quincena: 360, finDeMes: 406.95 });

    expect(periods[0].incomeAvailable).toBe(360);
    expect(periods[1].incomeAvailable).toBe(406.95);
  });

  it('includes the 31st when startDate is the 31st of the month', () => {
    // 2026-08-31
    const periods = generatePeriods(new Date(2026, 7, 31), 1, { quincena: 360, finDeMes: 400 });

    expect(periods[0].key).toBe('2026-08-31');
    expect(periods[0].day).toBe(31);
    expect(periods[0].timing).toBe('fin_de_mes');
    expect(periods[1].key).toBe('2026-09-15');
  });
});

describe('buildPaymentSchedule', () => {
  it('places debt minimum payment once per month on its timing', () => {
    const result = buildPaymentSchedule({
      debts: [baseDebt],
      incomes: [salary],
      expenses: [],
      months: 3,
      startDate: '2026-09-01',
    });

    const row = result.rows[0];
    expect(row.kind).toBe('debt');
    expect(row.cells['2026-09-15']).toBeUndefined();
    expect(row.cells['2026-09-30']).toBe(219.54);
    expect(row.cells['2026-10-31']).toBe(219.54);
    expect(row.cells['2026-11-30']).toBe(219.54);
  });

  it('caps the last installment to the remaining balance and marks payoff', () => {
    const result = buildPaymentSchedule({
      debts: [{ ...baseDebt, currentBalance: 300, minimumPayment: 200 }],
      incomes: [salary],
      expenses: [],
      months: 3,
      startDate: '2026-09-01',
    });

    const row = result.rows[0];
    expect(row.cells['2026-09-30']).toBe(200);
    expect(row.cells['2026-10-31']).toBe(100);
    expect(row.cells['2026-11-30']).toBeUndefined();
    expect(row.payoffPeriodKey).toBe('2026-10-31');
    expect(row.remainingInstallments).toBe(2);
  });

  it('splits recurring expenses across both periods of the month', () => {
    const pasaje: Expense = {
      id: 'exp-1',
      name: 'Pasaje',
      amount: 60,
      category: 'transport',
      isEssential: true,
      frequency: 'monthly',
    };

    const result = buildPaymentSchedule({
      debts: [],
      incomes: [salary],
      expenses: [pasaje],
      months: 1,
      startDate: '2026-09-01',
    });

    const row = result.rows[0];
    expect(row.cells['2026-09-15']).toBe(30);
    expect(row.cells['2026-09-30']).toBe(30);
    expect(row.totalScheduled).toBe(60);
  });

  it('computes "lo que queda del sueldo" per period', () => {
    const result = buildPaymentSchedule({
      debts: [{ ...baseDebt, paymentTiming: 'quincena', minimumPayment: 100 }],
      incomes: [salary],
      expenses: [],
      months: 1,
      startDate: '2026-09-01',
    });

    // Neto: 900 - 9.45% = 814.95 → quincena 360, fin de mes 454.95
    expect(result.monthlyIncome.quincena).toBe(360);
    expect(result.monthlyIncome.finDeMes).toBe(454.95);
    expect(result.remaining['2026-09-15']).toBe(260);
    expect(result.remaining['2026-09-30']).toBe(454.95);
  });

  it('flags deficit periods with negative remaining', () => {
    const result = buildPaymentSchedule({
      debts: [{ ...baseDebt, paymentTiming: 'quincena', minimumPayment: 500 }],
      incomes: [salary],
      expenses: [],
      months: 1,
      startDate: '2026-09-01',
    });

    expect(result.remaining['2026-09-15']).toBe(-140);
  });

  it('derives the monthly installment from balance / termMonths when the plan is active', () => {
    const result = buildPaymentSchedule({
      debts: [
        {
          ...baseDebt,
          currentBalance: 1000,
          minimumPayment: 50, // se ignora con plan activo
          hasInstallmentPlan: true,
          termMonths: 3,
        },
      ],
      incomes: [salary],
      expenses: [],
      months: 4,
      startDate: '2026-09-01',
    });

    const row = result.rows[0];
    expect(row.monthlyAmount).toBe(333.33);
    expect(row.totalInstallments).toBe(3);
    expect(row.cells['2026-09-30']).toBe(333.33);
    expect(row.cells['2026-10-31']).toBe(333.33);
    // La última cuota absorbe el residuo de redondeo
    expect(row.cells['2026-11-30']).toBe(333.34);
    expect(row.cells['2026-12-31']).toBeUndefined();
    expect(row.payoffPeriodKey).toBe('2026-11-30');
    expect(row.installmentNumbers?.['2026-10-31']).toBe(2);
    expect(row.totalScheduled).toBe(1000);
  });

  it('places an expense only on its configured corte', () => {
    const guardar: Expense = {
      id: 'exp-15',
      name: 'Guardar maestría',
      amount: 150,
      category: 'savings',
      isEssential: true,
      frequency: 'monthly',
      paymentTiming: 'quincena',
    };
    const panales: Expense = {
      id: 'exp-30',
      name: 'Pañales',
      amount: 30,
      category: 'health',
      isEssential: true,
      frequency: 'monthly',
      paymentTiming: 'fin_de_mes',
    };

    const result = buildPaymentSchedule({
      debts: [],
      incomes: [salary],
      expenses: [guardar, panales],
      months: 1,
      startDate: '2026-09-01',
    });

    const rowGuardar = result.rows.find((r) => r.id === 'exp-15')!;
    const rowPanales = result.rows.find((r) => r.id === 'exp-30')!;
    expect(rowGuardar.cells['2026-09-15']).toBe(150);
    expect(rowGuardar.cells['2026-09-30']).toBeUndefined();
    expect(rowPanales.cells['2026-09-15']).toBeUndefined();
    expect(rowPanales.cells['2026-09-30']).toBe(30);
  });

  it('respects an expense date range (activeFrom / activeUntil)', () => {
    const cumple: Expense = {
      id: 'exp-cumple',
      name: 'Cumple Isis',
      amount: 15,
      category: 'other',
      isEssential: false,
      frequency: 'monthly',
      paymentTiming: 'quincena',
      activeUntil: '2026-10-31',
    };

    const result = buildPaymentSchedule({
      debts: [],
      incomes: [salary],
      expenses: [cumple],
      months: 3,
      startDate: '2026-09-01',
    });

    const row = result.rows[0];
    expect(row.cells['2026-09-15']).toBe(15);
    expect(row.cells['2026-10-15']).toBe(15);
    expect(row.cells['2026-11-15']).toBeUndefined();
  });

  it('adds one-time incomes (décimo) to the income of their period', () => {
    const decimo: Income = {
      id: 'inc-decimo',
      name: 'Décimo Tercero',
      amount: 500,
      frequency: 'once',
      isSalary: false,
      date: '2026-12-20',
    };

    const result = buildPaymentSchedule({
      debts: [],
      incomes: [salary, decimo],
      expenses: [],
      months: 4,
      startDate: '2026-09-01',
    });

    const dic31 = result.periods.find((p) => p.key === '2026-12-31')!;
    const nov30 = result.periods.find((p) => p.key === '2026-11-30')!;
    // Fin de mes normal: 454.95; diciembre suma el décimo de 500
    expect(nov30.incomeAvailable).toBe(454.95);
    expect(dic31.incomeAvailable).toBe(954.95);
    expect(result.remaining['2026-12-31']).toBe(954.95);
  });

  it('excludes paid-off and zero-payment debts', () => {
    const result = buildPaymentSchedule({
      debts: [
        { ...baseDebt, currentBalance: 0 },
        { ...baseDebt, id: 'debt-2', minimumPayment: 0 },
      ],
      incomes: [salary],
      expenses: [],
      months: 3,
      startDate: '2026-09-01',
    });

    expect(result.rows).toHaveLength(0);
  });

  it('includes the immediate preceding cut when includePastCuts is 1', () => {
    // When date is September 1, 2026, includePastCuts=1 should include 2026-08-31 as the first period
    const periods = generatePeriods(
      new Date(2026, 8, 1),
      3,
      { quincena: 360, finDeMes: 400 },
      1
    );

    expect(periods).toHaveLength(7); // 6 future + 1 past
    expect(periods[0].key).toBe('2026-08-31');
    expect(periods[0].timing).toBe('fin_de_mes');
    expect(periods[1].key).toBe('2026-09-15');
    expect(periods[1].timing).toBe('quincena');

    const result = buildPaymentSchedule({
      debts: [],
      incomes: [salary],
      expenses: [],
      months: 2,
      startDate: '2026-09-01',
      includePastCuts: 1,
    });

    expect(result.periods[0].key).toBe('2026-08-31');
    expect(result.periods[1].key).toBe('2026-09-15');
  });
});
