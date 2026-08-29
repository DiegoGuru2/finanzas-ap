import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { incomeSchema } from '@/modules/financial-engine/validators';
import { calculateSalaryDetails } from '@/modules/financial-engine/cashflow';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const userIncomes = await db
      .select()
      .from(incomes)
      .where(eq(incomes.userId, user.id))
      .orderBy(desc(incomes.createdAt));

    // Enrich with calculated salary details
    const enriched = userIncomes.map((inc) => {
      const amountNum = parseFloat(inc.amount as string);
      const isSalary = !!inc.isSalary;
      const details = calculateSalaryDetails({
        id: inc.id,
        name: inc.name,
        amount: amountNum,
        frequency: (inc.frequency as any) || 'monthly',
        isSalary,
        paymentScheme: (inc.paymentScheme as any) || 'quincena_fin_mes',
        quincenaAmount: inc.quincenaAmount ? parseFloat(inc.quincenaAmount as string) : 0,
        finDeMesAmount: inc.finDeMesAmount ? parseFloat(inc.finDeMesAmount as string) : 0,
        deductIess: inc.deductIess ?? true,
        iessPercentage: inc.iessPercentage ? parseFloat(inc.iessPercentage as string) : 9.45,
        hasProgrammedSavings: !!inc.hasProgrammedSavings,
        programmedSavingsAmount: inc.programmedSavingsAmount ? parseFloat(inc.programmedSavingsAmount as string) : 0,
      });

      return {
        ...inc,
        amount: amountNum,
        hasProgrammedSavings: !!inc.hasProgrammedSavings,
        programmedSavingsAmount: inc.programmedSavingsAmount ? parseFloat(inc.programmedSavingsAmount as string) : 0,
        quincenaAmount: details.quincenaAmount,
        finDeMesAmount: details.finDeMesAmount,
        iessDeduction: details.iessDeduction,
        programmedSavings: details.programmedSavings,
        netAmount: details.netMonthly,
      };
    });

    return new Response(JSON.stringify({ data: enriched }), {
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
    const parsed = incomeSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }),
        { status: 400 }
      );
    }

    const {
      name,
      amount,
      frequency,
      isSalary,
      paymentScheme,
      quincenaAmount,
      finDeMesAmount,
      deductIess,
      iessPercentage,
      hasProgrammedSavings,
      programmedSavingsAmount,
      category,
      date,
    } = parsed.data;

    // Calculate auto breakdown if needed
    const details = calculateSalaryDetails({
      id: '',
      name,
      amount,
      frequency,
      isSalary,
      paymentScheme,
      quincenaAmount,
      finDeMesAmount,
      deductIess,
      iessPercentage,
      hasProgrammedSavings,
      programmedSavingsAmount,
    });

    const newId = generateId();

    await db.insert(incomes).values({
      id: newId,
      userId: user.id,
      name,
      amount: amount.toString(),
      frequency,
      isSalary,
      paymentScheme,
      quincenaAmount: details.quincenaAmount.toString(),
      finDeMesAmount: details.finDeMesAmount.toString(),
      deductIess,
      iessPercentage: iessPercentage.toString(),
      hasProgrammedSavings: !!hasProgrammedSavings,
      programmedSavingsAmount: (programmedSavingsAmount || 0).toString(),
      category: category || 'Sueldo',
      date: date ? (new Date(date) as any) : null,
    });

    return new Response(JSON.stringify({ success: true, id: newId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
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

    await db
      .delete(incomes)
      .where(and(eq(incomes.id, id), eq(incomes.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
