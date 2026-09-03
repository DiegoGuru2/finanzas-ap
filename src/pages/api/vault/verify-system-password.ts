import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { account } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';

export const POST: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await ctx.request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Ingresa la contraseña del sistema' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const acc = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, user.id), eq(account.providerId, 'credential')))
      .limit(1);

    if (acc.length === 0 || !acc[0].password) {
      return new Response(
        JSON.stringify({ valid: false, error: 'No se encontró contraseña registrada para este usuario' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isValid = await verifyPassword({
      password,
      hash: acc[0].password,
    });

    if (!isValid) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Contraseña del sistema incorrecta' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, message: 'Identidad confirmada exitosamente' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error verificando contraseña del sistema:', err);
    return new Response(
      JSON.stringify({ error: 'Error al verificar la contraseña' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
