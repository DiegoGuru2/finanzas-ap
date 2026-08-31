import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { catalogOptions } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { CATALOG_KEYS, DEFAULT_CATALOGS, type CatalogKey } from '@/lib/catalogs';

/**
 * Catálogos para los selects de la app (lectura, cualquier usuario logueado).
 * Devuelve las opciones activas administradas por el admin; si un catálogo
 * aún no tiene filas en la base, se devuelven los valores por defecto.
 */
export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const url = new URL(ctx.request.url);
    const requested = url.searchParams.get('catalog');
    const keys: CatalogKey[] =
      requested && (CATALOG_KEYS as string[]).includes(requested)
        ? [requested as CatalogKey]
        : CATALOG_KEYS;

    const rows = await db
      .select()
      .from(catalogOptions)
      .orderBy(asc(catalogOptions.sortOrder), asc(catalogOptions.label));

    const data: Record<string, { value: string; label: string; icon: string | null }[]> = {};
    for (const key of keys) {
      const options = rows
        .filter((r) => r.catalog === key && r.isActive !== false)
        .map((r) => ({ value: r.value, label: r.label, icon: r.icon }));
      data[key] = options.length > 0 ? options : DEFAULT_CATALOGS[key].map((o) => ({
        value: o.value,
        label: o.label,
        icon: o.icon ?? null,
      }));
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
