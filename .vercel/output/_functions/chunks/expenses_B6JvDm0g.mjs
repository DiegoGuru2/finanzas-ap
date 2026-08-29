import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { D as renderTemplate, S as renderComponent } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { t as $$AppLayout } from "./AppLayout_D5tnGjTt.mjs";
import { t as formatCurrency } from "./utils_DIO8eMIb.mjs";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/expenses/ExpensesManager.tsx
var isoDay = (v) => v ? String(v).slice(0, 10) : "";
function ExpensesManager() {
	const [expenses, setExpenses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [name, setName] = useState("");
	const [amount, setAmount] = useState(150);
	const [category, setCategory] = useState("housing");
	const [isEssential, setIsEssential] = useState(true);
	const [paymentTiming, setPaymentTiming] = useState("ambas");
	const [activeFrom, setActiveFrom] = useState("");
	const [activeUntil, setActiveUntil] = useState("");
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	const handleOpenCreateModal = () => {
		setEditingId(null);
		setName("");
		setAmount(150);
		setCategory("housing");
		setIsEssential(true);
		setPaymentTiming("ambas");
		setActiveFrom("");
		setActiveUntil("");
		setDescription("");
		setErrorMessage(null);
		setShowModal(true);
	};
	const handleOpenEditModal = (exp) => {
		setEditingId(exp.id);
		setName(exp.name);
		setAmount(exp.amount);
		setCategory(exp.category);
		setIsEssential(exp.isEssential);
		setPaymentTiming(exp.paymentTiming || "ambas");
		setActiveFrom(isoDay(exp.activeFrom));
		setActiveUntil(isoDay(exp.activeUntil));
		setDescription(exp.description || "");
		setErrorMessage(null);
		setShowModal(true);
	};
	const fetchExpenses = async () => {
		try {
			setLoading(true);
			const json = await (await fetch("/api/expenses")).json();
			if (json.data) setExpenses(json.data);
		} catch (err) {
			console.error("Error fetching expenses:", err);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchExpenses();
	}, []);
	const handleSubmit = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		setErrorMessage(null);
		try {
			const payload = {
				name,
				amount: Number(amount),
				category,
				isEssential,
				frequency: "monthly",
				paymentTiming,
				activeFrom: activeFrom || null,
				activeUntil: activeUntil || null,
				description
			};
			if (editingId) payload.id = editingId;
			const res = await fetch("/api/expenses", {
				method: editingId ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Error al guardar gasto");
			setShowModal(false);
			setEditingId(null);
			await fetchExpenses();
		} catch (err) {
			setErrorMessage(err.message || "Error al registrar");
		} finally {
			setSubmitting(false);
		}
	};
	const handleDelete = async (id) => {
		if (!confirm("¿Deseas eliminar este gasto?")) return;
		try {
			await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
			await fetchExpenses();
		} catch (err) {
			console.error(err);
		}
	};
	const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
	const essentialExpenses = expenses.filter((e) => e.isEssential).reduce((sum, e) => sum + e.amount, 0);
	const nonEssentialExpenses = expenses.filter((e) => !e.isEssential).reduce((sum, e) => sum + e.amount, 0);
	const categoryLabels = {
		housing: "🏠 Vivienda / Arriendo",
		food: "🛒 Alimentación / Supermercado",
		transport: "🚗 Transporte / Gasolina",
		utilities: "💡 Servicios Básicos / Luz / Agua / Internet",
		health: "🏥 Salud y Medicina",
		education: "📚 Educación",
		entertainment: "🎬 Entretenimiento / Salidas",
		insurance: "🛡️ Seguros",
		savings: "💰 Ahorro",
		other: "📦 Otros Gastos"
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "text-2xl font-bold",
					children: "Gastos Mensuales Recurrentes"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-text-secondary",
					children: "Registra tus gastos fijos y variables para calcular con precisión tu excedente para deudas."
				})] }), /* @__PURE__ */ jsxs("button", {
					onClick: handleOpenCreateModal,
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
					}), "Nuevo Gasto Recurrente"]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-1 gap-4 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-border-default bg-surface-50 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-text-muted",
								children: "Total Gastos Mensuales"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-text-primary",
								children: formatCurrency(totalExpenses)
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-1 text-xs text-text-muted",
								children: [expenses.length, " categorías registradas"]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-brand-400",
								children: "Gastos Esenciales (Fijos)"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-brand-400",
								children: formatCurrency(essentialExpenses)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Vivienda, comida, servicios"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-warning-400",
								children: "Gastos Prescindibles"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-warning-400",
								children: formatCurrency(nonEssentialExpenses)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Potencial de ahorro para deudas"
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
						children: "Desglose de Gastos"
					}), /* @__PURE__ */ jsxs("span", {
						className: "text-xs text-text-muted",
						children: [expenses.length, " registro(s)"]
					})]
				}), loading ? /* @__PURE__ */ jsx("div", {
					className: "p-8 text-center text-text-muted",
					children: "Cargando gastos..."
				}) : expenses.length === 0 ? /* @__PURE__ */ jsxs("div", {
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
									d: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
								})
							})
						}),
						/* @__PURE__ */ jsx("h4", {
							className: "mt-4 font-semibold text-text-primary",
							children: "No tienes gastos registrados"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-text-muted",
							children: "Registra tu arriendo, comida y servicios para que el motor calcule tu disponible real."
						}),
						/* @__PURE__ */ jsx("button", {
							onClick: handleOpenCreateModal,
							className: "mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white",
							children: "Registrar Primer Gasto"
						})
					]
				}) : /* @__PURE__ */ jsx("div", {
					className: "divide-y divide-border-default",
					children: expenses.map((exp) => /* @__PURE__ */ jsxs("div", {
						className: "p-5 flex items-center justify-between hover:bg-surface-100/50 transition-colors",
						children: [/* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "font-semibold text-text-primary",
										children: exp.name
									}),
									/* @__PURE__ */ jsx("span", {
										className: "text-xs bg-surface-200 px-2 py-0.5 rounded text-text-secondary",
										children: categoryLabels[exp.category] || exp.category
									}),
									exp.isEssential ? /* @__PURE__ */ jsx("span", {
										className: "text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded font-medium",
										children: "Esencial"
									}) : /* @__PURE__ */ jsx("span", {
										className: "text-xs bg-warning-500/10 text-warning-400 border border-warning-500/20 px-2 py-0.5 rounded font-medium",
										children: "Flexible"
									}),
									/* @__PURE__ */ jsx("span", {
										className: "text-xs bg-surface-200 px-2 py-0.5 rounded text-text-secondary",
										children: exp.paymentTiming === "quincena" ? "Paga el 15" : exp.paymentTiming === "fin_de_mes" ? "Paga a fin de mes" : "Repartido 15/30"
									})
								]
							}),
							(exp.activeFrom || exp.activeUntil) && /* @__PURE__ */ jsxs("p", {
								className: "text-xs text-warning-400 mt-1",
								children: [
									"Vigente ",
									exp.activeFrom ? `desde ${isoDay(exp.activeFrom)}` : "",
									exp.activeFrom && exp.activeUntil ? " " : "",
									exp.activeUntil ? `hasta ${isoDay(exp.activeUntil)}` : ""
								]
							}),
							exp.description && /* @__PURE__ */ jsx("p", {
								className: "text-xs text-text-muted mt-1",
								children: exp.description
							})
						] }), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-5",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "text-right",
									children: [/* @__PURE__ */ jsx("div", {
										className: "text-lg font-bold text-text-primary",
										children: formatCurrency(exp.amount)
									}), /* @__PURE__ */ jsx("div", {
										className: "text-xs text-text-muted",
										children: "al mes"
									})]
								}),
								/* @__PURE__ */ jsx("button", {
									onClick: () => handleOpenEditModal(exp),
									className: "p-2 text-text-muted hover:text-brand-400 transition-colors rounded-lg hover:bg-brand-500/10 cursor-pointer",
									title: "Editar gasto",
									children: /* @__PURE__ */ jsx("svg", {
										className: "h-5 w-5",
										fill: "none",
										stroke: "currentColor",
										viewBox: "0 0 24 24",
										children: /* @__PURE__ */ jsx("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											strokeWidth: "1.5",
											d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										})
									})
								}),
								/* @__PURE__ */ jsx("button", {
									onClick: () => handleDelete(exp.id),
									className: "p-2 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10",
									title: "Eliminar gasto",
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
								})
							]
						})]
					}, exp.id))
				})]
			}),
			showModal && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-md rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "text-lg font-bold",
							children: editingId ? "✏️ Editar Gasto" : "Registrar Gasto Recurrente"
						}), /* @__PURE__ */ jsx("button", {
							onClick: () => setShowModal(false),
							className: "text-text-muted hover:text-text-primary",
							children: "✕"
						})]
					}), /* @__PURE__ */ jsxs("form", {
						onSubmit: handleSubmit,
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "mb-1 block text-xs font-medium text-text-secondary",
								children: "Concepto del Gasto"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								value: name,
								onChange: (e) => setName(e.target.value),
								required: true,
								className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none",
								placeholder: "Ej. Arriendo Departamento / Supermercado"
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Monto Mensual ($)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "1",
									value: amount,
									onChange: (e) => setAmount(parseFloat(e.target.value) || 0),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
								})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Categoría"
								}), /* @__PURE__ */ jsxs("select", {
									value: category,
									onChange: (e) => setCategory(e.target.value),
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none",
									children: [
										/* @__PURE__ */ jsx("option", {
											value: "housing",
											children: "Vivienda / Arriendo"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "food",
											children: "Alimentación"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "transport",
											children: "Transporte / Combustible"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "utilities",
											children: "Servicios Básicos / Internet"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "health",
											children: "Salud"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "education",
											children: "Educación"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "entertainment",
											children: "Entretenimiento"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "insurance",
											children: "Seguros"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "other",
											children: "Otro"
										})
									]
								})] })]
							}),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "mb-1 block text-xs font-medium text-text-secondary",
								children: "¿En qué corte lo pagas?"
							}), /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-3 gap-2",
								children: [
									{
										value: "quincena",
										label: "Quincena (15)"
									},
									{
										value: "fin_de_mes",
										label: "Fin de Mes (30)"
									},
									{
										value: "ambas",
										label: "Repartido 50/50"
									}
								].map((opt) => /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setPaymentTiming(opt.value),
									className: `rounded-xl border p-2 text-xs font-medium cursor-pointer ${paymentTiming === opt.value ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-border-default bg-surface-100 text-text-muted"}`,
									children: opt.label
								}, opt.value))
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Vigencia en el cronograma (opcional)"
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
										className: "block text-[11px] text-text-muted mb-1",
										children: "Desde"
									}), /* @__PURE__ */ jsx("input", {
										type: "date",
										value: activeFrom,
										onChange: (e) => setActiveFrom(e.target.value),
										className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
									})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
										className: "block text-[11px] text-text-muted mb-1",
										children: "Hasta"
									}), /* @__PURE__ */ jsx("input", {
										type: "date",
										value: activeUntil,
										onChange: (e) => setActiveUntil(e.target.value),
										className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
									})] })]
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-1 text-[11px] text-text-muted",
									children: "Ej. un gasto que termina en diciembre o empieza el próximo mes. Vacío = siempre."
								})
							] }),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2 rounded-xl border border-border-default bg-surface-100 p-3",
								children: [/* @__PURE__ */ jsx("input", {
									type: "checkbox",
									id: "isEssential",
									checked: isEssential,
									onChange: (e) => setIsEssential(e.target.checked),
									className: "rounded border-border-default text-brand-500 focus:ring-brand-500"
								}), /* @__PURE__ */ jsx("label", {
									htmlFor: "isEssential",
									className: "text-xs font-medium text-text-primary cursor-pointer",
									children: "Este es un gasto esencial e imprescindible"
								})]
							}),
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
									children: submitting ? "Guardando..." : editingId ? "Actualizar Gasto 💾" : "Guardar Gasto"
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
//#region src/pages/app/expenses.astro
var expenses_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Expenses,
	file: () => $$file,
	url: () => $$url
});
var $$Expenses = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Gastos Recurrentes" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "ExpensesManager", ExpensesManager, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "@/components/expenses/ExpensesManager",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/expenses.astro", void 0);
var $$file = "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/expenses.astro";
var $$url = "/app/expenses";
//#endregion
//#region \0virtual:astro:page:src/pages/app/expenses@_@astro
var page = () => expenses_exports;
//#endregion
export { page };
