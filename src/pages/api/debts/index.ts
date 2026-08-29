import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { debts } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { debtSchema } from '@/modules/financial-engine/validators';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const userDebts = await db
      .select()
      .from(debts)
      .where(eq(debts.userId, user.id))
      .orderBy(desc(debts.currentBalance));

    const formatted = userDebts.map((d) => ({
      ...d,
      currentBalance: parseFloat(d.currentBalance as string),
      originalBalance: parseFloat(d.originalBalance as string),
      apr: parseFloat(d.apr as string),
      minimumPayment: parseFloat(d.minimumPayment as string),
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
    const parsed = debtSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos de deuda inválidos' }),
        { status: 400 }
      );
    }

    const {
      name,
      creditor,
      currentBalance,
      originalBalance,
      apr,
      minimumPayment,
      dueDay,
      type,
      currency,
      status,
      paymentTiming,
      hasInstallmentPlan,
      termMonths,
    } = parsed.data;

    const newId = generateId();

    await db.insert(debts).values({
      id: newId,
      userId: user.id,
      name,
      creditor: creditor || '',
      currentBalance: currentBalance.toString(),
      originalBalance: originalBalance.toString(),
      apr: apr.toString(),
      minimumPayment: minimumPayment.toString(),
      dueDay,
      type,
      paymentTiming: paymentTiming || 'fin_de_mes',
      hasInstallmentPlan: !!hasInstallmentPlan,
      termMonths: hasInstallmentPlan ? (termMonths ?? null) : null,
      currency: currency || 'USD',
      status: status || 'active',
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
      return new Response(JSON.stringify({ error: 'ID de deuda requerido' }), { status: 400 });
    }

    const parsed = debtSchema.safeParse(rest);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }),
        { status: 400 }
      );
    }

    const {
      name,
      creditor,
      currentBalance,
      originalBalance,
      apr,
      minimumPayment,
      dueDay,
      type,
      currency,
      status,
      paymentTiming,
      hasInstallmentPlan,
      termMonths,
    } = parsed.data;

    await db
      .update(debts)
      .set({
        name,
        creditor: creditor || '',
        currentBalance: currentBalance.toString(),
        originalBalance: originalBalance.toString(),
        apr: apr.toString(),
        minimumPayment: minimumPayment.toString(),
        dueDay,
        type,
        paymentTiming: paymentTiming || 'fin_de_mes',
        hasInstallmentPlan: !!hasInstallmentPlan,
        termMonths: hasInstallmentPlan ? (termMonths ?? null) : null,
        currency: currency || 'USD',
        status: status || 'active',
      })
      .where(and(eq(debts.id, id), eq(debts.userId, user.id)));

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

    await db.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
