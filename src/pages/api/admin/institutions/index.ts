import type { APIRoute } from 'astro';

// In-memory / curated list of Ecuadorian Financial Entities with reference rates
let institutions = [
  { id: '1', name: 'Banco Pichincha', type: 'Banco', code: 'BPIC', defaultApr: 15.6, maxTermMonths: 60, status: 'active' },
  { id: '2', name: 'Banco Guayaquil', type: 'Banco', code: 'BGYE', defaultApr: 16.06, maxTermMonths: 60, status: 'active' },
  { id: '3', name: 'Produbanco', type: 'Banco', code: 'PROD', defaultApr: 15.8, maxTermMonths: 48, status: 'active' },
  { id: '4', name: 'Banco del Pacífico', type: 'Banco', code: 'BPAC', defaultApr: 15.2, maxTermMonths: 60, status: 'active' },
  { id: '5', name: 'Banco Bolivariano', type: 'Banco', code: 'BBOL', defaultApr: 16.0, maxTermMonths: 48, status: 'active' },
  { id: '6', name: 'Banco Internacional', type: 'Banco', code: 'BINT', defaultApr: 15.5, maxTermMonths: 48, status: 'active' },
  { id: '7', name: 'BIESS — Préstamo Quirografario', type: 'Pública', code: 'BIESS-Q', defaultApr: 11.0, maxTermMonths: 60, status: 'active' },
  { id: '8', name: 'BIESS — Préstamo Hipotecario', type: 'Pública', code: 'BIESS-H', defaultApr: 6.99, maxTermMonths: 300, status: 'active' },
  { id: '9', name: 'Coop. Policía Nacional', type: 'Cooperativa', code: 'CPN', defaultApr: 14.5, maxTermMonths: 60, status: 'active' },
  { id: '10', name: 'Coop. JEP (Juventud Ecuatoriana)', type: 'Cooperativa', code: 'JEP', defaultApr: 14.8, maxTermMonths: 60, status: 'active' },
  { id: '11', name: 'Coop. Alianza del Valle', type: 'Cooperativa', code: 'ADV', defaultApr: 15.0, maxTermMonths: 48, status: 'active' },
  { id: '12', name: 'Diners Club Ecuador', type: 'Tarjeta', code: 'DINERS', defaultApr: 16.06, maxTermMonths: 36, status: 'active' },
];

export const GET: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  return new Response(JSON.stringify({ success: true, data: institutions }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const body = await ctx.request.json();
    const newInst = {
      id: String(Date.now()),
      name: body.name,
      type: body.type || 'Banco',
      code: body.code || '',
      defaultApr: Number(body.defaultApr) || 16.06,
      maxTermMonths: Number(body.maxTermMonths) || 60,
      status: 'active',
    };
    institutions.unshift(newInst);

    return new Response(JSON.stringify({ success: true, data: newInst }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const url = new URL(ctx.request.url);
    const id = url.searchParams.get('id');
    institutions = institutions.filter((i) => i.id !== id);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
