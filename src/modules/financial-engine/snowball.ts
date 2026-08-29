/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Snowball Strategy
 * ═══════════════════════════════════════════
 *
 * The Snowball method prioritizes debts with the
 * smallest balance first.
 *
 * While not mathematically optimal (pays more interest),
 * it provides psychological wins by eliminating debts faster,
 * which helps maintain motivation.
 *
 * Algorithm:
 * 1. Pay minimum on all debts
 * 2. Sort remaining debts by balance (smallest first)
 * 3. Allocate remaining surplus to the smallest balance debt
 * 4. If that debt would be fully paid, cascade to the next
 */

import type { Debt, PaymentAllocation } from './types';

/**
 * Allocate payments using the Snowball strategy.
 *
 * @param debts - Active debts (balance > 0)
 * @param availableSurplus - Money available AFTER minimum payments
 * @returns Array of payment allocations
 */
export function allocateSnowball(
  debts: Debt[],
  availableSurplus: number
): PaymentAllocation[] {
  if (debts.length === 0 || availableSurplus <= 0) {
    return debts.map((debt) => ({
      debtId: debt.id,
      debtName: debt.name,
      amount: Math.min(debt.minimumPayment, debt.currentBalance),
      type: 'minimum' as const,
    }));
  }

  // Sort by current balance ascending (smallest first)
  // If balance is equal, prioritize higher APR (save more interest)
  const sorted = [...debts].sort((a, b) => {
    if (a.currentBalance !== b.currentBalance) {
      return a.currentBalance - b.currentBalance;
    }
    return b.apr - a.apr;
  });

  const allocations: PaymentAllocation[] = [];
  let remaining = availableSurplus;

  for (const debt of sorted) {
    const minimumOrBalance = Math.min(debt.minimumPayment, debt.currentBalance);
    const maxExtra = debt.currentBalance - minimumOrBalance;

    if (remaining > 0 && maxExtra > 0) {
      const extraPayment = Math.min(remaining, maxExtra);
      allocations.push({
        debtId: debt.id,
        debtName: debt.name,
        amount: round(minimumOrBalance + extraPayment),
        type: 'extra',
      });
      remaining = round(remaining - extraPayment);
    } else {
      allocations.push({
        debtId: debt.id,
        debtName: debt.name,
        amount: round(minimumOrBalance),
        type: 'minimum',
      });
    }
  }

  return allocations;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
