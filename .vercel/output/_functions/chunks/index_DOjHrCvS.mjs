import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { o as payments, r as debts, t as db } from "./db_Gak7IQ5R.mjs";
import { a as paymentSchema } from "./validators_DCe3gEV7.mjs";
import { n as generateId } from "./utils_DIO8eMIb.mjs";
import { and, desc, eq } from "drizzle-orm";
//#region src/pages/api/payments/index.ts
var payments_exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	POST: () => POST,
	PUT: () => PUT
});
var GET = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const formatted = (await db.select({
			id: payments.id,
			debtId: payments.debtId,
			debtName: debts.name,
			amount: payments.amount,
			type: payments.type,
			paidAt: payments.paidAt,
			notes: payments.notes,
			createdAt: payments.createdAt
		}).from(payments).leftJoin(debts, eq(payments.debtId, debts.id)).where(eq(payments.userId, user.id)).orderBy(desc(payments.paidAt))).map((p) => ({
			...p,
			amount: parseFloat(p.amount)
		}));
		return new Response(JSON.stringify({ data: formatted }), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
var POST = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const body = await ctx.request.json();
		const parsed = paymentSchema.safeParse(body);
		if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos de pago inválidos" }), { status: 400 });
		const { debtId, amount, type, paidAt, notes } = parsed.data;
		const [targetDebt] = await db.select().from(debts).where(and(eq(debts.id, debtId), eq(debts.userId, user.id)));
		if (!targetDebt) return new Response(JSON.stringify({ error: "Deuda no encontrada" }), { status: 404 });
		const currentBal = parseFloat(targetDebt.currentBalance);
		const newBal = Math.max(0, currentBal - amount);
		const newId = generateId();
		await db.insert(payments).values({
			id: newId,
			userId: user.id,
			debtId,
			amount: amount.toString(),
			type,
			paidAt: new Date(paidAt),
			notes: notes || ""
		});
		await db.update(debts).set({
			currentBalance: newBal.toString(),
			status: newBal === 0 ? "paid_off" : "active"
		}).where(eq(debts.id, debtId));
		return new Response(JSON.stringify({
			success: true,
			id: newId,
			remainingBalance: newBal
		}), {
			status: 201,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
var PUT = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const { id, ...rest } = await ctx.request.json();
		if (!id) return new Response(JSON.stringify({ error: "ID de pago requerido" }), { status: 400 });
		const parsed = paymentSchema.safeParse(rest);
		if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos de pago inválidos" }), { status: 400 });
		const [existing] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id)));
		if (!existing) return new Response(JSON.stringify({ error: "Pago no encontrado" }), { status: 404 });
		const { amount, type, paidAt, notes } = parsed.data;
		const [targetDebt] = await db.select().from(debts).where(and(eq(debts.id, existing.debtId), eq(debts.userId, user.id)));
		if (!targetDebt) return new Response(JSON.stringify({ error: "Deuda del pago no encontrada" }), { status: 404 });
		const delta = amount - parseFloat(existing.amount);
		const currentBal = parseFloat(targetDebt.currentBalance);
		const newBal = Math.max(0, Math.round((currentBal - delta) * 100) / 100);
		await db.update(payments).set({
			amount: amount.toString(),
			type,
			paidAt: new Date(paidAt),
			notes: notes || ""
		}).where(and(eq(payments.id, id), eq(payments.userId, user.id)));
		await db.update(debts).set({
			currentBalance: newBal.toString(),
			status: newBal === 0 ? "paid_off" : "active"
		}).where(eq(debts.id, existing.debtId));
		return new Response(JSON.stringify({
			success: true,
			remainingBalance: newBal
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
var DELETE = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const id = new URL(ctx.request.url).searchParams.get("id");
		if (!id) return new Response(JSON.stringify({ error: "ID requerido" }), { status: 400 });
		const [existing] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id)));
		if (!existing) return new Response(JSON.stringify({ error: "Pago no encontrado" }), { status: 404 });
		const [targetDebt] = await db.select().from(debts).where(and(eq(debts.id, existing.debtId), eq(debts.userId, user.id)));
		if (targetDebt) {
			const restored = Math.round((parseFloat(targetDebt.currentBalance) + parseFloat(existing.amount)) * 100) / 100;
			await db.update(debts).set({
				currentBalance: restored.toString(),
				status: restored > 0 ? "active" : "paid_off"
			}).where(eq(debts.id, existing.debtId));
		}
		await db.delete(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id)));
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/payments/index@_@ts
var page = () => payments_exports;
//#endregion
export { page };
