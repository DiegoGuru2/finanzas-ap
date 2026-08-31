import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user, debts, incomes, expenses, savingsGoals, payments } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export const GET: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado: Se requiere rol de Administrador' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Total users & role breakdown
    const allUsers = await db.select({ id: user.id, role: user.role, emailVerified: user.emailVerified }).from(user);
    const totalUsers = allUsers.length;
    const adminCount = allUsers.filter((u) => u.role === 'admin').length;
    const standardUsers = totalUsers - adminCount;

    // 2. Financial commitments aggregate
    const [debtStats]: any = await db.execute(
      sql`SELECT COUNT(*) as count, COALESCE(SUM(currentBalance), 0) as totalDebt, COALESCE(SUM(minimumPayment), 0) as totalMinPayment FROM \`debts\``
    );
    const [incomeStats]: any = await db.execute(
      sql`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalIncome FROM \`incomes\``
    );
    const [expenseStats]: any = await db.execute(
      sql`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalExpenses FROM \`expenses\``
    );
    const [savingsStats]: any = await db.execute(
      sql`SELECT COUNT(*) as count, COALESCE(SUM(targetAmount), 0) as totalTarget, COALESCE(SUM(currentAmount), 0) as totalSaved FROM \`savings_goals\``
    );
    const [paymentStats]: any = await db.execute(
      sql`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalPaid FROM \`payments\``
    );

    const parseNum = (val: any) => parseFloat(val || 0);

    const stats = {
      users: {
        total: totalUsers,
        admins: adminCount,
        standard: standardUsers,
      },
      debts: {
        count: parseInt(debtStats[0]?.count || 0),
        totalBalance: parseNum(debtStats[0]?.totalDebt),
        monthlyPayment: parseNum(debtStats[0]?.totalMinPayment),
      },
      incomes: {
        count: parseInt(incomeStats[0]?.count || 0),
        totalVolume: parseNum(incomeStats[0]?.totalIncome),
      },
      expenses: {
        count: parseInt(expenseStats[0]?.count || 0),
        totalVolume: parseNum(expenseStats[0]?.totalExpenses),
      },
      savings: {
        count: parseInt(savingsStats[0]?.count || 0),
        totalTarget: parseNum(savingsStats[0]?.totalTarget),
        totalSaved: parseNum(savingsStats[0]?.totalSaved),
      },
      payments: {
        count: parseInt(paymentStats[0]?.count || 0),
        totalPaid: parseNum(paymentStats[0]?.totalPaid),
      },
    };

    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
