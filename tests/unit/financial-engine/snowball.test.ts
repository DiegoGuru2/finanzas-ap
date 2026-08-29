/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Snowball Strategy Tests
 * ═══════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { allocateSnowball } from '@/modules/financial-engine/snowball';
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

describe('allocateSnowball', () => {
  it('should allocate surplus to the smallest balance debt', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Big', currentBalance: 8000 }),
      makeDebt({ id: '2', name: 'Small', currentBalance: 1500 }),
    ];

    const allocations = allocateSnowball(debts, 300);

    // Smallest balance (Small $1500) should get the extra
    const smallAlloc = allocations.find((a) => a.debtId === '2');
    expect(smallAlloc?.amount).toBe(450); // 150 + 300
    expect(smallAlloc?.type).toBe('extra');
  });

  it('should cascade when smallest debt is fully payable', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Big', currentBalance: 5000 }),
      makeDebt({ id: '2', name: 'Tiny', currentBalance: 200, minimumPayment: 100 }),
    ];

    const allocations = allocateSnowball(debts, 500);

    const tinyAlloc = allocations.find((a) => a.debtId === '2');
    expect(tinyAlloc?.amount).toBe(200); // Full payoff

    const bigAlloc = allocations.find((a) => a.debtId === '1');
    expect(bigAlloc?.type).toBe('extra');
  });

  it('should handle same balance (prefer higher APR)', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'A', currentBalance: 2000, apr: 15 }),
      makeDebt({ id: '2', name: 'B', currentBalance: 2000, apr: 30 }),
    ];

    const allocations = allocateSnowball(debts, 200);

    // Same balance → higher APR gets priority
    const bAlloc = allocations.find((a) => a.debtId === '2');
    expect(bAlloc?.type).toBe('extra');
  });

  it('should handle zero surplus', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'A', currentBalance: 5000 }),
    ];

    const allocations = allocateSnowball(debts, 0);
    expect(allocations[0].type).toBe('minimum');
    expect(allocations[0].amount).toBe(150);
  });
});
