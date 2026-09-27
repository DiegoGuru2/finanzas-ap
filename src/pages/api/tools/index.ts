import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes, expenses, debts, savingsGoals, payments, expensePayments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { calculateCashflow, normalizeToMonthly } from '@/modules/financial-engine/cashflow';
import { optimizeDebt } from '@/modules/financial-engine/optimizer';
import type { Debt, Expense, Income } from '@/modules/financial-engine/types';
import { parseLocalDateParts } from '@/lib/utils';

/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Financial Tools API
 * ═══════════════════════════════════════════
 *
 * GET /api/tools?tool=afford-check&amount=120
 * GET /api/tools?tool=leak-radar
 * GET /api/tools?tool=stress-test&cutNonEssential=true
 */
export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const url = new URL(ctx.request.url);
  const tool = url.searchParams.get('tool');

  try {
    // ─── Fetch all user financial data in parallel ───
    const [userIncomes, userExpenses, userDebts, userSavings, userPayments, userExpensePayments] =
      await Promise.all([
        db.select().from(incomes).where(eq(incomes.userId, user.id)),
        db.select().from(expenses).where(eq(expenses.userId, user.id)),
        db.select().from(debts).where(eq(debts.userId, user.id)),
        db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
        db.select().from(payments).where(eq(payments.userId, user.id)),
        db.select().from(expensePayments).where(eq(expensePayments.userId, user.id)),
      ]);

    // ─── Format data ───
    const formattedIncomes: Income[] = userIncomes.map((i) => ({
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
      programmedSavingsAmount: i.programmedSavingsAmount
        ? parseFloat(i.programmedSavingsAmount as string)
        : 0,
      hasFondosReserva: !!i.hasFondosReserva,
      fondosReservaMensualizado: i.fondosReservaMensualizado ?? true,
      decimoTerceroMensualizado: i.decimoTerceroMensualizado ?? true,
      decimoCuartoMensualizado: i.decimoCuartoMensualizado ?? true,
      region: (i.region === 'sierra' ? 'sierra' : 'costa') as 'costa' | 'sierra',
      sbuAmount: i.sbuAmount ? parseFloat(i.sbuAmount as string) : undefined,
      hasUtilidades: i.hasUtilidades ?? true,
      utilidadesAmount: i.utilidadesAmount ? parseFloat(i.utilidadesAmount as string) : 0,
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
      }));

    const formattedDebts: Debt[] = userDebts
      .filter((d) => parseFloat(d.currentBalance as string) > 0)
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

    const totalMinimumPayments = formattedDebts.reduce((s, d) => s + d.minimumPayment, 0);

    const cashflow = calculateCashflow({
      incomes: formattedIncomes,
      expenses: formattedExpenses,
      minimumPayments: totalMinimumPayments,
    });

    // ─── Route to the right tool ───
    if (tool === 'afford-check') {
      return handleAffordCheck(url, cashflow, formattedDebts, formattedExpenses, userPayments, userExpensePayments);
    }

    if (tool === 'leak-radar') {
      return handleLeakRadar(formattedExpenses, formattedDebts, cashflow);
    }

    if (tool === 'stress-test') {
      const cutNonEssential = url.searchParams.get('cutNonEssential') === 'true';
      return handleStressTest(cashflow, formattedExpenses, formattedDebts, userSavings, cutNonEssential);
    }

    return new Response(JSON.stringify({ error: 'Herramienta no especificada. Usa ?tool=afford-check|leak-radar|stress-test' }), { status: 400 });
  } catch (err: any) {
    console.error('[Tools API Error]', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// ═══════════════════════════════════════════════════
// TOOL 1: AFFORD CHECK ("¿Me lo puedo permitir?")
// ═══════════════════════════════════════════════════
function handleAffordCheck(
  url: URL,
  cashflow: any,
  debts: Debt[],
  expenses: Expense[],
  userPayments: any[],
  userExpensePayments: any[]
) {
  const purchaseAmount = parseFloat(url.searchParams.get('amount') || '0');

  if (purchaseAmount <= 0) {
    return jsonResponse({
      verdict: 'neutral',
      message: 'Ingresa un monto válido para analizar.',
      purchaseAmount: 0,
    });
  }

  // Determine which cut period we are in
  const today = new Date();
  const dayOfMonth = today.getDate();
  const isQuincenaCut = dayOfMonth <= 15;
  const currentCutLabel = isQuincenaCut ? 'Quincena (día 15)' : 'Fin de Mes';
  const nextCutDay = isQuincenaCut ? 15 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysUntilCut = isQuincenaCut ? Math.max(0, 15 - dayOfMonth) : Math.max(0, nextCutDay - dayOfMonth);

  // Income available for the current cut period
  const incomeThisCut = isQuincenaCut
    ? cashflow.quincenaAvailable
    : cashflow.finDeMesAvailable;

  // Expenses allocated to this cut period (approximately half for "ambas")
  const expensesThisCut = cashflow.totalMonthlyExpenses / 2;
  const debtsThisCut = cashflow.minimumPayments / 2;

  // Calculate how much has already been paid this cut period
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  let paidDebtsThisCut = 0;
  for (const p of userPayments) {
    const parts = parseLocalDateParts(p.paidAt);
    if (!parts) continue;
    if (parts.year !== currentYear || parts.month !== currentMonth) continue;
    const inCut = isQuincenaCut ? parts.day <= 15 : parts.day > 15;
    if (inCut) paidDebtsThisCut += parseFloat(p.amount as string);
  }

  let paidExpensesThisCut = 0;
  const cutKey = isQuincenaCut
    ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-q`
    : `${currentYear}-${String(currentMonth).padStart(2, '0')}-f`;
  for (const ep of userExpensePayments) {
    if (ep.periodKey === cutKey) {
      paidExpensesThisCut += parseFloat(ep.amount as string);
    }
  }

  // What's still pending in this cut
  const pendingDebts = Math.max(0, debtsThisCut - paidDebtsThisCut);
  const pendingExpenses = Math.max(0, expensesThisCut - paidExpensesThisCut);

  // Available "free cash" in the current cut
  const freeCashBeforePurchase = Math.round((incomeThisCut - pendingDebts - pendingExpenses) * 100) / 100;
  const freeCashAfterPurchase = Math.round((freeCashBeforePurchase - purchaseAmount) * 100) / 100;

  // Determine verdict
  let verdict: 'green' | 'yellow' | 'red';
  let message: string;
  let description: string;

  if (freeCashAfterPurchase >= incomeThisCut * 0.10) {
    verdict = 'green';
    message = 'Puedes comprarlo sin problema';
    description = `Aún te quedarán $${freeCashAfterPurchase.toFixed(2)} libres antes del corte de ${currentCutLabel}. Tu colchón financiero se mantiene saludable.`;
  } else if (freeCashAfterPurchase >= 0) {
    verdict = 'yellow';
    message = 'Precaución: margen muy ajustado';
    description = `Te quedarán solo $${freeCashAfterPurchase.toFixed(2)} para imprevistos hasta tu próximo ingreso. Si surge algo inesperado podrías tener dificultades.`;
  } else {
    verdict = 'red';
    message = 'No recomendado: genera déficit';
    description = `Este gasto provocaría un déficit de -$${Math.abs(freeCashAfterPurchase).toFixed(2)} para cubrir tus compromisos pendientes del corte de ${currentCutLabel}.`;
  }

  // Upcoming debts that could be impacted
  const impactedDebts = debts
    .filter((d) => d.minimumPayment > 0)
    .sort((a, b) => a.dueDay - b.dueDay)
    .slice(0, 5)
    .map((d) => ({
      name: d.name,
      dueDay: d.dueDay,
      amount: d.minimumPayment,
    }));

  return jsonResponse({
    verdict,
    message,
    description,
    purchaseAmount,
    freeCashBeforePurchase,
    freeCashAfterPurchase,
    currentCutLabel,
    daysUntilCut,
    incomeThisCut: Math.round(incomeThisCut * 100) / 100,
    pendingDebts: Math.round(pendingDebts * 100) / 100,
    pendingExpenses: Math.round(pendingExpenses * 100) / 100,
    impactedDebts,
  });
}

// ═══════════════════════════════════════════════════
// TOOL 2: LEAK RADAR (Fugas Invisibles)
// ═══════════════════════════════════════════════════
function handleLeakRadar(
  expenses: Expense[],
  debts: Debt[],
  cashflow: any
) {
  const leaks: {
    id: string;
    name: string;
    category: string;
    monthlyAmount: number;
    annualAmount: number;
    isEssential: boolean;
    percentOfIncome: number;
    frequency: string;
    redirectImpact: {
      interestSaved: number;
      monthsSaved: number;
      targetDebt: string;
    } | null;
  }[] = [];

  // Identify the highest APR debt for redirection calculations
  const highestAprDebt = debts.length > 0
    ? debts.reduce((max, d) => (d.apr > max.apr ? d : max), debts[0])
    : null;

  for (const exp of expenses) {
    const monthly = normalizeToMonthly(exp.amount, exp.frequency);
    if (monthly <= 0) continue;

    const annual = Math.round(monthly * 12 * 100) / 100;
    const percentOfIncome = cashflow.totalNetIncome > 0
      ? Math.round((monthly / cashflow.totalNetIncome) * 10000) / 100
      : 0;

    // Calculate redirect impact: what happens if this money goes to the highest APR debt instead?
    let redirectImpact = null;
    if (highestAprDebt && !exp.isEssential) {
      const monthlyRate = highestAprDebt.apr / 100 / 12;
      const balance = highestAprDebt.currentBalance;
      const currentPayment = highestAprDebt.minimumPayment;
      const boostedPayment = currentPayment + monthly;

      // Calculate months to pay off with and without the boost
      const monthsWithout = monthlyRate > 0 && currentPayment > balance * monthlyRate
        ? Math.ceil(-Math.log(1 - (balance * monthlyRate) / currentPayment) / Math.log(1 + monthlyRate))
        : balance > 0 && currentPayment > 0 ? Math.ceil(balance / currentPayment) : 0;

      const monthsWith = monthlyRate > 0 && boostedPayment > balance * monthlyRate
        ? Math.ceil(-Math.log(1 - (balance * monthlyRate) / boostedPayment) / Math.log(1 + monthlyRate))
        : balance > 0 && boostedPayment > 0 ? Math.ceil(balance / boostedPayment) : 0;

      const monthsSaved = Math.max(0, monthsWithout - monthsWith);

      // Approximate interest saved
      const interestWithout = Math.max(0, (currentPayment * monthsWithout) - balance);
      const interestWith = Math.max(0, (boostedPayment * monthsWith) - balance);
      const interestSaved = Math.round(Math.max(0, interestWithout - interestWith) * 100) / 100;

      if (monthsSaved > 0 || interestSaved > 0) {
        redirectImpact = {
          interestSaved,
          monthsSaved,
          targetDebt: highestAprDebt.name,
        };
      }
    }

    leaks.push({
      id: exp.id,
      name: exp.name,
      category: exp.category,
      monthlyAmount: Math.round(monthly * 100) / 100,
      annualAmount: annual,
      isEssential: exp.isEssential,
      percentOfIncome,
      frequency: exp.frequency,
      redirectImpact,
    });
  }

  // Sort: non-essential first, then by annual amount descending
  leaks.sort((a, b) => {
    if (a.isEssential !== b.isEssential) return a.isEssential ? 1 : -1;
    return b.annualAmount - a.annualAmount;
  });

  const totalNonEssentialAnnual = leaks
    .filter((l) => !l.isEssential)
    .reduce((s, l) => s + l.annualAmount, 0);

  const totalEssentialAnnual = leaks
    .filter((l) => l.isEssential)
    .reduce((s, l) => s + l.annualAmount, 0);

  return jsonResponse({
    leaks,
    summary: {
      totalLeaks: leaks.length,
      nonEssentialCount: leaks.filter((l) => !l.isEssential).length,
      essentialCount: leaks.filter((l) => l.isEssential).length,
      totalNonEssentialMonthly: Math.round((totalNonEssentialAnnual / 12) * 100) / 100,
      totalNonEssentialAnnual: Math.round(totalNonEssentialAnnual * 100) / 100,
      totalEssentialMonthly: Math.round((totalEssentialAnnual / 12) * 100) / 100,
      totalEssentialAnnual: Math.round(totalEssentialAnnual * 100) / 100,
      highestAprDebt: highestAprDebt
        ? { name: highestAprDebt.name, apr: highestAprDebt.apr, balance: highestAprDebt.currentBalance }
        : null,
      netIncome: cashflow.totalNetIncome,
    },
  });
}

// ═══════════════════════════════════════════════════
// TOOL 3: STRESS TEST (Prueba de Estrés / Supervivencia)
// ═══════════════════════════════════════════════════
function handleStressTest(
  cashflow: any,
  expenses: Expense[],
  debts: Debt[],
  savings: any[],
  cutNonEssential: boolean
) {
  // Calculate total emergency fund / savings
  const totalSavings = savings.reduce((s, sv) => {
    return s + parseFloat(sv.currentAmount as string || '0');
  }, 0);

  // Essential monthly expenses (housing, food, utilities, transport, health, insurance)
  const essentialMonthly = expenses
    .filter((e) => e.isEssential)
    .reduce((s, e) => s + normalizeToMonthly(e.amount, e.frequency), 0);

  // Non-essential monthly expenses
  const nonEssentialMonthly = expenses
    .filter((e) => !e.isEssential)
    .reduce((s, e) => s + normalizeToMonthly(e.amount, e.frequency), 0);

  // Minimum debt payments (these are contractual obligations)
  const minimumDebts = debts.reduce((s, d) => s + d.minimumPayment, 0);

  // Full burn rate (all expenses + minimum debt payments)
  const fullBurnRate = Math.round((essentialMonthly + nonEssentialMonthly + minimumDebts) * 100) / 100;

  // Survival burn rate (only essential + minimum debts)
  const survivalBurnRate = Math.round((essentialMonthly + minimumDebts) * 100) / 100;

  // The burn rate to use based on toggle
  const activeBurnRate = cutNonEssential ? survivalBurnRate : fullBurnRate;

  // Calculate runway in months
  const runwayMonths = activeBurnRate > 0
    ? Math.round((totalSavings / activeBurnRate) * 10) / 10
    : totalSavings > 0 ? 999 : 0;

  const runwayDays = Math.round(runwayMonths * 30.44);

  // Determine risk level
  let riskLevel: 'critical' | 'danger' | 'warning' | 'safe' | 'strong';
  let riskMessage: string;

  if (runwayMonths < 1) {
    riskLevel = 'critical';
    riskMessage = 'Situación crítica: tus ahorros no cubren ni un mes de gastos esenciales. Se recomienda construir un fondo de emergencia urgentemente.';
  } else if (runwayMonths < 3) {
    riskLevel = 'danger';
    riskMessage = 'Riesgo alto: tus ahorros cubren menos de 3 meses. Los expertos recomiendan un mínimo de 3 a 6 meses de respaldo.';
  } else if (runwayMonths < 6) {
    riskLevel = 'warning';
    riskMessage = 'Precaución: tienes entre 3 y 6 meses de colchón. Estás en el rango mínimo recomendado pero podrías mejorar.';
  } else if (runwayMonths < 12) {
    riskLevel = 'safe';
    riskMessage = 'Buen respaldo: tienes entre 6 y 12 meses cubiertos. Estás en una posición financiera sólida ante emergencias.';
  } else {
    riskLevel = 'strong';
    riskMessage = 'Excelente: tienes más de 1 año de respaldo. Tu colchón financiero es robusto y te da mucha tranquilidad.';
  }

  // Savings improvement: how much would runway improve with the non-essential cut?
  const fullRunway = fullBurnRate > 0 ? Math.round((totalSavings / fullBurnRate) * 10) / 10 : 0;
  const survivalRunway = survivalBurnRate > 0 ? Math.round((totalSavings / survivalBurnRate) * 10) / 10 : 0;
  const runwayGain = Math.round((survivalRunway - fullRunway) * 10) / 10;

  // Detailed expense breakdown for the survival mode cut list
  const nonEssentialExpenses = expenses
    .filter((e) => !e.isEssential)
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      monthlyAmount: Math.round(normalizeToMonthly(e.amount, e.frequency) * 100) / 100,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const essentialExpenses = expenses
    .filter((e) => e.isEssential)
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      monthlyAmount: Math.round(normalizeToMonthly(e.amount, e.frequency) * 100) / 100,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  return jsonResponse({
    totalSavings: Math.round(totalSavings * 100) / 100,
    cutNonEssential,
    fullBurnRate,
    survivalBurnRate,
    activeBurnRate,
    runwayMonths,
    runwayDays,
    fullRunway,
    survivalRunway,
    runwayGain,
    riskLevel,
    riskMessage,
    essentialMonthly: Math.round(essentialMonthly * 100) / 100,
    nonEssentialMonthly: Math.round(nonEssentialMonthly * 100) / 100,
    minimumDebts: Math.round(minimumDebts * 100) / 100,
    nonEssentialExpenses,
    essentialExpenses,
    monthlyMonthlySavingsNeededFor6: Math.max(0, Math.round(((survivalBurnRate * 6 - totalSavings) / 12) * 100) / 100),
  });
}

// ─── Helpers ───
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
