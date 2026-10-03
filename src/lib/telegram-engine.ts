import { db } from '@/lib/db';
import {
  incomes,
  expenses,
  debts,
  payments,
  expensePayments,
  user,
  budgets,
  savingsGoals,
} from '@/lib/db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { buildPaymentSchedule } from '@/modules/financial-engine/schedule';
import type { Debt, Expense, Income } from '@/modules/financial-engine/types';
import { generateId, parseLocalDateParts, toLocalDateString } from '@/lib/utils';
import { escapeHtml } from '@/lib/telegram';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const EXPENSE_CATEGORIES = [
  {
    category: 'food',
    label: 'Alimentación',
    emoji: '🍽️',
    keywords: ['comida', 'almuerzo', 'desayuno', 'cena', 'restaurante', 'cafe', 'café', 'super', 'supermaxi', 'mercado', 'tienda', 'pizza', 'pan', 'frutas', 'snack', 'hamburguesa'],
  },
  {
    category: 'transport',
    label: 'Transporte',
    emoji: '🚗',
    keywords: ['taxi', 'uber', 'gasolina', 'combustible', 'bus', 'pasaje', 'peaje', 'parqueo', 'metro', 'indrive', 'mantenimiento'],
  },
  {
    category: 'health',
    label: 'Salud y Farmacia',
    emoji: '💊',
    keywords: ['medicina', 'farmacia', 'doctor', 'cita', 'clinica', 'pastillas', 'consulta', 'salud', 'dentista', 'examenes'],
  },
  {
    category: 'housing',
    label: 'Vivienda y Servicios',
    emoji: '🏠',
    keywords: ['luz', 'agua', 'internet', 'alquiler', 'arriendo', 'casa', 'condominio', 'alicuota', 'alícuota', 'gas', 'telefono', 'plan'],
  },
  {
    category: 'entertainment',
    label: 'Entretenimiento y Ocio',
    emoji: '🍿',
    keywords: ['cine', 'salida', 'cerveza', 'trago', 'fiesta', 'netflix', 'spotify', 'juego', 'videojuego', 'bar', 'evento', 'concierto', 'paseo'],
  },
  {
    category: 'education',
    label: 'Educación',
    emoji: '📚',
    keywords: ['curso', 'libro', 'universidad', 'colegio', 'utiles', 'escuela', 'capacitacion', 'taller'],
  },
  {
    category: 'shopping',
    label: 'Compras y Ropa',
    emoji: '🛍️',
    keywords: ['ropa', 'zapato', 'zapatos', 'camisa', 'pantalon', 'mall', 'tienda', 'electronica'],
  },
];

/**
 * Parsea un texto en lenguaje natural para extraer monto, descripción y categoría de gasto
 */
export function parseQuickExpense(input: string): {
  amount: number;
  concept: string;
  category: string;
  categoryLabel: string;
  emoji: string;
} | null {
  const clean = input.trim();
  const lower = clean.toLowerCase();

  // Caso 1: Empieza por palabra clave y luego monto: "gasto 12.50 almuerzo" o "pago 35 internet"
  const patternStartAmount = /^(?:gasto|pago|compre|compr[eé])\s*[:\-]?\s*\$?(\d+(?:[.,]\d{1,2})?)\s+(?:en\s+|de\s+|por\s+)?(.+)$/i;
  // Caso 2: Empieza por palabra clave, luego concepto y al final monto: "gasto almuerzo 12.50"
  const patternEndAmount = /^(?:gasto|pago|compre|compr[eé])\s*[:\-]?\s*(.+?)\s+(?:por\s+)?\$?(\d+(?:[.,]\d{1,2})?)$/i;
  // Caso 3: Solo monto y concepto: "15 taxi" o "$20 comida"
  const patternDirectAmount = /^\$?(\d+(?:[.,]\d{1,2})?)\s+(?:en\s+|de\s+|por\s+)?(.+)$/i;

  let amountStr = '';
  let concept = '';

  const m1 = clean.match(patternStartAmount);
  if (m1) {
    amountStr = m1[1];
    concept = m1[2].trim();
  } else {
    const m2 = clean.match(patternEndAmount);
    if (m2) {
      concept = m2[1].trim();
      amountStr = m2[2];
    } else {
      const m3 = clean.match(patternDirectAmount);
      if (m3 && !isNaN(parseFloat(m3[1]))) {
        amountStr = m3[1];
        concept = m3[2].trim();
      } else {
        // Caso 4: Concepto y monto al final: "taxi al trabajo 6.00"
        const patternEndDirect = /^([a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-_]+?)\s+(?:por\s+|de\s+)?\$?(\d+(?:[.,]\d{1,2})?)$/i;
        const m4 = clean.match(patternEndDirect);
        if (m4 && m4[1].trim().length >= 2 && !isNaN(parseFloat(m4[2]))) {
          concept = m4[1].trim();
          amountStr = m4[2];
        }
      }
    }
  }

  if (!amountStr || !concept) return null;

  const amount = parseFloat(amountStr.replace(',', '.'));
  if (isNaN(amount) || amount <= 0 || amount > 1000000) return null;

  // Detectar categoría a partir de palabras clave en el concepto
  const conceptLower = concept.toLowerCase();
  let matchedCat = EXPENSE_CATEGORIES.find((c) =>
    c.keywords.some((kw) => conceptLower.includes(kw))
  );

  if (!matchedCat) {
    matchedCat = {
      category: 'other',
      label: 'Varios',
      emoji: '📦',
      keywords: [],
    };
  }

  return {
    amount,
    concept: concept.charAt(0).toUpperCase() + concept.slice(1),
    category: matchedCat.category,
    categoryLabel: matchedCat.label,
    emoji: matchedCat.emoji,
  };
}

