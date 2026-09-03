import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { vaultKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const existing = await db
      .select()
      .from(vaultKeys)
      .where(eq(vaultKeys.userId, user.id))
      .limit(1);

    if (existing.length === 0) {
      return new Response(
        JSON.stringify({
          hasVault: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const item = existing[0];
    return new Response(
      JSON.stringify({
        hasVault: true,
        salt: item.salt,
        verifier: item.verifier,
        verifierIv: item.verifierIv,
        hint: item.hint || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error al obtener estado de bóveda:', err);
    return new Response(
      JSON.stringify({ error: 'Error al consultar estado de la bóveda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

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
    const { salt, verifier, verifierIv, hint } = body;

    if (!salt || !verifier || !verifierIv) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros criptográficos obligatorios (salt, verifier, verifierIv)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existing = await db
      .select()
      .from(vaultKeys)
      .where(eq(vaultKeys.userId, user.id))
      .limit(1);

    if (existing.length > 0) {
      // Actualización de clave o pista
      await db
        .update(vaultKeys)
        .set({
          salt,
          verifier,
          verifierIv,
          hint: hint || null,
          updatedAt: new Date(),
        })
        .where(eq(vaultKeys.userId, user.id));
    } else {
      // Creación inicial
      await db.insert(vaultKeys).values({
        id: generateId(),
        userId: user.id,
        salt,
        verifier,
        verifierIv,
        hint: hint || null,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Bóveda configurada exitosamente' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error al guardar configuración de bóveda:', err);
    return new Response(
      JSON.stringify({ error: 'Error al guardar configuración de la bóveda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
