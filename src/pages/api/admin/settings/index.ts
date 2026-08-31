import type { APIRoute } from 'astro';

let globalParams = {
  sbuAmount: 460.0,
  iessPercentagePrivate: 9.45,
  iessPercentagePublic: 11.45,
  maxDebtToIncomeRatio: 40.0,
  emergencyReserveMonthsDefault: 3,
  systemName: 'ProyecAhorro',
  systemVersion: '1.2.0',
  legalDecimoTerceroDate: '12-24',
  legalDecimoCuartoCostaDate: '03-15',
  legalDecimoCuartoSierraDate: '08-15',
};

export const GET: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  return new Response(JSON.stringify({ success: true, data: globalParams }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const body = await ctx.request.json();
    globalParams = { ...globalParams, ...body };

    return new Response(JSON.stringify({ success: true, data: globalParams }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
