import { describe, it, expect } from 'vitest';

describe('Session Timeout & Auto-Logout Logic', () => {
  const TIMEOUT_SECONDS = 900; // 15 min
  const WARNING_SECONDS = 60;  // 1 min

  function evaluateSessionState(lastActivityMs: number, currentMs: number) {
    const elapsedSec = Math.floor((currentMs - lastActivityMs) / 1000);
    const remaining = TIMEOUT_SECONDS - elapsedSec;

    if (remaining <= 0) {
      return { status: 'expired', remaining: 0, showWarning: false };
    }
    if (remaining <= WARNING_SECONDS) {
      return { status: 'warning', remaining, showWarning: true };
    }
    return { status: 'active', remaining, showWarning: false };
  }

  function formatCountdown(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  it('keeps session active during normal activity', () => {
    const now = Date.now();
    const state = evaluateSessionState(now - 60 * 1000, now); // 1 minuto transcurrido
    expect(state.status).toBe('active');
    expect(state.showWarning).toBe(false);
    expect(state.remaining).toBe(840);
  });

  it('triggers warning modal within the last 60 seconds of inactivity', () => {
    const now = Date.now();
    const state = evaluateSessionState(now - (TIMEOUT_SECONDS - 45) * 1000, now); // 45s restantes
    expect(state.status).toBe('warning');
    expect(state.showWarning).toBe(true);
    expect(state.remaining).toBe(45);
    expect(formatCountdown(state.remaining)).toBe('00:45');
  });

  it('marks session as expired when timeout threshold is exceeded', () => {
    const now = Date.now();
    const state = evaluateSessionState(now - (TIMEOUT_SECONDS + 5) * 1000, now);
    expect(state.status).toBe('expired');
    expect(state.remaining).toBe(0);
  });

  it('formats remaining seconds properly as mm:ss', () => {
    expect(formatCountdown(60)).toBe('01:00');
    expect(formatCountdown(9)).toBe('00:09');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(899)).toBe('14:59');
  });

  it('detects timeout reason in login url search params', () => {
    const url = new URL('https://finanzas.app/login?reason=timeout');
    expect(url.searchParams.get('reason')).toBe('timeout');

    const normalUrl = new URL('https://finanzas.app/login');
    expect(normalUrl.searchParams.get('reason')).toBeNull();
  });
});
