import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes with tailwind-merge
 * to handle conflicting utility classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency.
 * @param amount - The numeric amount
 * @param currency - ISO 4217 currency code (default: 'USD')
 * @param locale - BCP 47 locale string (default: 'en-US')
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a percentage value.
 * @param value - The numeric value (e.g., 29.9 for 29.9%)
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Format a date for display.
 * @param date - Date string or Date object
 * @param style - 'short' | 'medium' | 'long'
 */
export function formatDate(
  date: string | Date,
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { month: 'short', day: 'numeric' }
      : style === 'medium'
        ? { year: 'numeric', month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric' };

  return new Intl.DateTimeFormat('es-ES', options).format(d);
}

/**
 * Generate a UUID v4.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Sanitize string input against HTML/Script injection (XSS)
 * Strips script tags, javascript: pseudo-protocol, and escapes HTML characters.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: pseudo protocol
    .replace(/on\w+="[^"]*"/gi, '') // Remove inline event handlers on*="..."
    .replace(/on\w+='[^']*'/gi, '') // Remove inline event handlers on*='...'
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .trim();
}

/**
 * Sanitize object properties recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Safely parse a date string (YYYY-MM-DD) or Date object into local date parts
 * { year, month (0-indexed), day, dateStr } without UTC timezone shifts.
 */
export function parseLocalDateParts(input: unknown): { year: number; month: number; month1Based: number; day: number; dateStr: string } | null {
  if (!input) return null;
  let str = '';
  if (typeof input === 'string') {
    str = input.slice(0, 10);
  } else if (input instanceof Date && !Number.isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    str = `${y}-${m}-${d}`;
  } else {
    str = String(input).slice(0, 10);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month1Based = parseInt(match[2], 10);
  const month = month1Based - 1; // 0-indexed for consistency with Date.getMonth() & SchedulePeriod
  const day = parseInt(match[3], 10);

  return { year, month, month1Based, day, dateStr: `${match[1]}-${match[2]}-${match[3]}` };
}

/**
 * Format a Date or date string to strict YYYY-MM-DD
 */
export function toLocalDateString(input: unknown): string {
  const parts = parseLocalDateParts(input);
  if (parts) return parts.dateStr;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

