/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Avalanche Strategy
 * ═══════════════════════════════════════════
 *
 * The Avalanche method prioritizes debts with the
 * highest APR (Annual Percentage Rate) first.
 *
 * This mathematically minimizes the total interest paid
 * over the life of all debts.
 *
 * Algorithm:
 * 1. Pay minimum on all debts
 * 2. Sort remaining debts by APR (highest first)
 * 3. Allocate remaining surplus to the highest APR debt
 * 4. If that debt would be fully paid, cascade to the next
 */

import type { Debt, PaymentAllocation } from './types';

/**
 * Allocate payments using the Avalanche strategy.
 *
 * @param debts - Active debts (balance > 0)
 * @param availableSurplus - Money available AFTER minimum payments
 * @returns Array of payment allocations
 */
export function allocateAvalanche(
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

  // Sort by APR descending (highest rate first)
  // If APR is equal, prioritize smaller balance (faster payoff)
  const sorted = [...debts].sort((a, b) => {
    if (b.apr !== a.apr) return b.apr - a.apr;
    return a.currentBalance - b.currentBalance;
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
