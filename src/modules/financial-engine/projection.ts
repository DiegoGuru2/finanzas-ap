/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Projection Engine
 * ═══════════════════════════════════════════
 *
 * Generates month-by-month amortization projections
 * showing how debts will decrease over time given
 * a payment strategy and monthly payment amount.
 *
 * This powers the dashboard projection charts.
 */

import type {
  Debt,
  DebtSnapshot,
  MonthlySnapshot,
  ProjectionInput,
  ProjectionResult,
  Strategy,
} from './types';
import { allocateAvalanche } from './avalanche';
import { allocateSnowball } from './snowball';

/**
 * Project debt repayment over a number of months.
 *
 * @param input - Debts, monthly payment, strategy, and projection period
 * @returns ProjectionResult with monthly snapshots and summary stats
 */
export function projectAmortization(input: ProjectionInput): ProjectionResult {
  const { debts: initialDebts, monthlyPayment, strategy, months } = input;

  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  startDate.setDate(1); // Normalize to first of month

  // Deep clone debts for mutation during projection
  let currentDebts: Debt[] = initialDebts.map((d) => ({ ...d }));
  const snapshots: MonthlySnapshot[] = [];
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let debtFreeMonth: number | null = null;
  let debtFreeDate: string | null = null;

  for (let month = 1; month <= months; month++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + month);
    const dateStr = date.toISOString().slice(0, 10);

    // Filter active debts
    const activeDebts = currentDebts.filter((d) => d.currentBalance > 0);

    if (activeDebts.length === 0) {
      if (debtFreeMonth === null) {
        debtFreeMonth = month - 1;
        // Calculate the date of the previous month
        const freeDate = new Date(startDate);
        freeDate.setMonth(freeDate.getMonth() + month - 1);
        debtFreeDate = freeDate.toISOString().slice(0, 10);
      }
      break;
    }

    // Calculate minimum payments total
    const totalMinimums = activeDebts.reduce(
      (sum, d) => sum + Math.min(d.minimumPayment, d.currentBalance),
      0
    );

    // Available surplus after minimums
    const surplus = Math.max(0, monthlyPayment - totalMinimums);

    // Get allocations based on strategy
    const allocations = getAllocations(activeDebts, surplus, strategy);

    // Apply interest and payments to each debt
    const debtSnapshots: DebtSnapshot[] = [];
    let monthlyInterest = 0;
    let monthlyPrincipal = 0;

    for (const debt of currentDebts) {
      if (debt.currentBalance <= 0) {
        debtSnapshots.push({
          debtId: debt.id,
          debtName: debt.name,
          remainingBalance: 0,
          interestCharged: 0,
          principalPaid: 0,
          amountPaid: 0,
          isPaidOff: true,
        });
        continue;
      }

      // 1. Calculate monthly interest
      const monthlyRate = debt.apr / 100 / 12;
      const interest = round(debt.currentBalance * monthlyRate);

      // 2. Find this debt's allocation
      const allocation = allocations.find((a) => a.debtId === debt.id);
      const payment = allocation ? allocation.amount : Math.min(debt.minimumPayment, debt.currentBalance);

      // 3. Calculate principal (payment minus interest)
      const principal = round(Math.max(0, payment - interest));

      // 4. Update balance
      debt.currentBalance = round(Math.max(0, debt.currentBalance + interest - payment));

      monthlyInterest += interest;
      monthlyPrincipal += principal;
      totalInterestPaid += interest;
      totalPaid += payment;

      debtSnapshots.push({
        debtId: debt.id,
        debtName: debt.name,
        remainingBalance: debt.currentBalance,
        interestCharged: interest,
        principalPaid: principal,
        amountPaid: payment,
        isPaidOff: debt.currentBalance <= 0,
      });
    }

    snapshots.push({
      month,
      date: dateStr,
      debts: debtSnapshots,
      totalBalance: round(currentDebts.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0)),
      totalInterestPaid: round(totalInterestPaid),
      totalPrincipalPaid: round(totalPaid - totalInterestPaid),
      monthlyInterest: round(monthlyInterest),
      monthlyPrincipal: round(monthlyPrincipal),
    });

    // Check if all debts are paid
    if (currentDebts.every((d) => d.currentBalance <= 0)) {
      debtFreeMonth = month;
      debtFreeDate = dateStr;
      break;
    }
  }

  return {
    snapshots,
    totalInterestPaid: round(totalInterestPaid),
    totalPaid: round(totalPaid),
    debtFreeMonth,
    debtFreeDate,
    averageMonthlyInterest:
      snapshots.length > 0
        ? round(totalInterestPaid / snapshots.length)
        : 0,
  };
}

/**
 * Route to the correct allocation strategy.
 */
function getAllocations(debts: Debt[], surplus: number, strategy: Strategy) {
  switch (strategy) {
    case 'avalanche':
      return allocateAvalanche(debts, surplus);
    case 'snowball':
      return allocateSnowball(debts, surplus);
    case 'liquidity':
      // Liquidity: sort by lowest minimum payment first (frees cash flow fastest)
      const liquiditySorted = [...debts].sort(
        (a, b) => a.minimumPayment - b.minimumPayment
      );
      return allocateSnowball(liquiditySorted, surplus);
    case 'custom':
    default:
      return allocateAvalanche(debts, surplus);
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
