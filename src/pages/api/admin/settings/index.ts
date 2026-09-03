import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { adminSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const GLOBAL_ID = 'global';

export const GET: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const rows = await db.select().from(adminSettings).where(eq(adminSettings.id, GLOBAL_ID));
    const row = rows[0];

    if (!row) {
      // Si no existe la fila global, devolvemos defaults
      const defaults = {
        sbuAmount: 460.0,
        iessPercentagePrivate: 9.45,
        iessPercentagePublic: 11.45,
        maxDebtToIncomeRatio: 40.0,
        emergencyReserveMonthsDefault: 3,
        systemName: 'ProyecAhorro',
        systemVersion: '1.2.0',
        legalDecimoTerceroDate: '12-24',
        legalDecimoCuartoCostaDate: '03-15',
        legalDecimoCuartoSierraDate: '08-15',
      };
      return new Response(JSON.stringify({ success: true, data: defaults }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = {
      sbuAmount: parseFloat(row.sbuAmount as string) || 460.0,
      iessPercentagePrivate: parseFloat(row.iessPercentagePrivate as string) || 9.45,
      iessPercentagePublic: parseFloat(row.iessPercentagePublic as string) || 11.45,
      maxDebtToIncomeRatio: parseFloat(row.maxDebtToIncomeRatio as string) || 40.0,
      emergencyReserveMonthsDefault: row.emergencyReserveMonthsDefault ?? 3,
      systemName: row.systemName || 'ProyecAhorro',
      systemVersion: row.systemVersion || '1.2.0',
      legalDecimoTerceroDate: row.legalDecimoTerceroDate || '12-24',
      legalDecimoCuartoCostaDate: row.legalDecimoCuartoCostaDate || '03-15',
      legalDecimoCuartoSierraDate: row.legalDecimoCuartoSierraDate || '08-15',
    };

    return new Response(JSON.stringify({ success: true, data }), {
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

    // Verificar si existe la fila global
    const existing = await db.select().from(adminSettings).where(eq(adminSettings.id, GLOBAL_ID));

    const updateData: Record<string, any> = {};
    if (body.sbuAmount !== undefined) updateData.sbuAmount = String(body.sbuAmount);
    if (body.iessPercentagePrivate !== undefined) updateData.iessPercentagePrivate = String(body.iessPercentagePrivate);
    if (body.iessPercentagePublic !== undefined) updateData.iessPercentagePublic = String(body.iessPercentagePublic);
    if (body.maxDebtToIncomeRatio !== undefined) updateData.maxDebtToIncomeRatio = String(body.maxDebtToIncomeRatio);
    if (body.emergencyReserveMonthsDefault !== undefined) updateData.emergencyReserveMonthsDefault = body.emergencyReserveMonthsDefault;
    if (body.systemName !== undefined) updateData.systemName = body.systemName;
    if (body.systemVersion !== undefined) updateData.systemVersion = body.systemVersion;
    if (body.legalDecimoTerceroDate !== undefined) updateData.legalDecimoTerceroDate = body.legalDecimoTerceroDate;
    if (body.legalDecimoCuartoCostaDate !== undefined) updateData.legalDecimoCuartoCostaDate = body.legalDecimoCuartoCostaDate;
    if (body.legalDecimoCuartoSierraDate !== undefined) updateData.legalDecimoCuartoSierraDate = body.legalDecimoCuartoSierraDate;

    if (existing.length === 0) {
      await db.insert(adminSettings).values({ id: GLOBAL_ID, ...updateData });
    } else {
      await db.update(adminSettings).set(updateData).where(eq(adminSettings.id, GLOBAL_ID));
    }

    // Leer de vuelta para retornar datos actualizados
    const rows = await db.select().from(adminSettings).where(eq(adminSettings.id, GLOBAL_ID));
    const row = rows[0]!;
    const data = {
      sbuAmount: parseFloat(row.sbuAmount as string) || 460.0,
      iessPercentagePrivate: parseFloat(row.iessPercentagePrivate as string) || 9.45,
      iessPercentagePublic: parseFloat(row.iessPercentagePublic as string) || 11.45,
      maxDebtToIncomeRatio: parseFloat(row.maxDebtToIncomeRatio as string) || 40.0,
      emergencyReserveMonthsDefault: row.emergencyReserveMonthsDefault ?? 3,
      systemName: row.systemName || 'ProyecAhorro',
      systemVersion: row.systemVersion || '1.2.0',
      legalDecimoTerceroDate: row.legalDecimoTerceroDate || '12-24',
      legalDecimoCuartoCostaDate: row.legalDecimoCuartoCostaDate || '03-15',
      legalDecimoCuartoSierraDate: row.legalDecimoCuartoSierraDate || '08-15',
    };

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
