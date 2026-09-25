import { atom } from 'nanostores';

/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Financial Data Synchronization Store
 * ═══════════════════════════════════════════
 *
 * Reactive bus that coordinates state synchronization across Astro islands
 * (e.g. Header NotificationCenter, PaymentsView, DebtsManager, DashboardView).
 * Whenever a payment, debt, or expense status is mutated, this store emits
 * updates to all listening components without requiring a page reload.
 */

export const $financialSyncTick = atom<number>(0);

/**
 * Notify all mounted islands across the application that financial data
 * has changed and fresh data should be fetched from the API.
 */
export function notifyFinancialSync() {
  $financialSyncTick.set($financialSyncTick.get() + 1);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('finanzas:sync', {
        detail: { timestamp: Date.now() },
      })
    );
  }
}
