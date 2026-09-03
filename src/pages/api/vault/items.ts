import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { vaultItems } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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
    const items = await db
      .select()
      .from(vaultItems)
      .where(eq(vaultItems.userId, user.id))
      .orderBy(desc(vaultItems.isFavorite), desc(vaultItems.createdAt));

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error al listar elementos de bóveda:', err);
    return new Response(
      JSON.stringify({ error: 'Error al consultar elementos de la bóveda' }),
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
    const {
      title,
      category = 'other',
      websiteUrl,
      usernameEncrypted,
      passwordEncrypted,
      notesEncrypted,
      iv,
      isFavorite = false,
    } = body;

    if (!title || !passwordEncrypted || !iv) {
      return new Response(
        JSON.stringify({ error: 'Título, contraseña cifrada e IV son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newItem = {
      id: generateId(),
      userId: user.id,
      title: title.trim(),
      category: category || 'other',
      websiteUrl: websiteUrl ? websiteUrl.trim() : null,
      usernameEncrypted: usernameEncrypted || null,
      passwordEncrypted,
      notesEncrypted: notesEncrypted || null,
      iv,
      isFavorite: !!isFavorite,
    };

    await db.insert(vaultItems).values(newItem);

    return new Response(JSON.stringify({ success: true, item: newItem }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error al crear elemento en bóveda:', err);
    return new Response(
      JSON.stringify({ error: 'Error al registrar contraseña en la bóveda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await ctx.request.json();
    const {
      id,
      title,
      category,
      websiteUrl,
      usernameEncrypted,
      passwordEncrypted,
      notesEncrypted,
      iv,
      isFavorite,
    } = body;

    if (!id || !title || !passwordEncrypted || !iv) {
      return new Response(
        JSON.stringify({ error: 'ID, título, contraseña cifrada e IV son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updateData: any = {
      title: title.trim(),
      category: category || 'other',
      websiteUrl: websiteUrl ? websiteUrl.trim() : null,
      usernameEncrypted: usernameEncrypted || null,
      passwordEncrypted,
      notesEncrypted: notesEncrypted || null,
      iv,
      updatedAt: new Date(),
    };

    if (isFavorite !== undefined) {
      updateData.isFavorite = !!isFavorite;
    }

    await db
      .update(vaultItems)
      .set(updateData)
      .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, user.id)));

    return new Response(JSON.stringify({ success: true, message: 'Elemento actualizado' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error al actualizar elemento en bóveda:', err);
    return new Response(
      JSON.stringify({ error: 'Error al actualizar elemento en la bóveda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(ctx.request.url);
    let id = url.searchParams.get('id');

    if (!id) {
      try {
        const body = await ctx.request.json();
        id = body?.id;
      } catch {
        // query param was checked
      }
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido para eliminar' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db
      .delete(vaultItems)
      .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, user.id)));

    return new Response(JSON.stringify({ success: true, message: 'Elemento eliminado' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error al eliminar elemento de bóveda:', err);
    return new Response(
      JSON.stringify({ error: 'Error al eliminar elemento de la bóveda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
