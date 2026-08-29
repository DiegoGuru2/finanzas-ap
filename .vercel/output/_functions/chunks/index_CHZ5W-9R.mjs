import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { r as debts, t as db } from "./db_Gak7IQ5R.mjs";
import { t as debtSchema } from "./validators_DCe3gEV7.mjs";
import { n as generateId } from "./utils_DIO8eMIb.mjs";
import { and, desc, eq } from "drizzle-orm";
//#region src/pages/api/debts/index.ts
var debts_exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	POST: () => POST,
	PUT: () => PUT
});
var GET = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const formatted = (await db.select().from(debts).where(eq(debts.userId, user.id)).orderBy(desc(debts.currentBalance))).map((d) => ({
			...d,
			currentBalance: parseFloat(d.currentBalance),
			originalBalance: parseFloat(d.originalBalance),
			apr: parseFloat(d.apr),
			minimumPayment: parseFloat(d.minimumPayment)
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
		const parsed = debtSchema.safeParse(body);
		if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos de deuda inválidos" }), { status: 400 });
		const { name, creditor, currentBalance, originalBalance, apr, minimumPayment, dueDay, type, currency, status, paymentTiming, hasInstallmentPlan, termMonths } = parsed.data;
		const newId = generateId();
		await db.insert(debts).values({
			id: newId,
			userId: user.id,
			name,
			creditor: creditor || "",
			currentBalance: currentBalance.toString(),
			originalBalance: originalBalance.toString(),
			apr: apr.toString(),
			minimumPayment: minimumPayment.toString(),
			dueDay,
			type,
			paymentTiming: paymentTiming || "fin_de_mes",
			hasInstallmentPlan: !!hasInstallmentPlan,
			termMonths: hasInstallmentPlan ? termMonths ?? null : null,
			currency: currency || "USD",
			status: status || "active"
		});
		return new Response(JSON.stringify({
			success: true,
			id: newId
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
		if (!id) return new Response(JSON.stringify({ error: "ID de deuda requerido" }), { status: 400 });
		const parsed = debtSchema.safeParse(rest);
		if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos inválidos" }), { status: 400 });
		const { name, creditor, currentBalance, originalBalance, apr, minimumPayment, dueDay, type, currency, status, paymentTiming, hasInstallmentPlan, termMonths } = parsed.data;
		await db.update(debts).set({
			name,
			creditor: creditor || "",
			currentBalance: currentBalance.toString(),
			originalBalance: originalBalance.toString(),
			apr: apr.toString(),
			minimumPayment: minimumPayment.toString(),
			dueDay,
			type,
			paymentTiming: paymentTiming || "fin_de_mes",
			hasInstallmentPlan: !!hasInstallmentPlan,
			termMonths: hasInstallmentPlan ? termMonths ?? null : null,
			currency: currency || "USD",
			status: status || "active"
		}).where(and(eq(debts.id, id), eq(debts.userId, user.id)));
		return new Response(JSON.stringify({ success: true }), {
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
		await db.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, user.id)));
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/debts/index@_@ts
var page = () => debts_exports;
//#endregion
export { page };
