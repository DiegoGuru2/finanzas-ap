import { db } from '@/lib/db';
import { loginAttempts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

export const MAX_LOGIN_ATTEMPTS = 4;
export const LOCKOUT_DURATION_MINUTES = 15;

export interface RateLimitResult {
  allowed: boolean;
  attemptsLeft: number;
  lockedUntil?: Date | null;
  message?: string;
}

/**
 * Check if the user/IP is currently locked out
 */
export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  const normalized = identifier.toLowerCase().trim();
  try {
    const [record] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.identifier, normalized));

    if (!record) {
      return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS };
    }

    const now = new Date();
    if (record.lockedUntil && record.lockedUntil > now) {
      const minutesRemaining = Math.max(1, Math.ceil((record.lockedUntil.getTime() - now.getTime()) / (1000 * 60)));
      return {
        allowed: false,
        attemptsLeft: 0,
        lockedUntil: record.lockedUntil,
        message: `Has alcanzado el límite de intentos permitidos (${MAX_LOGIN_ATTEMPTS}). Tu cuenta está temporalmente bloqueada por seguridad durante ${minutesRemaining} minuto(s).`,
      };
    }

    // If lock expired, reset attempts
    if (record.lockedUntil && record.lockedUntil <= now) {
      await resetLoginRateLimit(normalized);
      return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS };
    }

    const attemptsLeft = Math.max(0, MAX_LOGIN_ATTEMPTS - record.attempts);
    return {
      allowed: record.attempts < MAX_LOGIN_ATTEMPTS,
      attemptsLeft,
      lockedUntil: null,
    };
  } catch (err) {
    console.error('[RateLimit] Check error:', err);
    return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS }; // Fail open if DB issue
  }
}

/**
 * Record a failed login attempt and lock account if max attempts reached
 */
export async function recordFailedLoginAttempt(identifier: string): Promise<RateLimitResult> {
  const normalized = identifier.toLowerCase().trim();
  try {
    const [record] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.identifier, normalized));

    const now = new Date();

    if (!record) {
      const newAttempts = 1;
      await db.insert(loginAttempts).values({
        id: generateId(),
        identifier: normalized,
        attempts: newAttempts,
        lockedUntil: null,
      });
      return {
        allowed: true,
        attemptsLeft: MAX_LOGIN_ATTEMPTS - newAttempts,
      };
    }

    const newAttempts = record.attempts + 1;
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await db
        .update(loginAttempts)
        .set({
          attempts: newAttempts,
          lockedUntil: lockUntil,
          updatedAt: now,
        })
        .where(eq(loginAttempts.identifier, normalized));

      return {
        allowed: false,
        attemptsLeft: 0,
        lockedUntil: lockUntil,
        message: `Has superado los ${MAX_LOGIN_ATTEMPTS} intentos fallidos. Tu acceso ha sido bloqueado temporalmente por ${LOCKOUT_DURATION_MINUTES} minutos para proteger tu cuenta.`,
      };
    }

    await db
      .update(loginAttempts)
      .set({
        attempts: newAttempts,
        updatedAt: now,
      })
      .where(eq(loginAttempts.identifier, normalized));

    const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempts;
    return {
      allowed: true,
      attemptsLeft,
      message: `Credenciales incorrectas. Te queda(n) ${attemptsLeft} intento(s) antes del bloqueo temporal.`,
    };
  } catch (err) {
    console.error('[RateLimit] Record error:', err);
    return { allowed: true, attemptsLeft: 1 };
  }
}

/**
 * Reset login attempts on successful authentication
 */
export async function resetLoginRateLimit(identifier: string): Promise<void> {
  const normalized = identifier.toLowerCase().trim();
  try {
    await db
      .delete(loginAttempts)
      .where(eq(loginAttempts.identifier, normalized));
  } catch (err) {
    console.error('[RateLimit] Reset error:', err);
  }
}
