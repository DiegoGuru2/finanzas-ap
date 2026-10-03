/**
 * ═══════════════════════════════════════════════════════════════════
 * Telegram Bot Service — ProyecAhorro
 * Integración con Telegram Bot API para alertas y recordatorios financieros
 * ═══════════════════════════════════════════════════════════════════
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '') || '';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'https://finanzas-ap-black.vercel.app';

export function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN.trim().length > 0);
}

export function getBotUsername(): string {
  return TELEGRAM_BOT_USERNAME;
}

export interface SendTelegramMessageOptions {
  reply_markup?: any;
  parse_mode?: 'HTML' | 'MarkdownV2' | 'Markdown';
  disable_web_page_preview?: boolean;
}

/**
 * Envía un mensaje vía Telegram Bot API utilizando fetch nativo
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: SendTelegramMessageOptions = {}
): Promise<{ ok: boolean; description?: string; result?: any }> {
  if (!isTelegramConfigured()) {
    console.warn('[Telegram] ⚠️ TELEGRAM_BOT_TOKEN no configurado. No se envió el mensaje.');
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN no configurado' };
  }

  const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode ?? 'HTML',
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('[Telegram] Error al enviar mensaje:', data.description);
    }
    return data;
  } catch (err: any) {
    console.error('[Telegram] Error de red o petición:', err?.message || err);
    return { ok: false, description: err?.message || 'Error de red' };
  }
}

/**
 * Responde a un callback query de botón interactivo (para quitar el icono de cargando en Telegram)
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  if (!isTelegramConfigured()) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (err) {
    console.error('[Telegram] Error answering callback query:', err);
  }
}

/**
 * Genera el mensaje formateado para recordatorio de corte de pagos
 */
export function buildCutReminderMessage(data: {
  name: string;
  cutDay: number;
  cutMonthName: string;
  urgencyTitle: string;
  pendingDebts: Array<{ name: string; amount: number }>;
  pendingExpenses: Array<{ name: string; amount: number }>;
  totalDebtsAmount: number;
  totalExpensesAmount: number;
  remainingIncome: number;
  appUrl?: string;
}): { text: string; reply_markup: any } {
  const totalCommitment = data.totalDebtsAmount + data.totalExpensesAmount;
  const baseUrl = data.appUrl || PUBLIC_APP_URL;

  let text = `<b>⏰ ${data.urgencyTitle}</b>\n`;
  text += `<i>Corte del ${data.cutDay} de ${data.cutMonthName}</i>\n\n`;
  text += `Hola <b>${escapeHtml(data.name || 'Usuario')}</b>, aquí tienes el resumen de tus compromisos próximos a vencer:\n\n`;

  if (data.pendingDebts.length > 0) {
    text += `💳 <b>Deudas pendientes (${data.pendingDebts.length}):</b>\n`;
    for (const d of data.pendingDebts.slice(0, 5)) {
      text += `  • ${escapeHtml(d.name)}: <b>$${d.amount.toFixed(2)}</b>\n`;
    }
    if (data.pendingDebts.length > 5) {
      text += `  <i>...y ${data.pendingDebts.length - 5} más</i>\n`;
    }
    text += `  <b>Subtotal deudas:</b> $${data.totalDebtsAmount.toFixed(2)}\n\n`;
  }

  if (data.pendingExpenses.length > 0) {
    text += `🏠 <b>Gastos fijos asignados (${data.pendingExpenses.length}):</b>\n`;
    for (const e of data.pendingExpenses.slice(0, 5)) {
      text += `  • ${escapeHtml(e.name)}: <b>$${e.amount.toFixed(2)}</b>\n`;
    }
    if (data.pendingExpenses.length > 5) {
      text += `  <i>...y ${data.pendingExpenses.length - 5} más</i>\n`;
    }
    text += `  <b>Subtotal gastos:</b> $${data.totalExpensesAmount.toFixed(2)}\n\n`;
  }

  text += `───────────────────────\n`;
  text += `💰 <b>Total a cubrir en corte:</b> <code>$${totalCommitment.toFixed(2)}</code>\n`;
  const balanceEmoji = data.remainingIncome >= 0 ? '🟢' : '🔴';
  text += `${balanceEmoji} <b>Saldo libre proyectado:</b> <code>$${data.remainingIncome.toFixed(2)}</code>\n\n`;
  text += `<i>💡 Recuerda registrar tus pagos en la plataforma para mantener tus saldos al día.</i>`;

  const reply_markup = {
    inline_keyboard: [
      [
        {
          text: '🌐 Abrir Cronograma en Web',
          url: `${baseUrl}/app/payments`,
        },
      ],
      [
        {
          text: '📋 Ver Todo en Detalle',
          callback_data: 'cmd:pagos',
        },
      ],
    ],
  };

  return { text, reply_markup };
}

/**
 * Escapa caracteres HTML especiales para evitar errores de sintaxis en Telegram
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
