import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes, expenses, debts, savingsGoals, payments, expensePayments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { calculateCashflow, normalizeToMonthly } from '@/modules/financial-engine/cashflow';
import { optimizeDebt } from '@/modules/financial-engine/optimizer';
import { calculateSeverance } from '@/modules/financial-engine/severance';
import { calculateBenefits } from '@/modules/financial-engine/benefits';
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
      utilidadesAmount: (i as any).utilidadesAmount ? parseFloat((i as any).utilidadesAmount as string) : 0,
      workStartDate: i.workStartDate
        ? (typeof i.workStartDate === 'string'
          ? i.workStartDate
          : (i.workStartDate as any).toISOString?.().slice(0, 10) || String(i.workStartDate))
        : null,
      contractType: (i.contractType as any) || 'indefinite',
      contractDurationMonths: i.contractDurationMonths ?? 12,
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
      return handleStressTest(cashflow, formattedExpenses, formattedDebts, userSavings, formattedIncomes, cutNonEssential);
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

  const round = (val: number) => Math.round(val * 100) / 100;

  // Determine current cut period
  const today = new Date();
  const dayOfMonth = today.getDate();
  const isQuincenaCut = dayOfMonth <= 15;
  const currentCutLabel = isQuincenaCut ? 'Quincena (día 15)' : 'Fin de Mes';
  const nextCutDay = isQuincenaCut ? 15 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysUntilCut = isQuincenaCut ? Math.max(0, 15 - dayOfMonth) : Math.max(0, nextCutDay - dayOfMonth);

  // 1. Separate expenses into Quincena and Fin de Mes
  let quincenaExpensesTotal = 0;
  let finDeMesExpensesTotal = 0;
  const adjustableExpenses: {
    id: string;
    name: string;
    monthlyAmount: number;
    quincenaAmount: number;
    finDeMesAmount: number;
    category?: string;
    paymentTiming: string;
  }[] = [];

  for (const exp of expenses) {
    const monthly = normalizeToMonthly(exp.amount, exp.frequency);
    if (monthly <= 0) continue;

    let q = 0;
    let f = 0;
    const timing = exp.paymentTiming || 'ambas';
    if (timing === 'quincena') {
      q = monthly;
    } else if (timing === 'fin_de_mes') {
      f = monthly;
    } else {
      // 'ambas': 50% quincena, 50% fin de mes
      q = round(monthly / 2);
      f = round(monthly - q);
    }

    quincenaExpensesTotal += q;
    finDeMesExpensesTotal += f;

    if (!exp.isEssential) {
      adjustableExpenses.push({
        id: exp.id,
        name: exp.name,
        monthlyAmount: round(monthly),
        quincenaAmount: round(q),
        finDeMesAmount: round(f),
        category: exp.category,
        paymentTiming: timing,
      });
    }
  }

  // 2. Separate debts into Quincena and Fin de Mes
  let quincenaDebtsTotal = 0;
  let finDeMesDebtsTotal = 0;

  for (const d of debts) {
    if (d.minimumPayment <= 0) continue;
    const timing = d.paymentTiming || 'any';
    let isQuincenaDebt = false;
    if (timing === 'quincena') {
      isQuincenaDebt = true;
    } else if (timing === 'fin_de_mes') {
      isQuincenaDebt = false;
    } else {
      isQuincenaDebt = d.dueDay <= 15;
    }

    if (isQuincenaDebt) {
      quincenaDebtsTotal += d.minimumPayment;
    } else {
      finDeMesDebtsTotal += d.minimumPayment;
    }
  }

  // 3. Paid amounts this current month
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  let paidDebtsQuincena = 0;
  let paidDebtsFinDeMes = 0;
  for (const p of userPayments) {
    const parts = parseLocalDateParts(p.paidAt);
    if (!parts) continue;
    if (parts.year !== currentYear || parts.month !== currentMonth) continue;
    if (parts.day <= 15) {
      paidDebtsQuincena += parseFloat(p.amount as string);
    } else {
      paidDebtsFinDeMes += parseFloat(p.amount as string);
    }
  }

  let paidExpensesQuincena = 0;
  let paidExpensesFinDeMes = 0;
  const qKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-q`;
  const fKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-f`;
  for (const ep of userExpensePayments) {
    if (ep.periodKey === qKey) paidExpensesQuincena += parseFloat(ep.amount as string);
    if (ep.periodKey === fKey) paidExpensesFinDeMes += parseFloat(ep.amount as string);
  }

  const pendingQuincenaDebts = Math.max(0, quincenaDebtsTotal - paidDebtsQuincena);
  const pendingQuincenaExpenses = Math.max(0, quincenaExpensesTotal - paidExpensesQuincena);
  const freeCashQuincena = round(cashflow.quincenaAvailable - pendingQuincenaDebts - pendingQuincenaExpenses);
  const freeCashQuincenaAfter = round(freeCashQuincena - purchaseAmount);

  const pendingFinDeMesDebts = Math.max(0, finDeMesDebtsTotal - paidDebtsFinDeMes);
  const pendingFinDeMesExpenses = Math.max(0, finDeMesExpensesTotal - paidExpensesFinDeMes);
  const freeCashFinDeMes = round(cashflow.finDeMesAvailable - pendingFinDeMesDebts - pendingFinDeMesExpenses);
  const freeCashFinDeMesAfter = round(freeCashFinDeMes - purchaseAmount);

  // 4. Cut analysis & recommendation (Quincena vs Fin de Mes)
  const quincenaAnalysis = {
    cutLabel: 'Quincena (día 15)',
    income: round(cashflow.quincenaAvailable),
    pendingDebts: round(pendingQuincenaDebts),
    pendingExpenses: round(pendingQuincenaExpenses),
    freeCashBefore: freeCashQuincena,
    freeCashAfter: freeCashQuincenaAfter,
    canAffordFull: freeCashQuincenaAfter >= 0,
    status: (freeCashQuincenaAfter >= cashflow.quincenaAvailable * 0.10
      ? 'green'
      : freeCashQuincenaAfter >= 0
        ? 'yellow'
        : 'red') as 'green' | 'yellow' | 'red',
  };

  const finDeMesAnalysis = {
    cutLabel: 'Fin de Mes (día 30/31)',
    income: round(cashflow.finDeMesAvailable),
    pendingDebts: round(pendingFinDeMesDebts),
    pendingExpenses: round(pendingFinDeMesExpenses),
    freeCashBefore: freeCashFinDeMes,
    freeCashAfter: freeCashFinDeMesAfter,
    canAffordFull: freeCashFinDeMesAfter >= 0,
    status: (freeCashFinDeMesAfter >= cashflow.finDeMesAvailable * 0.10
      ? 'green'
      : freeCashFinDeMesAfter >= 0
        ? 'yellow'
        : 'red') as 'green' | 'yellow' | 'red',
  };

  let recommendedCut: 'quincena' | 'fin_de_mes' | 'none';
  let cutRecommendationReason: string;

  if (quincenaAnalysis.canAffordFull && finDeMesAnalysis.canAffordFull) {
    if (freeCashFinDeMes >= freeCashQuincena) {
      recommendedCut = 'fin_de_mes';
      cutRecommendationReason = `Fin de Mes es más holgado: te quedarán $${freeCashFinDeMesAfter.toFixed(2)} libres (tienes $${freeCashFinDeMes.toFixed(2)} disponibles) vs $${freeCashQuincenaAfter.toFixed(2)} en Quincena.`;
    } else {
      recommendedCut = 'quincena';
      cutRecommendationReason = `Quincena es más favorable: te quedarán $${freeCashQuincenaAfter.toFixed(2)} libres vs $${freeCashFinDeMesAfter.toFixed(2)} en Fin de Mes.`;
    }
  } else if (finDeMesAnalysis.canAffordFull) {
    recommendedCut = 'fin_de_mes';
    cutRecommendationReason = `Te conviene pagarlo en Fin de Mes. En Quincena tendrías un déficit de -$${Math.abs(freeCashQuincenaAfter).toFixed(2)}, mientras que a Fin de Mes te quedan $${freeCashFinDeMesAfter.toFixed(2)} libres.`;
  } else if (quincenaAnalysis.canAffordFull) {
    recommendedCut = 'quincena';
    cutRecommendationReason = `Te conviene pagarlo en la Quincena. A Fin de Mes tendrías un déficit de -$${Math.abs(freeCashFinDeMesAfter).toFixed(2)}, mientras que en Quincena te quedan $${freeCashQuincenaAfter.toFixed(2)} libres.`;
  } else {
    recommendedCut = 'none';
    cutRecommendationReason = `No alcanza al contado en un solo corte (déficit de -$${Math.abs(freeCashQuincenaAfter).toFixed(2)} en Quincena y -$${Math.abs(freeCashFinDeMesAfter).toFixed(2)} a Fin de Mes). Te recomendamos diferirlo en cuotas o ajustar gastos no esenciales.`;
  }

  // 5. Installment Plans (Planes de Pago y Cuotas)
  const monthlySurplus = round(cashflow.surplus);
  const terms = [1, 2, 3, 6, 9, 12];
  const installmentPlans = terms.map((term) => {
    const monthlyInstallment = round(purchaseAmount / term);
    const cutInstallment = round(monthlyInstallment / 2);

    let status: 'green' | 'yellow' | 'red';
    let label: string;
    let description: string;
    let burdenPercent = 0;

    if (term === 1) {
      const bestCutMargin = Math.max(freeCashQuincena, freeCashFinDeMes);
      if (bestCutMargin >= purchaseAmount * 1.1) {
        status = 'green';
        label = 'Al contado (Óptimo)';
        description = 'Puedes pagarlo de una sola vez sin comprometer tu colchón ni pagar intereses.';
      } else if (bestCutMargin >= purchaseAmount) {
        status = 'yellow';
        label = 'Al contado (Ajustado)';
        description = 'Puedes pagarlo en un solo corte, pero tu margen quedará al límite.';
      } else {
        status = 'red';
        label = 'Al contado (No alcanza)';
        description = 'Generaría déficit en tus cortes inmediatos. Es mejor diferirlo.';
      }
    } else {
      if (monthlySurplus <= 0) {
        status = 'red';
        label = 'Riesgoso';
        description = `Tu flujo mensual actual no tiene superávit ($${monthlySurplus.toFixed(2)}). Requiere recortar gastos.`;
      } else {
        burdenPercent = Math.min(999, round((monthlyInstallment / monthlySurplus) * 100));
        if (burdenPercent <= 30) {
          status = 'green';
          label = 'Óptimo';
          description = `Cuota de $${monthlyInstallment.toFixed(2)}/mes ($${cutInstallment.toFixed(2)} por quincena). Consume solo el ${burdenPercent}% de tu superávit libre.`;
        } else if (burdenPercent <= 65) {
          status = 'yellow';
          label = 'Aceptable';
          description = `Cuota de $${monthlyInstallment.toFixed(2)}/mes. Consume el ${burdenPercent}% de tu superávit libre. Es viable pero reduce tu capacidad de ahorro.`;
        } else {
          status = 'red';
          label = 'Sobrecarga';
          description = `Cuota de $${monthlyInstallment.toFixed(2)}/mes. Consume el ${burdenPercent}% de tu superávit. Te dejaría muy expuesto a imprevistos.`;
        }
      }
    }

    return {
      term,
      monthlyInstallment,
      cutInstallment,
      burdenPercent,
      status,
      label,
      description,
    };
  });

  // Recommended Installment Term
  let recommendedTerm: number | null = null;
  let installmentAdvice = '';

  const fullPlan = installmentPlans.find((p) => p.term === 1);
  if (fullPlan && fullPlan.status === 'green') {
    recommendedTerm = 1;
    installmentAdvice = `¡Excelente! Puedes pagarlo al contado de una sola vez ($${purchaseAmount.toFixed(2)}) en tu corte de ${recommendedCut === 'fin_de_mes' ? 'Fin de Mes' : 'Quincena'}, evitando cualquier tipo de deuda o interés.`;
  } else {
    // Look for first green deferred option
    const greenPlan = installmentPlans.find((p) => p.term > 1 && p.status === 'green');
    if (greenPlan) {
      recommendedTerm = greenPlan.term;
      installmentAdvice = `Te sugerimos financiarlo en ${greenPlan.term} cuotas de $${greenPlan.monthlyInstallment.toFixed(2)}/mes ($${greenPlan.cutInstallment.toFixed(2)} por corte). Es el plazo más corto que mantiene tus finanzas completamente seguras.`;
    } else {
      const yellowPlan = installmentPlans.find((p) => p.term > 1 && p.status === 'yellow');
      if (yellowPlan) {
        recommendedTerm = yellowPlan.term;
        installmentAdvice = `El plazo más viable para tu presupuesto es de ${yellowPlan.term} cuotas de $${yellowPlan.monthlyInstallment.toFixed(2)}/mes. Estará algo ajustado, por lo que te recomendamos revisar los ajustes de gastos sugeridos.`;
      } else {
        recommendedTerm = null;
        installmentAdvice = `Tu flujo mensual actual no soporta esta cuota sin generar déficit. Te aconsejamos ajustar gastos no esenciales antes de realizar esta compra.`;
      }
    }
  }

  // 6. Adjustable expenses summary
  adjustableExpenses.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
  const totalNonEssentialMonthly = adjustableExpenses.reduce((s, e) => s + e.monthlyAmount, 0);
  const totalNonEssentialQuincena = adjustableExpenses.reduce((s, e) => s + e.quincenaAmount, 0);
  const totalNonEssentialFinDeMes = adjustableExpenses.reduce((s, e) => s + e.finDeMesAmount, 0);

  // 7. General verdict for current cut
  const currentCutAnalysis = isQuincenaCut ? quincenaAnalysis : finDeMesAnalysis;
  let verdict: 'green' | 'yellow' | 'red' = currentCutAnalysis.status;
  let message: string;
  let description: string;

  if (verdict === 'green') {
    message = 'Puedes pagarlo al contado en este corte';
    description = `Aún te quedarán $${currentCutAnalysis.freeCashAfter.toFixed(2)} libres antes del corte de ${currentCutLabel}. Tu colchón se mantiene saludable.`;
  } else if (verdict === 'yellow') {
    message = 'Precaución: margen al límite en este corte';
    description = `Te quedarían solo $${currentCutAnalysis.freeCashAfter.toFixed(2)} libres en ${currentCutLabel}. Revisa la opción de diferir en cuotas o pagar a ${isQuincenaCut ? 'Fin de Mes' : 'Quincena'}.`;
  } else {
    message = recommendedCut !== 'none'
      ? `No cabe en ${currentCutLabel}, pero sí en ${recommendedCut === 'quincena' ? 'Quincena' : 'Fin de Mes'}`
      : 'No alcanza al contado en un solo corte';
    description = recommendedCut !== 'none'
      ? cutRecommendationReason
      : `Generaría un déficit de -$${Math.abs(currentCutAnalysis.freeCashAfter).toFixed(2)} en ${currentCutLabel}. Te mostramos abajo los planes en cuotas y ajustes posibles.`;
  }

  // Upcoming debts impacted
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
    freeCashBeforePurchase: currentCutAnalysis.freeCashBefore,
    freeCashAfterPurchase: currentCutAnalysis.freeCashAfter,
    currentCutLabel,
    daysUntilCut,
    incomeThisCut: currentCutAnalysis.income,
    pendingDebts: currentCutAnalysis.pendingDebts,
    pendingExpenses: currentCutAnalysis.pendingExpenses,
    monthlySurplus,
    cutsComparison: {
      quincena: quincenaAnalysis,
      finDeMes: finDeMesAnalysis,
      recommendedCut,
      cutRecommendationReason,
    },
    installmentsAnalysis: {
      canPayFull: quincenaAnalysis.canAffordFull || finDeMesAnalysis.canAffordFull,
      recommendedTerm,
      installmentAdvice,
      plans: installmentPlans,
    },
    adjustments: {
      totalNonEssentialMonthly: round(totalNonEssentialMonthly),
      totalNonEssentialQuincena: round(totalNonEssentialQuincena),
      totalNonEssentialFinDeMes: round(totalNonEssentialFinDeMes),
      items: adjustableExpenses,
    },
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
  incomes: Income[],
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

  // ─── Severance & Ecuadorian Labor Cushion ───
  const salaryIncome = incomes.find((i) => i.isSalary) || incomes[0];
  let severance: any = null;
  let seasonalBenefits: any[] = [];
  let seasonalTotal = 0;

  if (salaryIncome && salaryIncome.amount > 0) {
    severance = calculateSeverance({
      salary: salaryIncome.amount,
      sbu: salaryIncome.sbuAmount,
      workStartDate: salaryIncome.workStartDate,
      contractType: salaryIncome.contractType,
      contractDurationMonths: salaryIncome.contractDurationMonths,
      region: salaryIncome.region,
      decimoTerceroMensualizado: salaryIncome.decimoTerceroMensualizado,
      decimoCuartoMensualizado: salaryIncome.decimoCuartoMensualizado,
    });

    const b = calculateBenefits(salaryIncome);
    seasonalBenefits = b.annualPayouts;
    seasonalTotal = seasonalBenefits.reduce((s, item) => s + item.amount, 0);
  }

  const resignationAmount = severance ? severance.resignation.total : 0;
  const dismissalAmount = severance ? severance.dismissal.total : 0;

  const resignationRunwayMonths = activeBurnRate > 0
    ? Math.round(((totalSavings + resignationAmount) / activeBurnRate) * 10) / 10
    : 0;

  const dismissalRunwayMonths = activeBurnRate > 0
    ? Math.round(((totalSavings + dismissalAmount) / activeBurnRate) * 10) / 10
    : 0;

  const seasonalRunwayMonths = activeBurnRate > 0
    ? Math.round(((totalSavings + seasonalTotal) / activeBurnRate) * 10) / 10
    : 0;

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
    // 🇪🇨 Severance & Labor Shield Data
    severance,
    resignationRunwayMonths,
    dismissalRunwayMonths,
    seasonalBenefits,
    seasonalTotal,
    seasonalRunwayMonths,
  });
}

// ─── Helpers ───
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
