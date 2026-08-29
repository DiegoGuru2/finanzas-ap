import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { a as incomes, i as expenses, o as payments, r as debts, t as db } from "./db_Gak7IQ5R.mjs";
import { n as calculateSalaryDetails, r as normalizeToMonthly } from "./cashflow_Bd1_Ar6s.mjs";
import { desc, eq } from "drizzle-orm";
//#region src/modules/financial-engine/schedule.ts
/**
* ═══════════════════════════════════════════
* FinanzasAP — Payment Schedule (Cronograma)
* ═══════════════════════════════════════════
*
* Builds a biweekly payment schedule (Quincena 15 + Fin de Mes 30)
* mapping each debt and recurring expense to the pay period where it
* should be covered, and computes what remains of the salary on each
* period ("Lo que queda del sueldo").
*/
/**
* Resolve on which period of the month an item should be paid.
*/
function resolveTiming(paymentTiming, dueDay) {
	if (paymentTiming === "quincena") return "quincena";
	if (paymentTiming === "fin_de_mes") return "fin_de_mes";
	return dueDay >= 1 && dueDay <= 15 ? "quincena" : "fin_de_mes";
}
/**
* Generate the biweekly pay periods (15 y fin de mes) for the horizon.
*/
function generatePeriods(startDate, months, monthlyIncome) {
	const periods = [];
	const target = months * 2;
	let year = startDate.getFullYear();
	let month = startDate.getMonth();
	while (periods.length < target) {
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const finDeMesDay = Math.min(30, daysInMonth);
		for (const [day, timing] of [[15, "quincena"], [finDeMesDay, "fin_de_mes"]]) {
			const date = new Date(year, month, day);
			if (date < startDate || periods.length >= target) continue;
			periods.push({
				key: toKey(date),
				date: toKey(date),
				day,
				month,
				year,
				timing,
				incomeAvailable: timing === "quincena" ? monthlyIncome.quincena : monthlyIncome.finDeMes
			});
		}
		month += 1;
		if (month > 11) {
			month = 0;
			year += 1;
		}
	}
	return periods;
}
/**
* Build the full payment schedule (Cronograma de pagos).
*/
function buildPaymentSchedule(input) {
	const months = Math.min(Math.max(input.months ?? 6, 1), 24);
	const startDate = input.startDate ? /* @__PURE__ */ new Date(`${input.startDate}T00:00:00`) : /* @__PURE__ */ new Date();
	startDate.setHours(0, 0, 0, 0);
	let quincenaIncome = 0;
	let finDeMesIncome = 0;
	for (const inc of input.incomes) {
		if (inc.frequency === "once") continue;
		if (inc.isSalary) {
			const details = calculateSalaryDetails(inc);
			quincenaIncome += details.quincenaAmount;
			finDeMesIncome += details.finDeMesAmount;
		} else finDeMesIncome += normalizeToMonthly(inc.amount, inc.frequency);
	}
	const periods = generatePeriods(startDate, months, {
		quincena: round(quincenaIncome),
		finDeMes: round(finDeMesIncome)
	});
	for (const inc of input.incomes) {
		if (inc.frequency !== "once" || !inc.date || inc.amount <= 0) continue;
		const d = /* @__PURE__ */ new Date(`${String(inc.date).slice(0, 10)}T00:00:00`);
		if (Number.isNaN(d.getTime())) continue;
		const timing = d.getDate() <= 15 ? "quincena" : "fin_de_mes";
		const period = periods.find((p) => p.year === d.getFullYear() && p.month === d.getMonth() && p.timing === timing);
		if (period) period.incomeAvailable = round(period.incomeAvailable + inc.amount);
	}
	const rows = [];
	for (const debt of input.debts) {
		const hasPlan = !!debt.hasInstallmentPlan && (debt.termMonths ?? 0) > 0;
		const planMonths = hasPlan ? debt.termMonths : 0;
		const monthlyDue = hasPlan ? round(debt.currentBalance / planMonths) : debt.minimumPayment;
		if (debt.currentBalance <= 0 || monthlyDue <= 0) continue;
		const timing = resolveTiming(debt.paymentTiming, debt.dueDay);
		const cells = {};
		const installmentNumbers = {};
		let remaining = debt.currentBalance;
		let totalScheduled = 0;
		let payoffPeriodKey = null;
		let installment = 0;
		for (const period of periods) {
			if (period.timing !== timing || remaining <= 0) continue;
			installment += 1;
			const amount = hasPlan && installment === planMonths ? round(remaining) : round(Math.min(monthlyDue, remaining));
			cells[period.key] = amount;
			installmentNumbers[period.key] = installment;
			totalScheduled += amount;
			remaining = round(remaining - amount);
			if (remaining <= 0) payoffPeriodKey = period.key;
		}
		rows.push({
			id: debt.id,
			name: debt.name,
			kind: "debt",
			timing,
			monthlyAmount: round(monthlyDue),
			totalScheduled: round(totalScheduled),
			currentBalance: round(debt.currentBalance),
			remainingInstallments: hasPlan ? planMonths : Math.ceil(debt.currentBalance / monthlyDue),
			totalInstallments: hasPlan ? planMonths : null,
			payoffPeriodKey,
			cells,
			installmentNumbers
		});
	}
	for (const expense of input.expenses) {
		const monthly = round(normalizeToMonthly(expense.amount, expense.frequency));
		if (monthly <= 0) continue;
		const timing = expense.paymentTiming ?? "ambas";
		const half = round(monthly / 2);
		const cells = {};
		let totalScheduled = 0;
		const from = expense.activeFrom ? String(expense.activeFrom).slice(0, 10) : null;
		const until = expense.activeUntil ? String(expense.activeUntil).slice(0, 10) : null;
		for (const period of periods) {
			if (from && period.date < from) continue;
			if (until && period.date > until) continue;
			let amount = 0;
			if (timing === "ambas") amount = period.timing === "quincena" ? half : round(monthly - half);
			else if (period.timing === timing) amount = monthly;
			if (amount <= 0) continue;
			cells[period.key] = amount;
			totalScheduled += amount;
		}
		rows.push({
			id: expense.id,
			name: expense.name,
			kind: "expense",
			timing,
			monthlyAmount: monthly,
			totalScheduled: round(totalScheduled),
			cells
		});
	}
	const totals = {};
	const remaining = {};
	for (const period of periods) {
		const total = rows.reduce((sum, row) => sum + (row.cells[period.key] ?? 0), 0);
		totals[period.key] = round(total);
		remaining[period.key] = round(period.incomeAvailable - total);
	}
	const monthlyDebts = rows.filter((r) => r.kind === "debt").reduce((sum, r) => sum + r.monthlyAmount, 0);
	const monthlyExpenses = rows.filter((r) => r.kind === "expense").reduce((sum, r) => sum + r.monthlyAmount, 0);
	return {
		periods,
		rows,
		totals,
		remaining,
		monthlyIncome: {
			quincena: round(quincenaIncome),
			finDeMes: round(finDeMesIncome)
		},
		monthlyCommitment: {
			debts: round(monthlyDebts),
			expenses: round(monthlyExpenses)
		}
	};
}
function toKey(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function round(value) {
	return Math.round(value * 100) / 100;
}
//#endregion
//#region src/pages/api/schedule/index.ts
var schedule_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var toIsoDate = (v) => {
	if (!v) return null;
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return null;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
var GET = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const url = new URL(ctx.request.url);
		const monthsParam = parseInt(url.searchParams.get("months") || "6", 10);
		const months = Number.isNaN(monthsParam) ? 6 : Math.min(Math.max(monthsParam, 1), 12);
		const [userIncomes, userExpenses, userDebts, userPayments] = await Promise.all([
			db.select().from(incomes).where(eq(incomes.userId, user.id)),
			db.select().from(expenses).where(eq(expenses.userId, user.id)),
			db.select().from(debts).where(eq(debts.userId, user.id)),
			db.select({
				id: payments.id,
				debtId: payments.debtId,
				debtName: debts.name,
				amount: payments.amount,
				type: payments.type,
				paidAt: payments.paidAt,
				notes: payments.notes
			}).from(payments).leftJoin(debts, eq(payments.debtId, debts.id)).where(eq(payments.userId, user.id)).orderBy(desc(payments.paidAt))
		]);
		const formattedIncomes = userIncomes.filter((i) => i.isActive !== false).map((i) => ({
			id: i.id,
			name: i.name,
			amount: parseFloat(i.amount),
			frequency: i.frequency || "monthly",
			isSalary: !!i.isSalary,
			paymentScheme: i.paymentScheme || "quincena_fin_mes",
			quincenaAmount: i.quincenaAmount ? parseFloat(i.quincenaAmount) : 0,
			finDeMesAmount: i.finDeMesAmount ? parseFloat(i.finDeMesAmount) : 0,
			deductIess: i.deductIess ?? true,
			iessPercentage: i.iessPercentage ? parseFloat(i.iessPercentage) : 9.45,
			hasProgrammedSavings: !!i.hasProgrammedSavings,
			programmedSavingsAmount: i.programmedSavingsAmount ? parseFloat(i.programmedSavingsAmount) : 0,
			date: toIsoDate(i.date)
		}));
		const formattedExpenses = userExpenses.filter((e) => e.isActive !== false).map((e) => ({
			id: e.id,
			name: e.name,
			amount: parseFloat(e.amount),
			category: e.category,
			isEssential: !!e.isEssential,
			frequency: e.frequency || "monthly",
			paymentTiming: e.paymentTiming || "ambas",
			activeFrom: toIsoDate(e.activeFrom),
			activeUntil: toIsoDate(e.activeUntil)
		}));
		const schedule = buildPaymentSchedule({
			debts: userDebts.filter((d) => d.status !== "paid_off" && parseFloat(d.currentBalance) > 0).map((d) => ({
				id: d.id,
				name: d.name,
				creditor: d.creditor || void 0,
				currentBalance: parseFloat(d.currentBalance),
				originalBalance: parseFloat(d.originalBalance),
				apr: parseFloat(d.apr),
				minimumPayment: parseFloat(d.minimumPayment),
				dueDay: d.dueDay ?? 15,
				type: d.type,
				paymentTiming: d.paymentTiming || "fin_de_mes",
				hasInstallmentPlan: !!d.hasInstallmentPlan,
				termMonths: d.termMonths ?? null
			})),
			incomes: formattedIncomes,
			expenses: formattedExpenses,
			months
		});
		const paid = {};
		for (const p of userPayments) {
			const paidDate = new Date(p.paidAt);
			if (Number.isNaN(paidDate.getTime())) continue;
			const timing = paidDate.getDate() <= 15 ? "quincena" : "fin_de_mes";
			const period = schedule.periods.find((per) => per.year === paidDate.getFullYear() && per.month === paidDate.getMonth() && per.timing === timing);
			if (!period) continue;
			paid[p.debtId] = paid[p.debtId] || {};
			paid[p.debtId][period.key] = (paid[p.debtId][period.key] || 0) + parseFloat(p.amount);
		}
		const history = userPayments.map((p) => ({
			...p,
			amount: parseFloat(p.amount)
		}));
		return new Response(JSON.stringify({ data: {
			schedule,
			paid,
			history,
			months
		} }), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/schedule/index@_@ts
var page = () => schedule_exports;
//#endregion
export { page };