/**
 * Inserta un gasto rápido y comprueba el presupuesto asignado
 */
export async function recordQuickExpense(data: {
  userId: string;
  amount: number;
  name: string;
  category: string;
}) {
  const expenseId = generateId();
  const today = new Date();
  const todayStr = toLocalDateString(today);

  await db.insert(expenses).values({
    id: expenseId,
    userId: data.userId,
    name: data.name,
    amount: data.amount.toFixed(2),
    category: data.category,
    frequency: 'monthly',
    isEssential: false,
    paymentTiming: 'ambas',
    date: new Date(todayStr) as any,
    isActive: true,
  });

  // Consultar si tiene presupuesto para esta categoría
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, data.userId), eq(budgets.category, data.category)));

  let budgetStatus: {
    monthlyLimit: number;
    totalSpent: number;
    percentage: number;
    remaining: number;
  } | null = null;

  if (budget) {
    const limit = parseFloat(budget.monthlyLimit as string);
    // Calcular lo gastado este mes en esta categoría
    const firstDayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-31`;

    const monthExpenses = await db
      .select({ amount: expenses.amount })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, data.userId),
          eq(expenses.category, data.category),
          gte(expenses.date, new Date(firstDayStr) as any),
          lte(expenses.date, new Date(lastDayStr) as any)
        )
      );

    const totalSpent = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount as string), 0);
    const percentage = limit > 0 ? Math.round((totalSpent / limit) * 100) : 0;
    const remaining = Math.max(0, limit - totalSpent);

    budgetStatus = {
      monthlyLimit: limit,
      totalSpent,
      percentage,
      remaining,
    };
  }

  return {
    expenseId,
    amount: data.amount,
    name: data.name,
    category: data.category,
    budgetStatus,
  };
}

/**
 * Registra un abono a deuda desde un toque en Telegram
 */
export async function recordDebtPaymentFromTelegram(data: {
  userId: string;
  debtId: string;
  amount: number;
}) {
  const [debtRecord] = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, data.debtId), eq(debts.userId, data.userId)));

  if (!debtRecord) {
    return { success: false, error: 'Deuda no encontrada' };
  }

  const currentBalance = parseFloat(debtRecord.currentBalance as string);
  const paymentAmount = Math.min(currentBalance, data.amount);
  const newBalance = Math.max(0, currentBalance - paymentAmount);
  const isPaidOff = newBalance <= 0;

  const paymentId = generateId();
  const todayStr = toLocalDateString(new Date());

  await db.insert(payments).values({
    id: paymentId,
    userId: data.userId,
    debtId: data.debtId,
    amount: paymentAmount.toFixed(2),
    type: 'extra',
    paidAt: new Date(todayStr) as any,
    notes: 'Abono registrado con 1 toque desde Telegram',
  });

  await db
    .update(debts)
    .set({
      currentBalance: newBalance.toFixed(2),
      status: isPaidOff ? 'paid_off' : 'active',
    })
    .where(eq(debts.id, data.debtId));

  return {
    success: true,
    debtName: debtRecord.name,
    amountPaid: paymentAmount,
    previousBalance: currentBalance,
    newBalance,
    isPaidOff,
  };
}

/**
 * Obtiene las metas de ahorro del usuario y su progreso
 */
export async function getUserSavingsGoals(userId: string) {
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, userId))
    .orderBy(desc(savingsGoals.priority));

  return goals.map((g) => {
    const target = parseFloat(g.targetAmount as string);
    const current = parseFloat(g.currentAmount as string);
    const ratio = target > 0 ? Math.min(1, Math.max(0, current / target)) : 0;
    const percentage = Math.round(ratio * 100);
    const filled = Math.round(ratio * 10);
    const empty = 10 - filled;
    const progressBar = '🟩'.repeat(filled) + '⬜'.repeat(empty);

    return {
      id: g.id,
      name: g.name,
      targetAmount: target,
      currentAmount: current,
      category: g.category,
      icon: g.icon || '🎯',
      status: g.status,
      percentage,
      progressBar,
    };
  });
}

/**
 * Registra un aporte voluntario a una meta de ahorro desde Telegram
 */
export async function recordSavingsContribution(data: {
  userId: string;
  goalId: string;
  amount: number;
}) {
  const [goal] = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.id, data.goalId), eq(savingsGoals.userId, data.userId)));

  if (!goal) return { success: false, error: 'Meta no encontrada' };

  const current = parseFloat(goal.currentAmount as string);
  const target = parseFloat(goal.targetAmount as string);
  const newCurrent = current + data.amount;
  const isCompleted = newCurrent >= target;

  await db
    .update(savingsGoals)
    .set({
      currentAmount: newCurrent.toFixed(2),
      status: isCompleted ? 'completed' : goal.status,
    })
    .where(eq(savingsGoals.id, data.goalId));

  const percentage = target > 0 ? Math.round((newCurrent / target) * 100) : 100;

  return {
    success: true,
    goalName: goal.name,
    amountContributed: data.amount,
    previousAmount: current,
    newCurrent,
    targetAmount: target,
    percentage,
    isCompleted,
  };
}

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
      utilidadesAmount: (i as any).utilidadesAmount ? parseFloat((i as any).utilidadesAmount as string) : 0,
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
    userId,
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

/**
 * Formatea la lista de pagos pendientes con botones interactivos para abonar con 1 toque
 */
export function formatPaymentsResponse(summary: NonNullable<Awaited<ReturnType<typeof getUserFinancialSummary>>>): {
  text: string;
  reply_markup?: any;
} {
  let text = `📋 <b>Pagos pendientes para el corte del ${summary.cutName}</b>\n`;
  text += `Hola <b>${escapeHtml(summary.userName)}</b>, aquí tienes el desglose:\n\n`;

  if (summary.pendingDebts.length === 0 && summary.pendingExpenses.length === 0) {
    text += `🎉 <b>¡Excelente noticia!</b>\n`;
    text += `No tienes deudas ni gastos pendientes registrados para este corte.\n`;
    text += `Saldo libre proyectado: <code>$${summary.remainingIncome.toFixed(2)}</code>`;
    return { text };
  }

  const inlineKeyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [];

  if (summary.pendingDebts.length > 0) {
    text += `💳 <b>Deudas a cubrir (${summary.pendingDebts.length}):</b>\n`;
    for (const d of summary.pendingDebts) {
      text += `  • ${escapeHtml(d.name)}: <b>$${d.amount.toFixed(2)}</b>\n`;
      // Botón para abonar con 1 toque
      inlineKeyboard.push([
        {
          text: `✅ Pagar $${d.amount.toFixed(2)} a ${d.name.slice(0, 16)}`,
          callback_data: `pay:debt:${d.id}:${d.amount.toFixed(2)}`,
        },
      ]);
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
  text += `${icon} <b>Saldo estimado restante:</b> <code>$${summary.remainingIncome.toFixed(2)}</code>\n\n`;
  text += `<i>💡 Toca cualquiera de los botones de abajo para marcar la deuda como pagada al instante.</i>`;

  return {
    text,
    reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
  };
}

/**
 * Formatea el balance general y saldo disponible
 */
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
  text += `<i>💡 Puedes escribir "Gasto 5 café" en cualquier momento para registrar salidas de dinero.</i>`;

  return text;
}

/**
 * Formatea las metas de ahorro con barras de progreso visuales y botones de aporte
 */
export function formatSavingsGoalsResponse(
  userName: string,
  goals: Awaited<ReturnType<typeof getUserSavingsGoals>>
): { text: string; reply_markup?: any } {
  if (goals.length === 0) {
    return {
      text:
        `🎯 <b>Metas de Ahorro</b>\n\n` +
        `Hola <b>${escapeHtml(userName)}</b>, no tienes metas de ahorro activas registradas.\n\n` +
        `Crea una desde la plataforma web (ej. Fondo de Emergencia, Vacaciones) para darle seguimiento aquí.`,
    };
  }

  let text = `🎯 <b>Tus Metas de Ahorro</b>\n`;
  text += `Progreso actual para <b>${escapeHtml(userName)}</b>:\n\n`;

  const inlineKeyboard: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const g of goals) {
    text += `${g.icon} <b>${escapeHtml(g.name)}</b>\n`;
    text += `   <code>$${g.currentAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)}</code> (${g.percentage}%)\n`;
    text += `   ${g.progressBar}\n\n`;

    if (g.percentage < 100) {
      inlineKeyboard.push([
        {
          text: `💰 Aportar $10 a ${g.name.slice(0, 16)}`,
          callback_data: `save:goal:${g.id}:10`,
        },
        {
          text: `💰 +$25`,
          callback_data: `save:goal:${g.id}:25`,
        },
      ]);
    }
  }

  text += `<i>💡 Puedes aportar a tus metas directamente tocando los botones.</i>`;

  return {
    text,
    reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
  };
}
