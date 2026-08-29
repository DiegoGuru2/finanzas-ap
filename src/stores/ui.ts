/**
 * ═══════════════════════════════════════════
 * FinanzasAP — UI State Store
 * ═══════════════════════════════════════════
 *
 * Manages UI-related state shared between islands:
 * - Sidebar visibility
 * - Active theme
 * - Modal states
 *
 * Uses Nanostores for cross-island state sharing.
 */

import { atom } from 'nanostores';

/** Whether the mobile sidebar is open */
export const $sidebarOpen = atom(false);

/** Current theme: 'dark' | 'light' */
export const $theme = atom<'dark' | 'light'>('dark');

/** Currently active modal (null = no modal open) */
export const $activeModal = atom<string | null>(null);

// ─── Actions ───

export function toggleSidebar() {
  $sidebarOpen.set(!$sidebarOpen.get());
}

export function setTheme(theme: 'dark' | 'light') {
  $theme.set(theme);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

export function openModal(modalId: string) {
  $activeModal.set(modalId);
}

export function closeModal() {
  $activeModal.set(null);
}
