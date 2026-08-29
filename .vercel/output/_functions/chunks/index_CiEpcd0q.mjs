import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { a as incomes, t as db } from "./db_Gak7IQ5R.mjs";
import { n as calculateSalaryDetails } from "./cashflow_Bd1_Ar6s.mjs";
import { r as incomeSchema } from "./validators_DCe3gEV7.mjs";
import { n as generateId } from "./utils_DIO8eMIb.mjs";
import { and, desc, eq } from "drizzle-orm";
//#region src/pages/api/incomes/index.ts
var incomes_exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	POST: () => POST
});
var GET = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const enriched = (await db.select().from(incomes).where(eq(incomes.userId, user.id)).orderBy(desc(incomes.createdAt))).map((inc) => {
			const amountNum = parseFloat(inc.amount);
			const isSalary = !!inc.isSalary;
			const details = calculateSalaryDetails({
				id: inc.id,
				name: inc.name,
				amount: amountNum,
				frequency: inc.frequency || "monthly",
				isSalary,
				paymentScheme: inc.paymentScheme || "quincena_fin_mes",
				quincenaAmount: inc.quincenaAmount ? parseFloat(inc.quincenaAmount) : 0,
				finDeMesAmount: inc.finDeMesAmount ? parseFloat(inc.finDeMesAmount) : 0,
				deductIess: inc.deductIess ?? true,
				iessPercentage: inc.iessPercentage ? parseFloat(inc.iessPercentage) : 9.45,
				hasProgrammedSavings: !!inc.hasProgrammedSavings,
				programmedSavingsAmount: inc.programmedSavingsAmount ? parseFloat(inc.programmedSavingsAmount) : 0
			});
			return {
				...inc,
				amount: amountNum,
				hasProgrammedSavings: !!inc.hasProgrammedSavings,
				programmedSavingsAmount: inc.programmedSavingsAmount ? parseFloat(inc.programmedSavingsAmount) : 0,
				quincenaAmount: details.quincenaAmount,
				finDeMesAmount: details.finDeMesAmount,
				iessDeduction: details.iessDeduction,
				programmedSavings: details.programmedSavings,
				netAmount: details.netMonthly
			};
		});
		return new Response(JSON.stringify({ data: enriched }), {
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
		const parsed = incomeSchema.safeParse(body);
		if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || "Datos inválidos" }), { status: 400 });
		const { name, amount, frequency, isSalary, paymentScheme, quincenaAmount, finDeMesAmount, deductIess, iessPercentage, hasProgrammedSavings, programmedSavingsAmount, category, date } = parsed.data;
		const details = calculateSalaryDetails({
			id: "",
			name,
			amount,
			frequency,
			isSalary,
			paymentScheme,
			quincenaAmount,
			finDeMesAmount,
			deductIess,
			iessPercentage,
			hasProgrammedSavings,
			programmedSavingsAmount
		});
		const newId = generateId();
		await db.insert(incomes).values({
			id: newId,
			userId: user.id,
			name,
			amount: amount.toString(),
			frequency,
			isSalary,
			paymentScheme,
			quincenaAmount: details.quincenaAmount.toString(),
			finDeMesAmount: details.finDeMesAmount.toString(),
			deductIess,
			iessPercentage: iessPercentage.toString(),
			hasProgrammedSavings: !!hasProgrammedSavings,
			programmedSavingsAmount: (programmedSavingsAmount || 0).toString(),
			category: category || "Sueldo",
			date: date ? new Date(date) : null
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
var DELETE = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const id = new URL(ctx.request.url).searchParams.get("id");
		if (!id) return new Response(JSON.stringify({ error: "ID requerido" }), { status: 400 });
		await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, user.id)));
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/incomes/index@_@ts
var page = () => incomes_exports;
//#endregion
export { page };
