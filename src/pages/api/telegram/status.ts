import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getBotUsername, isTelegramConfigured } from '@/lib/telegram';

export const GET: APIRoute = async (ctx) => {
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
        telegramChatId: user.telegramChatId,
        telegramUsername: user.telegramUsername,
        telegramNotificationsEnabled: user.telegramNotificationsEnabled,
      })
      .from(user)
      .where(eq(user.id, currentUser.id));

    if (!userData) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isLinked = Boolean(userData.telegramChatId && userData.telegramChatId.trim().length > 0);

    return new Response(
      JSON.stringify({
        success: true,
        isLinked,
        telegramUsername: userData.telegramUsername || null,
        telegramNotificationsEnabled: userData.telegramNotificationsEnabled ?? true,
        botUsername: getBotUsername(),
        isBotConfigured: isTelegramConfigured(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error fetching telegram status:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user;
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await ctx.request.json();
    const { telegramNotificationsEnabled } = body;

    await db
      .update(user)
      .set({
        telegramNotificationsEnabled: Boolean(telegramNotificationsEnabled),
      })
      .where(eq(user.id, currentUser.id));

    return new Response(
      JSON.stringify({
        success: true,
        telegramNotificationsEnabled: Boolean(telegramNotificationsEnabled),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error updating telegram settings:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
