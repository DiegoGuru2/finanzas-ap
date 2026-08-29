/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Cashflow & Payroll Tests
 * ═══════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCashflow,
  normalizeToMonthly,
  calculateSalaryDetails,
} from '@/modules/financial-engine/cashflow';

describe('Ecuadorian Payroll & IESS', () => {
  it('should calculate IESS deduction of 9.45% correctly', () => {
    const details = calculateSalaryDetails({
      id: '1',
      name: 'Sueldo',
      amount: 1000,
      frequency: 'monthly',
      isSalary: true,
      deductIess: true,
      iessPercentage: 9.45,
      paymentScheme: 'monthly',
    });

    expect(details.grossMonthly).toBe(1000);
    expect(details.iessDeduction).toBe(94.5); // 1000 * 9.45%
    expect(details.netMonthly).toBe(905.5); // 1000 - 94.5
    expect(details.finDeMesAmount).toBe(905.5);
  });

  it('should split net salary into Quincena (15) and Fin de Mes (30)', () => {
    const details = calculateSalaryDetails({
      id: '1',
      name: 'Sueldo',
      amount: 1000,
      frequency: 'monthly',
      isSalary: true,
      deductIess: true,
      iessPercentage: 9.45,
      paymentScheme: 'quincena_fin_mes',
    });

    // Net: 905.50 -> 50% = 452.75 quincena, 452.75 fin de mes
    expect(details.quincenaAmount).toBe(452.75);
    expect(details.finDeMesAmount).toBe(452.75);
    expect(details.quincenaAmount + details.finDeMesAmount).toBe(905.5);
  });

  it('should handle custom quincena advance amount', () => {
    const details = calculateSalaryDetails({
      id: '1',
      name: 'Sueldo',
      amount: 1200,
      frequency: 'monthly',
      isSalary: true,
      deductIess: true,
      iessPercentage: 9.45,
      paymentScheme: 'quincena_fin_mes',
      quincenaAmount: 400, // Custom quincena
    });

    // Gross: 1200, IESS: 113.40, Net: 1086.60
    expect(details.grossMonthly).toBe(1200);
    expect(details.iessDeduction).toBe(113.4);
    expect(details.netMonthly).toBe(1086.6);
    expect(details.quincenaAmount).toBe(400);
    expect(details.finDeMesAmount).toBe(686.6); // 1086.60 - 400
  });

  it('should integrate with calculateCashflow', () => {
    const result = calculateCashflow({
      incomes: [
        {
          id: '1',
          name: 'Sueldo Diego',
          amount: 1000,
          frequency: 'monthly',
          isSalary: true,
          deductIess: true,
          iessPercentage: 9.45,
          paymentScheme: 'quincena_fin_mes',
        },
      ],
      expenses: [
        { id: '1', name: 'Arriendo', amount: 300, frequency: 'monthly', category: 'housing', isEssential: true },
        { id: '2', name: 'Comida', amount: 200, frequency: 'monthly', category: 'food', isEssential: true },
      ],
      minimumPayments: 100,
    });

    expect(result.totalGrossIncome).toBe(1000);
    expect(result.totalIessDeductions).toBe(94.5);
    expect(result.totalNetIncome).toBe(905.5);
    expect(result.totalMonthlyExpenses).toBe(500);
    expect(result.minimumPayments).toBe(100);
    // Surplus: 905.50 - 500 - 100 = 305.50
    expect(result.surplus).toBe(305.5);
    expect(result.status).toBe('healthy');
  });
});

describe('normalizeToMonthly', () => {
  it('should convert weekly amounts to monthly', () => {
    expect(normalizeToMonthly(500, 'weekly')).toBeCloseTo(2166.67, 1);
  });

  it('should convert biweekly amounts to monthly', () => {
    expect(normalizeToMonthly(1000, 'biweekly')).toBeCloseTo(2166.67, 1);
  });

  it('should keep monthly amounts unchanged', () => {
    expect(normalizeToMonthly(1500, 'monthly')).toBe(1500);
  });

  it('should convert annual amounts to monthly', () => {
    expect(normalizeToMonthly(24000, 'annual')).toBe(2000);
  });
});
