/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Filters Store
 * ═══════════════════════════════════════════
 *
 * Manages filter state for data views (debts, expenses, incomes).
 */

import { atom } from 'nanostores';

export interface DateRange {
  from: string; // ISO date
  to: string;   // ISO date
}

/** Active date range filter */
export const $dateRange = atom<DateRange | null>(null);

/** Active category filter for expenses */
export const $expenseCategory = atom<string | null>(null);

/** Active debt type filter */
export const $debtType = atom<string | null>(null);

/** Search query */
export const $searchQuery = atom('');

// ─── Actions ───

export function setDateRange(range: DateRange | null) {
  $dateRange.set(range);
}

export function setExpenseCategory(category: string | null) {
  $expenseCategory.set(category);
}

export function setDebtType(type: string | null) {
  $debtType.set(type);
}

export function setSearchQuery(query: string) {
  $searchQuery.set(query);
}

export function clearAllFilters() {
  $dateRange.set(null);
  $expenseCategory.set(null);
  $debtType.set(null);
  $searchQuery.set('');
}
