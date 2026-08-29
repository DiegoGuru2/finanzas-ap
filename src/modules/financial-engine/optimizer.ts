/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Debt Optimizer
 * ═══════════════════════════════════════════
 *
 * The main optimization engine that combines all strategies
 * and produces the final recommendation.
 *
 * Pipeline:
 * SURPLUS → RESERVE → ALLOCATION → PROJECTION → RESULT
 */

import type {
  Debt,
  OptimizationInput,
  OptimizationResult,
  OptimizationWarning,
  Strategy,
} from './types';
import { allocateAvalanche } from './avalanche';
import { allocateSnowball } from './snowball';
import { projectAmortization } from './projection';

/**
 * Optimize debt repayment given a surplus and strategy.
 *
 * @param input - Surplus, debts, strategy, and optional emergency reserve
 * @returns OptimizationResult with allocations, projections, and warnings
 */
export function optimizeDebt(input: OptimizationInput): OptimizationResult {
  const {
    surplus,
    debts,
    strategy,
    emergencyReservePercent = 0,
  } = input;

  const warnings: OptimizationWarning[] = [];

  // ─── Validate inputs ───
  if (debts.length === 0) {
    return {
      allocations: [],
      totalAllocated: 0,
      emergencyReserve: 0,
      projectedTotalInterest: 0,
      projectedDebtFreeDate: new Date().toISOString().slice(0, 10),
      strategy,
      warnings: [{
        type: 'zero_surplus',
        message: 'No hay deudas activas para optimizar.',
        severity: 'info',
      }],
    };
  }

  // Filter active debts (balance > 0)
  const activeDebts = debts.filter((d) => d.currentBalance > 0);
  if (activeDebts.length === 0) {
    return {
      allocations: [],
      totalAllocated: 0,
      emergencyReserve: surplus,
      projectedTotalInterest: 0,
      projectedDebtFreeDate: new Date().toISOString().slice(0, 10),
      strategy,
      warnings: [{
        type: 'zero_surplus',
        message: '¡Felicidades! Todas tus deudas están pagadas.',
        severity: 'info',
      }],
    };
  }

  // ─── Calculate emergency reserve ───
  const emergencyReserve = round(surplus * (emergencyReservePercent / 100));
  const availableForDebt = round(surplus - emergencyReserve);

  // ─── Check for deficit ───
  if (surplus <= 0) {
    warnings.push({
      type: 'zero_surplus',
      message: 'No hay excedente disponible para pago de deudas.',
      severity: 'critical',
    });
  }

  // ─── Check if minimums can be covered ───
  const totalMinimums = activeDebts.reduce(
    (sum, d) => sum + Math.min(d.minimumPayment, d.currentBalance),
    0
  );

  if (surplus > 0 && surplus < totalMinimums) {
    warnings.push({
      type: 'insufficient_funds',
      message: `El excedente ($${surplus}) no cubre los pagos mínimos totales ($${totalMinimums}).`,
      severity: 'critical',
    });
  }

  // ─── Calculate surplus after minimums ───
  const surplusAfterMinimums = Math.max(0, availableForDebt - totalMinimums);

  // ─── Get allocations ───
  const allocations = getAllocations(activeDebts, surplusAfterMinimums, strategy);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

  // ─── Project to find debt-free date and total interest ───
  const projection = projectAmortization({
    debts: activeDebts,
    monthlyPayment: totalAllocated,
    strategy,
    months: 360, // Project up to 30 years max
  });

  // ─── High interest warning ───
  const highInterestDebts = activeDebts.filter((d) => d.apr >= 25);
  if (highInterestDebts.length > 0) {
    warnings.push({
      type: 'high_risk',
      message: `Tienes ${highInterestDebts.length} deuda(s) con tasa superior al 25% APR.`,
      severity: 'warning',
    });
  }

  return {
    allocations,
    totalAllocated: round(totalAllocated),
    emergencyReserve: round(emergencyReserve),
    projectedTotalInterest: projection.totalInterestPaid,
    projectedDebtFreeDate: projection.debtFreeDate ?? 'Más de 30 años',
    strategy,
    warnings,
  };
}

/**
 * Compare all strategies to help the user choose.
 */
export function compareStrategies(
  surplus: number,
  debts: Debt[]
): Record<Strategy, { totalInterest: number; debtFreeDate: string | null }> {
  const strategies: Strategy[] = ['avalanche', 'snowball', 'liquidity'];
  const results: Record<string, { totalInterest: number; debtFreeDate: string | null }> = {};

  for (const strategy of strategies) {
    const result = optimizeDebt({
      surplus,
      debts,
      strategy,
    });

    results[strategy] = {
      totalInterest: result.projectedTotalInterest,
      debtFreeDate: result.projectedDebtFreeDate,
    };
  }

  // Add custom (same as avalanche for now)
  results['custom'] = results['avalanche'];

  return results as Record<Strategy, { totalInterest: number; debtFreeDate: string | null }>;
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
    case 'liquidity': {
      const sorted = [...debts].sort(
        (a, b) => a.minimumPayment - b.minimumPayment
      );
      return allocateSnowball(sorted, surplus);
    }
    case 'custom':
    default:
      return allocateAvalanche(debts, surplus);
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
