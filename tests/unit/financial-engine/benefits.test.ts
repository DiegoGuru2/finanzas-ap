import { describe, expect, it } from 'vitest';
import { calculateBenefits, hasBenefitsConfigured } from '@/modules/financial-engine/benefits';
import { calculateCashflow } from '@/modules/financial-engine/cashflow';
import { buildPaymentSchedule } from '@/modules/financial-engine/schedule';
import { DEFAULT_SBU } from '@/modules/financial-engine/constants';
import type { Income } from '@/modules/financial-engine/types';

const baseSalary: Income = {
  id: 'inc-1',
  name: 'Sueldo',
  amount: 1200,
  frequency: 'monthly',
  isSalary: true,
  paymentScheme: 'quincena_fin_mes',
  quincenaAmount: 0,
  finDeMesAmount: 0,
  deductIess: true,
  iessPercentage: 9.45,
};

const withBenefits = (extra: Partial<Income> = {}): Income => ({
  ...baseSalary,
  hasFondosReserva: true,
  fondosReservaMensualizado: true,
  decimoTerceroMensualizado: true,
  decimoCuartoMensualizado: true,
  region: 'costa',
  sbuAmount: 460,
  hasUtilidades: false,
  utilidadesAmount: 0,
  ...extra,
});

describe('calculateBenefits', () => {
  it('no asume beneficios si el ingreso no los tiene configurados', () => {
    expect(hasBenefitsConfigured(baseSalary)).toBe(false);
    const b = calculateBenefits(baseSalary);
    expect(b.monthlyRecurring).toBe(0);
    expect(b.annualPayouts).toHaveLength(0);
  });

  it('prorratea todo con 1/12 exacto (13ro, 14to y fondos)', () => {
    const b = calculateBenefits(withBenefits());
    expect(b.decimoTerceroMonthly).toBe(100); // 1200 / 12
    expect(b.decimoCuartoMonthly).toBe(38.33); // 460 / 12
    expect(b.fondosReservaMonthly).toBe(100); // 1200 / 12 (el 8.33% legal)
    expect(b.monthlyRecurring).toBe(238.33);
    expect(b.annualPayouts).toHaveLength(0); // todo mensualizado
  });

  it('décimo tercero no mensualizado cae en diciembre a fin de mes', () => {
    const b = calculateBenefits(withBenefits({ decimoTerceroMensualizado: false }));
    expect(b.monthlyRecurring).toBe(138.33); // solo fondos + 14to
    expect(b.annualPayouts).toEqual([
      { month: 11, label: 'Décimo tercer sueldo', amount: 1200, timing: 'fin_de_mes' },
    ]);
  });

  it('décimo cuarto anual respeta la región (costa=marzo, sierra=agosto)', () => {
    const costa = calculateBenefits(withBenefits({ decimoCuartoMensualizado: false }));
    expect(costa.annualPayouts[0]).toMatchObject({ month: 2, amount: 460, timing: 'quincena' });

    const sierra = calculateBenefits(
      withBenefits({ decimoCuartoMensualizado: false, region: 'sierra' })
    );
    expect(sierra.annualPayouts[0]).toMatchObject({ month: 7, amount: 460 });
  });

  it('utilidades entran como pago anual en abril', () => {
    const b = calculateBenefits(withBenefits({ hasUtilidades: true, utilidadesAmount: 600 }));
    expect(b.utilidadesMonthly).toBe(50);
    expect(b.annualPayouts).toEqual([
      { month: 3, label: 'Utilidades', amount: 600, timing: 'quincena' },
    ]);
  });

  it('usa el SBU default si el configurado es 0', () => {
    const b = calculateBenefits(withBenefits({ sbuAmount: 0 }));
    expect(b.decimoCuartoAnnual).toBe(DEFAULT_SBU);
  });

  it('fondos acumulados en el IESS no llegan al flujo mensual', () => {
    const b = calculateBenefits(withBenefits({ fondosReservaMensualizado: false }));
    expect(b.monthlyRecurring).toBe(138.33); // sin los 100 de fondos
  });
});

describe('cashflow con beneficios', () => {
  it('suma los beneficios mensualizados al neto y al fin de mes', () => {
    const sin = calculateCashflow({ incomes: [baseSalary], expenses: [], minimumPayments: 0 });
    const con = calculateCashflow({ incomes: [withBenefits()], expenses: [], minimumPayments: 0 });

    expect(sin.totalBenefitsMonthly).toBe(0);
    expect(con.totalBenefitsMonthly).toBe(238.33);
    expect(con.totalNetIncome).toBeCloseTo(sin.totalNetIncome + 238.33, 2);
    expect(con.finDeMesAvailable).toBeCloseTo(sin.finDeMesAvailable + 238.33, 2);
    expect(con.quincenaAvailable).toBe(sin.quincenaAvailable);
  });
});

describe('cronograma con beneficios', () => {
  it('los mensualizados llegan al fin de mes de cada período', () => {
    const sin = buildPaymentSchedule({
      debts: [],
      incomes: [baseSalary],
      expenses: [],
      months: 2,
      startDate: '2026-09-01',
    });
    const con = buildPaymentSchedule({
      debts: [],
      incomes: [withBenefits()],
      expenses: [],
      months: 2,
      startDate: '2026-09-01',
    });

    expect(con.monthlyIncome.finDeMes).toBeCloseTo(sin.monthlyIncome.finDeMes + 238.33, 2);
    expect(con.monthlyIncome.quincena).toBe(sin.monthlyIncome.quincena);
  });

  it('el décimo tercero anual cae en el corte de fin de mes de diciembre', () => {
    const result = buildPaymentSchedule({
      debts: [],
      incomes: [withBenefits({ decimoTerceroMensualizado: false })],
      expenses: [],
      months: 5, // sep 2026 → ene 2027 incluye diciembre
      startDate: '2026-09-01',
    });

    const dic = result.periods.find((p) => p.month === 11 && p.timing === 'fin_de_mes');
    const nov = result.periods.find((p) => p.month === 10 && p.timing === 'fin_de_mes');
    expect(dic).toBeDefined();
    expect(nov).toBeDefined();
    expect(dic!.incomeAvailable).toBeCloseTo(nov!.incomeAvailable + 1200, 2);
    expect(result.benefitPayouts[dic!.key]).toEqual([
      { label: 'Décimo tercer sueldo', amount: 1200 },
    ]);
  });
});
