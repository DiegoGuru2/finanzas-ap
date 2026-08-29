/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Optimizer Tests
 * ═══════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { optimizeDebt, compareStrategies } from '@/modules/financial-engine/optimizer';
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

describe('optimizeDebt', () => {
  it('should produce valid allocations with avalanche strategy', () => {
    const result = optimizeDebt({
      surplus: 600,
      debts: [
        makeDebt({ id: '1', name: 'Visa', apr: 29.9, currentBalance: 5000 }),
        makeDebt({ id: '2', name: 'Personal', apr: 15, currentBalance: 3420 }),
      ],
      strategy: 'avalanche',
    });

    expect(result.allocations.length).toBe(2);
    expect(result.totalAllocated).toBeGreaterThan(0);
    expect(result.strategy).toBe('avalanche');
    expect(result.projectedDebtFreeDate).toBeTruthy();
  });

  it('should handle emergency reserve', () => {
    const result = optimizeDebt({
      surplus: 600,
      debts: [
        makeDebt({ id: '1', name: 'Visa', apr: 29.9, currentBalance: 5000 }),
      ],
      strategy: 'avalanche',
      emergencyReservePercent: 20,
    });

    expect(result.emergencyReserve).toBe(120); // 20% of 600
  });

  it('should warn about zero surplus', () => {
    const result = optimizeDebt({
      surplus: 0,
      debts: [
        makeDebt({ id: '1', name: 'Visa', currentBalance: 5000 }),
      ],
      strategy: 'avalanche',
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].type).toBe('zero_surplus');
  });

  it('should handle empty debt list', () => {
    const result = optimizeDebt({
      surplus: 600,
      debts: [],
      strategy: 'avalanche',
    });

    expect(result.allocations).toHaveLength(0);
    expect(result.warnings[0].severity).toBe('info');
  });

  it('should handle all debts paid off', () => {
    const result = optimizeDebt({
      surplus: 600,
      debts: [
        makeDebt({ id: '1', name: 'Done', currentBalance: 0 }),
      ],
      strategy: 'avalanche',
    });

    expect(result.allocations).toHaveLength(0);
    expect(result.warnings[0].message).toContain('pagadas');
  });

  it('should warn about high-interest debts', () => {
    const result = optimizeDebt({
      surplus: 600,
      debts: [
        makeDebt({ id: '1', name: 'Predatory', apr: 35, currentBalance: 5000 }),
      ],
      strategy: 'avalanche',
    });

    const highRiskWarning = result.warnings.find((w) => w.type === 'high_risk');
    expect(highRiskWarning).toBeTruthy();
  });

  it('should warn when surplus is less than total minimums', () => {
    const result = optimizeDebt({
      surplus: 200,
      debts: [
        makeDebt({ id: '1', name: 'A', minimumPayment: 150 }),
        makeDebt({ id: '2', name: 'B', minimumPayment: 150 }),
      ],
      strategy: 'avalanche',
    });

    const warning = result.warnings.find((w) => w.type === 'insufficient_funds');
    expect(warning).toBeTruthy();
    expect(warning?.severity).toBe('critical');
  });
});

describe('compareStrategies', () => {
  it('should return results for all strategies', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'Visa', apr: 29.9, currentBalance: 5000 }),
      makeDebt({ id: '2', name: 'Personal', apr: 15.0, currentBalance: 3420 }),
    ];

    const comparison = compareStrategies(600, debts);

    expect(comparison.avalanche).toBeTruthy();
    expect(comparison.snowball).toBeTruthy();
    expect(comparison.liquidity).toBeTruthy();
    expect(comparison.custom).toBeTruthy();
  });

  it('avalanche should have lower or equal interest than snowball', () => {
    const debts: Debt[] = [
      makeDebt({ id: '1', name: 'High APR', apr: 35, currentBalance: 8000 }),
      makeDebt({ id: '2', name: 'Low APR Small', apr: 10, currentBalance: 500 }),
    ];

    const comparison = compareStrategies(700, debts);

    expect(comparison.avalanche.totalInterest).toBeLessThanOrEqual(
      comparison.snowball.totalInterest
    );
  });
});
