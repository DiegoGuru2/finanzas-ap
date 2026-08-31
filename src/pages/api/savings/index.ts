import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { savingsGoals } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { savingsGoalSchema } from '@/modules/financial-engine/validators';
import { projectSavingsGoal, type SavingsGoal } from '@/modules/financial-engine/savings';
import { generateId } from '@/lib/utils';

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
});

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, user.id))
      .orderBy(desc(savingsGoals.createdAt));

    const enriched = rows.map((row) => {
      const goal = toGoal(row);
      const projection = projectSavingsGoal(goal);
      return { ...goal, projection };
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

    // Auto-complete if currentAmount >= targetAmount
    const autoStatus = data.currentAmount >= data.targetAmount ? 'completed' : data.status;

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
