import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes, expenses, debts, payments, expensePayments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { buildPaymentSchedule } from '@/modules/financial-engine/schedule';
import type { Debt, Expense, Income } from '@/modules/financial-engine/types';
import { parseLocalDateParts } from '@/lib/utils';

const toIsoDate = (v: unknown): string | null => {
  return parseLocalDateParts(v)?.dateStr || null;
};

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const url = new URL(ctx.request.url);
    const monthsParam = parseInt(url.searchParams.get('months') || '6', 10);
    const months = Number.isNaN(monthsParam) ? 6 : Math.min(Math.max(monthsParam, 1), 12);

    const [userIncomes, userExpenses, userDebts, userPayments, userExpensePayments] = await Promise.all([
      db.select().from(incomes).where(eq(incomes.userId, user.id)),
      db.select().from(expenses).where(eq(expenses.userId, user.id)),
      db.select().from(debts).where(eq(debts.userId, user.id)),
      db
        .select({
          id: payments.id,
          debtId: payments.debtId,
          debtName: debts.name,
          amount: payments.amount,
          type: payments.type,
          paidAt: payments.paidAt,
          notes: payments.notes,
        })
        .from(payments)
        .leftJoin(debts, eq(payments.debtId, debts.id))
        .where(eq(payments.userId, user.id))
        .orderBy(desc(payments.paidAt)),
      db
        .select()
        .from(expensePayments)
        .where(eq(expensePayments.userId, user.id)),
    ]);

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
        programmedSavingsAmount: i.programmedSavingsAmount
          ? parseFloat(i.programmedSavingsAmount as string)
          : 0,
        // Beneficios de Ley
        hasFondosReserva: !!i.hasFondosReserva,
        fondosReservaMensualizado: i.fondosReservaMensualizado ?? true,
        decimoTerceroMensualizado: i.decimoTerceroMensualizado ?? true,
        decimoCuartoMensualizado: i.decimoCuartoMensualizado ?? true,
        region: (i.region === 'sierra' ? 'sierra' : 'costa') as 'costa' | 'sierra',
        sbuAmount: i.sbuAmount ? parseFloat(i.sbuAmount as string) : undefined,
        hasUtilidades: i.hasUtilidades ?? true,
        utilidadesAmount: i.utilidadesAmount ? parseFloat(i.utilidadesAmount as string) : 0,
        workStartDate: i.workStartDate
          ? (typeof i.workStartDate === 'string'
            ? i.workStartDate
            : (i.workStartDate as any).toISOString?.().slice(0, 10) || String(i.workStartDate))
          : null,
        contractType: (i.contractType as any) || 'indefinite',
        contractDurationMonths: i.contractDurationMonths ?? 12,
        hasSalaryChange: !!i.hasSalaryChange,
        previousSalaryAmount: i.previousSalaryAmount ? parseFloat(i.previousSalaryAmount as string) : 0,
        salaryChangeDate: i.salaryChangeDate
          ? (typeof i.salaryChangeDate === 'string'
            ? i.salaryChangeDate
            : (i.salaryChangeDate as any).toISOString?.().slice(0, 10) || String(i.salaryChangeDate))
          : null,
        monthlyOvertimeAmount: i.monthlyOvertimeAmount ? parseFloat(i.monthlyOvertimeAmount as string) : 0,
        date: toIsoDate(i.date),
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
        activeFrom: toIsoDate(e.activeFrom),
        activeUntil: toIsoDate(e.activeUntil),
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
      months,
    });

    // Cruce con pagos registrados: marca las celdas del cronograma ya cubiertas.
    // Un pago del día 1-15 cae en el corte de quincena; del 16 en adelante, en fin de mes.
    // Usamos parseLocalDateParts para evitar desfasajes de zona horaria (UTC vs local).
    const paid: Record<string, Record<string, number>> = {};
    for (const p of userPayments) {
      const parts = parseLocalDateParts(p.paidAt);
      if (!parts) continue;
      const timing = parts.day <= 15 ? 'quincena' : 'fin_de_mes';
      const period = schedule.periods.find(
        (per) =>
          per.year === parts.year &&
          per.month === parts.month &&
          per.timing === timing
      );
      if (!period) continue;
      paid[p.debtId] = paid[p.debtId] || {};
      paid[p.debtId][period.key] =
        (paid[p.debtId][period.key] || 0) + parseFloat(p.amount as string);
    }

    // Mapa de gastos recurrentes marcados como pagados por período
    const paidExpenses: Record<string, Record<string, number>> = {};
    for (const ep of userExpensePayments) {
      paidExpenses[ep.expenseId] = paidExpenses[ep.expenseId] || {};
      paidExpenses[ep.expenseId][ep.periodKey] = parseFloat(ep.amount as string);
    }

    const history = userPayments.map((p) => ({
      ...p,
      amount: parseFloat(p.amount as string),
      paidAt: toIsoDate(p.paidAt) || String(p.paidAt),
    }));

    return new Response(
      JSON.stringify({ data: { schedule, paid, paidExpenses, history, months } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
