import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { savingsGoals, expenses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { savingsGoalSchema } from '@/modules/financial-engine/validators';
import {
  calculateLinkedAccrual,
  projectSavingsGoal,
  type SavingsGoal,
} from '@/modules/financial-engine/savings';
import { normalizeToMonthly } from '@/modules/financial-engine/cashflow';
import { generateId } from '@/lib/utils';

const toIso = (v: unknown): string | null => {
  if (!v) return null;
  const d = new Date(v as any);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toGoal = (row: typeof savingsGoals.$inferSelect): SavingsGoal => ({
  id: row.id,
  name: row.name,
  targetAmount: parseFloat(row.targetAmount as string),
  currentAmount: parseFloat(row.currentAmount as string),
  monthlyContribution: parseFloat(row.monthlyContribution as string),
  startDate: row.startDate as string,
  targetDate: row.targetDate as string | null,
  category: row.category,
  icon: row.icon || '🎯',
  status: row.status,
  linkedExpenseId: row.linkedExpenseId || null,
  linkedSince: toIso(row.linkedSince),
});

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const [rows, userExpenses] = await Promise.all([
      db
        .select()
        .from(savingsGoals)
        .where(eq(savingsGoals.userId, user.id))
        .orderBy(desc(savingsGoals.createdAt)),
      db.select().from(expenses).where(eq(expenses.userId, user.id)),
    ]);

    const enriched = rows.map((row) => {
      const goal = toGoal(row);

      // ─── Meta vinculada a un gasto: acumula sola con el tiempo ───
      // El "Ya ahorrado" manual queda como base; cada mes cumplido desde
      // linkedSince suma el monto mensual del gasto vinculado.
      const linkedExpense = goal.linkedExpenseId
        ? userExpenses.find((e) => e.id === goal.linkedExpenseId)
        : null;

      if (linkedExpense) {
        const monthlyAmount = normalizeToMonthly(
          parseFloat(linkedExpense.amount as string),
          (linkedExpense.frequency as any) || 'monthly'
        );
        const since = goal.linkedSince || goal.startDate;
        const accrual = calculateLinkedAccrual(since, monthlyAmount);

        const baseAmount = goal.currentAmount;
        const effectiveAmount = Math.min(
          goal.targetAmount,
          Math.round((baseAmount + accrual.accrued) * 100) / 100
        );

        const effectiveGoal: SavingsGoal = {
          ...goal,
          currentAmount: effectiveAmount,
          monthlyContribution: accrual.monthlyAmount,
        };
        const projection = projectSavingsGoal(effectiveGoal);

        return {
          ...effectiveGoal,
          // La meta se muestra completada cuando el acumulado la alcanza
          status: goal.status === 'active' && effectiveAmount >= goal.targetAmount ? 'completed' : goal.status,
          baseAmount,
          linked: {
            expenseId: linkedExpense.id,
            expenseName: linkedExpense.name,
            monthlyAmount: accrual.monthlyAmount,
            monthsElapsed: accrual.monthsElapsed,
            accrued: accrual.accrued,
            since,
          },
          projection,
        };
      }

      const projection = projectSavingsGoal(goal);
      return { ...goal, baseAmount: goal.currentAmount, linked: null, projection };
    });

    // Aggregates
    const totalSaved = enriched.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalTarget = enriched.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalMonthly = enriched
      .filter((g) => g.status === 'active')
      .reduce((sum, g) => sum + g.monthlyContribution, 0);
    const activeCount = enriched.filter((g) => g.status === 'active').length;
    const completedCount = enriched.filter((g) => g.status === 'completed').length;

    return new Response(
      JSON.stringify({
        data: enriched,
        summary: {
          totalSaved,
          totalTarget,
          totalMonthly,
          activeCount,
          completedCount,
          overallPercent: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 10000) / 100 : 0,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const body = await ctx.request.json();
    const parsed = savingsGoalSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }),
        { status: 400 }
      );
    }

    const data = parsed.data;
    const newId = generateId();

    // El gasto vinculado debe existir y ser del usuario
    let linkedExpenseId: string | null = null;
    if (data.linkedExpenseId) {
      const [exp] = await db
        .select({ id: expenses.id })
        .from(expenses)
        .where(and(eq(expenses.id, data.linkedExpenseId), eq(expenses.userId, user.id)));
      if (!exp) {
        return new Response(JSON.stringify({ error: 'El gasto vinculado no existe' }), { status: 400 });
      }
      linkedExpenseId = exp.id;
    }

    await db.insert(savingsGoals).values({
      id: newId,
      userId: user.id,
      name: data.name,
      targetAmount: data.targetAmount.toString(),
      currentAmount: data.currentAmount.toString(),
      monthlyContribution: data.monthlyContribution.toString(),
      startDate: new Date(data.startDate) as any,
      targetDate: data.targetDate ? (new Date(data.targetDate) as any) : null,
      category: data.category,
      icon: data.icon,
      priority: data.priority,
      status: data.status,
      linkedExpenseId,
      linkedSince: linkedExpenseId
        ? (new Date(data.linkedSince || new Date().toISOString().slice(0, 10)) as any)
        : null,
    });

    return new Response(
      JSON.stringify({ success: true, id: newId }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const body = await ctx.request.json();
    const { id, ...rest } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID de meta requerido' }), { status: 400 });
    }

    const parsed = savingsGoalSchema.safeParse(rest);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }),
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: savingsGoals.id })
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id)));

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Meta no encontrada' }), { status: 404 });
    }

    const data = parsed.data;

    // El gasto vinculado debe existir y ser del usuario
    let linkedExpenseId: string | null = null;
    if (data.linkedExpenseId) {
      const [exp] = await db
        .select({ id: expenses.id })
        .from(expenses)
        .where(and(eq(expenses.id, data.linkedExpenseId), eq(expenses.userId, user.id)));
      if (!exp) {
        return new Response(JSON.stringify({ error: 'El gasto vinculado no existe' }), { status: 400 });
      }
      linkedExpenseId = exp.id;
    }

    // Auto-complete if currentAmount >= targetAmount (sin vínculo; con vínculo
    // el estado efectivo se calcula al leer, incluyendo lo acumulado)
    const autoStatus =
      !linkedExpenseId && data.currentAmount >= data.targetAmount ? 'completed' : data.status;

    await db
      .update(savingsGoals)
      .set({
        name: data.name,
        targetAmount: data.targetAmount.toString(),
        currentAmount: data.currentAmount.toString(),
        monthlyContribution: data.monthlyContribution.toString(),
        startDate: new Date(data.startDate) as any,
        targetDate: data.targetDate ? (new Date(data.targetDate) as any) : null,
        category: data.category,
        icon: data.icon,
        priority: data.priority,
        status: autoStatus,
        linkedExpenseId,
        linkedSince: linkedExpenseId
          ? (new Date(data.linkedSince || new Date().toISOString().slice(0, 10)) as any)
          : null,
      })
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id)));

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const url = new URL(ctx.request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    await db
      .delete(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
