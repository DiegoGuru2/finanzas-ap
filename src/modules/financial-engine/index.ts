/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Financial Engine
 * ═══════════════════════════════════════════
 *
 * Public API for the deterministic financial engine.
 *
 * Usage:
 * ```ts
 * import {
 *   calculateCashflow,
 *   optimizeDebt,
 *   compareStrategies,
 *   projectAmortization,
 * } from '@/modules/financial-engine';
 * ```
 *
 * This module is completely independent from the UI
 * and database layers. It receives pure data and
 * returns deterministic results.
 */

// Core functions
export { calculateCashflow, normalizeToMonthly } from './cashflow';
export { allocateAvalanche } from './avalanche';
export { allocateSnowball } from './snowball';
export { projectAmortization } from './projection';
export { optimizeDebt, compareStrategies } from './optimizer';
export { buildPaymentSchedule, generatePeriods, resolveTiming } from './schedule';

// Types
export type {
  // Entities
  Income,
  Expense,
  Debt,
  Frequency,
  ExpenseCategory,
  DebtType,
  Strategy,
  // Cashflow
  CashflowInput,
  CashflowResult,
  // Optimization
  OptimizationInput,
  OptimizationResult,
  OptimizationWarning,
  PaymentAllocation,
  // Projection
  ProjectionInput,
  ProjectionResult,
  MonthlySnapshot,
  DebtSnapshot,
} from './types';

export type {
  ScheduleInput,
  SchedulePeriod,
  ScheduleRow,
  PaymentScheduleResult,
  PeriodTiming,
} from './schedule';

// Validators
export {
  incomeSchema,
  expenseSchema,
  debtSchema,
  paymentSchema,
  loginSchema,
  registerSchema,
  frequencySchema,
  debtTypeSchema,
  expenseCategorySchema,
  strategySchema,
  currencySchema,
} from './validators';

export type {
  IncomeInput,
  ExpenseInput,
  DebtInput,
  PaymentInput,
  LoginInput,
  RegisterInput,
} from './validators';
