import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { expenses, savingsGoals } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { expenseSchema } from '@/modules/financial-engine/validators';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const userExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, user.id))
      .orderBy(desc(expenses.amount));

    const formatted = userExpenses.map((exp) => ({
      ...exp,
      amount: parseFloat(exp.amount as string),
    }));

    return new Response(JSON.stringify({ data: formatted }), {
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
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos de gasto inválidos' }),
        { status: 400 }
      );
    }

    const {
      name,
      amount,
      category,
      isEssential,
      frequency,
      description,
      paymentTiming,
      activeFrom,
      activeUntil,
    } = parsed.data;

    const newId = generateId();

    await db.insert(expenses).values({
      id: newId,
      userId: user.id,
      name,
      amount: amount.toString(),
      category,
      isEssential: !!isEssential,
      frequency: frequency || 'monthly',
      paymentTiming: paymentTiming || 'ambas',
      activeFrom: activeFrom ? (new Date(activeFrom) as any) : null,
      activeUntil: activeUntil ? (new Date(activeUntil) as any) : null,
      description: description || '',
    });

    return new Response(JSON.stringify({ success: true, id: newId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
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
      return new Response(JSON.stringify({ error: 'ID de gasto requerido' }), { status: 400 });
    }

    const parsed = expenseSchema.safeParse(rest);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }),
        { status: 400 }
      );
    }

    const {
      name,
      amount,
      category,
      isEssential,
      frequency,
      description,
      paymentTiming,
      activeFrom,
      activeUntil,
    } = parsed.data;

    await db
      .update(expenses)
      .set({
        name,
        amount: amount.toString(),
        category,
        isEssential: !!isEssential,
        frequency: frequency || 'monthly',
        paymentTiming: paymentTiming || 'ambas',
        activeFrom: activeFrom ? (new Date(activeFrom) as any) : null,
        activeUntil: activeUntil ? (new Date(activeUntil) as any) : null,
        description: description || '',
      })
      .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
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

    // Desvincular las metas de ahorro que se alimentaban de este gasto
    await db
      .update(savingsGoals)
      .set({ linkedExpenseId: null, linkedSince: null })
      .where(and(eq(savingsGoals.linkedExpenseId, id), eq(savingsGoals.userId, user.id)));

    await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
