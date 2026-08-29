/**
* Calculate Ecuadorian payroll details for a given salary.
*/
function calculateSalaryDetails(income) {
	const grossMonthly = normalizeToMonthly(income.amount, income.frequency);
	let iessDeduction = 0;
	if (income.isSalary && income.deductIess) iessDeduction = round(grossMonthly * ((income.iessPercentage ?? 9.45) / 100));
	const netMonthly = round(Math.max(0, grossMonthly - iessDeduction));
	let programmedSavings = 0;
	if (income.hasProgrammedSavings && income.programmedSavingsAmount && income.programmedSavingsAmount > 0) programmedSavings = round(income.programmedSavingsAmount);
	let quincenaAmount = 0;
	let finDeMesAmount = netMonthly;
	if (income.isSalary && income.paymentScheme === "quincena_fin_mes") {
		if (income.quincenaAmount && income.quincenaAmount > 0) {
			quincenaAmount = round(income.quincenaAmount);
			finDeMesAmount = round(Math.max(0, netMonthly - quincenaAmount - programmedSavings));
		} else {
			quincenaAmount = round(netMonthly / 2);
			finDeMesAmount = round(Math.max(0, netMonthly - quincenaAmount - programmedSavings));
		}
	} else finDeMesAmount = round(Math.max(0, netMonthly - programmedSavings));
	return {
		grossMonthly: round(grossMonthly),
		iessDeduction: round(iessDeduction),
		netMonthly: round(netMonthly),
		programmedSavings: round(programmedSavings),
		quincenaAmount: round(quincenaAmount),
		finDeMesAmount: round(finDeMesAmount)
	};
}
/**
* Convert any frequency amount to its monthly equivalent.
*/
function normalizeToMonthly(amount, frequency) {
	switch (frequency) {
		case "weekly": return amount * 52 / 12;
		case "biweekly": return amount * 26 / 12;
		case "monthly": return amount;
		case "annual": return amount / 12;
		case "once": return 0;
		default: return amount;
	}
}
/**
* Calculate the complete monthly cashflow including IESS deductions, salary splits, and programmed savings.
*/
function calculateCashflow(input) {
	const { incomes, expenses, minimumPayments } = input;
	let totalGrossIncome = 0;
	let totalIessDeductions = 0;
	let totalProgrammedSavings = 0;
	let totalNetIncome = 0;
	let quincenaAvailable = 0;
	let finDeMesAvailable = 0;
	for (const inc of incomes) if (inc.isSalary) {
		const details = calculateSalaryDetails(inc);
		totalGrossIncome += details.grossMonthly;
		totalIessDeductions += details.iessDeduction;
		totalProgrammedSavings += details.programmedSavings;
		totalNetIncome += details.netMonthly;
		quincenaAvailable += details.quincenaAmount;
		finDeMesAvailable += details.finDeMesAmount;
	} else {
		const monthly = normalizeToMonthly(inc.amount, inc.frequency);
		totalGrossIncome += monthly;
		totalNetIncome += monthly;
		finDeMesAvailable += monthly;
	}
	let totalEssentialExpenses = 0;
	let totalNonEssentialExpenses = 0;
	for (const exp of expenses) {
		const monthly = normalizeToMonthly(exp.amount, exp.frequency);
		if (exp.isEssential) totalEssentialExpenses += monthly;
		else totalNonEssentialExpenses += monthly;
	}
	const totalMonthlyExpenses = totalEssentialExpenses + totalNonEssentialExpenses;
	const surplus = quincenaAvailable + finDeMesAvailable - totalMonthlyExpenses - minimumPayments;
	const savingsRate = totalNetIncome > 0 ? (surplus + totalProgrammedSavings) / totalNetIncome * 100 : 0;
	let status;
	if (surplus < 0) status = "deficit";
	else if (surplus === 0) status = "risk_payment";
	else if (savingsRate < 20) status = "tight";
	else status = "healthy";
	return {
		totalGrossIncome: round(totalGrossIncome),
		totalMonthlyIncome: round(totalGrossIncome),
		totalIessDeductions: round(totalIessDeductions),
		totalProgrammedSavings: round(totalProgrammedSavings),
		totalNetIncome: round(totalNetIncome),
		quincenaAvailable: round(quincenaAvailable),
		finDeMesAvailable: round(finDeMesAvailable),
		totalMonthlyExpenses: round(totalMonthlyExpenses),
		totalEssentialExpenses: round(totalEssentialExpenses),
		totalNonEssentialExpenses: round(totalNonEssentialExpenses),
		minimumPayments: round(minimumPayments),
		surplus: round(surplus),
		savingsRate: round(savingsRate),
		status
	};
}
function round(value) {
	return Math.round(value * 100) / 100;
}
//#endregion
export { calculateSalaryDetails as n, normalizeToMonthly as r, calculateCashflow as t };
