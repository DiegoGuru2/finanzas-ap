import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { incomes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { incomeSchema, type IncomeInput } from '@/modules/financial-engine/validators';
import { calculateSalaryDetails } from '@/modules/financial-engine/cashflow';
import { calculateBenefits } from '@/modules/financial-engine/benefits';
import { DEFAULT_IESS_PERCENTAGE, DEFAULT_SBU } from '@/modules/financial-engine/constants';
import { generateId } from '@/lib/utils';

/** Convierte una fila de la base al Income del motor (numéricos parseados). */
const toEngineIncome = (inc: typeof incomes.$inferSelect) => ({
  id: inc.id,
  name: inc.name,
  amount: parseFloat(inc.amount as string),
  frequency: (inc.frequency as any) || 'monthly',
  isSalary: !!inc.isSalary,
  paymentScheme: (inc.paymentScheme as any) || 'quincena_fin_mes',
  quincenaAmount: inc.quincenaAmount ? parseFloat(inc.quincenaAmount as string) : 0,
  finDeMesAmount: inc.finDeMesAmount ? parseFloat(inc.finDeMesAmount as string) : 0,
  deductIess: inc.deductIess ?? true,
  iessPercentage: inc.iessPercentage
    ? parseFloat(inc.iessPercentage as string)
    : DEFAULT_IESS_PERCENTAGE,
  hasProgrammedSavings: !!inc.hasProgrammedSavings,
  programmedSavingsAmount: inc.programmedSavingsAmount
    ? parseFloat(inc.programmedSavingsAmount as string)
    : 0,
  hasFondosReserva: !!inc.hasFondosReserva,
  fondosReservaMensualizado: inc.fondosReservaMensualizado ?? true,
  decimoTerceroMensualizado: inc.decimoTerceroMensualizado ?? true,
  decimoCuartoMensualizado: inc.decimoCuartoMensualizado ?? true,
  region: (inc.region === 'sierra' ? 'sierra' : 'costa') as 'costa' | 'sierra',
  sbuAmount: inc.sbuAmount ? parseFloat(inc.sbuAmount as string) : DEFAULT_SBU,
  hasUtilidades: inc.hasUtilidades ?? true,
  utilidadesAmount: inc.utilidadesAmount ? parseFloat(inc.utilidadesAmount as string) : 0,
});

/** Valores para INSERT/UPDATE a partir del payload validado. */
const toDbValues = (data: IncomeInput) => {
  const details = calculateSalaryDetails({ id: '', ...data });
  return {
    name: data.name,
    amount: data.amount.toString(),
    frequency: data.frequency,
    isSalary: data.isSalary,
    paymentScheme: data.paymentScheme,
    quincenaAmount: details.quincenaAmount.toString(),
    finDeMesAmount: details.finDeMesAmount.toString(),
    deductIess: data.deductIess,
    iessPercentage: data.iessPercentage.toString(),
    hasProgrammedSavings: !!data.hasProgrammedSavings,
    programmedSavingsAmount: (data.programmedSavingsAmount || 0).toString(),
    hasFondosReserva: data.hasFondosReserva,
    fondosReservaMensualizado: data.fondosReservaMensualizado,
    decimoTerceroMensualizado: data.decimoTerceroMensualizado,
    decimoCuartoMensualizado: data.decimoCuartoMensualizado,
    region: data.region,
    sbuAmount: data.sbuAmount.toString(),
    hasUtilidades: data.hasUtilidades,
    utilidadesAmount: data.utilidadesAmount.toString(),
    category: data.category || 'Sueldo',
    date: data.date ? (new Date(data.date) as any) : null,
  };
};

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

    // Enrich with calculated salary details + benefits
    const enriched = userIncomes.map((inc) => {
      const engineIncome = toEngineIncome(inc);
      const details = calculateSalaryDetails(engineIncome);
      const benefits = calculateBenefits(engineIncome);

      return {
        ...inc,
        ...engineIncome,
        quincenaAmount: details.quincenaAmount,
        finDeMesAmount: details.finDeMesAmount,
        iessDeduction: details.iessDeduction,
        programmedSavings: details.programmedSavings,
        netAmount: details.netMonthly,
        benefits,
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

    const newId = generateId();
    await db.insert(incomes).values({
      id: newId,
      userId: user.id,
      ...toDbValues(parsed.data),
    });

    return new Response(JSON.stringify({ success: true, id: newId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
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
      return new Response(JSON.stringify({ error: 'ID de ingreso requerido' }), { status: 400 });
    }

    const parsed = incomeSchema.safeParse(rest);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }),
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: incomes.id })
      .from(incomes)
      .where(and(eq(incomes.id, id), eq(incomes.userId, user.id)));

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Ingreso no encontrado' }), { status: 404 });
    }

    await db
      .update(incomes)
      .set(toDbValues(parsed.data))
      .where(and(eq(incomes.id, id), eq(incomes.userId, user.id)));

    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
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
