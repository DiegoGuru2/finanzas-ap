import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeObject } from '@/lib/utils';
import { debtSchema, expenseSchema, incomeSchema, loginSchema } from '@/modules/financial-engine/validators';

describe('Sanitization & Anti-Injection Protection', () => {
  it('strips dangerous HTML and script tags from text inputs', () => {
    const malicious = '<script>alert("hacked")</script>Préstamo Personal';
    const cleaned = sanitizeString(malicious);
    expect(cleaned).toBe('Préstamo Personal');
  });

  it('strips javascript: pseudo-protocol and inline event handlers', () => {
    const malicious = '<img src="x" onerror="alert(1)">Tarjeta de Crédito javascript:steal()';
    const cleaned = sanitizeString(malicious);
    expect(cleaned).not.toContain('onerror');
    expect(cleaned).not.toContain('javascript:');
    expect(cleaned).toContain('Tarjeta de Crédito');
  });

  it('sanitizes input automatically via Zod debtSchema validation', () => {
    const input = {
      name: '<script>evil()</script>Banco Pichincha',
      creditor: '<b onclick="bad()">Banco</b>',
      currentBalance: 1000,
      originalBalance: 1500,
      apr: 15,
      minimumPayment: 50,
      dueDay: 15,
    };
    const parsed = debtSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Banco Pichincha');
      expect(parsed.data.creditor).toBe('Banco');
    }
  });

  it('sanitizes input automatically via Zod expenseSchema validation', () => {
    const input = {
      name: 'Supermercado <iframe src="evil.com"></iframe>',
      amount: 120,
      category: 'food',
      description: '<script>run()</script>Compra semanal',
    };
    const parsed = expenseSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Supermercado');
      expect(parsed.data.description).toBe('Compra semanal');
    }
  });

  it('sanitizes email in loginSchema to lowercase and stripped of tags', () => {
    const input = {
      email: '  <script>evil()</script>USER@Finanzas.App  ',
      password: 'password123',
    };
    const parsed = loginSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe('user@finanzas.app');
    }
  });

  it('recursively sanitizes nested objects', () => {
    const dirty = {
      user: {
        bio: '<script>alert(1)</script>Hola mundo',
        notes: 'Texto seguro',
      },
      count: 10,
    };
    const clean = sanitizeObject(dirty);
    expect(clean.user.bio).toBe('Hola mundo');
    expect(clean.count).toBe(10);
  });
});
