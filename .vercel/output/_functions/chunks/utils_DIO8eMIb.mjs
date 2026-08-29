import "clsx";
//#region src/lib/utils.ts
/**
* Format a number as currency.
* @param amount - The numeric amount
* @param currency - ISO 4217 currency code (default: 'USD')
* @param locale - BCP 47 locale string (default: 'en-US')
*/
function formatCurrency(amount, currency = "USD", locale = "en-US") {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount);
}
/**
* Generate a UUID v4.
*/
function generateId() {
	return crypto.randomUUID();
}
//#endregion
export { generateId as n, formatCurrency as t };
