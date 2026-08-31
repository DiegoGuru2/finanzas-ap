import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { user, account, session, debts, savingsGoals } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';

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
        birthDate: user.birthDate,
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
    const { userId, name, email, role, birthDate, newPassword } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'ID de usuario requerido' }), { status: 400 });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role && ['admin', 'user'].includes(role)) updates.role = role;
    if (birthDate !== undefined) updates.birthDate = birthDate;

    if (Object.keys(updates).length > 0) {
      await db.update(user).set(updates).where(eq(user.id, userId));
    }

    // If password update requested
    if (newPassword && typeof newPassword === 'string' && newPassword.length >= 8) {
      const hashedPassword = await hashPassword(newPassword);
      const existingAcc = await db
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));

      if (existingAcc.length > 0) {
        await db
          .update(account)
          .set({ password: hashedPassword, updatedAt: new Date() })
          .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
      } else {
        await db.insert(account).values({
          id: crypto.randomUUID(),
          userId,
          accountId: userId,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Limpiar cualquier sesión antigua en caché/base de datos para obligar al nuevo login limpio
      await db.delete(session).where(eq(session.userId, userId));
    }

    return new Response(JSON.stringify({ success: true, message: 'Usuario actualizado exitosamente' }), {
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
