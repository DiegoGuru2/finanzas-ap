import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { D as renderTemplate, S as renderComponent } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { t as $$AppLayout } from "./AppLayout_D5tnGjTt.mjs";
import { t as formatCurrency } from "./utils_DIO8eMIb.mjs";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/settings/SettingsManager.tsx
function SettingsManager() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [successMessage, setSuccessMessage] = useState(null);
	const [errorMessage, setErrorMessage] = useState(null);
	const [salaryId, setSalaryId] = useState(null);
	const [salaryName, setSalaryName] = useState("Sueldo Principal");
	const [salaryAmount, setSalaryAmount] = useState(1200);
	const [paymentScheme, setPaymentScheme] = useState("quincena_fin_mes");
	const [quincenaAmount, setQuincenaAmount] = useState(500);
	const [finDeMesAmount, setFinDeMesAmount] = useState(586.6);
	const [deductIess, setDeductIess] = useState(true);
	const [iessPercentage, setIessPercentage] = useState(9.45);
	const [hasProgrammedSavings, setHasProgrammedSavings] = useState(false);
	const [programmedSavingsAmount, setProgrammedSavingsAmount] = useState(100);
	useEffect(() => {
		const gross = salaryAmount || 0;
		const iess = deductIess ? gross * (iessPercentage / 100) : 0;
		const net = Math.max(0, gross - iess);
		const savings = hasProgrammedSavings && programmedSavingsAmount > 0 ? programmedSavingsAmount : 0;
		if (paymentScheme === "quincena_fin_mes") {
			const q = Math.round(net / 2 * 100) / 100;
			setQuincenaAmount(q);
			setFinDeMesAmount(Math.round(Math.max(0, net - q - savings) * 100) / 100);
		} else {
			setQuincenaAmount(0);
			setFinDeMesAmount(Math.round(Math.max(0, net - savings) * 100) / 100);
		}
	}, [
		salaryAmount,
		deductIess,
		iessPercentage,
		paymentScheme,
		hasProgrammedSavings,
		programmedSavingsAmount
	]);
	const fetchData = async () => {
		try {
			setLoading(true);
			const json = await (await fetch("/api/incomes")).json();
			if (json.data && json.data.length > 0) {
				const principal = json.data.find((i) => i.isSalary) || json.data[0];
				setSalaryId(principal.id);
				setSalaryName(principal.name || "Sueldo Principal");
				setSalaryAmount(Number(principal.amount) || 1200);
				setPaymentScheme(principal.paymentScheme || "quincena_fin_mes");
				setQuincenaAmount(Number(principal.quincenaAmount) || 500);
				setFinDeMesAmount(Number(principal.finDeMesAmount) || 586.6);
				setDeductIess(principal.deductIess ?? true);
				setIessPercentage(Number(principal.iessPercentage) || 9.45);
				setHasProgrammedSavings(!!principal.hasProgrammedSavings);
				setProgrammedSavingsAmount(Number(principal.programmedSavingsAmount) || 100);
			}
		} catch (err) {
			console.error("Error fetching settings:", err);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchData();
	}, []);
	const handleSaveSalary = async (e) => {
		e.preventDefault();
		setSaving(true);
		setSuccessMessage(null);
		setErrorMessage(null);
		try {
			if (salaryId) await fetch(`/api/incomes?id=${salaryId}`, { method: "DELETE" });
			const res = await fetch("/api/incomes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: salaryName,
					amount: Number(salaryAmount),
					frequency: "monthly",
					isSalary: true,
					paymentScheme,
					quincenaAmount: Number(quincenaAmount),
					finDeMesAmount: Number(finDeMesAmount),
					deductIess,
					iessPercentage: Number(iessPercentage),
					hasProgrammedSavings,
					programmedSavingsAmount: Number(programmedSavingsAmount),
					category: "Sueldo"
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Error al actualizar el sueldo");
			setSalaryId(json.id);
			setSuccessMessage("✅ ¡Configuración guardada exitosamente! Sueldo, IESS y Ahorro Programado actualizados en toda la plataforma.");
		} catch (err) {
			setErrorMessage(err.message || "Error al guardar");
		} finally {
			setSaving(false);
		}
	};
	if (loading) return /* @__PURE__ */ jsxs("div", {
		className: "p-12 text-center text-text-muted",
		children: [/* @__PURE__ */ jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-3" }), "Cargando configuración..."]
	});
	const iessDeduction = deductIess ? salaryAmount * (iessPercentage / 100) : 0;
	const netSalary = Math.max(0, salaryAmount - iessDeduction);
	const activeSavings = hasProgrammedSavings && programmedSavingsAmount > 0 ? programmedSavingsAmount : 0;
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-4xl space-y-8",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
				className: "text-2xl font-bold",
				children: "Configuración de la Cuenta"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-text-secondary",
				children: "Modifica tu sueldo si varía en el tiempo, configura ahorro programado descontado a fin de mes y ajusta tus aportes al IESS."
			})] }),
			successMessage && /* @__PURE__ */ jsx("div", {
				className: "rounded-2xl border border-accent-500/30 bg-accent-500/10 p-4 text-xs font-semibold text-accent-400 animate-in fade-in",
				children: successMessage
			}),
			errorMessage && /* @__PURE__ */ jsx("div", {
				className: "rounded-2xl border border-danger-500/30 bg-danger-500/10 p-4 text-xs font-semibold text-danger-400 animate-in fade-in",
				children: errorMessage
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-3xl border border-border-default bg-surface-50 p-6 sm:p-8 space-y-6 shadow-xl",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3 border-b border-border-default pb-5",
					children: [/* @__PURE__ */ jsx("div", {
						className: "flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 text-xl",
						children: "🇪🇨"
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
						className: "text-lg font-bold text-text-primary",
						children: "Ajuste de Sueldo e Ingreso Mensual"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-xs text-text-muted",
						children: "Si tu sueldo subió, cambió tu contrato o varias de ingresos, actualízalo aquí."
					})] })]
				}), /* @__PURE__ */ jsxs("form", {
					onSubmit: handleSaveSalary,
					className: "space-y-6",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-5",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-semibold text-text-secondary mb-1.5",
								children: "Nombre o Concepto del Empleo"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								value: salaryName,
								onChange: (e) => setSalaryName(e.target.value),
								required: true,
								className: "w-full rounded-xl border border-border-default bg-surface-100 px-4 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none",
								placeholder: "Ej. Sueldo Empresa / Nuevo Empleo"
							})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-semibold text-text-secondary mb-1.5",
								children: "Sueldo Bruto Nominal ($ USD)"
							}), /* @__PURE__ */ jsxs("div", {
								className: "relative",
								children: [/* @__PURE__ */ jsx("span", {
									className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm",
									children: "$"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "1",
									value: salaryAmount,
									onChange: (e) => setSalaryAmount(parseFloat(e.target.value) || 0),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 pl-8 pr-4 py-2.5 text-sm font-bold text-text-primary focus:border-brand-500 focus:outline-none",
									placeholder: "1200.00"
								})]
							})] })]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "rounded-2xl border border-border-default bg-surface-100/70 p-5 space-y-4",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ jsx("input", {
										type: "checkbox",
										id: "settingsIessToggle",
										checked: deductIess,
										onChange: (e) => setDeductIess(e.target.checked),
										className: "h-4 w-4 rounded border-border-default text-brand-500 focus:ring-brand-500 cursor-pointer"
									}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										htmlFor: "settingsIessToggle",
										className: "text-xs font-bold text-text-primary cursor-pointer",
										children: "Descontar Aporte Personal al IESS (Ecuador)"
									}), /* @__PURE__ */ jsx("p", {
										className: "text-[11px] text-text-muted",
										children: "Se calcula sobre el salario nominal bruto registrado"
									})] })]
								}), deductIess && /* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-xs text-text-muted",
										children: "Porcentaje:"
									}), /* @__PURE__ */ jsxs("select", {
										value: iessPercentage,
										onChange: (e) => setIessPercentage(parseFloat(e.target.value)),
										className: "rounded-lg border border-border-default bg-surface-50 px-2.5 py-1 text-xs font-bold text-warning-400 focus:outline-none",
										children: [
											/* @__PURE__ */ jsx("option", {
												value: 9.45,
												children: "9.45% (Bajo dependencia / Sector privado)"
											}),
											/* @__PURE__ */ jsx("option", {
												value: 11.45,
												children: "11.45% (Sector público)"
											}),
											/* @__PURE__ */ jsx("option", {
												value: 17.6,
												children: "17.60% (Afiliación voluntaria / Independiente)"
											}),
											/* @__PURE__ */ jsx("option", {
												value: 20.6,
												children: "20.60% (Sin relación de dependencia)"
											})
										]
									})]
								})]
							}), deductIess && /* @__PURE__ */ jsxs("div", {
								className: "flex justify-between items-center text-xs pt-3 border-t border-border-default text-text-muted",
								children: [/* @__PURE__ */ jsxs("span", { children: [
									"Descuento de Ley IESS (",
									iessPercentage,
									"%):"
								] }), /* @__PURE__ */ jsxs("strong", {
									className: "text-warning-400 text-sm",
									children: ["-", formatCurrency(iessDeduction)]
								})]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "rounded-2xl border border-accent-500/30 bg-accent-500/5 p-5 space-y-4",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ jsx("input", {
										type: "checkbox",
										id: "settingsProgrammedSavingsToggle",
										checked: hasProgrammedSavings,
										onChange: (e) => setHasProgrammedSavings(e.target.checked),
										className: "h-4 w-4 rounded border-accent-500 text-accent-500 focus:ring-accent-500 cursor-pointer"
									}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("label", {
										htmlFor: "settingsProgrammedSavingsToggle",
										className: "text-xs font-bold text-text-primary cursor-pointer flex items-center gap-2",
										children: [/* @__PURE__ */ jsx("span", { children: "🏦 Activar Ahorro Programado / Débito Automático" }), /* @__PURE__ */ jsx("span", {
											className: "rounded bg-accent-500/20 text-accent-400 px-2 py-0.5 text-[10px] font-semibold",
											children: "Descontado a Fin de Mes"
										})]
									}), /* @__PURE__ */ jsx("p", {
										className: "text-[11px] text-text-muted",
										children: "Se reserva automáticamente de tu pago del día 30 para proteger tu fondo de ahorro o póliza."
									})] })]
								}), hasProgrammedSavings && /* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-xs text-text-muted font-medium",
										children: "Monto a reservar:"
									}), /* @__PURE__ */ jsxs("div", {
										className: "relative w-32",
										children: [/* @__PURE__ */ jsx("span", {
											className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs",
											children: "$"
										}), /* @__PURE__ */ jsx("input", {
											type: "number",
											step: "0.01",
											min: "1",
											value: programmedSavingsAmount,
											onChange: (e) => setProgrammedSavingsAmount(parseFloat(e.target.value) || 0),
											className: "w-full rounded-lg border border-accent-500/40 bg-surface-50 pl-6 pr-2 py-1 text-xs font-bold text-accent-400 focus:outline-none",
											placeholder: "100.00"
										})]
									})]
								})]
							}), hasProgrammedSavings && /* @__PURE__ */ jsxs("div", {
								className: "flex justify-between items-center text-xs pt-3 border-t border-accent-500/20 text-text-muted",
								children: [/* @__PURE__ */ jsx("span", { children: "Reserva mensual retenida a Fin de Mes:" }), /* @__PURE__ */ jsxs("strong", {
									className: "text-accent-400 text-sm",
									children: ["-", formatCurrency(programmedSavingsAmount)]
								})]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-semibold text-text-secondary",
								children: "Modalidad de Cobro en el Mes"
							}), /* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
								children: [/* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => setPaymentScheme("quincena_fin_mes"),
									className: `rounded-2xl border p-4 text-left transition-all cursor-pointer ${paymentScheme === "quincena_fin_mes" ? "border-brand-500 bg-brand-500/15 text-brand-400 shadow-sm ring-1 ring-brand-500" : "border-border-default bg-surface-100 text-text-muted hover:border-border-hover"}`,
									children: [/* @__PURE__ */ jsx("div", {
										className: "text-xs font-bold",
										children: "📅 Quincena y Fin de Mes"
									}), /* @__PURE__ */ jsx("div", {
										className: "mt-1 text-[11px] opacity-80",
										children: "Anticipo el día 15 y saldo el 30"
									})]
								}), /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => setPaymentScheme("monthly"),
									className: `rounded-2xl border p-4 text-left transition-all cursor-pointer ${paymentScheme === "monthly" ? "border-brand-500 bg-brand-500/15 text-brand-400 shadow-sm ring-1 ring-brand-500" : "border-border-default bg-surface-100 text-text-muted hover:border-border-hover"}`,
									children: [/* @__PURE__ */ jsx("div", {
										className: "text-xs font-bold",
										children: "💳 Un Solo Pago"
									}), /* @__PURE__ */ jsx("div", {
										className: "mt-1 text-[11px] opacity-80",
										children: "100% cobrado a fin de mes"
									})]
								})]
							})]
						}),
						paymentScheme === "quincena_fin_mes" && /* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-border-default bg-surface-100 p-4",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-[11px] font-semibold text-text-secondary mb-1",
								children: "Anticipo Quincena (Día 15)"
							}), /* @__PURE__ */ jsx("input", {
								type: "number",
								step: "0.01",
								min: "0",
								value: quincenaAmount,
								onChange: (e) => {
									const q = parseFloat(e.target.value) || 0;
									setQuincenaAmount(q);
									setFinDeMesAmount(Math.round(Math.max(0, netSalary - q - activeSavings) * 100) / 100);
								},
								className: "w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
							})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("label", {
								className: "block text-[11px] font-semibold text-text-secondary mb-1",
								children: ["Saldo Fin de Mes (Día 30) ", hasProgrammedSavings && "(Tras Ahorro)"]
							}), /* @__PURE__ */ jsx("input", {
								type: "number",
								step: "0.01",
								min: "0",
								value: finDeMesAmount,
								onChange: (e) => setFinDeMesAmount(parseFloat(e.target.value) || 0),
								className: "w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
							})] })]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "rounded-2xl border border-accent-500/30 bg-accent-500/10 p-5 space-y-2",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-bold text-accent-400 block",
									children: "Sueldo Neto Líquido Total:"
								}), /* @__PURE__ */ jsxs("span", {
									className: "text-xs text-text-muted",
									children: [
										"Bruto (",
										formatCurrency(salaryAmount),
										") - IESS (",
										formatCurrency(iessDeduction),
										")"
									]
								})] }), /* @__PURE__ */ jsx("div", {
									className: "text-2xl font-extrabold text-accent-400",
									children: formatCurrency(netSalary)
								})]
							}), hasProgrammedSavings && /* @__PURE__ */ jsxs("div", {
								className: "pt-2 border-t border-accent-500/20 flex justify-between text-xs text-text-secondary",
								children: [/* @__PURE__ */ jsxs("span", { children: [
									"Saldo disponible a Fin de Mes tras reservar Ahorro Programado (",
									formatCurrency(activeSavings),
									"):"
								] }), /* @__PURE__ */ jsx("strong", {
									className: "text-text-primary font-bold",
									children: formatCurrency(finDeMesAmount)
								})]
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "flex justify-end pt-2",
							children: /* @__PURE__ */ jsx("button", {
								type: "submit",
								disabled: saving,
								className: "rounded-2xl bg-brand-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 hover:shadow-brand-400/30 transition-all disabled:opacity-50 cursor-pointer",
								children: saving ? "Guardando cambios..." : "Guardar y Actualizar Dashboard 💾"
							})
						})
					]
				})]
			})
		]
	});
}
//#endregion
//#region src/pages/app/settings.astro
var settings_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Settings,
	file: () => $$file,
	url: () => $$url
});
var $$Settings = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Configuración" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "SettingsManager", SettingsManager, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "@/components/settings/SettingsManager",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/settings.astro", void 0);
var $$file = "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/settings.astro";
var $$url = "/app/settings";
//#endregion
//#region \0virtual:astro:page:src/pages/app/settings@_@astro
var page = () => settings_exports;
//#endregion
export { page };
