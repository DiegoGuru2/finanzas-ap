import { db } from '@/lib/db';
import { incomes, expenses, debts, payments, expensePayments, user } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { buildPaymentSchedule } from '@/modules/financial-engine/schedule';
import type { Debt, Expense, Income } from '@/modules/financial-engine/types';
import { parseLocalDateParts, toLocalDateString } from '@/lib/utils';
import { escapeHtml } from '@/lib/telegram';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export async function getUserFinancialSummary(userId: string) {
  const [userData, userIncomes, userExpenses, userDebts, userPayments, userExpensePayments] = await Promise.all([
    db.select().from(user).where(eq(user.id, userId)).then((r) => r[0]),
    db.select().from(incomes).where(eq(incomes.userId, userId)),
    db.select().from(expenses).where(eq(expenses.userId, userId)),
    db.select().from(debts).where(eq(debts.userId, userId)),
    db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.paidAt)),
    db.select().from(expensePayments).where(eq(expensePayments.userId, userId)),
  ]);

  if (!userData) return null;

  const formattedIncomes: Income[] = userIncomes
    .filter((i) => i.isActive !== false)
    .map((i) => ({
      id: i.id,
      name: i.name,
      amount: parseFloat(i.amount as string),
      frequency: (i.frequency as any) || 'monthly',
      isSalary: !!i.isSalary,
      paymentScheme: (i.paymentScheme as any) || 'quincena_fin_mes',
      quincenaAmount: i.quincenaAmount ? parseFloat(i.quincenaAmount as string) : 0,
      finDeMesAmount: i.finDeMesAmount ? parseFloat(i.finDeMesAmount as string) : 0,
      deductIess: i.deductIess ?? true,
      iessPercentage: i.iessPercentage ? parseFloat(i.iessPercentage as string) : 9.45,
      hasProgrammedSavings: !!i.hasProgrammedSavings,
      programmedSavingsAmount: i.programmedSavingsAmount ? parseFloat(i.programmedSavingsAmount as string) : 0,
      hasFondosReserva: !!i.hasFondosReserva,
      fondosReservaMensualizado: i.fondosReservaMensualizado ?? true,
      decimoTerceroMensualizado: i.decimoTerceroMensualizado ?? true,
      decimoCuartoMensualizado: i.decimoCuartoMensualizado ?? true,
      region: (i.region === 'sierra' ? 'sierra' : 'costa') as 'costa' | 'sierra',
      sbuAmount: i.sbuAmount ? parseFloat(i.sbuAmount as string) : undefined,
      hasUtilidades: i.hasUtilidades ?? true,
      utilidadesAmount: i.utilidadesAmount ? parseFloat(i.utilidadesAmount as string) : 0,
      date: parseLocalDateParts(i.date)?.dateStr || null,
    }));

  const formattedExpenses: Expense[] = userExpenses
    .filter((e) => e.isActive !== false)
    .map((e) => ({
      id: e.id,
      name: e.name,
      amount: parseFloat(e.amount as string),
      category: e.category as any,
      isEssential: !!e.isEssential,
      frequency: (e.frequency as any) || 'monthly',
      paymentTiming: (e.paymentTiming as any) || 'ambas',
      activeFrom: parseLocalDateParts(e.activeFrom)?.dateStr || null,
      activeUntil: parseLocalDateParts(e.activeUntil)?.dateStr || null,
    }));

  const formattedDebts: Debt[] = userDebts
    .filter((d) => d.status !== 'paid_off' && parseFloat(d.currentBalance as string) > 0)
    .map((d) => ({
      id: d.id,
      name: d.name,
      creditor: d.creditor || undefined,
      currentBalance: parseFloat(d.currentBalance as string),
      originalBalance: parseFloat(d.originalBalance as string),
      apr: parseFloat(d.apr as string),
      minimumPayment: parseFloat(d.minimumPayment as string),
      dueDay: d.dueDay ?? 15,
      type: d.type as any,
      paymentTiming: (d.paymentTiming as any) || 'fin_de_mes',
      hasInstallmentPlan: !!d.hasInstallmentPlan,
      termMonths: d.termMonths ?? null,
    }));

  const schedule = buildPaymentSchedule({
    debts: formattedDebts,
    incomes: formattedIncomes,
    expenses: formattedExpenses,
    months: 2,
  });

  const todayStr = toLocalDateString(new Date());

  // Cruce con pagos registrados
  const paid: Record<string, Record<string, number>> = {};
  for (const p of userPayments) {
    const parts = parseLocalDateParts(p.paidAt);
    if (!parts) continue;
    const timing = parts.day <= 15 ? 'quincena' : 'fin_de_mes';
    const period = schedule.periods.find(
      (per) => per.year === parts.year && per.month === parts.month && per.timing === timing
    );
    if (!period) continue;
    paid[p.debtId] = paid[p.debtId] || {};
    paid[p.debtId][period.key] = (paid[p.debtId][period.key] || 0) + parseFloat(p.amount as string);
  }

  const nextPeriod = schedule.periods.find((p) => p.date >= todayStr) || schedule.periods[0];
  if (!nextPeriod) return null;

  const debtRows = schedule.rows.filter((r) => r.kind === 'debt');
  const expenseRows = schedule.rows.filter((r) => r.kind === 'expense');

  const pendingDebts = debtRows
    .map((r) => {
      const scheduled = r.cells[nextPeriod.key] || 0;
      const alreadyPaid = paid[r.id]?.[nextPeriod.key] || 0;
      const pending = Math.max(0, scheduled - alreadyPaid);
      return { id: r.id, name: r.name, scheduled, alreadyPaid, amount: pending };
    })
    .filter((d) => d.amount > 0);

  const paidExpenseIds = new Set<string>();
  for (const ep of userExpensePayments) {
    if (ep.periodKey === nextPeriod.key) {
      paidExpenseIds.add(ep.expenseId);
    }
  }

  const pendingExpenses = expenseRows
    .map((r) => {
      const scheduled = r.cells[nextPeriod.key] || 0;
      const isPaid = paidExpenseIds.has(r.id);
      return { id: r.id, name: r.name, amount: isPaid ? 0 : scheduled };
    })
    .filter((e) => e.amount > 0);

  const totalDebtsAmount = pendingDebts.reduce((sum, d) => sum + d.amount, 0);
  const totalExpensesAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingIncome = schedule.remaining[nextPeriod.key] || 0;
  const cutName = `${nextPeriod.day} de ${MONTH_NAMES[nextPeriod.month]}`;

  return {
    userName: userData.name,
    nextPeriod,
    cutName,
    pendingDebts,
    pendingExpenses,
    totalDebtsAmount,
    totalExpensesAmount,
    totalCommitment: totalDebtsAmount + totalExpensesAmount,
    remainingIncome,
    totalMonthlyDebts: formattedDebts.reduce((s, d) => s + d.minimumPayment, 0),
    totalDebtBalance: formattedDebts.reduce((s, d) => s + d.currentBalance, 0),
    totalMonthlyIncome: formattedIncomes.reduce((s, i) => s + i.amount, 0),
  };
}

