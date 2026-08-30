import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes, expenses, debts, payments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { buildPaymentSchedule } from '@/modules/financial-engine/schedule';
import type { Debt, Expense, Income } from '@/modules/financial-engine/types';

const toIsoDate = (v: unknown): string | null => {
  if (!v) return null;
  const d = new Date(v as any);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

    const [userIncomes, userExpenses, userDebts, userPayments] = await Promise.all([
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
    const paid: Record<string, Record<string, number>> = {};
    for (const p of userPayments) {
      const paidDate = new Date(p.paidAt as any);
      if (Number.isNaN(paidDate.getTime())) continue;
      const timing = paidDate.getDate() <= 15 ? 'quincena' : 'fin_de_mes';
      const period = schedule.periods.find(
        (per) =>
          per.year === paidDate.getFullYear() &&
          per.month === paidDate.getMonth() &&
          per.timing === timing
      );
      if (!period) continue;
      paid[p.debtId] = paid[p.debtId] || {};
      paid[p.debtId][period.key] =
        (paid[p.debtId][period.key] || 0) + parseFloat(p.amount as string);
    }

    const history = userPayments.map((p) => ({
      ...p,
      amount: parseFloat(p.amount as string),
    }));

    return new Response(
      JSON.stringify({ data: { schedule, paid, history, months } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
