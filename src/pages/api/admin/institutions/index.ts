import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { institutions } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const rows = await db.select().from(institutions).orderBy(asc(institutions.name));
    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      code: r.code,
      defaultApr: parseFloat(r.defaultApr as string),
      maxTermMonths: r.maxTermMonths,
      status: r.status,
    }));

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const body = await ctx.request.json();
    const id = generateId();

    await db.insert(institutions).values({
      id,
      name: body.name,
      type: body.type || 'Banco',
      code: body.code || '',
      defaultApr: String(Number(body.defaultApr) || 16.06),
      maxTermMonths: Number(body.maxTermMonths) || 60,
      status: 'active',
    });

    const newInst = {
      id,
      name: body.name,
      type: body.type || 'Banco',
      code: body.code || '',
      defaultApr: Number(body.defaultApr) || 16.06,
      maxTermMonths: Number(body.maxTermMonths) || 60,
      status: 'active',
    };

    return new Response(JSON.stringify({ success: true, data: newInst }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
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
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    await db.delete(institutions).where(eq(institutions.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