export function formatPaymentsResponse(summary: NonNullable<Awaited<ReturnType<typeof getUserFinancialSummary>>>) {
  let text = `📋 <b>Pagos pendientes para el corte del ${summary.cutName}</b>\n`;
  text += `Hola <b>${escapeHtml(summary.userName)}</b>, aquí tienes el desglose:\n\n`;

  if (summary.pendingDebts.length === 0 && summary.pendingExpenses.length === 0) {
    text += `🎉 <b>¡Excelente noticia!</b>\n`;
    text += `No tienes deudas ni gastos pendientes registrados para este corte.\n`;
    text += `Saldo libre proyectado: <code>$${summary.remainingIncome.toFixed(2)}</code>`;
    return text;
  }

  if (summary.pendingDebts.length > 0) {
    text += `💳 <b>Deudas a cubrir (${summary.pendingDebts.length}):</b>\n`;
    for (const d of summary.pendingDebts) {
      text += `  • ${escapeHtml(d.name)}: <b>$${d.amount.toFixed(2)}</b>\n`;
    }
    text += `  <b>Subtotal deudas:</b> $${summary.totalDebtsAmount.toFixed(2)}\n\n`;
  }

  if (summary.pendingExpenses.length > 0) {
    text += `🏠 <b>Gastos fijos (${summary.pendingExpenses.length}):</b>\n`;
    for (const e of summary.pendingExpenses) {
      text += `  • ${escapeHtml(e.name)}: <b>$${e.amount.toFixed(2)}</b>\n`;
    }
    text += `  <b>Subtotal gastos:</b> $${summary.totalExpensesAmount.toFixed(2)}\n\n`;
  }

  text += `───────────────────────\n`;
  text += `💰 <b>Total a cancelar:</b> <code>$${summary.totalCommitment.toFixed(2)}</code>\n`;
  const icon = summary.remainingIncome >= 0 ? '🟢' : '🔴';
  text += `${icon} <b>Saldo estimado restante:</b> <code>$${summary.remainingIncome.toFixed(2)}</code>\n`;

  return text;
}

export function formatBalanceResponse(summary: NonNullable<Awaited<ReturnType<typeof getUserFinancialSummary>>>) {
  let text = `💵 <b>Resumen Financiero y Saldo</b>\n`;
  text += `Usuario: <b>${escapeHtml(summary.userName)}</b>\n\n`;

  text += `📊 <b>Visión General Mensual:</b>\n`;
  text += `• Ingreso mensual registrado: <b>$${summary.totalMonthlyIncome.toFixed(2)}</b>\n`;
  text += `• Saldo total adeudado: <b>$${summary.totalDebtBalance.toFixed(2)}</b>\n\n`;

  text += `🎯 <b>Próximo corte (${summary.cutName}):</b>\n`;
  text += `• Compromisos por pagar: <b>$${summary.totalCommitment.toFixed(2)}</b>\n`;
  const icon = summary.remainingIncome >= 0 ? '🟢' : '🔴';
  text += `• Saldo disponible proyectado: ${icon} <b>$${summary.remainingIncome.toFixed(2)}</b>\n\n`;
  text += `<i>💡 Recuerda ingresar tus abonos en la web para mantener las proyecciones actualizadas.</i>`;

  return text;
}
