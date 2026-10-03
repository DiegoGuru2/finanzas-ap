import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { sendTelegramMessage, answerCallbackQuery, escapeHtml } from '@/lib/telegram';
import {
  getUserFinancialSummary,
  formatPaymentsResponse,
  formatBalanceResponse,
} from '@/lib/telegram-engine';

export const POST: APIRoute = async (ctx) => {
  // Verificación de token secreto opcional para el Webhook de Telegram
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incomingSecret = ctx.request.headers.get('x-telegram-bot-api-secret-token');
    if (incomingSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }
  }

  try {
    const update = await ctx.request.json();

    // ═══════════════════════════════════════════
    // 1. Manejo de Botones Interactivos (Callback Queries)
    // ═══════════════════════════════════════════
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id || cb.from?.id;
      const data = cb.data;

      await answerCallbackQuery(cb.id);

      if (data === 'cmd:pagos') {
        const [linkedUser] = await db
          .select()
          .from(user)
          .where(eq(user.telegramChatId, String(chatId)));

        if (!linkedUser) {
          await sendTelegramMessage(
            chatId,
            '⚠️ Tu cuenta de Telegram no está vinculada a ningún usuario en ProyecAhorro.'
          );
        } else {
          const summary = await getUserFinancialSummary(linkedUser.id);
          if (summary) {
            const reply = formatPaymentsResponse(summary);
            await sendTelegramMessage(chatId, reply);
          } else {
            await sendTelegramMessage(
              chatId,
              'No se encontraron datos financieros registrados en tu cuenta.'
            );
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ═══════════════════════════════════════════
    // 2. Manejo de Mensajes de Texto
    // ═══════════════════════════════════════════
    if (update.message && update.message.text) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text.trim();
      const fromUsername = msg.from?.username || msg.from?.first_name || '';

      // A. Comando /start con código de vinculación: /start link_xxxx
      if (text.startsWith('/start link_')) {
        const linkCode = text.replace('/start ', '').trim();
        const now = new Date();

        const [candidateUser] = await db
          .select()
          .from(user)
          .where(
            and(
              eq(user.telegramLinkCode, linkCode),
              gte(user.telegramLinkExpires, now)
            )
          );

        if (!candidateUser) {
          await sendTelegramMessage(
            chatId,
            '⚠️ <b>El enlace de vinculación no es válido o ya expiró.</b>\n\nPor favor, ingresa a ProyecAhorro en tu navegador web y haz clic nuevamente en <b>"Conectar con Telegram"</b> para generar un código nuevo.'
          );
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        // Vincular usuario
        await db
          .update(user)
          .set({
            telegramChatId: String(chatId),
            telegramUsername: fromUsername || null,
            telegramLinkCode: null,
            telegramLinkExpires: null,
            telegramNotificationsEnabled: true,
          })
          .where(eq(user.id, candidateUser.id));

        const welcomeText =
          `🎉 <b>¡Cuenta Vinculada con Éxito!</b>\n\n` +
          `Hola <b>${escapeHtml(candidateUser.name)}</b>, tu cuenta de <b>ProyecAhorro</b> ahora está conectada a este Telegram.\n\n` +
          `🔔 A partir de ahora recibirás automáticamente aquí los recordatorios de tus fechas de corte y pagos por realizar.\n\n` +
          `<b>Comandos que puedes escribir en cualquier momento:</b>\n` +
          `• <b>/pagos</b> — Ver deudas y gastos del corte actual\n` +
          `• <b>/saldo</b> — Ver tu balance y saldo libre proyectado\n` +
          `• <b>/desvincular</b> — Desconectar tu Telegram\n` +
          `• <b>/ayuda</b> — Ver la lista de comandos`;

        await sendTelegramMessage(chatId, welcomeText);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // B. Comando /start (sin código)
      if (text === '/start') {
        const [linkedUser] = await db
          .select()
          .from(user)
          .where(eq(user.telegramChatId, String(chatId)));

        if (linkedUser) {
          await sendTelegramMessage(
            chatId,
            `👋 ¡Hola de nuevo, <b>${escapeHtml(linkedUser.name)}</b>!\n\nTu cuenta de ProyecAhorro está conectada activamente.\n\nPrueba escribir <b>/pagos</b> o <b>/saldo</b> para revisar tu estado financiero.`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `👋 ¡Hola! Soy el asistente financiero de <b>ProyecAhorro</b>.\n\nPara vincular tu cuenta:\n1. Inicia sesión en la plataforma web.\n2. Ve a <b>Configuración &gt; Telegram</b>.\n3. Haz clic en <b>"Conectar con Telegram"</b>.`
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // C. Comando /pagos o /pendientes
      if (text.startsWith('/pagos') || text.startsWith('/pendientes')) {
        const [linkedUser] = await db
          .select()
          .from(user)
          .where(eq(user.telegramChatId, String(chatId)));

        if (!linkedUser) {
          await sendTelegramMessage(
            chatId,
            '⚠️ Este chat de Telegram aún no está vinculado a una cuenta de ProyecAhorro.\nInicia sesión en la web para conectarlo.'
          );
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        const summary = await getUserFinancialSummary(linkedUser.id);
        if (summary) {
          const reply = formatPaymentsResponse(summary);
          await sendTelegramMessage(chatId, reply);
        } else {
          await sendTelegramMessage(
            chatId,
            'No encontramos información financiera registrada en tu cuenta.'
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // D. Comando /saldo
      if (text.startsWith('/saldo')) {
        const [linkedUser] = await db
          .select()
          .from(user)
          .where(eq(user.telegramChatId, String(chatId)));

        if (!linkedUser) {
          await sendTelegramMessage(
            chatId,
            '⚠️ Este chat de Telegram aún no está vinculado a una cuenta de ProyecAhorro.'
          );
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        const summary = await getUserFinancialSummary(linkedUser.id);
        if (summary) {
          const reply = formatBalanceResponse(summary);
          await sendTelegramMessage(chatId, reply);
        } else {
          await sendTelegramMessage(chatId, 'No se pudo obtener el saldo.');
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // E. Comando /desvincular
      if (text.startsWith('/desvincular')) {
        const [linkedUser] = await db
          .select()
          .from(user)
          .where(eq(user.telegramChatId, String(chatId)));

        if (linkedUser) {
          await db
            .update(user)
            .set({
              telegramChatId: null,
              telegramUsername: null,
              telegramLinkCode: null,
              telegramLinkExpires: null,
            })
            .where(eq(user.id, linkedUser.id));

          await sendTelegramMessage(
            chatId,
            '✅ <b>Tu cuenta de ProyecAhorro ha sido desvinculada exitosamente de este Telegram.</b>\nYa no recibirás alertas aquí. Puedes volver a vincularla cuando desees desde la web.'
          );
        } else {
          await sendTelegramMessage(
            chatId,
            'ℹ️ No tenías ninguna cuenta vinculada a este chat.'
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // F. Comando /ayuda o cualquier otro mensaje
      const helpText =
        `🤖 <b>Comandos disponibles en ProyecAhorro:</b>\n\n` +
        `• <b>/pagos</b> — Lista detallada de deudas y gastos del corte próximo\n` +
        `• <b>/saldo</b> — Resumen de ingresos, compromisos y saldo libre disponible\n` +
        `• <b>/desvincular</b> — Desconecta tu cuenta de Telegram\n` +
        `• <b>/ayuda</b> — Muestra este menú de ayuda\n\n` +
        `<i>💡 Además recibirás alertas automáticas antes de cada corte de pago.</i>`;

      await sendTelegramMessage(chatId, helpText);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    console.error('Error in Telegram Webhook:', err);
    // Respondemos 200 para que Telegram no reintente indefinidamente en caso de payload malformado
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 200 });
  }
};
