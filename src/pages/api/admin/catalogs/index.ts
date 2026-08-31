import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { catalogOptions } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { CATALOG_KEYS, DEFAULT_CATALOGS, type CatalogKey } from '@/lib/catalogs';
import { generateId } from '@/lib/utils';

const isAdmin = (ctx: Parameters<APIRoute>[0]) => {
  const u = ctx.locals.user as any;
  return u && u.role === 'admin';
};

const isValidCatalog = (c: unknown): c is CatalogKey =>
  typeof c === 'string' && (CATALOG_KEYS as string[]).includes(c);

/** Siembra los valores por defecto de un catálogo si aún no tiene filas. */
async function seedIfEmpty(catalog: CatalogKey) {
  const existing = await db
    .select({ id: catalogOptions.id })
    .from(catalogOptions)
    .where(eq(catalogOptions.catalog, catalog));
  if (existing.length > 0) return;

  let order = 0;
  for (const opt of DEFAULT_CATALOGS[catalog]) {
    await db.insert(catalogOptions).values({
      id: generateId(),
      catalog,
      value: opt.value,
      label: opt.label,
      icon: opt.icon ?? null,
      sortOrder: order++,
      isActive: true,
    });
  }
}

export const GET: APIRoute = async (ctx) => {
  if (!isAdmin(ctx)) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    // Primera visita: sembrar los defaults para que sean editables
    for (const key of CATALOG_KEYS) await seedIfEmpty(key);

    const rows = await db
      .select()
      .from(catalogOptions)
      .orderBy(asc(catalogOptions.catalog), asc(catalogOptions.sortOrder), asc(catalogOptions.label));

    return new Response(JSON.stringify({ success: true, data: rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async (ctx) => {
  if (!isAdmin(ctx)) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const body = await ctx.request.json();
    const { catalog, value, label, icon, sortOrder } = body;

    if (!isValidCatalog(catalog)) {
      return new Response(JSON.stringify({ error: 'Catálogo inválido' }), { status: 400 });
    }
    if (!value || typeof value !== 'string' || !/^[a-z0-9_\-]{1,100}$/.test(value)) {
      return new Response(
        JSON.stringify({ error: 'La clave debe ser minúsculas, números, guiones o guion bajo (ej: gastos_mascotas)' }),
        { status: 400 }
      );
    }
    if (!label || typeof label !== 'string' || label.length > 150) {
      return new Response(JSON.stringify({ error: 'Etiqueta requerida (máx. 150 caracteres)' }), { status: 400 });
    }

    // Clave única dentro del catálogo
    const [dup] = await db
      .select({ id: catalogOptions.id })
      .from(catalogOptions)
      .where(and(eq(catalogOptions.catalog, catalog), eq(catalogOptions.value, value)));
    if (dup) {
      return new Response(JSON.stringify({ error: `Ya existe una opción con la clave "${value}"` }), { status: 409 });
    }

    const newId = generateId();
    await db.insert(catalogOptions).values({
      id: newId,
      catalog,
      value,
      label,
      icon: icon || null,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 999,
      isActive: true,
    });

    return new Response(JSON.stringify({ success: true, id: newId }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async (ctx) => {
  if (!isAdmin(ctx)) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const url = new URL(ctx.request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    const body = await ctx.request.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.label === 'string' && body.label && body.label.length <= 150) updates.label = body.label;
    if (body.icon !== undefined) updates.icon = body.icon || null;
    if (Number.isFinite(Number(body.sortOrder))) updates.sortOrder = Number(body.sortOrder);
    if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'Nada que actualizar' }), { status: 400 });
    }

    await db.update(catalogOptions).set(updates).where(eq(catalogOptions.id, id));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (ctx) => {
  if (!isAdmin(ctx)) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const url = new URL(ctx.request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    await db.delete(catalogOptions).where(eq(catalogOptions.id, id));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
