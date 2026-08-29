/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Edge Case Tests
 * ═══════════════════════════════════════════
 *
 * Tests for boundary conditions and unusual scenarios
 * that the financial engine must handle correctly.
 */

import { describe, it, expect } from 'vitest';
import { calculateCashflow } from '@/modules/financial-engine/cashflow';
import { allocateAvalanche } from '@/modules/financial-engine/avalanche';
import { allocateSnowball } from '@/modules/financial-engine/snowball';
import { projectAmortization } from '@/modules/financial-engine/projection';
import type { Debt } from '@/modules/financial-engine/types';

const makeDebt = (overrides: Partial<Debt> & { id: string; name: string }): Debt => ({
  currentBalance: 5000,
  originalBalance: 5000,
  apr: 20,
  minimumPayment: 150,
  dueDay: 15,
  type: 'credit_card',
  ...overrides,
});

describe('Edge Cases — Cashflow', () => {
  it('should handle income of $0', () => {
    const result = calculateCashflow({
      incomes: [],
      expenses: [],
      minimumPayments: 0,
    });

    expect(result.surplus).toBe(0);
    expect(result.totalMonthlyIncome).toBe(0);
    expect(result.savingsRate).toBe(0);
  });

  it('should handle expenses greater than income', () => {
    const result = calculateCashflow({
      incomes: [{ id: '1', name: 'Job', amount: 1000, frequency: 'monthly' }],
      expenses: [{ id: '1', name: 'Rent', amount: 1500, frequency: 'monthly', category: 'housing', isEssential: true }],
      minimumPayments: 0,
    });

    expect(result.surplus).toBe(-500);
    expect(result.status).toBe('deficit');
  });

  it('should handle very small amounts without floating point errors', () => {
    const result = calculateCashflow({
      incomes: [{ id: '1', name: 'Job', amount: 0.01, frequency: 'monthly' }],
      expenses: [],
      minimumPayments: 0,
    });

    expect(result.totalMonthlyIncome).toBe(0.01);
    expect(result.surplus).toBe(0.01);
  });
});

describe('Edge Cases — Allocation', () => {
  it('should handle debt balance of $0', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Paid', currentBalance: 0 }),
    ];

    const allocations = allocateAvalanche(debts, 500);
    // Balance is 0, so minimum is min(150, 0) = 0, no extra possible
    expect(allocations[0].amount).toBe(0);
  });

  it('should handle single debt', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Only', apr: 20, currentBalance: 3000 }),
    ];

    const allocations = allocateAvalanche(debts, 500);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].amount).toBe(650); // 150 + 500
  });

  it('should handle many debts with small surplus', () => {
    const debts: Debt[] = Array.from({ length: 10 }, (_, i) =>
      makeDebt({
        id: `${i}`,
        name: `Debt ${i}`,
        apr: 10 + i * 2,
        currentBalance: 1000 * (i + 1),
      })
    );

    const allocations = allocateAvalanche(debts, 50);

    // Only the highest APR should get extra
    const extraAllocations = allocations.filter((a) => a.type === 'extra');
    expect(extraAllocations.length).toBe(1);
    expect(extraAllocations[0].debtId).toBe('9'); // Highest APR
  });

  it('should handle both strategies for 2 debts with same APR and same balance', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'A', apr: 20, currentBalance: 3000 }),
      makeDebt({ id: '2', name: 'B', apr: 20, currentBalance: 3000 }),
    ];

    const avalanche = allocateAvalanche(debts, 200);
    const snowball = allocateSnowball(debts, 200);

    // Both should work without errors
    expect(avalanche.length).toBe(2);
    expect(snowball.length).toBe(2);

    // Total allocated should equal minimums + surplus
    const totalAvalanche = avalanche.reduce((s, a) => s + a.amount, 0);
    const totalSnowball = snowball.reduce((s, a) => s + a.amount, 0);
    expect(totalAvalanche).toBeCloseTo(500, 0); // 150 + 150 + 200
    expect(totalSnowball).toBeCloseTo(500, 0);
  });
});

describe('Edge Cases — Projection', () => {
  it('should handle debt paid off early in projection', () => {
    const result = projectAmortization({
      debts: [
        makeDebt({ id: '1', name: 'Small', apr: 10, currentBalance: 300, minimumPayment: 300 }),
      ],
      monthlyPayment: 300,
      strategy: 'avalanche',
      months: 12,
    });

    expect(result.debtFreeMonth).toBeLessThanOrEqual(3);
    expect(result.debtFreeDate).toBeTruthy();
  });

  it('should handle 0-month projection', () => {
    const result = projectAmortization({
      debts: [makeDebt({ id: '1', name: 'Test' })],
      monthlyPayment: 600,
      strategy: 'avalanche',
      months: 0,
    });

    expect(result.snapshots).toHaveLength(0);
    expect(result.totalPaid).toBe(0);
  });

  it('should handle 0% APR debt', () => {
    const result = projectAmortization({
      debts: [
        makeDebt({ id: '1', name: 'Interest Free', apr: 0, currentBalance: 1000, minimumPayment: 100 }),
      ],
      monthlyPayment: 100,
      strategy: 'avalanche',
      months: 24,
    });

    expect(result.totalInterestPaid).toBe(0);
    expect(result.debtFreeMonth).toBe(10); // 1000 / 100 = 10 months
  });

  it('should handle very high APR', () => {
    const result = projectAmortization({
      debts: [
        makeDebt({ id: '1', name: 'Payday', apr: 99.9, currentBalance: 500, minimumPayment: 50 }),
      ],
      monthlyPayment: 200,
      strategy: 'avalanche',
      months: 24,
    });

    // Should still compute without errors
    expect(result.snapshots.length).toBeGreaterThan(0);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
  });
});
