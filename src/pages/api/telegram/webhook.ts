import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { sendTelegramMessage, answerCallbackQuery, escapeHtml } from '@/lib/telegram';
import {
  getUserFinancialSummary,
  formatPaymentsResponse,
  formatBalanceResponse,
  parseQuickExpense,
  recordQuickExpense,
  recordDebtPaymentFromTelegram,
  getUserSavingsGoals,
  formatSavingsGoalsResponse,
  recordSavingsContribution,
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
      const data: string = cb.data || '';

      const [linkedUser] = await db
        .select()
        .from(user)
        .where(eq(user.telegramChatId, String(chatId)));

      if (!linkedUser) {
        await answerCallbackQuery(cb.id, '⚠️ Cuenta no vinculada');
        await sendTelegramMessage(
          chatId,
          '⚠️ Tu cuenta de Telegram no está vinculada a ningún usuario en ProyecAhorro.'
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // A. Botón de Abono a Deuda con 1 Toque: pay:debt:<debtId>:<amount>
      if (data.startsWith('pay:debt:')) {
        const parts = data.split(':');
        const debtId = parts[2];
        const amount = parseFloat(parts[3] || '0');

        if (debtId && amount > 0) {
          const res = await recordDebtPaymentFromTelegram({
            userId: linkedUser.id,
            debtId,
            amount,
          });

          if (res.success) {
            await answerCallbackQuery(cb.id, `✅ Abono de $${amount.toFixed(2)} registrado`);
            let msg = `🎉 <b>¡Abono registrado con éxito!</b>\n\n`;
            msg += `• Deuda: <b>${escapeHtml(res.debtName || 'Deuda')}</b>\n`;
            msg += `• Monto abonado: <b>$${res.amountPaid?.toFixed(2)}</b>\n`;
            if (res.isPaidOff) {
              msg += `🎊 <b>¡FELICITACIONES! Has cancelado esta deuda por completo.</b>\n`;
            } else {
              msg += `• Saldo restante: <b>$${res.newBalance?.toFixed(2)}</b> (antes $${res.previousBalance?.toFixed(2)})\n`;
            }
            msg += `\n<i>💡 Se ha actualizado automáticamente en tu cronograma web.</i>`;
            await sendTelegramMessage(chatId, msg);
          } else {
            await answerCallbackQuery(cb.id, '❌ No se pudo registrar el pago');
          }
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // B. Botón de Aporte a Meta de Ahorro: save:goal:<goalId>:<amount>
      if (data.startsWith('save:goal:')) {
        const parts = data.split(':');
        const goalId = parts[2];
        const amount = parseFloat(parts[3] || '0');

        if (goalId && amount > 0) {
          const res = await recordSavingsContribution({
            userId: linkedUser.id,
            goalId,
            amount,
          });

          if (res.success) {
            await answerCallbackQuery(cb.id, `🎯 +$${amount.toFixed(2)} ahorrados`);
            let msg = `🎯 <b>¡Aporte a Meta Registrado!</b>\n\n`;
            msg += `• Meta: <b>${escapeHtml(res.goalName || 'Ahorro')}</b>\n`;
            msg += `• Aporte: <b>+$${res.amountContributed?.toFixed(2)}</b>\n`;
            msg += `• Acumulado actual: <b>$${res.newCurrent?.toFixed(2)} / $${res.targetAmount?.toFixed(2)}</b> (${res.percentage}%)\n`;
            if (res.isCompleted) {
              msg += `🏆 <b>¡META ALCANZADA! Has completado el 100% del objetivo.</b>\n`;
            } else {
              msg += `<i>¡Cada dólar te acerca más a tu objetivo!</i>`;
            }
            await sendTelegramMessage(chatId, msg);
          } else {
            await answerCallbackQuery(cb.id, '❌ Error al registrar aporte');
          }
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // C. Ver pagos pendientes
      if (data === 'cmd:pagos') {
        await answerCallbackQuery(cb.id);
        const summary = await getUserFinancialSummary(linkedUser.id);
        if (summary) {
          const reply = formatPaymentsResponse(summary);
          await sendTelegramMessage(chatId, reply.text, { reply_markup: reply.reply_markup });
        } else {
          await sendTelegramMessage(chatId, 'No se encontraron datos financieros en tu cuenta.');
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      await answerCallbackQuery(cb.id);
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
          `🔔 A partir de ahora recibirás alertas automáticas de tus fechas de corte y pagos pendientes.\n\n` +
          `<b>🚀 Funciones que puedes usar ahora mismo:</b>\n` +
          `• <b>Escribe cualquier gasto al vuelo:</b>\n` +
          `  Ej: <code>Gasto 4.50 almuerzo</code> o <code>Taxi 6</code>\n` +
          `• <b>/pagos</b> — Ver deudas y gastos del corte con botones para pagar\n` +
          `• <b>/metas</b> — Ver tus metas de ahorro y barras de progreso\n` +
          `• <b>/saldo</b> — Ver tu balance y saldo libre disponible\n` +
          `• <b>/ayuda</b> — Ver la lista completa de comandos`;

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
            `👋 ¡Hola de nuevo, <b>${escapeHtml(linkedUser.name)}</b>!\n\n` +
            `Tu cuenta de ProyecAhorro está conectada y activa.\n\n` +
            `💡 <b>Prueba esto:</b>\n` +
            `• Escribe: <code>Gasto 3.50 café</code> para registrar una compra.\n` +
            `• Escribe: <b>/pagos</b> para revisar tus cuotas próximas.\n` +
            `• Escribe: <b>/metas</b> para ver cómo van tus ahorros.`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `👋 ¡Hola! Soy el asistente financiero de <b>ProyecAhorro</b>.\n\nPara vincular tu cuenta:\n1. Inicia sesión en la plataforma web.\n2. Ve a <b>Configuración &gt; Telegram y Alertas</b>.\n3. Haz clic en <b>"Conectar con Telegram"</b>.`
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // Buscar si el usuario actual está vinculado
      const [linkedUser] = await db
        .select()
        .from(user)
        .where(eq(user.telegramChatId, String(chatId)));

      if (!linkedUser) {
        await sendTelegramMessage(
          chatId,
          '⚠️ Este chat de Telegram aún no está vinculado a una cuenta de ProyecAhorro.\nInicia sesión en la plataforma web para conectarlo.'
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // C. Comando /pagos o /pendientes
      if (text.startsWith('/pagos') || text.startsWith('/pendientes')) {
        const summary = await getUserFinancialSummary(linkedUser.id);
        if (summary) {
          const reply = formatPaymentsResponse(summary);
          await sendTelegramMessage(chatId, reply.text, { reply_markup: reply.reply_markup });
        } else {
          await sendTelegramMessage(
            chatId,
            'No encontramos información financiera registrada en tu cuenta.'
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // D. Comando /metas o /ahorro
      if (text.startsWith('/metas') || text.startsWith('/ahorro')) {
        const goals = await getUserSavingsGoals(linkedUser.id);
        const reply = formatSavingsGoalsResponse(linkedUser.name, goals);
        await sendTelegramMessage(chatId, reply.text, { reply_markup: reply.reply_markup });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // E. Comando /saldo o /balance
      if (text.startsWith('/saldo') || text.startsWith('/balance')) {
        const summary = await getUserFinancialSummary(linkedUser.id);
        if (summary) {
          const reply = formatBalanceResponse(summary);
          await sendTelegramMessage(chatId, reply);
        } else {
          await sendTelegramMessage(chatId, 'No se pudo obtener el saldo.');
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // F. Comando /gasto (instrucciones de gastos rápidos)
      if (text === '/gasto') {
        const msg =
          `📝 <b>Cómo registrar gastos rápidamente:</b>\n\n` +
          `Solo escribe un mensaje en el chat con el monto y el concepto. No necesitas escribir comandos raros.\n\n` +
          `<b>Ejemplos válidos:</b>\n` +
          `• <code>Gasto 4.50 almuerzo</code>\n` +
          `• <code>Taxi 6</code>\n` +
          `• <code>Gasto 25 supermercado</code>\n` +
          `• <code>Farmacia 12.30 medicina</code>\n` +
          `• <code>Gasto 15 gasolina transporte</code>\n\n` +
          `<i>El bot clasificará la categoría automáticamente y verificará tu presupuesto del mes.</i>`;
        await sendTelegramMessage(chatId, msg);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // G. Comando /desvincular
      if (text.startsWith('/desvincular')) {
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
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // H. Comando /ayuda
      if (text === '/ayuda' || text === '/help') {
        const helpText =
          `🤖 <b>Asistente ProyecAhorro — Menú de Comandos</b>\n\n` +
          `• <b>Escribir un gasto:</b> <code>Gasto 5 almuerzo</code> o <code>Taxi 6</code>\n` +
          `• <b>/pagos</b> — Lista de deudas y compromisos con botones de pago rápido\n` +
          `• <b>/metas</b> — Metas de ahorro con barras de progreso visuales\n` +
          `• <b>/saldo</b> — Saldo disponible, ingresos y balance adeudado\n` +
          `• <b>/gasto</b> — Ejemplos para registrar compras al instante\n` +
          `• <b>/desvincular</b> — Desconecta tu Telegram de ProyecAhorro\n\n` +
          `<i>💡 Además recibirás alertas automáticas antes de cada corte de pago.</i>`;

        await sendTelegramMessage(chatId, helpText);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // I. Detector de Gasto Rápido en Lenguaje Natural (ej. "Gasto 4.50 almuerzo" o "Taxi 6")
      const parsedExpense = parseQuickExpense(text);
      if (parsedExpense) {
        const rec = await recordQuickExpense({
          userId: linkedUser.id,
          amount: parsedExpense.amount,
          name: parsedExpense.concept,
          category: parsedExpense.category,
        });

        let msg = `✅ <b>Gasto registrado exitosamente</b>\n\n`;
        msg += `• Concepto: <b>${escapeHtml(rec.name)}</b>\n`;
        msg += `• Monto: <b>$${rec.amount.toFixed(2)}</b>\n`;
        msg += `• Categoría: ${parsedExpense.emoji} <b>${parsedExpense.categoryLabel}</b>\n`;

        if (rec.budgetStatus) {
          const bs = rec.budgetStatus;
          msg += `\n📊 <b>Presupuesto del Mes (${parsedExpense.categoryLabel}):</b>\n`;
          msg += `• Consumido: <b>$${bs.totalSpent.toFixed(2)} / $${bs.monthlyLimit.toFixed(2)}</b> (${bs.percentage}%)\n`;
          if (bs.remaining > 0) {
            msg += `• Disponible restante: <b>$${bs.remaining.toFixed(2)}</b>\n`;
          } else {
            msg += `⚠️ <b>¡Has superado el límite de presupuesto para esta categoría!</b>\n`;
          }
        }

        msg += `\n<i>💡 Registrado en tu cuenta de ProyecAhorro en tiempo real.</i>`;
        await sendTelegramMessage(chatId, msg);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // J. Mensaje no reconocido -> Sugerencia inteligente
      const fallback =
        `Hola <b>${escapeHtml(linkedUser.name)}</b> 👋\n\n` +
        `No reconocí esa instrucción. ¿Deseas registrar un gasto? Prueba escribiendo:\n` +
        `👉 <code>Gasto 12.50 almuerzo</code>\n\n` +
        `O utiliza los comandos rápidos:\n` +
        `• <b>/pagos</b> para ver qué tienes pendiente\n` +
        `• <b>/metas</b> para ver tus ahorros\n` +
        `• <b>/saldo</b> para revisar tu dinero disponible\n` +
        `• <b>/ayuda</b> para ver todas las opciones`;

      await sendTelegramMessage(chatId, fallback);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    console.error('Error in Telegram Webhook:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 200 });
  }
};
