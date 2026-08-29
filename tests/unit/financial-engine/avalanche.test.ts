/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Avalanche Strategy Tests
 * ═══════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { allocateAvalanche } from '@/modules/financial-engine/avalanche';
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

describe('allocateAvalanche', () => {
  it('should allocate surplus to the highest APR debt', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Visa', apr: 29.9, currentBalance: 5000 }),
      makeDebt({ id: '2', name: 'Personal', apr: 15.0, currentBalance: 3420 }),
    ];

    const allocations = allocateAvalanche(debts, 300);

    // Highest APR (Visa 29.9%) should get the extra
    const visaAlloc = allocations.find((a) => a.debtId === '1');
    const personalAlloc = allocations.find((a) => a.debtId === '2');

    expect(visaAlloc?.amount).toBe(450); // 150 min + 300 extra
    expect(visaAlloc?.type).toBe('extra');
    expect(personalAlloc?.amount).toBe(150); // just minimum
    expect(personalAlloc?.type).toBe('minimum');
  });

  it('should cascade surplus to next debt when first is fully payable', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Small', apr: 30, currentBalance: 200, minimumPayment: 100 }),
      makeDebt({ id: '2', name: 'Big', apr: 20, currentBalance: 5000 }),
    ];

    const allocations = allocateAvalanche(debts, 500);

    // Small debt: min(100, 200) = 100, max extra = 200 - 100 = 100, so total = 200
    const smallAlloc = allocations.find((a) => a.debtId === '1');
    expect(smallAlloc?.amount).toBe(200); // Fully paid off

    // Big debt: 150 min + remaining 400 extra
    const bigAlloc = allocations.find((a) => a.debtId === '2');
    expect(bigAlloc?.amount).toBe(550); // 150 + 400
  });

  it('should handle zero surplus (minimum payments only)', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Visa', apr: 29.9 }),
      makeDebt({ id: '2', name: 'Personal', apr: 15.0 }),
    ];

    const allocations = allocateAvalanche(debts, 0);

    expect(allocations).toHaveLength(2);
    expect(allocations.every((a) => a.type === 'minimum')).toBe(true);
    expect(allocations.every((a) => a.amount === 150)).toBe(true);
  });

  it('should handle empty debt list', () => {
    const allocations = allocateAvalanche([], 500);
    expect(allocations).toHaveLength(0);
  });

  it('should handle debts with same APR (prefer smaller balance)', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'A', apr: 25, currentBalance: 3000 }),
      makeDebt({ id: '2', name: 'B', apr: 25, currentBalance: 1000 }),
    ];

    const allocations = allocateAvalanche(debts, 200);

    // Same APR → smaller balance first
    const bAlloc = allocations.find((a) => a.debtId === '2');
    expect(bAlloc?.type).toBe('extra');
  });

  it('should cap payment at current balance', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Small', apr: 30, currentBalance: 50, minimumPayment: 50 }),
    ];

    const allocations = allocateAvalanche(debts, 500);

    expect(allocations[0].amount).toBe(50); // Can't pay more than balance
  });

  it('should handle minimum payment greater than balance', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Almost done', apr: 20, currentBalance: 30, minimumPayment: 150 }),
    ];

    const allocations = allocateAvalanche(debts, 100);

    // minimum is capped to balance: min(150, 30) = 30
    expect(allocations[0].amount).toBe(30);
  });
});
