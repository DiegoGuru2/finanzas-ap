import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { a as incomes, i as expenses, r as debts, t as db } from "./db_Gak7IQ5R.mjs";
import { t as calculateCashflow } from "./cashflow_Bd1_Ar6s.mjs";
import { eq } from "drizzle-orm";
//#region src/modules/financial-engine/avalanche.ts
/**
* Allocate payments using the Avalanche strategy.
*
* @param debts - Active debts (balance > 0)
* @param availableSurplus - Money available AFTER minimum payments
* @returns Array of payment allocations
*/
function allocateAvalanche(debts, availableSurplus) {
	if (debts.length === 0 || availableSurplus <= 0) return debts.map((debt) => ({
		debtId: debt.id,
		debtName: debt.name,
		amount: Math.min(debt.minimumPayment, debt.currentBalance),
		type: "minimum"
	}));
	const sorted = [...debts].sort((a, b) => {
		if (b.apr !== a.apr) return b.apr - a.apr;
		return a.currentBalance - b.currentBalance;
	});
	const allocations = [];
	let remaining = availableSurplus;
	for (const debt of sorted) {
		const minimumOrBalance = Math.min(debt.minimumPayment, debt.currentBalance);
		const maxExtra = debt.currentBalance - minimumOrBalance;
		if (remaining > 0 && maxExtra > 0) {
			const extraPayment = Math.min(remaining, maxExtra);
			allocations.push({
				debtId: debt.id,
				debtName: debt.name,
				amount: round$3(minimumOrBalance + extraPayment),
				type: "extra"
			});
			remaining = round$3(remaining - extraPayment);
		} else allocations.push({
			debtId: debt.id,
			debtName: debt.name,
			amount: round$3(minimumOrBalance),
			type: "minimum"
		});
	}
	return allocations;
}
function round$3(value) {
	return Math.round(value * 100) / 100;
}
//#endregion
//#region src/modules/financial-engine/snowball.ts
/**
* Allocate payments using the Snowball strategy.
*
* @param debts - Active debts (balance > 0)
* @param availableSurplus - Money available AFTER minimum payments
* @returns Array of payment allocations
*/
function allocateSnowball(debts, availableSurplus) {
	if (debts.length === 0 || availableSurplus <= 0) return debts.map((debt) => ({
		debtId: debt.id,
		debtName: debt.name,
		amount: Math.min(debt.minimumPayment, debt.currentBalance),
		type: "minimum"
	}));
	const sorted = [...debts].sort((a, b) => {
		if (a.currentBalance !== b.currentBalance) return a.currentBalance - b.currentBalance;
		return b.apr - a.apr;
	});
	const allocations = [];
	let remaining = availableSurplus;
	for (const debt of sorted) {
		const minimumOrBalance = Math.min(debt.minimumPayment, debt.currentBalance);
		const maxExtra = debt.currentBalance - minimumOrBalance;
		if (remaining > 0 && maxExtra > 0) {
			const extraPayment = Math.min(remaining, maxExtra);
			allocations.push({
				debtId: debt.id,
				debtName: debt.name,
				amount: round$2(minimumOrBalance + extraPayment),
				type: "extra"
			});
			remaining = round$2(remaining - extraPayment);
		} else allocations.push({
			debtId: debt.id,
			debtName: debt.name,
			amount: round$2(minimumOrBalance),
			type: "minimum"
		});
	}
	return allocations;
}
function round$2(value) {
	return Math.round(value * 100) / 100;
}
//#endregion
//#region src/modules/financial-engine/projection.ts
/**
* Project debt repayment over a number of months.
*
* @param input - Debts, monthly payment, strategy, and projection period
* @returns ProjectionResult with monthly snapshots and summary stats
*/
function projectAmortization(input) {
	const { debts: initialDebts, monthlyPayment, strategy, months } = input;
	const startDate = input.startDate ? new Date(input.startDate) : /* @__PURE__ */ new Date();
	startDate.setDate(1);
	let currentDebts = initialDebts.map((d) => ({ ...d }));
	const snapshots = [];
	let totalInterestPaid = 0;
	let totalPaid = 0;
	let debtFreeMonth = null;
	let debtFreeDate = null;
	for (let month = 1; month <= months; month++) {
		const date = new Date(startDate);
		date.setMonth(date.getMonth() + month);
		const dateStr = date.toISOString().slice(0, 10);
		const activeDebts = currentDebts.filter((d) => d.currentBalance > 0);
		if (activeDebts.length === 0) {
			if (debtFreeMonth === null) {
				debtFreeMonth = month - 1;
				const freeDate = new Date(startDate);
				freeDate.setMonth(freeDate.getMonth() + month - 1);
				debtFreeDate = freeDate.toISOString().slice(0, 10);
			}
			break;
		}
		const totalMinimums = activeDebts.reduce((sum, d) => sum + Math.min(d.minimumPayment, d.currentBalance), 0);
		const allocations = getAllocations$1(activeDebts, Math.max(0, monthlyPayment - totalMinimums), strategy);
		const debtSnapshots = [];
		let monthlyInterest = 0;
		let monthlyPrincipal = 0;
		for (const debt of currentDebts) {
			if (debt.currentBalance <= 0) {
				debtSnapshots.push({
					debtId: debt.id,
					debtName: debt.name,
					remainingBalance: 0,
					interestCharged: 0,
					principalPaid: 0,
					amountPaid: 0,
					isPaidOff: true
				});
				continue;
			}
			const monthlyRate = debt.apr / 100 / 12;
			const interest = round$1(debt.currentBalance * monthlyRate);
			const allocation = allocations.find((a) => a.debtId === debt.id);
			const payment = allocation ? allocation.amount : Math.min(debt.minimumPayment, debt.currentBalance);
			const principal = round$1(Math.max(0, payment - interest));
			debt.currentBalance = round$1(Math.max(0, debt.currentBalance + interest - payment));
			monthlyInterest += interest;
			monthlyPrincipal += principal;
			totalInterestPaid += interest;
			totalPaid += payment;
			debtSnapshots.push({
				debtId: debt.id,
				debtName: debt.name,
				remainingBalance: debt.currentBalance,
				interestCharged: interest,
				principalPaid: principal,
				amountPaid: payment,
				isPaidOff: debt.currentBalance <= 0
			});
		}
		snapshots.push({
			month,
			date: dateStr,
			debts: debtSnapshots,
			totalBalance: round$1(currentDebts.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0)),
			totalInterestPaid: round$1(totalInterestPaid),
			totalPrincipalPaid: round$1(totalPaid - totalInterestPaid),
			monthlyInterest: round$1(monthlyInterest),
			monthlyPrincipal: round$1(monthlyPrincipal)
		});
		if (currentDebts.every((d) => d.currentBalance <= 0)) {
			debtFreeMonth = month;
			debtFreeDate = dateStr;
			break;
		}
	}
	return {
		snapshots,
		totalInterestPaid: round$1(totalInterestPaid),
		totalPaid: round$1(totalPaid),
		debtFreeMonth,
		debtFreeDate,
		averageMonthlyInterest: snapshots.length > 0 ? round$1(totalInterestPaid / snapshots.length) : 0
	};
}
/**
* Route to the correct allocation strategy.
*/
function getAllocations$1(debts, surplus, strategy) {
	switch (strategy) {
		case "avalanche": return allocateAvalanche(debts, surplus);
		case "snowball": return allocateSnowball(debts, surplus);
		case "liquidity": return allocateSnowball([...debts].sort((a, b) => a.minimumPayment - b.minimumPayment), surplus);
		default: return allocateAvalanche(debts, surplus);
	}
}
function round$1(value) {
	return Math.round(value * 100) / 100;
}
//#endregion
//#region src/modules/financial-engine/optimizer.ts
/**
* Optimize debt repayment given a surplus and strategy.
*
* @param input - Surplus, debts, strategy, and optional emergency reserve
* @returns OptimizationResult with allocations, projections, and warnings
*/
function optimizeDebt(input) {
	const { surplus, debts, strategy, emergencyReservePercent = 0 } = input;
	const warnings = [];
	if (debts.length === 0) return {
		allocations: [],
		totalAllocated: 0,
		emergencyReserve: 0,
		projectedTotalInterest: 0,
		projectedDebtFreeDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		strategy,
		warnings: [{
			type: "zero_surplus",
			message: "No hay deudas activas para optimizar.",
			severity: "info"
		}]
	};
	const activeDebts = debts.filter((d) => d.currentBalance > 0);
	if (activeDebts.length === 0) return {
		allocations: [],
		totalAllocated: 0,
		emergencyReserve: surplus,
		projectedTotalInterest: 0,
		projectedDebtFreeDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		strategy,
		warnings: [{
			type: "zero_surplus",
			message: "¡Felicidades! Todas tus deudas están pagadas.",
			severity: "info"
		}]
	};
	const emergencyReserve = round(surplus * (emergencyReservePercent / 100));
	const availableForDebt = round(surplus - emergencyReserve);
	if (surplus <= 0) warnings.push({
		type: "zero_surplus",
		message: "No hay excedente disponible para pago de deudas.",
		severity: "critical"
	});
	const totalMinimums = activeDebts.reduce((sum, d) => sum + Math.min(d.minimumPayment, d.currentBalance), 0);
	if (surplus > 0 && surplus < totalMinimums) warnings.push({
		type: "insufficient_funds",
		message: `El excedente ($${surplus}) no cubre los pagos mínimos totales ($${totalMinimums}).`,
		severity: "critical"
	});
	const allocations = getAllocations(activeDebts, Math.max(0, availableForDebt - totalMinimums), strategy);
	const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
	const projection = projectAmortization({
		debts: activeDebts,
		monthlyPayment: totalAllocated,
		strategy,
		months: 360
	});
	const highInterestDebts = activeDebts.filter((d) => d.apr >= 25);
	if (highInterestDebts.length > 0) warnings.push({
		type: "high_risk",
		message: `Tienes ${highInterestDebts.length} deuda(s) con tasa superior al 25% APR.`,
		severity: "warning"
	});
	return {
		allocations,
		totalAllocated: round(totalAllocated),
		emergencyReserve: round(emergencyReserve),
		projectedTotalInterest: projection.totalInterestPaid,
		projectedDebtFreeDate: projection.debtFreeDate ?? "Más de 30 años",
		strategy,
		warnings
	};
}
/**
* Compare all strategies to help the user choose.
*/
function compareStrategies(surplus, debts) {
	const strategies = [
		"avalanche",
		"snowball",
		"liquidity"
	];
	const results = {};
	for (const strategy of strategies) {
		const result = optimizeDebt({
			surplus,
			debts,
			strategy
		});
		results[strategy] = {
			totalInterest: result.projectedTotalInterest,
			debtFreeDate: result.projectedDebtFreeDate
		};
	}
	results["custom"] = results["avalanche"];
	return results;
}
/**
* Route to the correct allocation strategy.
*/
function getAllocations(debts, surplus, strategy) {
	switch (strategy) {
		case "avalanche": return allocateAvalanche(debts, surplus);
		case "snowball": return allocateSnowball(debts, surplus);
		case "liquidity": return allocateSnowball([...debts].sort((a, b) => a.minimumPayment - b.minimumPayment), surplus);
		default: return allocateAvalanche(debts, surplus);
	}
}
function round(value) {
	return Math.round(value * 100) / 100;
}
//#endregion
//#region src/pages/api/dashboard/index.ts
var dashboard_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async (ctx) => {
	const user = ctx.locals.user;
	if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
	try {
		const strategyParam = new URL(ctx.request.url).searchParams.get("strategy");
		const strategy = [
			"avalanche",
			"snowball",
			"liquidity"
		].includes(strategyParam || "") ? strategyParam : "avalanche";
		const [userIncomes, userExpenses, userDebts] = await Promise.all([
			db.select().from(incomes).where(eq(incomes.userId, user.id)),
			db.select().from(expenses).where(eq(expenses.userId, user.id)),
			db.select().from(debts).where(eq(debts.userId, user.id))
		]);
		const formattedIncomes = userIncomes.map((i) => ({
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
			programmedSavingsAmount: i.programmedSavingsAmount ? parseFloat(i.programmedSavingsAmount) : 0
		}));
		const formattedExpenses = userExpenses.map((e) => ({
			id: e.id,
			name: e.name,
			amount: parseFloat(e.amount),
			category: e.category,
			isEssential: !!e.isEssential,
			frequency: e.frequency || "monthly"
		}));
		const formattedDebts = userDebts.filter((d) => parseFloat(d.currentBalance) > 0).map((d) => ({
			id: d.id,
			name: d.name,
			creditor: d.creditor || void 0,
			currentBalance: parseFloat(d.currentBalance),
			originalBalance: parseFloat(d.originalBalance),
			apr: parseFloat(d.apr),
			minimumPayment: parseFloat(d.minimumPayment),
			dueDay: d.dueDay ?? 15,
			type: d.type,
			paymentTiming: d.paymentTiming || "fin_de_mes"
		}));
		const totalMinimumPayments = formattedDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
		const cashflow = calculateCashflow({
			incomes: formattedIncomes,
			expenses: formattedExpenses,
			minimumPayments: totalMinimumPayments
		});
		const optimization = optimizeDebt({
			surplus: Math.max(0, cashflow.surplus),
			debts: formattedDebts,
			strategy
		});
		const strategyComparison = compareStrategies(Math.max(0, cashflow.surplus), formattedDebts);
		const projection = projectAmortization({
			debts: formattedDebts,
			monthlyPayment: optimization.totalAllocated > 0 ? optimization.totalAllocated : totalMinimumPayments,
			strategy,
			months: 24
		});
		const totalDebt = formattedDebts.reduce((sum, d) => sum + d.currentBalance, 0);
		return new Response(JSON.stringify({ data: {
			user: {
				id: user.id,
				name: user.name,
				email: user.email
			},
			summary: {
				totalDebt,
				totalGrossIncome: cashflow.totalGrossIncome,
				totalIessDeductions: cashflow.totalIessDeductions,
				totalProgrammedSavings: cashflow.totalProgrammedSavings,
				totalNetIncome: cashflow.totalNetIncome,
				quincenaAvailable: cashflow.quincenaAvailable,
				finDeMesAvailable: cashflow.finDeMesAvailable,
				totalExpenses: cashflow.totalMonthlyExpenses,
				totalMinimumPayments,
				surplus: cashflow.surplus,
				savingsRate: cashflow.savingsRate,
				status: cashflow.status,
				activeDebtsCount: formattedDebts.length
			},
			strategy,
			optimization,
			strategyComparison,
			projection,
			incomes: formattedIncomes,
			expenses: formattedExpenses,
			debts: formattedDebts
		} }), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/dashboard/index@_@ts
var page = () => dashboard_exports;
//#endregion
export { page };
