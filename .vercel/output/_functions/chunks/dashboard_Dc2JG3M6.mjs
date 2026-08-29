import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { D as renderTemplate, L as createAstro, S as renderComponent } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { t as $$AppLayout } from "./AppLayout_D5tnGjTt.mjs";
import { t as formatCurrency } from "./utils_DIO8eMIb.mjs";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/dashboard/DashboardView.tsx
var STRATEGY_LABELS = {
	avalanche: {
		name: "Avalancha",
		desc: "Prioriza la tasa de interés más alta: ahorras más en intereses."
	},
	snowball: {
		name: "Bola de Nieve",
		desc: "Prioriza la deuda más pequeña: liquidas deudas más rápido y ganas motivación."
	},
	liquidity: {
		name: "Liquidez",
		desc: "Prioriza la cuota mínima más baja: libera flujo de caja mensual antes."
	}
};
function DashboardView() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [strategy, setStrategy] = useState("avalanche");
	const [isLight, setIsLight] = useState(typeof document !== "undefined" && document.documentElement.dataset.theme === "light");
	useEffect(() => {
		const observer = new MutationObserver(() => setIsLight(document.documentElement.dataset.theme === "light"));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"]
		});
		return () => observer.disconnect();
	}, []);
	const [onboardingSalaryName, setOnboardingSalaryName] = useState("Sueldo Principal");
	const [onboardingAmount, setOnboardingAmount] = useState(1e3);
	const [onboardingScheme, setOnboardingScheme] = useState("quincena_fin_mes");
	const [onboardingQuincena, setOnboardingQuincena] = useState(452.75);
	const [onboardingFinDeMes, setOnboardingFinDeMes] = useState(452.75);
	const [deductIess, setDeductIess] = useState(true);
	const [iessPercentage, setIessPercentage] = useState(9.45);
	const [savingOnboarding, setSavingOnboarding] = useState(false);
	const [onboardingError, setOnboardingError] = useState(null);
	useEffect(() => {
		const gross = onboardingAmount || 0;
		const iess = deductIess ? gross * (iessPercentage / 100) : 0;
		const net = Math.max(0, gross - iess);
		if (onboardingScheme === "quincena_fin_mes") {
			const q = Math.round(net / 2 * 100) / 100;
			setOnboardingQuincena(q);
			setOnboardingFinDeMes(Math.round((net - q) * 100) / 100);
		} else {
			setOnboardingQuincena(0);
			setOnboardingFinDeMes(net);
		}
	}, [
		onboardingAmount,
		deductIess,
		iessPercentage,
		onboardingScheme
	]);
	const fetchDashboard = async () => {
		try {
			setLoading(true);
			const json = await (await fetch(`/api/dashboard?strategy=${strategy}`)).json();
			if (json.data) {
				setData(json.data);
				if (!json.data.incomes || json.data.incomes.length === 0) setShowOnboarding(true);
			}
		} catch (err) {
			console.error("Error fetching dashboard:", err);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchDashboard();
	}, [strategy]);
	const handleSaveOnboarding = async (e) => {
		e.preventDefault();
		setSavingOnboarding(true);
		setOnboardingError(null);
		try {
			const res = await fetch("/api/incomes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: onboardingSalaryName,
					amount: Number(onboardingAmount),
					frequency: "monthly",
					isSalary: true,
					paymentScheme: onboardingScheme,
					quincenaAmount: Number(onboardingQuincena),
					finDeMesAmount: Number(onboardingFinDeMes),
					deductIess,
					iessPercentage: Number(iessPercentage),
					category: "Sueldo"
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Error al guardar sueldo inicial");
			setShowOnboarding(false);
			await fetchDashboard();
		} catch (err) {
			setOnboardingError(err.message || "Error al registrar configuración inicial");
		} finally {
			setSavingOnboarding(false);
		}
	};
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "flex h-96 items-center justify-center",
		children: /* @__PURE__ */ jsxs("div", {
			className: "text-center space-y-3",
			children: [/* @__PURE__ */ jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto" }), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-text-muted",
				children: "Calculando tu motor financiero con TiDB Cloud..."
			})]
		})
	});
	const summary = data?.summary || {};
	const optimization = data?.optimization || {};
	const projection = data?.projection || {};
	const debts = data?.debts || [];
	const userName = data?.user?.name || "Diego Gurumendi";
	const chartData = projection.snapshots?.map((s) => ({
		name: `Mes ${s.month}`,
		saldo: s.totalBalance,
		interesAcumulado: s.totalInterestPaid,
		capitalPagado: s.totalPrincipalPaid
	})) || [];
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h2", {
					className: "text-2xl font-bold",
					children: ["Buenos días, ", /* @__PURE__ */ jsx("span", {
						className: "gradient-text",
						children: userName
					})]
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-text-secondary",
					children: "Resumen consolidado de sueldo, descuento IESS, quincena y optimización de deudas."
				})] }), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx("button", {
						onClick: () => setShowOnboarding(true),
						className: "rounded-xl bg-surface-100 hover:bg-surface-200 border border-border-default px-4 py-2 text-xs font-semibold text-text-primary transition-all cursor-pointer",
						children: "⚙️ Ajustar Sueldo e IESS"
					}), /* @__PURE__ */ jsx("a", {
						href: "/app/debts",
						className: "rounded-xl bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 transition-all",
						children: "+ Añadir Deuda"
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-danger-500/20 bg-danger-500/5 p-5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-medium text-danger-400",
									children: "Deuda Total Activa"
								}), /* @__PURE__ */ jsxs("span", {
									className: "rounded bg-danger-500/20 px-2 py-0.5 text-[10px] font-bold text-danger-300",
									children: [summary.activeDebtsCount || 0, " deudas"]
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-3 text-2xl font-extrabold text-danger-400",
								children: formatCurrency(summary.totalDebt || 0)
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-1 text-xs text-text-muted",
								children: [
									"Mínimo total: ",
									formatCurrency(summary.totalMinimumPayments || 0),
									"/mes"
								]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-medium text-accent-400",
									children: "Sueldo Neto Líquido"
								}), /* @__PURE__ */ jsx("span", {
									className: "text-[10px] text-text-muted",
									children: "Descontado IESS"
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-3 text-2xl font-extrabold text-accent-400",
								children: formatCurrency(summary.totalNetIncome || 0)
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-1 text-xs text-text-muted",
								children: [
									"Bruto: ",
									formatCurrency(summary.totalGrossIncome || 0),
									" (IESS: -",
									formatCurrency(summary.totalIessDeductions || 0),
									")"
								]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-border-default bg-surface-50 p-5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-medium text-brand-400",
									children: "Flujo Quincena vs Fin de Mes"
								}), summary.totalProgrammedSavings > 0 && /* @__PURE__ */ jsxs("span", {
									className: "text-[10px] font-bold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded border border-accent-500/20",
									children: ["Ahorro: ", formatCurrency(summary.totalProgrammedSavings)]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-2 text-xs space-y-1",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-text-muted",
										children: "Quincena (15):"
									}), /* @__PURE__ */ jsx("strong", {
										className: "text-text-primary",
										children: formatCurrency(summary.quincenaAvailable || 0)
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-text-muted",
										children: "Fin de Mes (30):"
									}), /* @__PURE__ */ jsx("strong", {
										className: "text-text-primary",
										children: formatCurrency(summary.finDeMesAvailable || 0)
									})]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-1 pt-1 border-t border-border-default text-[11px] text-text-muted",
								children: ["Gastos fijos: ", formatCurrency(summary.totalExpenses || 0)]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-brand-500/30 bg-brand-500/10 p-5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-medium text-brand-400",
									children: "Excedente para Pagar Deuda"
								}), /* @__PURE__ */ jsx("span", {
									className: "rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300",
									children: summary.status === "healthy" ? "Saludable" : summary.status === "tight" ? "Ajustado" : "Déficit"
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-3 text-2xl font-extrabold text-brand-400",
								children: formatCurrency(summary.surplus || 0)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Libre tras gastos y mínimos"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-surface-50 to-surface-50 p-6 shadow-xl",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-lg",
									children: "🎯"
								}), /* @__PURE__ */ jsxs("h3", {
									className: "text-base font-bold text-brand-400",
									children: [
										"Recomendación de Pago del Mes (Estrategia ",
										STRATEGY_LABELS[strategy].name,
										")"
									]
								})]
							}), /* @__PURE__ */ jsxs("p", {
								className: "text-xs text-text-secondary max-w-2xl",
								children: [
									"El motor distribuye tu excedente de ",
									/* @__PURE__ */ jsx("strong", { children: formatCurrency(summary.surplus || 0) }),
									".",
									" ",
									STRATEGY_LABELS[strategy].desc
								]
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-left md:text-right bg-surface-100/80 p-3 rounded-xl border border-border-default",
							children: [/* @__PURE__ */ jsx("div", {
								className: "text-xs text-text-muted",
								children: "Fecha estimada libre de deuda"
							}), /* @__PURE__ */ jsx("div", {
								className: "text-lg font-extrabold text-accent-400",
								children: optimization.projectedDebtFreeDate || "Calculando..."
							})]
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3",
						children: [
							"avalanche",
							"snowball",
							"liquidity"
						].map((s) => {
							const comp = data?.strategyComparison?.[s];
							const active = strategy === s;
							return /* @__PURE__ */ jsxs("button", {
								onClick: () => setStrategy(s),
								className: `rounded-xl border p-3 text-left transition-all cursor-pointer ${active ? "border-brand-500 bg-brand-500/15 ring-1 ring-brand-500" : "border-border-default bg-surface-100 hover:border-border-hover"}`,
								children: [/* @__PURE__ */ jsxs("div", {
									className: `text-xs font-bold ${active ? "text-brand-400" : "text-text-primary"}`,
									children: [
										STRATEGY_LABELS[s].name,
										" ",
										active && "✓"
									]
								}), comp && /* @__PURE__ */ jsxs("div", {
									className: "mt-1 text-[11px] text-text-muted",
									children: [
										"Intereses proyectados:",
										" ",
										/* @__PURE__ */ jsx("strong", {
											className: "text-warning-400",
											children: formatCurrency(comp.totalInterest || 0)
										}),
										comp.debtFreeDate && /* @__PURE__ */ jsxs("span", {
											className: "block",
											children: ["Libre de deuda: ", comp.debtFreeDate]
										})
									]
								})]
							}, s);
						})
					}),
					optimization.allocations && optimization.allocations.length > 0 && /* @__PURE__ */ jsx("div", {
						className: "mt-4 pt-4 border-t border-border-default grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
						children: optimization.allocations.map((a, idx) => /* @__PURE__ */ jsxs("div", {
							className: "rounded-xl bg-surface-100 p-3 border border-border-default flex items-center justify-between",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
								className: "font-semibold text-xs text-text-primary",
								children: a.debtName
							}), /* @__PURE__ */ jsx("span", {
								className: `text-[10px] px-2 py-0.5 rounded-full font-medium ${a.type === "extra" ? "bg-accent-500/10 text-accent-400" : "bg-surface-200 text-text-muted"}`,
								children: a.type === "extra" ? "Mínimo + Abono Extra" : "Solo Cuota Mínima"
							})] }), /* @__PURE__ */ jsx("div", {
								className: "text-right font-extrabold text-sm text-text-primary",
								children: formatCurrency(a.amount)
							})]
						}, idx))
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl border border-border-default bg-surface-50 p-6 space-y-4",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
						className: "font-bold text-base text-text-primary",
						children: "📉 Proyección de Amortización (24 Meses)"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-xs text-text-muted",
						children: "Visualización mes a mes de la reducción de capital e intereses"
					})] }), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-4 text-xs",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx("div", { className: "h-3 w-3 rounded-full bg-danger-500" }), /* @__PURE__ */ jsx("span", {
								className: "text-text-secondary",
								children: "Saldo Deuda"
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx("div", { className: "h-3 w-3 rounded-full bg-accent-400" }), /* @__PURE__ */ jsx("span", {
								className: "text-text-secondary",
								children: "Capital Amortizado"
							})]
						})]
					})]
				}), chartData.length > 0 && debts.length > 0 ? /* @__PURE__ */ jsx("div", {
					className: "h-72 w-full pt-4",
					children: /* @__PURE__ */ jsx(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						children: /* @__PURE__ */ jsxs(AreaChart, {
							data: chartData,
							margin: {
								top: 10,
								right: 10,
								left: 0,
								bottom: 0
							},
							children: [
								/* @__PURE__ */ jsxs("defs", { children: [/* @__PURE__ */ jsxs("linearGradient", {
									id: "colorSaldo",
									x1: "0",
									y1: "0",
									x2: "0",
									y2: "1",
									children: [/* @__PURE__ */ jsx("stop", {
										offset: "5%",
										stopColor: "#ef4444",
										stopOpacity: .4
									}), /* @__PURE__ */ jsx("stop", {
										offset: "95%",
										stopColor: "#ef4444",
										stopOpacity: 0
									})]
								}), /* @__PURE__ */ jsxs("linearGradient", {
									id: "colorCapital",
									x1: "0",
									y1: "0",
									x2: "0",
									y2: "1",
									children: [/* @__PURE__ */ jsx("stop", {
										offset: "5%",
										stopColor: "#10b981",
										stopOpacity: .4
									}), /* @__PURE__ */ jsx("stop", {
										offset: "95%",
										stopColor: "#10b981",
										stopOpacity: 0
									})]
								})] }),
								/* @__PURE__ */ jsx(CartesianGrid, {
									strokeDasharray: "3 3",
									stroke: isLight ? "#e5e5e5" : "#262626"
								}),
								/* @__PURE__ */ jsx(XAxis, {
									dataKey: "name",
									stroke: "#737373",
									fontSize: 11
								}),
								/* @__PURE__ */ jsx(YAxis, {
									stroke: "#737373",
									fontSize: 11,
									tickFormatter: (val) => `$${val}`
								}),
								/* @__PURE__ */ jsx(Tooltip, {
									contentStyle: {
										backgroundColor: isLight ? "#ffffff" : "#171717",
										borderColor: isLight ? "#e5e5e5" : "#262626",
										color: isLight ? "#171717" : "#f5f5f5",
										borderRadius: "12px",
										fontSize: "12px"
									},
									formatter: (val) => [formatCurrency(Number(val)), ""]
								}),
								/* @__PURE__ */ jsx(Area, {
									type: "monotone",
									dataKey: "saldo",
									name: "Saldo Deuda",
									stroke: "#ef4444",
									fillOpacity: 1,
									fill: "url(#colorSaldo)",
									strokeWidth: 2
								}),
								/* @__PURE__ */ jsx(Area, {
									type: "monotone",
									dataKey: "capitalPagado",
									name: "Capital Pagado",
									stroke: "#10b981",
									fillOpacity: 1,
									fill: "url(#colorCapital)",
									strokeWidth: 2
								})
							]
						})
					})
				}) : /* @__PURE__ */ jsx("div", {
					className: "flex h-48 items-center justify-center rounded-xl border border-dashed border-border-default text-xs text-text-muted",
					children: "Registra tus deudas para generar la curva de amortización"
				})]
			}),
			showOnboarding && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-xl rounded-3xl border border-brand-500/30 bg-surface-50 p-6 sm:p-8 shadow-2xl space-y-6",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "text-center space-y-2",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/20 text-2xl",
								children: "🇪🇨"
							}),
							/* @__PURE__ */ jsxs("h3", {
								className: "text-xl sm:text-2xl font-bold text-text-primary",
								children: [
									"¡Bienvenido a FinanzasAP, ",
									/* @__PURE__ */ jsx("span", {
										className: "gradient-text",
										children: userName
									}),
									"!"
								]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-xs sm:text-sm text-text-secondary max-w-md mx-auto",
								children: "Para calcular tu flujo real y plan de optimización de deudas, configuremos tu sueldo y esquema de cobro en Ecuador."
							})
						]
					}), /* @__PURE__ */ jsxs("form", {
						onSubmit: handleSaveOnboarding,
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-semibold text-text-secondary mb-1.5",
								children: "1. ¿Cuánto es tu sueldo bruto mensual? ($ USD)"
							}), /* @__PURE__ */ jsxs("div", {
								className: "relative",
								children: [/* @__PURE__ */ jsx("span", {
									className: "absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base font-bold",
									children: "$"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "1",
									value: onboardingAmount,
									onChange: (e) => setOnboardingAmount(parseFloat(e.target.value) || 0),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 pl-9 pr-4 py-3 text-base font-bold text-text-primary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
									placeholder: "1000.00"
								})]
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "rounded-2xl border border-border-default bg-surface-100/70 p-4 space-y-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-2.5",
										children: [/* @__PURE__ */ jsx("input", {
											type: "checkbox",
											id: "onboardingDeductIess",
											checked: deductIess,
											onChange: (e) => setDeductIess(e.target.checked),
											className: "h-4 w-4 rounded border-border-default text-brand-500 focus:ring-brand-500 cursor-pointer"
										}), /* @__PURE__ */ jsx("label", {
											htmlFor: "onboardingDeductIess",
											className: "text-xs font-semibold text-text-primary cursor-pointer",
											children: "Descontar automáticamente el Aporte al IESS (Ecuador)"
										})]
									}), deductIess && /* @__PURE__ */ jsx("span", {
										className: "text-xs font-bold text-warning-400 bg-warning-500/10 px-2 py-0.5 rounded border border-warning-500/20",
										children: "9.45% de ley"
									})]
								}), deductIess && /* @__PURE__ */ jsxs("div", {
									className: "flex justify-between items-center text-xs pt-2 border-t border-border-default text-text-muted",
									children: [/* @__PURE__ */ jsx("span", { children: "Descuento IESS retenido:" }), /* @__PURE__ */ jsxs("strong", {
										className: "text-warning-400 text-sm",
										children: ["-$", (onboardingAmount * iessPercentage / 100).toFixed(2)]
									})]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx("label", {
									className: "block text-xs font-semibold text-text-secondary",
									children: "2. ¿Cómo recibes tus pagos en el mes?"
								}), /* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => setOnboardingScheme("quincena_fin_mes"),
										className: `rounded-2xl border p-4 text-left transition-all cursor-pointer ${onboardingScheme === "quincena_fin_mes" ? "border-brand-500 bg-brand-500/15 text-brand-400 shadow-md shadow-brand-500/10 ring-1 ring-brand-500" : "border-border-default bg-surface-100 text-text-muted hover:border-border-hover"}`,
										children: [/* @__PURE__ */ jsx("div", {
											className: "text-xs font-bold",
											children: "📅 Quincena y Fin de Mes"
										}), /* @__PURE__ */ jsx("div", {
											className: "mt-1 text-[11px] opacity-80",
											children: "Cobro el 15 y el 30"
										})]
									}), /* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => setOnboardingScheme("monthly"),
										className: `rounded-2xl border p-4 text-left transition-all cursor-pointer ${onboardingScheme === "monthly" ? "border-brand-500 bg-brand-500/15 text-brand-400 shadow-md shadow-brand-500/10 ring-1 ring-brand-500" : "border-border-default bg-surface-100 text-text-muted hover:border-border-hover"}`,
										children: [/* @__PURE__ */ jsx("div", {
											className: "text-xs font-bold",
											children: "💳 Un Solo Pago"
										}), /* @__PURE__ */ jsx("div", {
											className: "mt-1 text-[11px] opacity-80",
											children: "100% a fin de mes"
										})]
									})]
								})]
							}),
							onboardingScheme === "quincena_fin_mes" && /* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-3 rounded-2xl border border-border-default bg-surface-100 p-4",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "block text-[11px] font-medium text-text-secondary",
									children: "Anticipo Quincena (15)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "0",
									value: onboardingQuincena,
									onChange: (e) => {
										const q = parseFloat(e.target.value) || 0;
										setOnboardingQuincena(q);
										const gross = onboardingAmount || 0;
										const iess = deductIess ? gross * (iessPercentage / 100) : 0;
										const net = Math.max(0, gross - iess);
										setOnboardingFinDeMes(Math.round(Math.max(0, net - q) * 100) / 100);
									},
									className: "mt-1 w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
								})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "block text-[11px] font-medium text-text-secondary",
									children: "Saldo Fin de Mes (30)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "0",
									value: onboardingFinDeMes,
									onChange: (e) => setOnboardingFinDeMes(parseFloat(e.target.value) || 0),
									className: "mt-1 w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
								})] })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rounded-2xl bg-accent-500/10 border border-accent-500/30 p-4 flex justify-between items-center",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-medium text-text-secondary block",
									children: "Sueldo Neto Líquido Disponible:"
								}), /* @__PURE__ */ jsx("span", {
									className: "text-[11px] text-text-muted",
									children: "Dinero real que ingresa a tu cuenta bancaria"
								})] }), /* @__PURE__ */ jsx("div", {
									className: "text-xl font-extrabold text-accent-400",
									children: formatCurrency(Math.max(0, onboardingAmount - (deductIess ? onboardingAmount * iessPercentage / 100 : 0)))
								})]
							}),
							onboardingError && /* @__PURE__ */ jsx("div", {
								className: "rounded-xl bg-danger-500/10 border border-danger-500/20 px-4 py-2.5 text-xs text-danger-400",
								children: onboardingError
							}),
							/* @__PURE__ */ jsx("button", {
								type: "submit",
								disabled: savingOnboarding,
								className: "w-full rounded-2xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 hover:shadow-brand-400/30 transition-all disabled:opacity-50 cursor-pointer",
								children: savingOnboarding ? "Guardando configuración..." : "Comenzar a optimizar mis finanzas 🚀"
							})
						]
					})]
				})
			})
		]
	});
}
//#endregion
//#region src/pages/app/dashboard.astro
var dashboard_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Dashboard,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Dashboard = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Dashboard;
	Astro.locals.user;
	return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Dashboard" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "DashboardView", DashboardView, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "@/components/dashboard/DashboardView",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/dashboard.astro", void 0);
var $$file = "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/dashboard.astro";
var $$url = "/app/dashboard";
//#endregion
//#region \0virtual:astro:page:src/pages/app/dashboard@_@astro
var page = () => dashboard_exports;
//#endregion
export { page };
