import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { payments, debts, alerts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { paymentSchema } from '@/modules/financial-engine/validators';
import { generateId, parseLocalDateParts, toLocalDateString } from '@/lib/utils';
import { sendPaymentReceiptEmail, sendDebtPaidOffEmail } from '@/lib/email';

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
      paidAt: toLocalDateString(p.paidAt),
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
    const newId = generateId();

    // Normalizar fecha de pago evitando desfasajes de zona horaria
    const dateParts = parseLocalDateParts(paidAt);
    const safeDateStr = dateParts ? dateParts.dateStr : toLocalDateString(new Date());

    // ─── Transacción atómica: insertar pago + actualizar saldo + generar alerta ───
    const result = await db.transaction(async (tx) => {
      const [targetDebt] = await tx
        .select()
        .from(debts)
        .where(and(eq(debts.id, debtId), eq(debts.userId, user.id)));

      if (!targetDebt) {
        throw new Error('DEBT_NOT_FOUND');
      }

      const currentBal = parseFloat(targetDebt.currentBalance as string);
      const overpayment = Math.round(Math.max(0, amount - currentBal) * 100) / 100;
      const newBal = Math.max(0, Math.round((currentBal - amount) * 100) / 100);
      const isPaidOff = newBal === 0;

      await tx.insert(payments).values({
        id: newId,
        userId: user.id,
        debtId,
        amount: amount.toString(),
        type,
        paidAt: safeDateStr as any,
        notes: notes || '',
      });

      await tx
        .update(debts)
        .set({
          currentBalance: newBal.toString(),
          status: isPaidOff ? 'paid_off' : 'active',
        })
        .where(eq(debts.id, debtId));

      // ─── Generar alerta in-app en la tabla alerts ───
      const alertId = generateId();
      await tx.insert(alerts).values({
        id: alertId,
        userId: user.id,
        type: isPaidOff ? 'debt_cleared' : 'payment',
        title: isPaidOff
          ? `¡Deuda liquidada: ${targetDebt.name}!`
          : `Abono de $${amount.toFixed(2)} registrado`,
        message: isPaidOff
          ? `¡Felicidades! Has liquidado por completo "${targetDebt.name}" con un abono de $${amount.toFixed(2)}.`
          : `Se aplicó un abono de $${amount.toFixed(2)} a "${targetDebt.name}". Saldo restante: $${newBal.toFixed(2)}.`,
        isRead: false,
      });

      return {
        newBal,
        isPaidOff,
        overpayment,
        debtName: targetDebt.name,
      };
    });

    // ─── Envío asíncrono de comprobante por correo (no bloquea respuesta si falla SMTP) ───
    if (user.email) {
      sendPaymentReceiptEmail({
        to: user.email,
        name: user.name,
        debtName: result.debtName,
        amount,
        remainingBalance: result.newBal,
        isPaidOff: result.isPaidOff,
        paidAt: safeDateStr,
        paymentType: type,
        notes,
      }).catch((emailErr) => {
        console.error('[Payments] Error enviando comprobante de pago por correo:', emailErr?.message || emailErr);
      });

      if (result.isPaidOff) {
        sendDebtPaidOffEmail({
          to: user.email,
          name: user.name,
          debtName: result.debtName,
          totalPaid: amount,
        }).catch((emailErr) => {
          console.error('[Payments] Error enviando correo de felicitación por deuda liquidada:', emailErr?.message || emailErr);
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: newId,
        remainingBalance: result.newBal,
        isPaidOff: result.isPaidOff,
        overpayment: result.overpayment,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    if (err.message === 'DEBT_NOT_FOUND') {
      return new Response(JSON.stringify({ error: 'Deuda no encontrada' }), { status: 404 });
    }
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

    const { amount, type, paidAt, notes } = parsed.data;
    const dateParts = parseLocalDateParts(paidAt);
    const safeDateStr = dateParts ? dateParts.dateStr : toLocalDateString(new Date());

    // ─── Transacción atómica: actualizar pago + ajustar saldo ───
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, id), eq(payments.userId, user.id)));

      if (!existing) {
        throw new Error('PAYMENT_NOT_FOUND');
      }

      const [targetDebt] = await tx
        .select()
        .from(debts)
        .where(and(eq(debts.id, existing.debtId), eq(debts.userId, user.id)));

      if (!targetDebt) {
        throw new Error('DEBT_NOT_FOUND');
      }

      const oldAmount = parseFloat(existing.amount as string);
      const delta = amount - oldAmount;
      const currentBal = parseFloat(targetDebt.currentBalance as string);
      const newBal = Math.max(0, Math.round((currentBal - delta) * 100) / 100);
      const isPaidOff = newBal === 0;

      await tx
        .update(payments)
        .set({
          amount: amount.toString(),
          type,
          paidAt: safeDateStr as any,
          notes: notes || '',
        })
        .where(and(eq(payments.id, id), eq(payments.userId, user.id)));

      await tx
        .update(debts)
        .set({
          currentBalance: newBal.toString(),
          status: isPaidOff ? 'paid_off' : 'active',
        })
        .where(eq(debts.id, existing.debtId));

      await tx.insert(alerts).values({
        id: generateId(),
        userId: user.id,
        type: isPaidOff ? 'debt_cleared' : 'payment',
        title: isPaidOff
          ? `¡Deuda liquidada: ${targetDebt.name}!`
          : `Abono actualizado: ${targetDebt.name}`,
        message: `Se actualizó el abono a $${amount.toFixed(2)} en "${targetDebt.name}". Saldo actual: $${newBal.toFixed(2)}.`,
        isRead: false,
      });

      return { newBal, isPaidOff };
    });

    return new Response(
      JSON.stringify({ success: true, remainingBalance: result.newBal, isPaidOff: result.isPaidOff }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    if (err.message === 'PAYMENT_NOT_FOUND') {
      return new Response(JSON.stringify({ error: 'Pago no encontrado' }), { status: 404 });
    }
    if (err.message === 'DEBT_NOT_FOUND') {
      return new Response(JSON.stringify({ error: 'Deuda del pago no encontrada' }), { status: 404 });
    }
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

    // ─── Transacción atómica: revertir saldo + eliminar pago + registrar alerta ───
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, id), eq(payments.userId, user.id)));

      if (!existing) {
        throw new Error('PAYMENT_NOT_FOUND');
      }

      const [targetDebt] = await tx
        .select()
        .from(debts)
        .where(and(eq(debts.id, existing.debtId), eq(debts.userId, user.id)));

      if (targetDebt) {
        const restored = Math.round(
          (parseFloat(targetDebt.currentBalance as string) +
            parseFloat(existing.amount as string)) *
            100
        ) / 100;

        await tx
          .update(debts)
          .set({
            currentBalance: restored.toString(),
            status: restored > 0 ? 'active' : 'paid_off',
          })
          .where(eq(debts.id, existing.debtId));

        await tx.insert(alerts).values({
          id: generateId(),
          userId: user.id,
          type: 'payment_reversed',
          title: 'Pago eliminado y saldo restaurado',
          message: `Se eliminó el abono de $${parseFloat(existing.amount as string).toFixed(2)} a "${targetDebt.name}". El saldo se restauró a $${restored.toFixed(2)}.`,
          isRead: false,
        });
      }

      await tx.delete(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id)));
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    if (err.message === 'PAYMENT_NOT_FOUND') {
      return new Response(JSON.stringify({ error: 'Pago no encontrado' }), { status: 404 });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
