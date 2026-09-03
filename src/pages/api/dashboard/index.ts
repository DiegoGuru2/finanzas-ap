import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes, expenses, debts, savingsGoals, budgets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { calculateCashflow } from '@/modules/financial-engine/cashflow';
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

    const [userIncomes, userExpenses, userDebts, userSavings, userBudgets] = await Promise.all([
      db.select().from(incomes).where(eq(incomes.userId, user.id)),
      db.select().from(expenses).where(eq(expenses.userId, user.id)),
      db.select().from(debts).where(eq(debts.userId, user.id)),
      db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
      db.select().from(budgets).where(eq(budgets.userId, user.id)),
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

    // Métricas avanzadas adicionales: Ahorro y Presupuestos
    const totalSaved = userSavings.reduce((sum, s) => sum + parseFloat(s.currentAmount as string || '0'), 0);
    const totalSavingsTarget = userSavings.reduce((sum, s) => sum + parseFloat(s.targetAmount as string || '0'), 0);
    const totalMonthlySavingsContribution = userSavings
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + parseFloat(s.monthlyContribution as string || '0'), 0);

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
            // Nuevas métricas avanzadas
            totalSaved,
            totalSavingsTarget,
            totalMonthlySavingsContribution,
            debtToIncomeRatio,
            budgetsCount: userBudgets.length,
          },
          expensesByCategory,
          strategy,
          optimization,
          strategyComparison,
          projection,
          incomes: formattedIncomes,
          expenses: formattedExpenses,
          debts: formattedDebts,
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
