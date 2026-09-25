/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Date & Payment Sync Tests
 * ═══════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { parseLocalDateParts, toLocalDateString } from '@/lib/utils';

describe('parseLocalDateParts & toLocalDateString', () => {
  it('parses YYYY-MM-DD string without UTC timezone shift', () => {
    // 2026-05-01 in UTC-5 would previously become 2026-04-30 with new Date("2026-05-01")
    const parts = parseLocalDateParts('2026-05-01')!;
    expect(parts).not.toBeNull();
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(4); // 0-indexed for Date constructor
    expect(parts.month1Based).toBe(5); // 1-indexed for calendar
    expect(parts.day).toBe(1);
    expect(parts.dateStr).toBe('2026-05-01');
  });

  it('parses middle of month date correctly', () => {
    const parts = parseLocalDateParts('2026-05-15')!;
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(4);
    expect(parts.month1Based).toBe(5);
    expect(parts.day).toBe(15);
  });

  it('parses second quincena date correctly', () => {
    const parts = parseLocalDateParts('2026-05-16')!;
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(4);
    expect(parts.month1Based).toBe(5);
    expect(parts.day).toBe(16);
    expect(parts.dateStr).toBe('2026-05-16');
  });

  it('parses end of month date correctly', () => {
    const parts = parseLocalDateParts('2026-05-31')!;
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(4);
    expect(parts.month1Based).toBe(5);
    expect(parts.day).toBe(31);
  });

  it('parses ISO datetime strings', () => {
    const parts = parseLocalDateParts('2026-07-20T14:30:00.000Z')!;
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(6);
    expect(parts.month1Based).toBe(7);
    expect(parts.day).toBe(20);
    expect(parts.dateStr).toBe('2026-07-20');
  });

  it('formats Date object using toLocalDateString consistently', () => {
    const testDate = new Date(2026, 4, 1); // May 1st (0-indexed month)
    expect(toLocalDateString(testDate)).toBe('2026-05-01');
  });

  it('correctly maps payment date to quincena or fin_de_mes cut period', () => {
    const checkTiming = (dateStr: string) => {
      const parts = parseLocalDateParts(dateStr)!;
      return parts.day <= 15 ? 'quincena' : 'fin_de_mes';
    };

    expect(checkTiming('2026-05-01')).toBe('quincena');
    expect(checkTiming('2026-05-15')).toBe('quincena');
    expect(checkTiming('2026-05-16')).toBe('fin_de_mes');
    expect(checkTiming('2026-05-31')).toBe('fin_de_mes');
  });
});
