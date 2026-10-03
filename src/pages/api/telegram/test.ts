import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendTelegramMessage, buildCutReminderMessage } from '@/lib/telegram';

export const POST: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user;
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const [userData] = await db
      .select({
        id: user.id,
        name: user.name,
        telegramChatId: user.telegramChatId,
      })
      .from(user)
      .where(eq(user.id, currentUser.id));

    if (!userData || !userData.telegramChatId) {
      return new Response(
        JSON.stringify({ error: 'No tienes una cuenta de Telegram vinculada' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const testReminder = buildCutReminderMessage({
      name: userData.name || 'Usuario',
      cutDay: 15,
      cutMonthName: 'Octubre',
      urgencyTitle: 'Prueba de Conexión Exitosa',
      pendingDebts: [
        { name: 'Tarjeta Crédito (Ejemplo)', amount: 45.0 },
        { name: 'Préstamo Personal (Ejemplo)', amount: 110.0 },
      ],
      pendingExpenses: [
        { name: 'Servicio de Internet (Ejemplo)', amount: 35.0 },
      ],
      totalDebtsAmount: 155.0,
      totalExpensesAmount: 35.0,
      remainingIncome: 310.0,
      appUrl: process.env.PUBLIC_APP_URL || 'https://finanzas-ap-black.vercel.app',
    });

    const result = await sendTelegramMessage(
      userData.telegramChatId,
      testReminder.text,
      { reply_markup: testReminder.reply_markup }
    );

    if (!result.ok) {
      return new Response(
        JSON.stringify({
          error: `Telegram rechazó el envío: ${result.description || 'Error desconocido'}`,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Mensaje de prueba enviado exitosamente a tu Telegram!',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error sending telegram test message:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
