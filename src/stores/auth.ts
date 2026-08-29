/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Auth State Store
 * ═══════════════════════════════════════════
 *
 * Client-side auth state for React islands.
 * The source of truth for auth is always the server session;
 * this store provides a reactive client-side mirror.
 */

import { atom } from 'nanostores';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

/** Current authenticated user (null = not logged in) */
export const $user = atom<AuthUser | null>(null);

/** Whether the auth state is still loading */
export const $authLoading = atom(true);

// ─── Actions ───

export function setUser(user: AuthUser | null) {
  $user.set(user);
  $authLoading.set(false);
}

export function clearUser() {
  $user.set(null);
  $authLoading.set(false);
}
