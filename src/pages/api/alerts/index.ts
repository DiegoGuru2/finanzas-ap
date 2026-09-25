import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { alerts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const userAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, user.id))
      .orderBy(desc(alerts.createdAt))
      .limit(50);

    const unreadCount = userAlerts.filter((a) => !a.isRead).length;

    return new Response(
      JSON.stringify({
        data: userAlerts,
        unreadCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
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
    const { type, title, message } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'Título y mensaje son requeridos' }),
        { status: 400 }
      );
    }

    const newId = generateId();
    await db.insert(alerts).values({
      id: newId,
      userId: user.id,
      type: type || 'system',
      title,
      message,
      isRead: false,
    });

    return new Response(
      JSON.stringify({ success: true, id: newId }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
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
    const { id, all } = body;

    if (all) {
      await db
        .update(alerts)
        .set({ isRead: true })
        .where(eq(alerts.userId, user.id));
      return new Response(JSON.stringify({ success: true, message: 'Todas marcadas como leídas' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID de alerta requerido' }), { status: 400 });
    }

    await db
      .update(alerts)
      .set({ isRead: true })
      .where(and(eq(alerts.id, id), eq(alerts.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), {
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
    const allRead = url.searchParams.get('allRead') === 'true';

    if (allRead) {
      await db
        .delete(alerts)
        .where(and(eq(alerts.userId, user.id), eq(alerts.isRead, true)));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    await db
      .delete(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
