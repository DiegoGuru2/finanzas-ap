import { describe, it, expect } from 'vitest';
import { buildCutReminderMessage, escapeHtml } from '@/lib/telegram';
import { formatPaymentsResponse, formatBalanceResponse } from '@/lib/telegram-engine';

describe('Telegram Integration Tests', () => {
  it('correctly escapes HTML characters for safe Telegram messages', () => {
    const raw = 'John & Jane <devs> "super"';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('John &amp; Jane &lt;devs&gt; "super"');
  });

  it('builds a rich payment reminder message with inline keyboard', () => {
    const reminder = buildCutReminderMessage({
      name: 'Diego',
      cutDay: 15,
      cutMonthName: 'Octubre',
      urgencyTitle: '¡Hoy es tu corte de pago!',
      pendingDebts: [
        { name: 'Tarjeta Pichincha', amount: 50.0 },
        { name: 'Crédito Auto', amount: 150.0 },
      ],
      pendingExpenses: [
        { name: 'Alquiler', amount: 300.0 },
      ],
      totalDebtsAmount: 200.0,
      totalExpensesAmount: 300.0,
      remainingIncome: 250.0,
      appUrl: 'https://proyecahorro.app',
    });

    expect(reminder.text).toContain('¡Hoy es tu corte de pago!');
    expect(reminder.text).toContain('Diego');
    expect(reminder.text).toContain('Tarjeta Pichincha');
    expect(reminder.text).toContain('$50.00');
    expect(reminder.text).toContain('Total a cubrir en corte');
    expect(reminder.text).toContain('$500.00');
    expect(reminder.text).toContain('$250.00');

    expect(reminder.reply_markup.inline_keyboard).toHaveLength(2);
    expect(reminder.reply_markup.inline_keyboard[0][0].url).toBe('https://proyecahorro.app/app/payments');
    expect(reminder.reply_markup.inline_keyboard[1][0].callback_data).toBe('cmd:pagos');
  });

  it('formats payments response for user queries', () => {
    const mockSummary: any = {
      userName: 'Carlos',
      cutName: '15 de Octubre',
      pendingDebts: [{ id: '1', name: 'Préstamo', amount: 80 }],
      pendingExpenses: [{ id: '2', name: 'Luz', amount: 20 }],
      totalDebtsAmount: 80,
      totalExpensesAmount: 20,
      totalCommitment: 100,
      remainingIncome: 400,
      totalMonthlyIncome: 1000,
      totalDebtBalance: 1200,
    };

    const formatted = formatPaymentsResponse(mockSummary);
    expect(formatted).toContain('Carlos');
    expect(formatted).toContain('15 de Octubre');
    expect(formatted).toContain('Préstamo');
    expect(formatted).toContain('$80.00');
    expect(formatted).toContain('$100.00');
  });

  it('formats balance response for /saldo command', () => {
    const mockSummary: any = {
      userName: 'Carlos',
      cutName: '30 de Octubre',
      pendingDebts: [],
      pendingExpenses: [],
      totalDebtsAmount: 0,
      totalExpensesAmount: 0,
      totalCommitment: 0,
      remainingIncome: 650,
      totalMonthlyIncome: 1200,
      totalDebtBalance: 3400,
    };

    const formatted = formatBalanceResponse(mockSummary);
    expect(formatted).toContain('Carlos');
    expect(formatted).toContain('30 de Octubre');
    expect(formatted).toContain('$1200.00');
    expect(formatted).toContain('$3400.00');
    expect(formatted).toContain('$650.00');
  });
});
