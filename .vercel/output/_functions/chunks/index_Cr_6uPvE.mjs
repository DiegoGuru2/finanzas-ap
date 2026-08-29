import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { i as expenses, t as db } from "./db_Gak7IQ5R.mjs";
import { n as expenseSchema } from "./validators_DCe3gEV7.mjs";
import { n as generateId } from "./utils_DIO8eMIb.mjs";
import { and, desc, eq } from "drizzle-orm";
//#region src/pages/api/expenses/index.ts
var expenses_exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	POST: () => POST,
	PUT: () => PUT
});
var GET = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const formatted = (await db.select().from(expenses).where(eq(expenses.userId, user.id)).orderBy(desc(expenses.amount))).map((exp) => ({
			...exp,
			amount: parseFloat(exp.amount)
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
		const parsed = expenseSchema.safeParse(body);
		if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos de gasto inválidos" }), { status: 400 });
		const { name, amount, category, isEssential, frequency, description, paymentTiming, activeFrom, activeUntil } = parsed.data;
		const newId = generateId();
		await db.insert(expenses).values({
			id: newId,
			userId: user.id,
			name,
			amount: amount.toString(),
			category,
			isEssential: !!isEssential,
			frequency: frequency || "monthly",
			paymentTiming: paymentTiming || "ambas",
			activeFrom: activeFrom ? new Date(activeFrom) : null,
			activeUntil: activeUntil ? new Date(activeUntil) : null,
			description: description || ""
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
		if (!id) return new Response(JSON.stringify({ error: "ID de gasto requerido" }), { status: 400 });
		const parsed = expenseSchema.safeParse(rest);
		if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos inválidos" }), { status: 400 });
		const { name, amount, category, isEssential, frequency, description, paymentTiming, activeFrom, activeUntil } = parsed.data;
		await db.update(expenses).set({
			name,
			amount: amount.toString(),
			category,
			isEssential: !!isEssential,
			frequency: frequency || "monthly",
			paymentTiming: paymentTiming || "ambas",
			activeFrom: activeFrom ? new Date(activeFrom) : null,
			activeUntil: activeUntil ? new Date(activeUntil) : null,
			description: description || ""
		}).where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));
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
		await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/expenses/index@_@ts
var page = () => expenses_exports;
//#endregion
export { page };
