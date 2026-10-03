import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user, incomes, expenses, debts, payments, expensePayments, alerts } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { buildPaymentSchedule } from '@/modules/financial-engine/schedule';
import type { Debt, Expense, Income } from '@/modules/financial-engine/types';
import { generateId, parseLocalDateParts, toLocalDateString } from '@/lib/utils';
import { sendCutReminderEmail } from '@/lib/email';
import { sendTelegramMessage, buildCutReminderMessage } from '@/lib/telegram';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const ALL: APIRoute = async (ctx) => {
  // Verificación de seguridad de Cron
  const authHeader = ctx.request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    Boolean((ctx.locals.user as any)?.role === 'admin');

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'No autorizado para ejecutar cron' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const allUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        telegramChatId: user.telegramChatId,
        telegramNotificationsEnabled: user.telegramNotificationsEnabled,
      })
      .from(user);
    const todayStr = toLocalDateString(new Date());
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    let processedUsers = 0;
    let alertsCreated = 0;
    let emailsSent = 0;
    let telegramSent = 0;

    for (const u of allUsers) {
      processedUsers++;

      const [userIncomes, userExpenses, userDebts, userPayments, userExpensePayments] = await Promise.all([
        db.select().from(incomes).where(eq(incomes.userId, u.id)),
        db.select().from(expenses).where(eq(expenses.userId, u.id)),
        db.select().from(debts).where(eq(debts.userId, u.id)),
        db.select().from(payments).where(eq(payments.userId, u.id)).orderBy(desc(payments.paidAt)),
        db.select().from(expensePayments).where(eq(expensePayments.userId, u.id)),
      ]);

      const formattedIncomes: Income[] = userIncomes
        .filter((i) => i.isActive !== false)
        .map((i) => ({
          id: i.id,
          name: i.name,
          amount: parseFloat(i.amount as string),
          frequency: (i.frequency as any) || 'monthly',
          isSalary: !!i.isSalary,
          paymentScheme: (i.paymentScheme as any) || 'quincena_fin_mes',
          quincenaAmount: i.quincenaAmount ? parseFloat(i.quincenaAmount as string) : 0,
          finDeMesAmount: i.finDeMesAmount ? parseFloat(i.finDeMesAmount as string) : 0,
          deductIess: i.deductIess ?? true,
          iessPercentage: i.iessPercentage ? parseFloat(i.iessPercentage as string) : 9.45,
          hasProgrammedSavings: !!i.hasProgrammedSavings,
          programmedSavingsAmount: i.programmedSavingsAmount ? parseFloat(i.programmedSavingsAmount as string) : 0,
          hasFondosReserva: !!i.hasFondosReserva,
          fondosReservaMensualizado: i.fondosReservaMensualizado ?? true,
          decimoTerceroMensualizado: i.decimoTerceroMensualizado ?? true,
          decimoCuartoMensualizado: i.decimoCuartoMensualizado ?? true,
          region: (i.region === 'sierra' ? 'sierra' : 'costa') as 'costa' | 'sierra',
          sbuAmount: i.sbuAmount ? parseFloat(i.sbuAmount as string) : undefined,
          hasUtilidades: i.hasUtilidades ?? true,
          utilidadesAmount: i.utilidadesAmount ? parseFloat(i.utilidadesAmount as string) : 0,
          date: parseLocalDateParts(i.date)?.dateStr || null,
        }));

      const formattedExpenses: Expense[] = userExpenses
        .filter((e) => e.isActive !== false)
        .map((e) => ({
          id: e.id,
          name: e.name,
          amount: parseFloat(e.amount as string),
          category: e.category as any,
          isEssential: !!e.isEssential,
          frequency: (e.frequency as any) || 'monthly',
          paymentTiming: (e.paymentTiming as any) || 'ambas',
          activeFrom: parseLocalDateParts(e.activeFrom)?.dateStr || null,
          activeUntil: parseLocalDateParts(e.activeUntil)?.dateStr || null,
        }));

      const formattedDebts: Debt[] = userDebts
        .filter((d) => d.status !== 'paid_off' && parseFloat(d.currentBalance as string) > 0)
        .map((d) => ({
          id: d.id,
          name: d.name,
          creditor: d.creditor || undefined,
          currentBalance: parseFloat(d.currentBalance as string),
          originalBalance: parseFloat(d.originalBalance as string),
          apr: parseFloat(d.apr as string),
          minimumPayment: parseFloat(d.minimumPayment as string),
          dueDay: d.dueDay ?? 15,
          type: d.type as any,
          paymentTiming: (d.paymentTiming as any) || 'fin_de_mes',
          hasInstallmentPlan: !!d.hasInstallmentPlan,
          termMonths: d.termMonths ?? null,
        }));

      const schedule = buildPaymentSchedule({
        debts: formattedDebts,
        incomes: formattedIncomes,
        expenses: formattedExpenses,
        months: 2,
      });

      // Cruce con pagos registrados
      const paid: Record<string, Record<string, number>> = {};
      for (const p of userPayments) {
        const parts = parseLocalDateParts(p.paidAt);
        if (!parts) continue;
        const timing = parts.day <= 15 ? 'quincena' : 'fin_de_mes';
        const period = schedule.periods.find(
          (per) => per.year === parts.year && per.month === parts.month && per.timing === timing
        );
        if (!period) continue;
        paid[p.debtId] = paid[p.debtId] || {};
        paid[p.debtId][period.key] = (paid[p.debtId][period.key] || 0) + parseFloat(p.amount as string);
      }

      const nextPeriod = schedule.periods.find((p) => p.date >= todayStr) || schedule.periods[0];
      if (!nextPeriod) continue;

      const pParts = parseLocalDateParts(nextPeriod.date);
      if (!pParts) continue;

      const pDate = new Date(pParts.year, pParts.month, pParts.day);
      const diffTime = pDate.getTime() - todayDate.getTime();
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Solo notificar si faltan 2 días o menos (0 = hoy, 1 = mañana, 2 = pasado mañana)
      if (daysDiff >= 0 && daysDiff <= 2) {
        const debtRows = schedule.rows.filter((r) => r.kind === 'debt');
        const expenseRows = schedule.rows.filter((r) => r.kind === 'expense');

        const pendingDebts = debtRows.filter((r) => {
          const scheduledAmount = r.cells[nextPeriod.key] || 0;
          if (scheduledAmount <= 0) return false;
          const paidAmount = paid[r.id]?.[nextPeriod.key] || 0;
          return paidAmount < scheduledAmount;
        });

        // Filtrar gastos no cubiertos en este corte
        const paidExpenseIds = new Set<string>();
        for (const ep of userExpensePayments) {
          if (ep.periodKey === nextPeriod.key) {
            paidExpenseIds.add(ep.expenseId);
          }
        }
        const pendingExpenses = expenseRows.filter(
          (r) => (r.cells[nextPeriod.key] || 0) > 0 && !paidExpenseIds.has(r.id)
        );

        if (pendingDebts.length > 0 || pendingExpenses.length > 0) {
          // Verificar si ya se envió alerta en las últimas 24 horas para este corte
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const existingAlerts = await db
            .select()
            .from(alerts)
            .where(
              and(
                eq(alerts.userId, u.id),
                eq(alerts.type, 'due_reminder'),
                gte(alerts.createdAt, oneDayAgo)
              )
            );

          if (existingAlerts.length === 0) {
            const cutName = `${nextPeriod.day} de ${MONTH_NAMES[nextPeriod.month]}`;
            const totalDebtsAmount = pendingDebts.reduce((sum, d) => {
              const scheduled = d.cells[nextPeriod.key] || 0;
              const alreadyPaid = paid[d.id]?.[nextPeriod.key] || 0;
              return sum + Math.max(0, scheduled - alreadyPaid);
            }, 0);
            const totalExpensesAmount = pendingExpenses.reduce((sum, e) => sum + (e.cells[nextPeriod.key] || 0), 0);
            const remainingIncome = schedule.remaining[nextPeriod.key] || 0;

            const urgency =
              daysDiff === 0
                ? '¡Hoy es tu corte de pago!'
                : daysDiff === 1
                  ? 'Mañana es tu corte de pago'
                  : `Corte en 2 días (${cutName})`;

            // 1. Guardar en tabla alerts (título limpio sin emojis)
            await db.insert(alerts).values({
              id: generateId(),
              userId: u.id,
              type: 'due_reminder',
              title: urgency,
              message: `Tienes ${pendingDebts.length} cuotas de deuda y ${pendingExpenses.length} gastos pendientes por un total de $${(totalDebtsAmount + totalExpensesAmount).toFixed(2)}. Saldo restante proyectado: $${remainingIncome.toFixed(2)}.`,
              isRead: false,
            });
            alertsCreated++;

            // 2. Enviar correo transaccional
            if (u.email) {
              await sendCutReminderEmail({
                to: u.email,
                name: u.name,
                cutDate: nextPeriod.date,
                cutDay: nextPeriod.day,
                cutMonthName: MONTH_NAMES[nextPeriod.month],
                pendingDebtsCount: pendingDebts.length,
                totalDebtsAmount,
                pendingExpensesCount: pendingExpenses.length,
                totalExpensesAmount,
                remainingIncome,
              }).catch((e) => console.error('Error enviando correo de recordatorio en cron:', e));
              emailsSent++;
            }

            // 3. Enviar mensaje de Telegram (si tiene cuenta vinculada y notificaciones activas)
            if (u.telegramChatId && u.telegramNotificationsEnabled !== false) {
              const mappedPendingDebts = pendingDebts.map((d) => {
                const scheduled = d.cells[nextPeriod.key] || 0;
                const alreadyPaid = paid[d.id]?.[nextPeriod.key] || 0;
                return { name: d.name, amount: Math.max(0, scheduled - alreadyPaid) };
              });
              const mappedPendingExpenses = pendingExpenses.map((e) => ({
                name: e.name,
                amount: e.cells[nextPeriod.key] || 0,
              }));

              const reminderMsg = buildCutReminderMessage({
                name: u.name,
                cutDay: nextPeriod.day,
                cutMonthName: MONTH_NAMES[nextPeriod.month],
                urgencyTitle: urgency,
                pendingDebts: mappedPendingDebts,
                pendingExpenses: mappedPendingExpenses,
                totalDebtsAmount,
                totalExpensesAmount,
                remainingIncome,
              });

              await sendTelegramMessage(u.telegramChatId, reminderMsg.text, {
                reply_markup: reminderMsg.reply_markup,
              }).catch((e) => console.error('Error enviando recordatorio de Telegram en cron:', e));
              telegramSent++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedUsers,
        alertsCreated,
        emailsSent,
        telegramSent,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en daily-check cron:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
