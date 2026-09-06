import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { activities } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { activitySchema, activityUpdateSchema } from '@/modules/financial-engine/validators';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const userActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, user.id))
      .orderBy(asc(activities.scheduledAt));

    return new Response(JSON.stringify({ data: userActivities }), {
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
    const parsed = activitySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos de actividad inválidos' }),
        { status: 400 }
      );
    }

    const {
      title,
      description,
      category,
      scheduledAt,
      recurrenceType,
      intervalHours,
      isCritical,
      requiresLock,
      sound,
    } = parsed.data;

    const newId = generateId();

    await db.insert(activities).values({
      id: newId,
      userId: user.id,
      title,
      description: description || '',
      category: category || 'salud',
      scheduledAt: new Date(scheduledAt) as any,
      recurrenceType: recurrenceType || 'none',
      intervalHours: intervalHours || null,
      isCritical: isCritical !== undefined ? isCritical : true,
      requiresLock: requiresLock !== undefined ? requiresLock : true,
      sound: sound || 'alarm_default',
      isCompleted: false,
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
    const parsed = activityUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }),
        { status: 400 }
      );
    }

    const { id, ...data } = parsed.data;

    const [existing] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, user.id)));

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Actividad no encontrada' }), { status: 404 });
    }

    const updateValues: Record<string, any> = {};

    if (data.title !== undefined) updateValues.title = data.title;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.category !== undefined) updateValues.category = data.category;
    if (data.scheduledAt !== undefined) updateValues.scheduledAt = new Date(data.scheduledAt);
    if (data.recurrenceType !== undefined) updateValues.recurrenceType = data.recurrenceType;
    if (data.intervalHours !== undefined) updateValues.intervalHours = data.intervalHours;
    if (data.isCritical !== undefined) updateValues.isCritical = data.isCritical;
    if (data.requiresLock !== undefined) updateValues.requiresLock = data.requiresLock;
    if (data.sound !== undefined) updateValues.sound = data.sound;

    if (data.isCompleted !== undefined) {
      updateValues.isCompleted = data.isCompleted;
      updateValues.completedAt = data.isCompleted ? new Date() : null;

      // Si es recurrente por intervalo de horas (ej: medicamento cada 8 horas),
      // al completarlo podemos reprogramar la siguiente dosis automáticamente
      if (data.isCompleted && existing.recurrenceType === 'interval_hours' && existing.intervalHours) {
        const nextTime = new Date(Date.now() + existing.intervalHours * 60 * 60 * 1000);
        const nextId = generateId();

        await db.insert(activities).values({
          id: nextId,
          userId: user.id,
          title: existing.title,
          description: existing.description,
          category: existing.category,
          scheduledAt: nextTime as any,
          recurrenceType: existing.recurrenceType,
          intervalHours: existing.intervalHours,
          isCritical: existing.isCritical,
          requiresLock: existing.requiresLock,
          sound: existing.sound,
          isCompleted: false,
        });
      }
    }

    if (data.snoozedUntil !== undefined) {
      updateValues.snoozedUntil = data.snoozedUntil ? new Date(data.snoozedUntil) : null;
    }

    await db
      .update(activities)
      .set(updateValues)
      .where(and(eq(activities.id, id), eq(activities.userId, user.id)));

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

    await db.delete(activities).where(and(eq(activities.id, id), eq(activities.userId, user.id)));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
