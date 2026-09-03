import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { budgets, expenses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const [userBudgets, userExpenses] = await Promise.all([
      db.select().from(budgets).where(eq(budgets.userId, user.id)),
      db.select().from(expenses).where(eq(expenses.userId, user.id)),
    ]);

    // Calcular gasto real mensual por categoría
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

    const data = userBudgets.map((b) => {
      const limit = parseFloat(b.monthlyLimit as string);
      const spent = spentByCategory[b.category] || 0;
      const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      return {
        id: b.id,
        category: b.category,
        monthlyLimit: limit,
        spent: Math.round(spent * 100) / 100,
        percentage: Math.round(pct * 10) / 10,
        status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok',
      };
    });

    // Resumen global
    const totalLimit = data.reduce((s, b) => s + b.monthlyLimit, 0);
    const totalSpent = data.reduce((s, b) => s + b.spent, 0);

    return new Response(JSON.stringify({
      data,
      summary: {
        totalLimit,
        totalSpent,
        totalPercentage: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 1000) / 10 : 0,
        categoriesOverBudget: data.filter((b) => b.status === 'exceeded').length,
        categoriesWarning: data.filter((b) => b.status === 'warning').length,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
    const { category, monthlyLimit } = body;

    if (!category || !monthlyLimit || monthlyLimit <= 0) {
      return new Response(JSON.stringify({ error: 'Categoría y límite son requeridos' }), { status: 400 });
    }

    // Verificar si ya existe un presupuesto para esta categoría
    const existing = await db.select().from(budgets)
      .where(and(eq(budgets.userId, user.id), eq(budgets.category, category)));

    if (existing.length > 0) {
      // Actualizar el existente
      await db.update(budgets)
        .set({ monthlyLimit: String(monthlyLimit) })
        .where(eq(budgets.id, existing[0].id));

      return new Response(JSON.stringify({ success: true, id: existing[0].id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = generateId();
    await db.insert(budgets).values({
      id,
      userId: user.id,
      category,
      monthlyLimit: String(monthlyLimit),
    });

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
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

    await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
