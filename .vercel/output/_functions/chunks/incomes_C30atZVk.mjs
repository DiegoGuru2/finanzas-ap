import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { D as renderTemplate, S as renderComponent } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { t as $$AppLayout } from "./AppLayout_D5tnGjTt.mjs";
import { t as formatCurrency } from "./utils_DIO8eMIb.mjs";
import { useEffect, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/incomes/IncomesManager.tsx
function IncomesManager() {
	const [incomes, setIncomes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [name, setName] = useState("Sueldo Principal");
	const [amount, setAmount] = useState(1e3);
	const [isSalary, setIsSalary] = useState(true);
	const [incomeType, setIncomeType] = useState("recurrente");
	const [incomeDate, setIncomeDate] = useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [paymentScheme, setPaymentScheme] = useState("quincena_fin_mes");
	const [quincenaAmount, setQuincenaAmount] = useState(450);
	const [finDeMesAmount, setFinDeMesAmount] = useState(455.5);
	const [deductIess, setDeductIess] = useState(true);
	const [iessPercentage, setIessPercentage] = useState(9.45);
	const [submitting, setSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	useEffect(() => {
		const gross = amount || 0;
		const iess = deductIess ? gross * (iessPercentage / 100) : 0;
		const net = Math.max(0, gross - iess);
		if (paymentScheme === "quincena_fin_mes") {
			const q = Math.round(net / 2 * 100) / 100;
			setQuincenaAmount(q);
			setFinDeMesAmount(Math.round((net - q) * 100) / 100);
		} else {
			setQuincenaAmount(0);
			setFinDeMesAmount(net);
		}
	}, [
		amount,
		deductIess,
		iessPercentage,
		paymentScheme
	]);
	const fetchIncomes = async () => {
		try {
			setLoading(true);
			const json = await (await fetch("/api/incomes")).json();
			if (json.data) setIncomes(json.data);
		} catch (err) {
			console.error("Error fetching incomes:", err);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchIncomes();
	}, []);
	const handleSubmit = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		setErrorMessage(null);
		try {
			const res = await fetch("/api/incomes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(incomeType === "unico" ? {
					name,
					amount: Number(amount),
					frequency: "once",
					isSalary: false,
					paymentScheme: "monthly",
					quincenaAmount: 0,
					finDeMesAmount: 0,
					deductIess: false,
					iessPercentage: 0,
					category: "Ingreso Único",
					date: incomeDate
				} : {
					name,
					amount: Number(amount),
					frequency: "monthly",
					isSalary,
					paymentScheme,
					quincenaAmount: Number(quincenaAmount),
					finDeMesAmount: Number(finDeMesAmount),
					deductIess,
					iessPercentage: Number(iessPercentage),
					category: isSalary ? "Sueldo" : "Ingreso Extra"
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Error al guardar ingreso");
			setShowModal(false);
			await fetchIncomes();
		} catch (err) {
			setErrorMessage(err.message || "Error al registrar");
		} finally {
			setSubmitting(false);
		}
	};
	const handleDelete = async (id) => {
		if (!confirm("¿Deseas eliminar este ingreso?")) return;
		try {
			await fetch(`/api/incomes?id=${id}`, { method: "DELETE" });
			await fetchIncomes();
		} catch (err) {
			console.error(err);
		}
	};
	const totalGross = incomes.reduce((sum, i) => sum + i.amount, 0);
	const totalIess = incomes.reduce((sum, i) => sum + (i.iessDeduction || 0), 0);
	const totalNet = incomes.reduce((sum, i) => sum + (i.netAmount || i.amount), 0);
	const totalQuincena = incomes.reduce((sum, i) => sum + (i.quincenaAmount || 0), 0);
	const totalFinDeMes = incomes.reduce((sum, i) => sum + (i.finDeMesAmount || i.netAmount || i.amount), 0);
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "text-2xl font-bold",
					children: "Ingresos y Configuración de Sueldo"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-text-secondary",
					children: "Configura tu sueldo nominal, esquema de pago (Quincena / Fin de Mes) y aporte al IESS."
				})] }), /* @__PURE__ */ jsxs("button", {
					onClick: () => setShowModal(true),
					className: "inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 cursor-pointer",
					children: [/* @__PURE__ */ jsx("svg", {
						className: "h-5 w-5",
						fill: "none",
						stroke: "currentColor",
						viewBox: "0 0 24 24",
						children: /* @__PURE__ */ jsx("path", {
							strokeLinecap: "round",
							strokeLinejoin: "round",
							strokeWidth: "2",
							d: "M12 4v16m8-8H4"
						})
					}), "Registrar Ingreso / Sueldo"]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-border-default bg-surface-50 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-text-muted",
								children: "Sueldo Bruto Total"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-text-primary",
								children: formatCurrency(totalGross)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Nominal registrado"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-warning-400",
								children: "Aporte Personal IESS (9.45%)"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-2 text-2xl font-bold text-warning-400",
								children: ["-", formatCurrency(totalIess)]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Descuento de ley Ecuador"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-accent-400",
								children: "Sueldo Neto Líquido"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-accent-400",
								children: formatCurrency(totalNet)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Disponible en mano"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-brand-400",
								children: "Distribución Mensual"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-2 text-sm font-semibold text-text-primary",
								children: ["Quincena (15): ", /* @__PURE__ */ jsx("strong", {
									className: "text-brand-400",
									children: formatCurrency(totalQuincena)
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-1 text-sm font-semibold text-text-primary",
								children: ["Fin de Mes (30): ", /* @__PURE__ */ jsx("strong", {
									className: "text-brand-400",
									children: formatCurrency(totalFinDeMes)
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl border border-border-default bg-surface-50 overflow-hidden",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "p-5 border-b border-border-default flex items-center justify-between",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "font-semibold text-text-primary",
						children: "Tus Fuentes de Ingreso"
					}), /* @__PURE__ */ jsxs("span", {
						className: "text-xs bg-surface-100 px-3 py-1 rounded-full text-text-secondary",
						children: [incomes.length, " registro(s)"]
					})]
				}), loading ? /* @__PURE__ */ jsx("div", {
					className: "p-8 text-center text-text-muted",
					children: "Cargando ingresos..."
				}) : incomes.length === 0 ? /* @__PURE__ */ jsxs("div", {
					className: "p-12 text-center",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-text-muted",
							children: /* @__PURE__ */ jsx("svg", {
								className: "h-6 w-6",
								fill: "none",
								stroke: "currentColor",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									strokeWidth: "1.5",
									d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								})
							})
						}),
						/* @__PURE__ */ jsx("h4", {
							className: "mt-4 font-semibold text-text-primary",
							children: "No tienes ingresos registrados"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-text-muted",
							children: "Configura tu sueldo para calcular tu flujo disponible."
						}),
						/* @__PURE__ */ jsx("button", {
							onClick: () => setShowModal(true),
							className: "mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white",
							children: "Agregar Sueldo"
						})
					]
				}) : /* @__PURE__ */ jsx("div", {
					className: "divide-y divide-border-default",
					children: incomes.map((inc) => /* @__PURE__ */ jsxs("div", {
						className: "p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-surface-100/50 transition-colors",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "font-semibold text-text-primary",
									children: inc.name
								}),
								inc.isSalary && /* @__PURE__ */ jsx("span", {
									className: "rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-400 border border-brand-500/20",
									children: "Sueldo"
								}),
								inc.frequency === "once" ? /* @__PURE__ */ jsxs("span", {
									className: "rounded-md bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-400 border border-accent-500/20",
									children: ["Ingreso único", inc.date ? ` · ${String(inc.date).slice(0, 10)}` : ""]
								}) : /* @__PURE__ */ jsx("span", {
									className: "rounded-md bg-surface-200 px-2 py-0.5 text-xs text-text-secondary",
									children: inc.paymentScheme === "quincena_fin_mes" ? "Quincena + Fin de Mes" : "Pago Único Fin de Mes"
								})
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-text-muted",
							children: [
								/* @__PURE__ */ jsxs("span", { children: ["Bruto: ", /* @__PURE__ */ jsx("strong", {
									className: "text-text-secondary",
									children: formatCurrency(inc.amount)
								})] }),
								inc.deductIess && /* @__PURE__ */ jsxs("span", {
									className: "text-warning-400",
									children: [
										"IESS (",
										inc.iessPercentage,
										"%): -",
										formatCurrency(inc.iessDeduction)
									]
								}),
								inc.paymentScheme === "quincena_fin_mes" && /* @__PURE__ */ jsxs("span", { children: [
									"Quincena: ",
									/* @__PURE__ */ jsx("strong", {
										className: "text-accent-400",
										children: formatCurrency(inc.quincenaAmount)
									}),
									" | Fin de Mes: ",
									/* @__PURE__ */ jsx("strong", {
										className: "text-accent-400",
										children: formatCurrency(inc.finDeMesAmount)
									})
								] })
							]
						})] }), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between md:justify-end gap-6",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "text-right",
								children: [/* @__PURE__ */ jsx("div", {
									className: "text-lg font-bold text-accent-400",
									children: formatCurrency(inc.netAmount || inc.amount)
								}), /* @__PURE__ */ jsx("div", {
									className: "text-xs text-text-muted",
									children: inc.frequency === "once" ? "Monto único" : "Líquido mensual"
								})]
							}), /* @__PURE__ */ jsx("button", {
								onClick: () => handleDelete(inc.id),
								className: "p-2 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10",
								title: "Eliminar ingreso",
								children: /* @__PURE__ */ jsx("svg", {
									className: "h-5 w-5",
									fill: "none",
									stroke: "currentColor",
									viewBox: "0 0 24 24",
									children: /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										strokeWidth: "1.5",
										d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									})
								})
							})]
						})]
					}, inc.id))
				})]
			}),
			showModal && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-lg rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "text-lg font-bold",
							children: "Configurar Sueldo / Ingreso"
						}), /* @__PURE__ */ jsx("button", {
							onClick: () => setShowModal(false),
							className: "text-text-muted hover:text-text-primary",
							children: "✕"
						})]
					}), /* @__PURE__ */ jsxs("form", {
						onSubmit: handleSubmit,
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => setIncomeType("recurrente"),
									className: `rounded-xl border p-3 text-left transition-all cursor-pointer ${incomeType === "recurrente" ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-border-default bg-surface-100 text-text-muted hover:border-border-hover"}`,
									children: [/* @__PURE__ */ jsx("div", {
										className: "text-xs font-bold",
										children: "Recurrente Mensual"
									}), /* @__PURE__ */ jsx("div", {
										className: "mt-1 text-[11px]",
										children: "Sueldo o ingreso fijo cada mes"
									})]
								}), /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => setIncomeType("unico"),
									className: `rounded-xl border p-3 text-left transition-all cursor-pointer ${incomeType === "unico" ? "border-accent-500 bg-accent-500/10 text-accent-400" : "border-border-default bg-surface-100 text-text-muted hover:border-border-hover"}`,
									children: [/* @__PURE__ */ jsx("div", {
										className: "text-xs font-bold",
										children: "Ingreso Único"
									}), /* @__PURE__ */ jsx("div", {
										className: "mt-1 text-[11px]",
										children: "Décimo, fondos de reserva, bono"
									})]
								})]
							}),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "mb-1 block text-xs font-medium text-text-secondary",
								children: "Nombre o Concepto"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								value: name,
								onChange: (e) => setName(e.target.value),
								required: true,
								className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none",
								placeholder: incomeType === "unico" ? "Ej. Décimo Tercero / Fondos de Reserva" : "Ej. Sueldo Empresa / Trabajo"
							})] }),
							incomeType === "unico" && /* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Fecha en que lo recibes"
								}),
								/* @__PURE__ */ jsx("input", {
									type: "date",
									value: incomeDate,
									onChange: (e) => setIncomeDate(e.target.value),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-1 text-[11px] text-text-muted",
									children: "Se sumará al ingreso disponible de esa quincena en el cronograma."
								})
							] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "mb-1 block text-xs font-medium text-text-secondary",
								children: incomeType === "unico" ? "Monto a Recibir ($ USD)" : "Sueldo Bruto / Nominal ($ USD)"
							}), /* @__PURE__ */ jsx("input", {
								type: "number",
								step: "0.01",
								min: "1",
								value: amount,
								onChange: (e) => setAmount(parseFloat(e.target.value) || 0),
								required: true,
								className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none",
								placeholder: "1000.00"
							})] }),
							incomeType === "recurrente" && /* @__PURE__ */ jsxs(Fragment$1, { children: [
								/* @__PURE__ */ jsxs("div", {
									className: "rounded-xl border border-border-default bg-surface-100 p-3 space-y-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ jsx("input", {
												type: "checkbox",
												id: "deductIess",
												checked: deductIess,
												onChange: (e) => setDeductIess(e.target.checked),
												className: "rounded border-border-default text-brand-500 focus:ring-brand-500"
											}), /* @__PURE__ */ jsx("label", {
												htmlFor: "deductIess",
												className: "text-xs font-medium text-text-primary cursor-pointer",
												children: "Descontar Aporte Personal al IESS (Ecuador)"
											})]
										}), deductIess && /* @__PURE__ */ jsx("span", {
											className: "text-xs font-semibold text-warning-400",
											children: "9.45% de ley"
										})]
									}), deductIess && /* @__PURE__ */ jsxs("div", {
										className: "text-xs text-text-muted flex justify-between pt-1 border-t border-border-default",
										children: [/* @__PURE__ */ jsx("span", { children: "Descuento estimado IESS:" }), /* @__PURE__ */ jsxs("strong", {
											className: "text-warning-400",
											children: ["-$", (amount * iessPercentage / 100).toFixed(2)]
										})]
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-medium text-text-secondary",
										children: "Modalidad de Pago en el Mes"
									}), /* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-2 gap-3",
										children: [/* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => setPaymentScheme("quincena_fin_mes"),
											className: `rounded-xl border p-3 text-left transition-all cursor-pointer ${paymentScheme === "quincena_fin_mes" ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-border-default bg-surface-100 text-text-muted hover:border-border-hover"}`,
											children: [/* @__PURE__ */ jsx("div", {
												className: "text-xs font-bold",
												children: "Quincena y Fin de Mes"
											}), /* @__PURE__ */ jsx("div", {
												className: "mt-1 text-[11px]",
												children: "Pagos el 15 y el 30"
											})]
										}), /* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => setPaymentScheme("monthly"),
											className: `rounded-xl border p-3 text-left transition-all cursor-pointer ${paymentScheme === "monthly" ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-border-default bg-surface-100 text-text-muted hover:border-border-hover"}`,
											children: [/* @__PURE__ */ jsx("div", {
												className: "text-xs font-bold",
												children: "Un Solo Pago"
											}), /* @__PURE__ */ jsx("div", {
												className: "mt-1 text-[11px]",
												children: "Pago total a fin de mes"
											})]
										})]
									})]
								}),
								paymentScheme === "quincena_fin_mes" && /* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3 rounded-xl border border-border-default bg-surface-100 p-3",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-[11px] font-medium text-text-secondary",
										children: "Anticipo Quincena (15)"
									}), /* @__PURE__ */ jsx("input", {
										type: "number",
										step: "0.01",
										min: "0",
										value: quincenaAmount,
										onChange: (e) => {
											const q = parseFloat(e.target.value) || 0;
											setQuincenaAmount(q);
											const gross = amount || 0;
											const iess = deductIess ? gross * (iessPercentage / 100) : 0;
											const net = Math.max(0, gross - iess);
											setFinDeMesAmount(Math.round(Math.max(0, net - q) * 100) / 100);
										},
										className: "mt-1 w-full rounded-lg border border-border-default bg-surface-50 px-2.5 py-1.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
									})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-[11px] font-medium text-text-secondary",
										children: "Saldo Fin de Mes (30)"
									}), /* @__PURE__ */ jsx("input", {
										type: "number",
										step: "0.01",
										min: "0",
										value: finDeMesAmount,
										onChange: (e) => setFinDeMesAmount(parseFloat(e.target.value) || 0),
										className: "mt-1 w-full rounded-lg border border-border-default bg-surface-50 px-2.5 py-1.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
									})] })]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "rounded-xl bg-accent-500/10 border border-accent-500/20 p-3 flex justify-between items-center text-xs",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-text-secondary font-medium",
										children: "Sueldo Neto Líquido Estimado:"
									}), /* @__PURE__ */ jsx("span", {
										className: "text-sm font-bold text-accent-400",
										children: formatCurrency(Math.max(0, amount - (deductIess ? amount * iessPercentage / 100 : 0)))
									})]
								})
							] }),
							errorMessage && /* @__PURE__ */ jsx("div", {
								className: "rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400",
								children: errorMessage
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex justify-end gap-3 pt-2",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setShowModal(false),
									className: "rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100",
									children: "Cancelar"
								}), /* @__PURE__ */ jsx("button", {
									type: "submit",
									disabled: submitting,
									className: "rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50",
									children: submitting ? "Guardando..." : "Guardar Ingreso"
								})]
							})
						]
					})]
				})
			})
		]
	});
}
//#endregion
//#region src/pages/app/incomes.astro
var incomes_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Incomes,
	file: () => $$file,
	url: () => $$url
});
var $$Incomes = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Ingresos y Sueldo" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "IncomesManager", IncomesManager, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "@/components/incomes/IncomesManager",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/incomes.astro", void 0);
var $$file = "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/incomes.astro";
var $$url = "/app/incomes";
//#endregion
//#region \0virtual:astro:page:src/pages/app/incomes@_@astro
var page = () => incomes_exports;
//#endregion
export { page };
