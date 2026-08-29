import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { payments, debts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { paymentSchema } from '@/modules/financial-engine/validators';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const userPayments = await db
      .select({
        id: payments.id,
        debtId: payments.debtId,
        debtName: debts.name,
        amount: payments.amount,
        type: payments.type,
        paidAt: payments.paidAt,
        notes: payments.notes,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(debts, eq(payments.debtId, debts.id))
      .where(eq(payments.userId, user.id))
      .orderBy(desc(payments.paidAt));

    const formatted = userPayments.map((p) => ({
      ...p,
      amount: parseFloat(p.amount as string),
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
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos de pago inválidos' }),
        { status: 400 }
      );
    }

    const { debtId, amount, type, paidAt, notes } = parsed.data;

    // Fetch debt to verify ownership and update balance
    const [targetDebt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, debtId), eq(debts.userId, user.id)));

    if (!targetDebt) {
      return new Response(JSON.stringify({ error: 'Deuda no encontrada' }), { status: 404 });
    }

    const currentBal = parseFloat(targetDebt.currentBalance as string);
    const newBal = Math.max(0, currentBal - amount);

    const newId = generateId();

    // Insert payment record
    await db.insert(payments).values({
      id: newId,
      userId: user.id,
      debtId,
      amount: amount.toString(),
      type,
      paidAt: new Date(paidAt) as any,
      notes: notes || '',
    });

    // Update debt current balance
    await db
      .update(debts)
      .set({
        currentBalance: newBal.toString(),
        status: newBal === 0 ? 'paid_off' : 'active',
      })
      .where(eq(debts.id, debtId));

    return new Response(JSON.stringify({ success: true, id: newId, remainingBalance: newBal }), {
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
      return new Response(JSON.stringify({ error: 'ID de pago requerido' }), { status: 400 });
    }

    const parsed = paymentSchema.safeParse(rest);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos de pago inválidos' }),
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, user.id)));

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Pago no encontrado' }), { status: 404 });
    }

    const { amount, type, paidAt, notes } = parsed.data;

    // El monto solo puede cambiar contra la misma deuda; se ajusta el saldo por la diferencia
    const [targetDebt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, existing.debtId), eq(debts.userId, user.id)));

    if (!targetDebt) {
      return new Response(JSON.stringify({ error: 'Deuda del pago no encontrada' }), { status: 404 });
    }

    const oldAmount = parseFloat(existing.amount as string);
    const delta = amount - oldAmount;
    const currentBal = parseFloat(targetDebt.currentBalance as string);
    const newBal = Math.max(0, Math.round((currentBal - delta) * 100) / 100);

    await db
      .update(payments)
      .set({
        amount: amount.toString(),
        type,
        paidAt: new Date(paidAt) as any,
        notes: notes || '',
      })
      .where(and(eq(payments.id, id), eq(payments.userId, user.id)));

    await db
      .update(debts)
      .set({
        currentBalance: newBal.toString(),
        status: newBal === 0 ? 'paid_off' : 'active',
      })
      .where(eq(debts.id, existing.debtId));

    return new Response(JSON.stringify({ success: true, remainingBalance: newBal }), {
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

    const [existing] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, user.id)));

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Pago no encontrado' }), { status: 404 });
    }

    // Revertir el abono en el saldo de la deuda antes de eliminar el registro
    const [targetDebt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, existing.debtId), eq(debts.userId, user.id)));

    if (targetDebt) {
      const restored =
        Math.round(
          (parseFloat(targetDebt.currentBalance as string) +
            parseFloat(existing.amount as string)) *
            100
        ) / 100;
      await db
        .update(debts)
        .set({ currentBalance: restored.toString(), status: restored > 0 ? 'active' : 'paid_off' })
        .where(eq(debts.id, existing.debtId));
    }

    await db.delete(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
