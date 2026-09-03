import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes, expenses, debts, payments, savingsGoals, budgets } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const [userIncomes, userExpenses, userDebts, userPayments, userSavings, userBudgets] = await Promise.all([
      db.select().from(incomes).where(eq(incomes.userId, user.id)),
      db.select().from(expenses).where(eq(expenses.userId, user.id)),
      db.select().from(debts).where(eq(debts.userId, user.id)),
      db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.paidAt)),
      db.select().from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
      db.select().from(budgets).where(eq(budgets.userId, user.id)),
    ]);

    // ═══ Métricas Base ═══
    const totalGrossIncome = userIncomes.reduce((s, i) => s + parseFloat(i.amount as string), 0);
    const totalExpenses = userExpenses
      .filter((e) => e.isActive !== false)
      .reduce((s, e) => {
        const amt = parseFloat(e.amount as string);
        const freq = e.frequency || 'monthly';
        if (freq === 'weekly') return s + amt * 4.33;
        if (freq === 'biweekly') return s + amt * 2;
        if (freq === 'annual') return s + amt / 12;
        return s + amt;
      }, 0);

    const totalDebt = userDebts.reduce((s, d) => s + parseFloat(d.currentBalance as string), 0);
    const totalMinPayments = userDebts.reduce((s, d) => s + parseFloat(d.minimumPayment as string), 0);
    const totalSaved = userSavings.reduce((s, g) => s + parseFloat(g.currentAmount as string), 0);
    const totalSavingsTarget = userSavings.reduce((s, g) => s + parseFloat(g.targetAmount as string), 0);

    // ═══ Componentes del Score (0-100) ═══
    // 1. Ratio Deuda/Ingreso (30 pts) — < 20% = 30pts, > 60% = 0pts
    const debtToIncomeRatio = totalGrossIncome > 0 ? (totalMinPayments / totalGrossIncome) * 100 : 0;
    let debtScore = 0;
    if (debtToIncomeRatio <= 0) debtScore = 30;
    else if (debtToIncomeRatio <= 15) debtScore = 28;
    else if (debtToIncomeRatio <= 25) debtScore = 22;
    else if (debtToIncomeRatio <= 35) debtScore = 15;
    else if (debtToIncomeRatio <= 50) debtScore = 8;
    else debtScore = 0;

    // 2. Tasa de Ahorro (25 pts) — ahorro / ingreso
    const savingsRate = totalGrossIncome > 0 ? (totalSaved / (totalGrossIncome * 3)) * 100 : 0; // vs 3 meses
    let savingsScore = 0;
    if (savingsRate >= 100) savingsScore = 25;
    else if (savingsRate >= 75) savingsScore = 20;
    else if (savingsRate >= 50) savingsScore = 15;
    else if (savingsRate >= 25) savingsScore = 10;
    else if (savingsRate > 0) savingsScore = 5;

    // 3. Cumplimiento de Pagos (25 pts) — pagos hechos en los últimos 3 meses
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recentPayments = userPayments.filter((p) => new Date(p.paidAt) >= threeMonthsAgo);
    const expectedPayments = userDebts.length * 3; // 1 pago mínimo × 3 meses × N deudas
    const paymentCompliance = expectedPayments > 0 ? Math.min((recentPayments.length / expectedPayments) * 100, 100) : 100;
    let paymentScore = 0;
    if (paymentCompliance >= 90) paymentScore = 25;
    else if (paymentCompliance >= 70) paymentScore = 18;
    else if (paymentCompliance >= 50) paymentScore = 12;
    else if (paymentCompliance >= 25) paymentScore = 6;

    // 4. Disciplina Presupuestaria (20 pts) — presupuestos dentro del límite
    let budgetScore = 0;
    if (userBudgets.length > 0) {
      const spentByCategory: Record<string, number> = {};
      for (const exp of userExpenses) {
        if (exp.isActive === false) continue;
        const cat = exp.category;
        const amount = parseFloat(exp.amount as string);
        const freq = exp.frequency || 'monthly';
        let monthly = amount;
        if (freq === 'weekly') monthly = amount * 4.33;
        else if (freq === 'biweekly') monthly = amount * 2;
        else if (freq === 'annual') monthly = amount / 12;
        spentByCategory[cat] = (spentByCategory[cat] || 0) + monthly;
      }

      let withinBudget = 0;
      for (const b of userBudgets) {
        const limit = parseFloat(b.monthlyLimit as string);
        const spent = spentByCategory[b.category] || 0;
        if (spent <= limit) withinBudget++;
      }
      const budgetCompliance = (withinBudget / userBudgets.length) * 100;
      if (budgetCompliance >= 90) budgetScore = 20;
      else if (budgetCompliance >= 70) budgetScore = 14;
      else if (budgetCompliance >= 50) budgetScore = 8;
      else budgetScore = 3;
    } else {
      budgetScore = 10; // Sin presupuestos = neutral
    }

    const totalScore = Math.min(debtScore + savingsScore + paymentScore + budgetScore, 100);

    // ═══ Nivel ═══
    let level = 'Principiante';
    let levelColor = '#ef4444';
    if (totalScore >= 85) { level = 'Experto Financiero'; levelColor = '#10b981'; }
    else if (totalScore >= 70) { level = 'Avanzado'; levelColor = '#3b82f6'; }
    else if (totalScore >= 55) { level = 'Intermedio'; levelColor = '#f59e0b'; }
    else if (totalScore >= 35) { level = 'En Progreso'; levelColor = '#f97316'; }

    // ═══ Insignias ═══
    const creditCardDebts = userDebts.filter((d) => d.type === 'credit_card');
    const creditCardDebt = creditCardDebts.reduce((s, d) => s + parseFloat(d.currentBalance as string), 0);

    const emergencyGoals = userSavings.filter((g) => g.category === 'emergency');
    const emergencySaved = emergencyGoals.reduce((s, g) => s + parseFloat(g.currentAmount as string), 0);
    const monthlyExpenses = totalExpenses;
    const hasEmergencyFund1 = monthlyExpenses > 0 && emergencySaved >= monthlyExpenses * 1;
    const hasEmergencyFund3 = monthlyExpenses > 0 && emergencySaved >= monthlyExpenses * 3;

    // Racha de pagos: ¿tiene pagos en los últimos 3 meses consecutivos?
    const paymentMonths = new Set(
      recentPayments.map((p) => {
        const d = new Date(p.paidAt);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );
    const hasStreak3 = paymentMonths.size >= 3;

    const badges: Badge[] = [
      {
        id: 'zero_cc_debt',
        name: 'Cero Deuda en Tarjeta',
        icon: '💳',
        description: 'No tienes saldo pendiente en ninguna tarjeta de crédito',
        unlocked: creditCardDebts.length === 0 || creditCardDebt <= 0,
      },
      {
        id: 'emergency_fund_1',
        name: 'Fondo de Emergencia Nivel 1',
        icon: '🛡️',
        description: 'Has ahorrado al menos 1 mes de gastos en tu fondo de emergencia',
        unlocked: hasEmergencyFund1,
      },
      {
        id: 'emergency_fund_3',
        name: 'Fondo de Emergencia Nivel 3',
        icon: '🏆',
        description: 'Has ahorrado 3 meses de gastos en tu fondo de emergencia',
        unlocked: hasEmergencyFund3,
      },
      {
        id: 'payment_streak_3',
        name: 'Racha de 3 Meses',
        icon: '🔥',
        description: 'Llevas 3 meses consecutivos realizando pagos a tus deudas',
        unlocked: hasStreak3,
      },
      {
        id: 'debt_free',
        name: 'Libre de Deuda',
        icon: '🎉',
        description: 'No tienes ninguna deuda activa registrada',
        unlocked: totalDebt <= 0,
      },
      {
        id: 'saver',
        name: 'Ahorrador Activo',
        icon: '💰',
        description: 'Tienes al menos una meta de ahorro con progreso',
        unlocked: totalSaved > 0,
      },
      {
        id: 'budget_master',
        name: 'Maestro del Presupuesto',
        icon: '📊',
        description: 'Tienes presupuestos asignados y todos están dentro del límite',
        unlocked: userBudgets.length >= 3 && budgetScore >= 18,
      },
      {
        id: 'vault_secured',
        name: 'Bóveda Protegida',
        icon: '🔐',
        description: 'Has configurado tu bóveda de contraseñas con cifrado AES-256',
        unlocked: false, // Se verificará del lado del cliente
      },
    ];

    return new Response(JSON.stringify({
      score: totalScore,
      level,
      levelColor,
      breakdown: {
        debtManagement: { score: debtScore, max: 30, ratio: Math.round(debtToIncomeRatio * 10) / 10 },
        savings: { score: savingsScore, max: 25, rate: Math.round(savingsRate * 10) / 10 },
        paymentCompliance: { score: paymentScore, max: 25, compliance: Math.round(paymentCompliance * 10) / 10 },
        budgetDiscipline: { score: budgetScore, max: 20, budgetsCount: userBudgets.length },
      },
      badges,
      stats: {
        totalIncome: totalGrossIncome,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalDebt,
        totalSaved,
        debtToIncomeRatio: Math.round(debtToIncomeRatio * 10) / 10,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
