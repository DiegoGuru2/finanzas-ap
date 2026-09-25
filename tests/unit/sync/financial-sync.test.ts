import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { $financialSyncTick, notifyFinancialSync } from '@/stores/sync';

describe('Financial Data Synchronization Store', () => {
  beforeEach(() => {
    $financialSyncTick.set(0);
  });

  it('increments financialSyncTick when notifyFinancialSync is called', () => {
    expect($financialSyncTick.get()).toBe(0);
    notifyFinancialSync();
    expect($financialSyncTick.get()).toBe(1);
    notifyFinancialSync();
    expect($financialSyncTick.get()).toBe(2);
  });

  it('dispatches finanzas:sync CustomEvent in browser window environment', () => {
    const fakeDispatch = vi.fn();
    (globalThis as any).window = {
      dispatchEvent: fakeDispatch,
    };

    notifyFinancialSync();
    expect(fakeDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'finanzas:sync',
      })
    );

    delete (globalThis as any).window;
  });
});
