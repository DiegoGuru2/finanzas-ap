import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { vaultItems } from '@/lib/db/schema';
import { generateId } from '@/lib/utils';

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
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Debes enviar una lista de elementos para importar' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const records = items
      .filter((it: any) => it && it.title && it.passwordEncrypted && it.iv)
      .map((it: any) => ({
        id: generateId(),
        userId: user.id,
        title: String(it.title).trim().slice(0, 255),
        category: it.category || 'other',
        websiteUrl: it.websiteUrl ? String(it.websiteUrl).trim().slice(0, 500) : null,
        usernameEncrypted: it.usernameEncrypted ? String(it.usernameEncrypted) : null,
        passwordEncrypted: String(it.passwordEncrypted),
        notesEncrypted: it.notesEncrypted ? String(it.notesEncrypted) : null,
        iv: String(it.iv),
        isFavorite: !!it.isFavorite,
      }));

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron elementos válidos con contraseña cifrada' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Inserción en bloques de 50 para evitar exceder límites de consultas SQL
    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await db.insert(vaultItems).values(chunk);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: records.length,
        message: `Se importaron ${records.length} contraseñas exitosamente`,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error al importar lote de contraseñas:', err);
    return new Response(
      JSON.stringify({ error: 'Error al importar las contraseñas en la bóveda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
