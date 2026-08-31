import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user, debts, savingsGoals } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const allUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    // Enrich with counts
    const enriched = await Promise.all(
      allUsers.map(async (u) => {
        const userDebts = await db.select({ id: debts.id }).from(debts).where(eq(debts.userId, u.id));
        const userSavings = await db.select({ id: savingsGoals.id }).from(savingsGoals).where(eq(savingsGoals.userId, u.id));
        return {
          ...u,
          debtsCount: userDebts.length,
          savingsCount: userSavings.length,
        };
      })
    );

    return new Response(JSON.stringify({ success: true, data: enriched }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const body = await ctx.request.json();
    const { userId, role } = body;

    if (!userId || !['admin', 'user'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), { status: 400 });
    }

    await db.update(user).set({ role }).where(eq(user.id, userId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
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
    const userId = url.searchParams.get('id');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'ID de usuario requerido' }), { status: 400 });
    }

    if (userId === currentUser.id) {
      return new Response(JSON.stringify({ error: 'No puedes eliminar tu propia cuenta de administrador' }), {
        status: 400,
      });
    }

    await db.delete(user).where(eq(user.id, userId));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
