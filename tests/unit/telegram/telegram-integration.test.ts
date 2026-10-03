import { describe, it, expect } from 'vitest';
import { buildCutReminderMessage, escapeHtml } from '@/lib/telegram';
import {
  formatPaymentsResponse,
  formatBalanceResponse,
  parseQuickExpense,
  formatSavingsGoalsResponse,
} from '@/lib/telegram-engine';

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

  it('formats payments response with one-touch payment buttons for debts', () => {
    const mockSummary: any = {
      userName: 'Carlos',
      cutName: '15 de Octubre',
      pendingDebts: [{ id: 'debt-123', name: 'Préstamo', amount: 80 }],
      pendingExpenses: [{ id: 'exp-456', name: 'Luz', amount: 20 }],
      totalDebtsAmount: 80,
      totalExpensesAmount: 20,
      totalCommitment: 100,
      remainingIncome: 400,
      totalMonthlyIncome: 1000,
      totalDebtBalance: 1200,
    };

    const formatted = formatPaymentsResponse(mockSummary);
    expect(formatted.text).toContain('Carlos');
    expect(formatted.text).toContain('15 de Octubre');
    expect(formatted.text).toContain('Préstamo');
    expect(formatted.text).toContain('$80.00');
    expect(formatted.text).toContain('$100.00');

    expect(formatted.reply_markup).toBeDefined();
    expect(formatted.reply_markup.inline_keyboard[0][0].callback_data).toBe('pay:debt:debt-123:80.00');
    expect(formatted.reply_markup.inline_keyboard[0][0].text).toContain('Pagar $80.00');
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

  it('parses natural language quick expenses with automatic category mapping', () => {
    // 1. Gasto con monto al inicio
    const exp1 = parseQuickExpense('Gasto 12.50 almuerzo ejecutivo');
    expect(exp1).not.toBeNull();
    expect(exp1?.amount).toBe(12.5);
    expect(exp1?.concept).toBe('Almuerzo ejecutivo');
    expect(exp1?.category).toBe('food');
    expect(exp1?.emoji).toBe('🍽️');

    // 2. Taxi directo
    const exp2 = parseQuickExpense('Taxi al trabajo 6.00');
    expect(exp2).not.toBeNull();
    expect(exp2?.amount).toBe(6.0);
    expect(exp2?.category).toBe('transport');
    expect(exp2?.emoji).toBe('🚗');

    // 3. Monto y concepto sin palabra gasto
    const exp3 = parseQuickExpense('25 medicina en farmacia');
    expect(exp3).not.toBeNull();
    expect(exp3?.amount).toBe(25.0);
    expect(exp3?.category).toBe('health');
    expect(exp3?.emoji).toBe('💊');

    // 4. Servicio de luz
    const exp4 = parseQuickExpense('Pago 34.20 servicio de luz');
    expect(exp4).not.toBeNull();
    expect(exp4?.amount).toBe(34.2);
    expect(exp4?.category).toBe('housing');
    expect(exp4?.emoji).toBe('🏠');

    // 5. Texto inválido no debe parsear como gasto
    expect(parseQuickExpense('hola bot como estas')).toBeNull();
    expect(parseQuickExpense('/pagos')).toBeNull();
  });

  it('formats savings goals with visual progress bars and contribution buttons', () => {
    const goals: any = [
      {
        id: 'goal-1',
        name: 'Fondo de Emergencia',
        targetAmount: 1000,
        currentAmount: 600,
        category: 'emergency',
        icon: '🛡️',
        status: 'active',
        percentage: 60,
        progressBar: '🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜',
      },
    ];

    const result = formatSavingsGoalsResponse('Diego', goals);
    expect(result.text).toContain('Fondo de Emergencia');
    expect(result.text).toContain('$600.00 / $1000.00');
    expect(result.text).toContain('60%');
    expect(result.text).toContain('🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜');

    expect(result.reply_markup).toBeDefined();
    expect(result.reply_markup.inline_keyboard[0][0].callback_data).toBe('save:goal:goal-1:10');
  });
});
