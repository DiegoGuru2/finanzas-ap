/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Cashflow Calculator
 * ═══════════════════════════════════════════
 *
 * Handles income normalization, Ecuadorian payroll (IESS 9.45%,
 * Quincena + Fin de Mes split, Programmed Savings deduction), expense categorization, and net surplus.
 */

import type { CashflowInput, CashflowResult, Frequency, Income } from './types';
import { calculateBenefits } from './benefits';
import { DEFAULT_IESS_PERCENTAGE, round } from './constants';

export { DEFAULT_IESS_PERCENTAGE };

/**
 * Calculate Ecuadorian payroll details for a given salary.
 */
export function calculateSalaryDetails(income: Income): {
  grossMonthly: number;
  iessDeduction: number;
  netMonthly: number;
  programmedSavings: number;
  quincenaAmount: number;
  finDeMesAmount: number;
} {
  const grossMonthly = normalizeToMonthly(income.amount, income.frequency);

  // Calculate IESS deduction if enabled
  let iessDeduction = 0;
  if (income.isSalary && income.deductIess) {
    const rate = (income.iessPercentage ?? DEFAULT_IESS_PERCENTAGE) / 100;
    iessDeduction = round(grossMonthly * rate);
  }

  const netMonthly = round(Math.max(0, grossMonthly - iessDeduction));

  // Determine Programmed Savings (Ahorro programado a fin de mes)
  let programmedSavings = 0;
  if (income.hasProgrammedSavings && income.programmedSavingsAmount && income.programmedSavingsAmount > 0) {
    programmedSavings = round(income.programmedSavingsAmount);
  }

  // Determine Quincena vs Fin de Mes distribution
  let quincenaAmount = 0;
  let finDeMesAmount = netMonthly;

  if (income.isSalary && income.paymentScheme === 'quincena_fin_mes') {
    if (income.quincenaAmount && income.quincenaAmount > 0) {
      quincenaAmount = round(income.quincenaAmount);
      // El fin de mes recibe el remanente neto menos el ahorro programado
      finDeMesAmount = round(Math.max(0, netMonthly - quincenaAmount - programmedSavings));
    } else {
      // Distribución tradicional equitativa 50% quincena, 50% fin de mes
      quincenaAmount = round(netMonthly / 2);
      finDeMesAmount = round(Math.max(0, netMonthly - quincenaAmount - programmedSavings));
    }
  } else {
    // Pago único fin de mes: se descuenta el ahorro programado del total
    finDeMesAmount = round(Math.max(0, netMonthly - programmedSavings));
  }

  return {
    grossMonthly: round(grossMonthly),
    iessDeduction: round(iessDeduction),
    netMonthly: round(netMonthly),
    programmedSavings: round(programmedSavings),
    quincenaAmount: round(quincenaAmount),
    finDeMesAmount: round(finDeMesAmount),
  };
}

/**
 * Convert any frequency amount to its monthly equivalent.
 */
export function normalizeToMonthly(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case 'weekly':
      return (amount * 52) / 12;
    case 'biweekly':
      return (amount * 26) / 12;
    case 'monthly':
      return amount;
    case 'annual':
      return amount / 12;
    case 'once':
      return 0; // Un ingreso/gasto único no forma parte del flujo mensual recurrente
    default:
      return amount;
  }
}

/**
 * Calculate the complete monthly cashflow including IESS deductions, salary splits, and programmed savings.
 */
export function calculateCashflow(input: CashflowInput): CashflowResult {
  const { incomes, expenses, minimumPayments } = input;

  let totalGrossIncome = 0;
  let totalIessDeductions = 0;
  let totalProgrammedSavings = 0;
  let totalNetIncome = 0;
  let totalBenefitsMonthly = 0;
  let quincenaAvailable = 0;
  let finDeMesAvailable = 0;

  for (const inc of incomes) {
    if (inc.isSalary) {
      const details = calculateSalaryDetails(inc);
      totalGrossIncome += details.grossMonthly;
      totalIessDeductions += details.iessDeduction;
      totalProgrammedSavings += details.programmedSavings;
      totalNetIncome += details.netMonthly;
      quincenaAvailable += details.quincenaAmount;
      finDeMesAvailable += details.finDeMesAmount;

      // Beneficios de ley mensualizados: llegan cada mes en el rol (fin de mes)
      const benefits = calculateBenefits(inc);
      if (benefits.monthlyRecurring > 0) {
        totalBenefitsMonthly += benefits.monthlyRecurring;
        totalNetIncome += benefits.monthlyRecurring;
        finDeMesAvailable += benefits.monthlyRecurring;
      }
    } else {
      const monthly = normalizeToMonthly(inc.amount, inc.frequency);
      totalGrossIncome += monthly;
      totalNetIncome += monthly;
      finDeMesAvailable += monthly; // Ingresos adicionales por defecto a fin de mes
    }
  }

  // Expenses categorization
  let totalEssentialExpenses = 0;
  let totalNonEssentialExpenses = 0;

  for (const exp of expenses) {
    const monthly = normalizeToMonthly(exp.amount, exp.frequency);
    if (exp.isEssential) {
      totalEssentialExpenses += monthly;
    } else {
      totalNonEssentialExpenses += monthly;
    }
  }

  const totalMonthlyExpenses = totalEssentialExpenses + totalNonEssentialExpenses;

  // Surplus is Net Income (minus programmed savings) minus Expenses minus Minimum Debt Payments
  const surplus = (quincenaAvailable + finDeMesAvailable) - totalMonthlyExpenses - minimumPayments;

  const savingsRate =
    totalNetIncome > 0
      ? ((surplus + totalProgrammedSavings) / totalNetIncome) * 100
      : 0;

  let status: CashflowResult['status'];
  if (surplus < 0) {
    status = 'deficit';
  } else if (surplus === 0) {
    status = 'risk_payment';
  } else if (savingsRate < 20) {
    status = 'tight';
  } else {
    status = 'healthy';
  }

  return {
    totalGrossIncome: round(totalGrossIncome),
    totalMonthlyIncome: round(totalGrossIncome),
    totalIessDeductions: round(totalIessDeductions),
    totalProgrammedSavings: round(totalProgrammedSavings),
    totalNetIncome: round(totalNetIncome),
    totalBenefitsMonthly: round(totalBenefitsMonthly),
    quincenaAvailable: round(quincenaAvailable),
    finDeMesAvailable: round(finDeMesAvailable),
    totalMonthlyExpenses: round(totalMonthlyExpenses),
    totalEssentialExpenses: round(totalEssentialExpenses),
    totalNonEssentialExpenses: round(totalNonEssentialExpenses),
    minimumPayments: round(minimumPayments),
    surplus: round(surplus),
    savingsRate: round(savingsRate),
    status,
  };
}
