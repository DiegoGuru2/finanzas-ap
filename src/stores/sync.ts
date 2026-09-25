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

let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('finanzas_sync_bus');
    syncChannel.onmessage = (event) => {
      if (event.data?.type === 'finanzas:sync') {
        $financialSyncTick.set($financialSyncTick.get() + 1);
        window.dispatchEvent(
          new CustomEvent('finanzas:sync', {
            detail: { timestamp: event.data.timestamp, source: 'remote' },
          })
        );
      }
    };
  } catch {
    // Ignore unsupported environments
  }
}

/**
 * Notify all mounted islands across the application and across browser tabs
 * that financial data has changed and fresh data should be fetched from the API.
 */
export function notifyFinancialSync() {
  $financialSyncTick.set($financialSyncTick.get() + 1);
  if (typeof window !== 'undefined') {
    const timestamp = Date.now();
    window.dispatchEvent(
      new CustomEvent('finanzas:sync', {
        detail: { timestamp, source: 'local' },
      })
    );
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'finanzas:sync', timestamp });
      } catch {
        // Ignore postMessage failure
      }
    }
  }
}
