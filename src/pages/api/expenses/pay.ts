import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { expensePayments, expenses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

export const POST: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const body = await ctx.request.json();
    const { expenseId, periodKey, amount, paidAt, toggle } = body;

    if (!expenseId || !periodKey) {
      return new Response(
        JSON.stringify({ error: 'expenseId y periodKey son requeridos' }),
        { status: 400 }
      );
    }

    // Verificar si el gasto pertenece al usuario
    const [exp] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.userId, user.id)));

    if (!exp) {
      return new Response(JSON.stringify({ error: 'Gasto no encontrado' }), { status: 404 });
    }

    // Buscar si ya existe un registro de pago para este gasto y período
    const existing = await db
      .select()
      .from(expensePayments)
      .where(
        and(
          eq(expensePayments.userId, user.id),
          eq(expensePayments.expenseId, expenseId),
          eq(expensePayments.periodKey, periodKey)
        )
      );

    if (existing.length > 0) {
      // Si ya existe y se solicitó toggle o delete, lo desmarcamos
      if (toggle || body.action === 'unpay') {
        await db
          .delete(expensePayments)
          .where(
            and(
              eq(expensePayments.userId, user.id),
              eq(expensePayments.expenseId, expenseId),
              eq(expensePayments.periodKey, periodKey)
            )
          );
        return new Response(
          JSON.stringify({ success: true, isPaid: false, message: 'Gasto desmarcado' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Marcar como pagado
    const payAmount = Number(amount) || Number(exp.amount) || 0;
    const payDate = paidAt ? new Date(paidAt) : new Date();

    const newId = generateId();
    await db.insert(expensePayments).values({
      id: newId,
      userId: user.id,
      expenseId,
      periodKey,
      amount: payAmount.toString(),
      paidAt: payDate as any,
      createdAt: new Date(),
    });

    return new Response(
      JSON.stringify({ success: true, isPaid: true, id: newId, message: 'Gasto marcado como pagado' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
