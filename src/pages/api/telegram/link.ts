import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getBotUsername, isTelegramConfigured } from '@/lib/telegram';
import crypto from 'node:crypto';

export const POST: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user;
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isTelegramConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'El bot de Telegram no está configurado en el servidor (falta TELEGRAM_BOT_TOKEN en variables de entorno)',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const botUsername = getBotUsername();
  if (!botUsername) {
    return new Response(
      JSON.stringify({
        error: 'El nombre de usuario del bot no está configurado (falta TELEGRAM_BOT_USERNAME)',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Generar código aleatorio seguro de 16 caracteres
    const rawCode = crypto.randomBytes(8).toString('hex');
    const linkCode = `link_${rawCode}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await db
      .update(user)
      .set({
        telegramLinkCode: linkCode,
        telegramLinkExpires: expiresAt,
      })
      .where(eq(user.id, currentUser.id));

    const linkUrl = `https://t.me/${botUsername}?start=${linkCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        linkCode,
        linkUrl,
        expiresInMinutes: 15,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error generating telegram link code:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user;
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await db
      .update(user)
      .set({
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkCode: null,
        telegramLinkExpires: null,
      })
      .where(eq(user.id, currentUser.id));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cuenta de Telegram desvinculada exitosamente',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error unlinking telegram account:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
