import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes, expenses, debts, savingsGoals, budgets, payments, expensePayments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { calculateCashflow, normalizeToMonthly } from '@/modules/financial-engine/cashflow';
import { optimizeDebt, compareStrategies } from '@/modules/financial-engine/optimizer';
import { projectAmortization } from '@/modules/financial-engine/projection';
import type { Debt, Expense, Income } from '@/modules/financial-engine/types';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const url = new URL(ctx.request.url);
    const strategyParam = url.searchParams.get('strategy');
    const strategy = (['avalanche', 'snowball', 'liquidity'].includes(strategyParam || '')
      ? strategyParam
      : 'avalanche') as 'avalanche' | 'snowball' | 'liquidity';

    const safeQuery = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await promise;
      } catch (err: any) {
        console.warn('Dashboard safeQuery caught error:', err?.message || err);
        return fallback;
      }
    };

    const [userIncomes, userExpenses, userDebts, userSavings, userBudgets, userPayments, userExpensePayments] = await Promise.all([
      safeQuery(db.select().from(incomes).where(eq(incomes.userId, user.id)), []),
      safeQuery(db.select().from(expenses).where(eq(expenses.userId, user.id)), []),
      safeQuery(db.select().from(debts).where(eq(debts.userId, user.id)), []),
      safeQuery(db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)), []),
      safeQuery(db.select().from(budgets).where(eq(budgets.userId, user.id)), []),
      safeQuery(db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.paidAt)), []),
      safeQuery(db.select().from(expensePayments).where(eq(expensePayments.userId, user.id)), []),
    ]);

    // Format incomes
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
      programmedSavingsAmount: i.programmedSavingsAmount ? parseFloat(i.programmedSavingsAmount as string) : 0,
      // Beneficios de Ley
      hasFondosReserva: !!i.hasFondosReserva,
      fondosReservaMensualizado: i.fondosReservaMensualizado ?? true,
      decimoTerceroMensualizado: i.decimoTerceroMensualizado ?? true,
      decimoCuartoMensualizado: i.decimoCuartoMensualizado ?? true,
      region: (i.region === 'sierra' ? 'sierra' : 'costa') as 'costa' | 'sierra',
      sbuAmount: i.sbuAmount ? parseFloat(i.sbuAmount as string) : undefined,
      hasUtilidades: i.hasUtilidades ?? true,
      utilidadesAmount: i.utilidadesAmount ? parseFloat(i.utilidadesAmount as string) : 0,
    }));

    // Format expenses
    const formattedExpenses: Expense[] = userExpenses.map((e) => ({
      id: e.id,
      name: e.name,
      amount: parseFloat(e.amount as string),
      category: e.category as any,
      isEssential: !!e.isEssential,
      frequency: (e.frequency as any) || 'monthly',
    }));

    // Format debts
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
      }));

    const totalMinimumPayments = formattedDebts.reduce((sum, d) => sum + d.minimumPayment, 0);

    // Calculate cashflow with Ecuadorian IESS & payroll
    const cashflow = calculateCashflow({
      incomes: formattedIncomes,
      expenses: formattedExpenses,
      minimumPayments: totalMinimumPayments,
    });

    // Optimize debt payments using the selected strategy
    const optimization = optimizeDebt({
      surplus: Math.max(0, cashflow.surplus),
      debts: formattedDebts,
      strategy,
    });

    const strategyComparison = compareStrategies(
      Math.max(0, cashflow.surplus),
      formattedDebts
    );

    // 24-month projection for visual chart
    const projection = projectAmortization({
      debts: formattedDebts,
      monthlyPayment: optimization.totalAllocated > 0 ? optimization.totalAllocated : totalMinimumPayments,
      strategy,
      months: 24,
    });

    const totalDebt = formattedDebts.reduce((sum, d) => sum + d.currentBalance, 0);
    const totalOriginalDebt = userDebts.reduce((sum, d) => sum + parseFloat(d.originalBalance as string || '0'), 0);
    const totalDebtPaidOff = Math.max(0, Math.round((totalOriginalDebt - totalDebt) * 100) / 100);
    const totalDebtProgress = totalOriginalDebt > 0 ? Math.round(((totalOriginalDebt - totalDebt) / totalOriginalDebt) * 1000) / 10 : 0;
    const paidOffDebtsCount = userDebts.filter((d) => parseFloat(d.currentBalance as string) <= 0).length;

    // Helper ISO date string
    const toIsoStr = (v: unknown): string | null => {
      if (!v) return null;
      if (typeof v === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        if (v.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
      }
      const d = new Date(v as any);
      if (Number.isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Metas de ahorro enriquecidas considerando pagos marcados si están vinculadas
    const enrichedSavingsGoals = userSavings.map((s) => {
      const baseAmount = parseFloat(s.currentAmount as string || '0');
      let currentAmount = baseAmount;
      let monthlyContribution = parseFloat(s.monthlyContribution as string || '0');
      const targetAmount = parseFloat(s.targetAmount as string || '0');

      if (s.linkedExpenseId) {
        const linkedExp = userExpenses.find((e) => e.id === s.linkedExpenseId);
        if (linkedExp) {
          monthlyContribution = normalizeToMonthly(
            parseFloat(linkedExp.amount as string),
            (linkedExp.frequency as any) || 'monthly'
          );
          const sinceStr = toIsoStr(s.linkedSince) || toIsoStr(s.startDate) || '2000-01-01';
          const paymentsForExp = userExpensePayments.filter((p) => {
            if (p.expenseId !== linkedExp.id) return false;
            const paidAtStr = toIsoStr(p.paidAt);
            return !paidAtStr || paidAtStr >= sinceStr;
          });
          const totalPaidAmt = paymentsForExp.reduce((sum, p) => sum + parseFloat(p.amount as string || '0'), 0);
          currentAmount = Math.min(targetAmount, Math.round((baseAmount + totalPaidAmt) * 100) / 100);
        }
      }

      const isCompleted = s.status === 'active' && currentAmount >= targetAmount;
      const percent = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 1000) / 10) : 0;

      return {
        id: s.id,
        name: s.name,
        currentAmount,
        targetAmount,
        monthlyContribution,
        category: s.category,
        icon: s.icon || '🎯',
        status: isCompleted ? 'completed' : s.status,
        percent,
      };
    });

    // Métricas avanzadas adicionales: Ahorro y Metas
    const totalSaved = enrichedSavingsGoals.reduce((sum, s) => sum + s.currentAmount, 0);
    const totalSavingsTarget = enrichedSavingsGoals.reduce((sum, s) => sum + s.targetAmount, 0);
    const totalMonthlySavingsContribution = enrichedSavingsGoals
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + s.monthlyContribution, 0);
    const savingsProgress = totalSavingsTarget > 0 ? Math.round((totalSaved / totalSavingsTarget) * 1000) / 10 : 0;

    // Total histórico abonado a deudas
    const totalHistoricalPaymentsAmount = userPayments.reduce((sum, p) => sum + parseFloat(p.amount as string || '0'), 0);

    const debtToIncomeRatio = cashflow.totalGrossIncome > 0
      ? Math.round(((totalMinimumPayments / cashflow.totalGrossIncome) * 100) * 10) / 10
      : 0;

    // Desglose de gastos por categoría para gráfica Donut
    const expensesByCategoryMap: Record<string, number> = {};
    for (const exp of formattedExpenses) {
      expensesByCategoryMap[exp.category] = (expensesByCategoryMap[exp.category] || 0) + exp.amount;
    }
    const expensesByCategory = Object.entries(expensesByCategoryMap).map(([cat, amount]) => ({
      name: cat,
      amount: Math.round(amount * 100) / 100,
    }));

    // Pagos recientes
    const recentPayments = userPayments.slice(0, 5).map((p) => {
      const targetDebt = userDebts.find((d) => d.id === p.debtId);
      return {
        id: p.id,
        debtId: p.debtId,
        debtName: targetDebt?.name || 'Deuda',
        amount: parseFloat(p.amount as string),
        type: p.type,
        paidAt: p.paidAt,
        notes: p.notes,
      };
    });

    return new Response(
      JSON.stringify({
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          summary: {
            totalDebt,
            totalOriginalDebt,
            totalDebtPaidOff,
            totalDebtProgress,
            paidOffDebtsCount,
            totalGrossIncome: cashflow.totalGrossIncome,
            totalIessDeductions: cashflow.totalIessDeductions,
            totalProgrammedSavings: cashflow.totalProgrammedSavings,
            totalNetIncome: cashflow.totalNetIncome,
            totalBenefitsMonthly: cashflow.totalBenefitsMonthly,
            quincenaAvailable: cashflow.quincenaAvailable,
            finDeMesAvailable: cashflow.finDeMesAvailable,
            totalExpenses: cashflow.totalMonthlyExpenses,
            totalMinimumPayments,
            surplus: cashflow.surplus,
            savingsRate: cashflow.savingsRate,
            status: cashflow.status,
            activeDebtsCount: formattedDebts.length,
            // Métricas de Ahorro
            totalSaved,
            totalSavingsTarget,
            totalMonthlySavingsContribution,
            savingsProgress,
            totalHistoricalPaymentsAmount,
            debtToIncomeRatio,
            budgetsCount: userBudgets.length,
          },
          expensesByCategory,
          savingsGoals: enrichedSavingsGoals,
          recentPayments,
          strategy,
          optimization,
          strategyComparison,
          projection,
          incomes: formattedIncomes,
          expenses: formattedExpenses,
          debts: userDebts.map((d) => ({
            id: d.id,
            name: d.name,
            creditor: d.creditor || '',
            currentBalance: parseFloat(d.currentBalance as string),
            originalBalance: parseFloat(d.originalBalance as string),
            apr: parseFloat(d.apr as string),
            minimumPayment: parseFloat(d.minimumPayment as string),
            dueDay: d.dueDay ?? 15,
            type: d.type,
            status: d.status,
            paidAmount: Math.max(0, Math.round((parseFloat(d.originalBalance as string) - parseFloat(d.currentBalance as string)) * 100) / 100),
            progress: parseFloat(d.originalBalance as string) > 0
              ? Math.min(100, Math.round(((parseFloat(d.originalBalance as string) - parseFloat(d.currentBalance as string)) / parseFloat(d.originalBalance as string)) * 100))
              : 0,
          })),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
