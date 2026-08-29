import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { D as renderTemplate, S as renderComponent } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { t as $$AppLayout } from "./AppLayout_D5tnGjTt.mjs";
import { t as formatCurrency } from "./utils_DIO8eMIb.mjs";
import { useEffect, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/payments/ScheduleConfig.tsx
var isoDay = (v) => v ? String(v).slice(0, 10) : "";
/**
* Panel para configurar el cronograma sin salir de la página de Pagos:
* corte y cuotas de cada deuda, y corte / monto / vigencia de cada gasto.
*/
function ScheduleConfig({ onClose, onSaved }) {
	const [debts, setDebts] = useState([]);
	const [expenses, setExpenses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState(null);
	const [error, setError] = useState(null);
	const [dirty, setDirty] = useState(false);
	useEffect(() => {
		const load = async () => {
			try {
				const [dRes, eRes] = await Promise.all([fetch("/api/debts"), fetch("/api/expenses")]);
				const dJson = await dRes.json();
				const eJson = await eRes.json();
				setDebts((dJson.data || []).filter((d) => d.status !== "paid_off"));
				setExpenses(eJson.data || []);
			} catch {
				setError("No se pudieron cargar los datos");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);
	const updateDebt = (id, patch) => {
		setDebts((prev) => prev.map((d) => d.id === id ? {
			...d,
			...patch
		} : d));
	};
	const updateExpense = (id, patch) => {
		setExpenses((prev) => prev.map((e) => e.id === id ? {
			...e,
			...patch
		} : e));
	};
	const saveDebt = async (debt) => {
		setSavingId(debt.id);
		setError(null);
		try {
			const hasPlan = !!debt.hasInstallmentPlan && (debt.termMonths ?? 0) > 0;
			const minimumPayment = hasPlan ? Math.round(debt.currentBalance / debt.termMonths * 100) / 100 : debt.minimumPayment;
			const res = await fetch("/api/debts", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: debt.id,
					name: debt.name,
					creditor: debt.creditor || "",
					currentBalance: debt.currentBalance,
					originalBalance: debt.originalBalance,
					apr: debt.apr,
					minimumPayment,
					dueDay: debt.dueDay,
					type: debt.type,
					paymentTiming: debt.paymentTiming || "fin_de_mes",
					hasInstallmentPlan: !!debt.hasInstallmentPlan,
					termMonths: hasPlan ? debt.termMonths : null,
					currency: "USD",
					status: "active"
				})
			});
			if (!res.ok) throw new Error((await res.json()).error || "Error al guardar");
			setDirty(true);
		} catch (err) {
			setError(err.message);
		} finally {
			setSavingId(null);
		}
	};
	const saveExpense = async (exp) => {
		setSavingId(exp.id);
		setError(null);
		try {
			const res = await fetch("/api/expenses", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: exp.id,
					name: exp.name,
					amount: exp.amount,
					category: exp.category,
					isEssential: exp.isEssential,
					frequency: exp.frequency || "monthly",
					paymentTiming: exp.paymentTiming || "ambas",
					activeFrom: isoDay(exp.activeFrom) || null,
					activeUntil: isoDay(exp.activeUntil) || null,
					description: exp.description || ""
				})
			});
			if (!res.ok) throw new Error((await res.json()).error || "Error al guardar");
			setDirty(true);
		} catch (err) {
			setError(err.message);
		} finally {
			setSavingId(null);
		}
	};
	const handleClose = () => {
		if (dirty) onSaved();
		onClose();
	};
	const inputCls = "w-full rounded-lg border border-border-default bg-surface-100 px-2.5 py-1.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none";
	return /* @__PURE__ */ jsx("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-5",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
						className: "text-lg font-bold",
						children: "⚙️ Configurar Cronograma"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-xs text-text-muted",
						children: "Ajusta en qué corte cae cada concepto, las cuotas de tus deudas y la vigencia de cada gasto."
					})] }), /* @__PURE__ */ jsx("button", {
						onClick: handleClose,
						className: "text-text-muted hover:text-text-primary cursor-pointer",
						children: "✕"
					})]
				}),
				error && /* @__PURE__ */ jsx("div", {
					className: "rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400",
					children: error
				}),
				loading ? /* @__PURE__ */ jsx("div", {
					className: "py-10 text-center text-sm text-text-muted",
					children: "Cargando..."
				}) : /* @__PURE__ */ jsxs(Fragment$1, { children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h4", {
						className: "mb-2 text-xs font-semibold uppercase tracking-wide text-danger-400",
						children: "Deudas y créditos"
					}), /* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [debts.length === 0 && /* @__PURE__ */ jsx("p", {
							className: "text-xs text-text-muted",
							children: "No tienes deudas activas."
						}), debts.map((d) => /* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-1 gap-2 rounded-xl border border-border-default bg-surface-100/50 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
									className: "text-sm font-medium text-text-primary",
									children: d.name
								}), /* @__PURE__ */ jsxs("div", {
									className: "text-[11px] text-text-muted",
									children: [
										"saldo ",
										formatCurrency(d.currentBalance),
										d.hasInstallmentPlan && d.termMonths ? ` · ${d.termMonths} cuotas de ${formatCurrency(Math.round(d.currentBalance / d.termMonths * 100) / 100)}` : ` · pago ${formatCurrency(d.minimumPayment)}`
									]
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "block text-[10px] text-text-muted mb-0.5",
									children: "Corte"
								}), /* @__PURE__ */ jsxs("select", {
									value: d.paymentTiming || "fin_de_mes",
									onChange: (e) => updateDebt(d.id, { paymentTiming: e.target.value }),
									className: inputCls,
									children: [/* @__PURE__ */ jsx("option", {
										value: "quincena",
										children: "Día 15"
									}), /* @__PURE__ */ jsx("option", {
										value: "fin_de_mes",
										children: "Fin de mes"
									})]
								})] }),
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-1.5 pb-1.5",
									children: [/* @__PURE__ */ jsx("input", {
										type: "checkbox",
										id: `plan-${d.id}`,
										checked: !!d.hasInstallmentPlan,
										onChange: (e) => updateDebt(d.id, { hasInstallmentPlan: e.target.checked }),
										className: "rounded border-border-default text-brand-500"
									}), /* @__PURE__ */ jsx("label", {
										htmlFor: `plan-${d.id}`,
										className: "text-[11px] text-text-secondary cursor-pointer",
										children: "Cuotas"
									})]
								}),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "block text-[10px] text-text-muted mb-0.5",
									children: "# Cuotas"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									min: "1",
									max: "360",
									disabled: !d.hasInstallmentPlan,
									value: d.termMonths || "",
									onChange: (e) => updateDebt(d.id, { termMonths: parseInt(e.target.value) || null }),
									className: `${inputCls} w-20 disabled:opacity-40`
								})] }),
								/* @__PURE__ */ jsx("button", {
									onClick: () => saveDebt(d),
									disabled: savingId === d.id,
									className: "rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 cursor-pointer",
									children: savingId === d.id ? "..." : "Guardar"
								})
							]
						}, d.id))]
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h4", {
						className: "mb-2 text-xs font-semibold uppercase tracking-wide text-warning-400",
						children: "Gastos recurrentes"
					}), /* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [expenses.length === 0 && /* @__PURE__ */ jsx("p", {
							className: "text-xs text-text-muted",
							children: "No tienes gastos registrados."
						}), expenses.map((e) => /* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-2 gap-2 rounded-xl border border-border-default bg-surface-100/50 p-3 sm:grid-cols-[1fr_5rem_auto_auto_auto_auto] sm:items-end",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "col-span-2 sm:col-span-1",
									children: /* @__PURE__ */ jsx("div", {
										className: "text-sm font-medium text-text-primary",
										children: e.name
									})
								}),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "block text-[10px] text-text-muted mb-0.5",
									children: "Monto/mes"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "0",
									value: e.amount,
									onChange: (ev) => updateExpense(e.id, { amount: parseFloat(ev.target.value) || 0 }),
									className: inputCls
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "block text-[10px] text-text-muted mb-0.5",
									children: "Corte"
								}), /* @__PURE__ */ jsxs("select", {
									value: e.paymentTiming || "ambas",
									onChange: (ev) => updateExpense(e.id, { paymentTiming: ev.target.value }),
									className: inputCls,
									children: [
										/* @__PURE__ */ jsx("option", {
											value: "quincena",
											children: "Día 15"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "fin_de_mes",
											children: "Fin de mes"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "ambas",
											children: "Repartido"
										})
									]
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "block text-[10px] text-text-muted mb-0.5",
									children: "Desde"
								}), /* @__PURE__ */ jsx("input", {
									type: "date",
									value: isoDay(e.activeFrom),
									onChange: (ev) => updateExpense(e.id, { activeFrom: ev.target.value || null }),
									className: inputCls
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "block text-[10px] text-text-muted mb-0.5",
									children: "Hasta"
								}), /* @__PURE__ */ jsx("input", {
									type: "date",
									value: isoDay(e.activeUntil),
									onChange: (ev) => updateExpense(e.id, { activeUntil: ev.target.value || null }),
									className: inputCls
								})] }),
								/* @__PURE__ */ jsx("button", {
									onClick: () => saveExpense(e),
									disabled: savingId === e.id,
									className: "rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 cursor-pointer",
									children: savingId === e.id ? "..." : "Guardar"
								})
							]
						}, e.id))]
					})] }),
					/* @__PURE__ */ jsx("div", {
						className: "flex justify-end pt-2",
						children: /* @__PURE__ */ jsx("button", {
							onClick: handleClose,
							className: "rounded-xl bg-surface-100 border border-border-default px-5 py-2 text-xs font-semibold text-text-primary hover:bg-surface-200 cursor-pointer",
							children: "Cerrar y actualizar cronograma"
						})
					})
				] })
			]
		})
	});
}
//#endregion
//#region src/components/payments/PaymentsView.tsx
var MONTH_NAMES = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre"
];
var PAYMENT_TYPE_LABELS = {
	minimum: "Mínimo",
	extra: "Extra a capital",
	full: "Liquidación"
};
var localIso = (d) => {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function PaymentsView() {
	const [schedule, setSchedule] = useState(null);
	const [paid, setPaid] = useState({});
	const [history, setHistory] = useState([]);
	const [months, setMonths] = useState(6);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [reload, setReload] = useState(0);
	const [showConfig, setShowConfig] = useState(false);
	const [payCell, setPayCell] = useState(null);
	const [payAmount, setPayAmount] = useState(0);
	const [payDate, setPayDate] = useState("");
	const [payNotes, setPayNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [modalError, setModalError] = useState(null);
	const [editPayment, setEditPayment] = useState(null);
	const [editAmount, setEditAmount] = useState(0);
	const [editDate, setEditDate] = useState("");
	const [editType, setEditType] = useState("minimum");
	const [editNotes, setEditNotes] = useState("");
	const refresh = () => setReload((r) => r + 1);
	useEffect(() => {
		const fetchSchedule = async () => {
			try {
				setLoading(true);
				setError(null);
				const res = await fetch(`/api/schedule?months=${months}`);
				const json = await res.json();
				if (!res.ok) throw new Error(json.error || "Error al cargar el cronograma");
				setSchedule(json.data.schedule);
				setPaid(json.data.paid || {});
				setHistory(json.data.history || []);
			} catch (err) {
				setError(err.message || "Error al cargar el cronograma");
			} finally {
				setLoading(false);
			}
		};
		fetchSchedule();
	}, [months, reload]);
	const openPayCell = (row, periodKey, periodDate) => {
		const amount = row.cells[periodKey] || 0;
		setPayCell({
			debtId: row.id,
			debtName: row.name,
			amount,
			date: periodDate
		});
		setPayAmount(amount);
		const today = localIso(/* @__PURE__ */ new Date());
		setPayDate(periodDate <= today ? periodDate : today);
		setPayNotes("");
		setModalError(null);
	};
	const handlePayCell = async (e) => {
		e.preventDefault();
		if (!payCell) return;
		setSubmitting(true);
		setModalError(null);
		try {
			const res = await fetch("/api/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					debtId: payCell.debtId,
					amount: Number(payAmount),
					type: "minimum",
					paidAt: payDate,
					notes: payNotes
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Error al registrar el abono");
			setPayCell(null);
			refresh();
		} catch (err) {
			setModalError(err.message);
		} finally {
			setSubmitting(false);
		}
	};
	const openEditPayment = (p) => {
		setEditPayment(p);
		setEditAmount(p.amount);
		setEditDate(String(p.paidAt).slice(0, 10));
		setEditType(p.type);
		setEditNotes(p.notes || "");
		setModalError(null);
	};
	const handleEditPayment = async (e) => {
		e.preventDefault();
		if (!editPayment) return;
		setSubmitting(true);
		setModalError(null);
		try {
			const res = await fetch("/api/payments", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: editPayment.id,
					debtId: editPayment.debtId,
					amount: Number(editAmount),
					type: editType,
					paidAt: editDate,
					notes: editNotes
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Error al actualizar el pago");
			setEditPayment(null);
			refresh();
		} catch (err) {
			setModalError(err.message);
		} finally {
			setSubmitting(false);
		}
	};
	const handleDeletePayment = async (p) => {
		if (!confirm(`¿Eliminar el pago de ${formatCurrency(p.amount)} a "${p.debtName || "deuda"}"? El monto se devolverá al saldo de la deuda.`)) return;
		try {
			const res = await fetch(`/api/payments?id=${p.id}`, { method: "DELETE" });
			if (!res.ok) {
				const json = await res.json();
				alert(json.error || "Error al eliminar el pago");
				return;
			}
			refresh();
		} catch (err) {
			console.error(err);
		}
	};
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "flex h-64 items-center justify-center",
		children: /* @__PURE__ */ jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" })
	});
	if (error) return /* @__PURE__ */ jsx("div", {
		className: "rounded-2xl border border-danger-500/20 bg-danger-500/5 p-6 text-sm text-danger-400",
		children: error
	});
	if (!schedule) return null;
	const { periods, rows, totals, remaining, monthlyIncome, monthlyCommitment } = schedule;
	const debtRows = rows.filter((r) => r.kind === "debt");
	const expenseRows = rows.filter((r) => r.kind === "expense");
	const monthGroups = [];
	for (const p of periods) {
		const label = `${MONTH_NAMES[p.month]} ${p.year}`;
		const last = monthGroups[monthGroups.length - 1];
		if (last && last.label === label) last.span += 1;
		else monthGroups.push({
			label,
			span: 1
		});
	}
	const minRemaining = periods.length ? Math.min(...periods.map((p) => remaining[p.key] ?? 0)) : 0;
	const totalCommitment = monthlyCommitment.debts + monthlyCommitment.expenses;
	const todayIso = localIso(/* @__PURE__ */ new Date());
	const nextKey = periods.find((p) => p.date >= todayIso)?.key;
	const hl = (k) => k === nextKey ? " bg-brand-500/[0.07]" : "";
	const cellPaid = (rowId, periodKey) => paid[rowId]?.[periodKey];
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "text-2xl font-bold",
					children: "Cronograma de Pagos"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-text-secondary",
					children: "Plan quincenal de deudas y gastos: qué pagar el 15, qué pagar a fin de mes y cuánto te queda del sueldo en cada corte."
				})] }), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsx("div", {
						className: "flex items-center gap-1 rounded-xl border border-border-default bg-surface-50 p-1",
						children: [
							3,
							6,
							12
						].map((m) => /* @__PURE__ */ jsxs("button", {
							onClick: () => setMonths(m),
							className: `rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${months === m ? "bg-brand-500/15 text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"}`,
							children: [m, " meses"]
						}, m))
					}), /* @__PURE__ */ jsxs("button", {
						onClick: () => setShowConfig(true),
						className: "inline-flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-50 px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:text-text-primary hover:border-border-hover cursor-pointer",
						children: [/* @__PURE__ */ jsxs("svg", {
							className: "h-4 w-4",
							fill: "none",
							stroke: "currentColor",
							viewBox: "0 0 24 24",
							children: [/* @__PURE__ */ jsx("path", {
								strokeLinecap: "round",
								strokeLinejoin: "round",
								strokeWidth: "1.5",
								d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							}), /* @__PURE__ */ jsx("path", {
								strokeLinecap: "round",
								strokeLinejoin: "round",
								strokeWidth: "1.5",
								d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							})]
						}), "Configurar"]
					})]
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
								children: "Ingreso Quincena (15)"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-text-primary",
								children: formatCurrency(monthlyIncome.quincena)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Anticipo disponible cada 15"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-border-default bg-surface-50 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-text-muted",
								children: "Ingreso Fin de Mes (30)"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-text-primary",
								children: formatCurrency(monthlyIncome.finDeMes)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Saldo de sueldo a fin de mes"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-warning-400",
								children: "Compromiso Mensual"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-warning-400",
								children: formatCurrency(totalCommitment)
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-1 text-xs text-text-muted",
								children: [
									formatCurrency(monthlyCommitment.debts),
									" deudas +",
									" ",
									formatCurrency(monthlyCommitment.expenses),
									" gastos"
								]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: `rounded-2xl border p-5 ${minRemaining < 0 ? "border-danger-500/20 bg-danger-500/5" : "border-accent-500/20 bg-accent-500/5"}`,
						children: [
							/* @__PURE__ */ jsx("span", {
								className: `text-xs font-medium ${minRemaining < 0 ? "text-danger-400" : "text-accent-400"}`,
								children: "Quincena más ajustada"
							}),
							/* @__PURE__ */ jsx("div", {
								className: `mt-2 text-2xl font-bold ${minRemaining < 0 ? "text-danger-400" : "text-accent-400"}`,
								children: formatCurrency(minRemaining)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: minRemaining < 0 ? "Hay cortes donde el plan no alcanza" : "Lo mínimo que te queda en un corte"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl border border-border-default bg-surface-50",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "border-b border-border-default px-5 py-4",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "font-semibold",
						children: "Tabla de Pagos por Quincena"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-xs text-text-muted",
						children: "Las celdas en verde ya tienen un abono registrado en ese corte."
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ jsxs("table", {
						className: "w-full min-w-max text-sm",
						children: [
							/* @__PURE__ */ jsxs("thead", { children: [/* @__PURE__ */ jsxs("tr", {
								className: "border-b border-border-default",
								children: [/* @__PURE__ */ jsx("th", {
									className: "sticky left-0 z-10 bg-surface-50 px-5 py-2 text-left text-xs font-medium text-text-muted",
									children: "Concepto"
								}), monthGroups.map((g) => /* @__PURE__ */ jsx("th", {
									colSpan: g.span,
									className: "border-l border-border-default px-3 py-2 text-center text-xs font-semibold text-text-secondary",
									children: g.label
								}, g.label))]
							}), /* @__PURE__ */ jsxs("tr", {
								className: "border-b border-border-default",
								children: [/* @__PURE__ */ jsx("th", { className: "sticky left-0 z-10 bg-surface-50 px-5 py-2" }), periods.map((p) => /* @__PURE__ */ jsxs("th", {
									className: `px-3 py-2 text-center text-xs font-medium ${p.timing === "quincena" ? "text-brand-400" : "text-accent-400"} border-l border-border-default${hl(p.key)}`,
									children: [p.timing === "quincena" ? "Día 15" : "Fin de mes", p.key === nextKey && /* @__PURE__ */ jsx("div", {
										className: "text-[9px] font-bold uppercase tracking-wide text-brand-400",
										children: "próximo"
									})]
								}, p.key))]
							})] }),
							/* @__PURE__ */ jsxs("tbody", { children: [
								debtRows.length > 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
									colSpan: periods.length + 1,
									className: "sticky left-0 bg-surface-100/50 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-danger-400",
									children: "Deudas y créditos"
								}) }),
								debtRows.map((row) => /* @__PURE__ */ jsxs("tr", {
									className: "border-b border-border-default/50 hover:bg-surface-100/40",
									children: [/* @__PURE__ */ jsxs("td", {
										className: "sticky left-0 z-10 bg-surface-50 px-5 py-2.5",
										children: [/* @__PURE__ */ jsx("div", {
											className: "font-medium text-text-primary",
											children: row.name
										}), /* @__PURE__ */ jsx("div", {
											className: "text-xs text-text-muted",
											children: row.totalInstallments ? `${row.totalInstallments} cuota(s) de ${formatCurrency(row.monthlyAmount)} · saldo ${formatCurrency(row.currentBalance ?? 0)}` : row.remainingInstallments ? `~${row.remainingInstallments} cuota(s) restante(s) · saldo ${formatCurrency(row.currentBalance ?? 0)}` : `saldo ${formatCurrency(row.currentBalance ?? 0)}`
										})]
									}), periods.map((p) => {
										const amount = row.cells[p.key];
										const paidAmount = cellPaid(row.id, p.key);
										const isPayoff = row.payoffPeriodKey === p.key;
										const cuotaNum = row.installmentNumbers?.[p.key];
										const cuotaLabel = cuotaNum && row.totalInstallments ? `${cuotaNum}/${row.totalInstallments}` : null;
										return /* @__PURE__ */ jsx("td", {
											className: `border-l border-border-default/50 px-3 py-2.5 text-center${hl(p.key)}`,
											children: paidAmount !== void 0 ? /* @__PURE__ */ jsxs("span", {
												className: "inline-flex items-center gap-1 rounded-md bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-400",
												children: ["✓ ", formatCurrency(paidAmount)]
											}) : amount ? /* @__PURE__ */ jsxs("button", {
												onClick: () => openPayCell(row, p.key, p.date),
												title: "Registrar este pago",
												className: "group cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-brand-500/10",
												children: [
													/* @__PURE__ */ jsxs("span", {
														className: isPayoff ? "font-semibold text-accent-400" : "text-text-primary",
														children: [formatCurrency(amount), isPayoff && /* @__PURE__ */ jsx("span", {
															className: "ml-1 text-xs",
															children: "🎉"
														})]
													}),
													cuotaLabel && /* @__PURE__ */ jsxs("div", {
														className: "text-[10px] leading-tight text-text-muted",
														children: ["cuota ", cuotaLabel]
													}),
													/* @__PURE__ */ jsx("div", {
														className: "hidden text-[10px] font-medium leading-tight text-brand-400 group-hover:block",
														children: "abonar"
													})
												]
											}) : /* @__PURE__ */ jsx("span", {
												className: "text-text-muted/40",
												children: "—"
											})
										}, p.key);
									})]
								}, row.id)),
								expenseRows.length > 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
									colSpan: periods.length + 1,
									className: "sticky left-0 bg-surface-100/50 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-warning-400",
									children: "Gastos recurrentes"
								}) }),
								expenseRows.map((row) => /* @__PURE__ */ jsxs("tr", {
									className: "border-b border-border-default/50 hover:bg-surface-100/40",
									children: [/* @__PURE__ */ jsxs("td", {
										className: "sticky left-0 z-10 bg-surface-50 px-5 py-2.5",
										children: [/* @__PURE__ */ jsx("div", {
											className: "font-medium text-text-primary",
											children: row.name
										}), /* @__PURE__ */ jsxs("div", {
											className: "text-xs text-text-muted",
											children: [
												formatCurrency(row.monthlyAmount),
												"/mes",
												row.timing === "quincena" ? " · solo el 15" : row.timing === "fin_de_mes" ? " · solo fin de mes" : " · repartido"
											]
										})]
									}), periods.map((p) => {
										const amount = row.cells[p.key];
										return /* @__PURE__ */ jsx("td", {
											className: `border-l border-border-default/50 px-3 py-2.5 text-center${hl(p.key)}`,
											children: amount ? /* @__PURE__ */ jsx("span", {
												className: "text-text-secondary",
												children: formatCurrency(amount)
											}) : /* @__PURE__ */ jsx("span", {
												className: "text-text-muted/40",
												children: "—"
											})
										}, p.key);
									})]
								}, row.id))
							] }),
							/* @__PURE__ */ jsxs("tfoot", { children: [
								/* @__PURE__ */ jsxs("tr", {
									className: "border-t border-border-default bg-surface-100/60",
									children: [/* @__PURE__ */ jsx("td", {
										className: "sticky left-0 z-10 bg-surface-100 px-5 py-2.5 text-xs font-semibold text-text-secondary",
										children: "Total a pagar"
									}), periods.map((p) => /* @__PURE__ */ jsx("td", {
										className: `border-l border-border-default/50 px-3 py-2.5 text-center font-semibold text-warning-400${hl(p.key)}`,
										children: formatCurrency(totals[p.key] ?? 0)
									}, p.key))]
								}),
								/* @__PURE__ */ jsxs("tr", {
									className: "bg-surface-100/60",
									children: [/* @__PURE__ */ jsx("td", {
										className: "sticky left-0 z-10 bg-surface-100 px-5 py-2.5 text-xs font-semibold text-text-secondary",
										children: "Ingreso disponible"
									}), periods.map((p) => /* @__PURE__ */ jsx("td", {
										className: `border-l border-border-default/50 px-3 py-2.5 text-center text-text-secondary${hl(p.key)}`,
										children: formatCurrency(p.incomeAvailable)
									}, p.key))]
								}),
								/* @__PURE__ */ jsxs("tr", {
									className: "border-t border-border-default bg-surface-100",
									children: [/* @__PURE__ */ jsx("td", {
										className: "sticky left-0 z-10 bg-surface-100 px-5 py-3 text-xs font-bold text-text-primary",
										children: "Lo que queda del sueldo"
									}), periods.map((p) => {
										const value = remaining[p.key] ?? 0;
										return /* @__PURE__ */ jsx("td", {
											className: `border-l border-border-default/50 px-3 py-3 text-center font-bold ${value < 0 ? "text-danger-400" : "text-accent-400"}${hl(p.key)}`,
											children: formatCurrency(value)
										}, p.key);
									})]
								})
							] })
						]
					})
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl border border-border-default bg-surface-50",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "border-b border-border-default px-5 py-4",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "font-semibold",
						children: "Historial de Pagos"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-xs text-text-muted",
						children: "Abonos registrados desde la sección de Deudas."
					})]
				}), history.length === 0 ? /* @__PURE__ */ jsxs("div", {
					className: "px-5 py-10 text-center text-sm text-text-muted",
					children: [
						"Aún no has registrado pagos. Regístralos desde",
						" ",
						/* @__PURE__ */ jsx("a", {
							href: "/app/debts",
							className: "text-brand-400 hover:underline",
							children: "Deudas"
						}),
						" ",
						"con el botón \"Abonar\"."
					]
				}) : /* @__PURE__ */ jsx("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ jsxs("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
							className: "border-b border-border-default text-left text-xs text-text-muted",
							children: [
								/* @__PURE__ */ jsx("th", {
									className: "px-5 py-2 font-medium",
									children: "Fecha"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-5 py-2 font-medium",
									children: "Deuda"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-5 py-2 font-medium",
									children: "Tipo"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-5 py-2 text-right font-medium",
									children: "Monto"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-5 py-2 font-medium",
									children: "Notas"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-5 py-2 text-right font-medium",
									children: "Acciones"
								})
							]
						}) }), /* @__PURE__ */ jsx("tbody", { children: history.map((p) => /* @__PURE__ */ jsxs("tr", {
							className: "border-b border-border-default/50 hover:bg-surface-100/40",
							children: [
								/* @__PURE__ */ jsx("td", {
									className: "px-5 py-2.5 text-text-secondary",
									children: String(p.paidAt).slice(0, 10)
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-5 py-2.5 font-medium text-text-primary",
									children: p.debtName || "(deuda eliminada)"
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-5 py-2.5",
									children: /* @__PURE__ */ jsx("span", {
										className: "rounded-md bg-surface-100 px-2 py-0.5 text-xs text-text-secondary",
										children: PAYMENT_TYPE_LABELS[p.type] || p.type
									})
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-5 py-2.5 text-right font-semibold text-accent-400",
									children: formatCurrency(p.amount)
								}),
								/* @__PURE__ */ jsx("td", {
									className: "max-w-48 truncate px-5 py-2.5 text-xs text-text-muted",
									children: p.notes || "—"
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-5 py-2.5 text-right",
									children: /* @__PURE__ */ jsxs("div", {
										className: "inline-flex items-center gap-1",
										children: [/* @__PURE__ */ jsx("button", {
											onClick: () => openEditPayment(p),
											className: "p-1.5 text-text-muted hover:text-brand-400 transition-colors rounded-lg hover:bg-brand-500/10 cursor-pointer",
											title: "Editar pago",
											children: /* @__PURE__ */ jsx("svg", {
												className: "h-4 w-4",
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
										}), /* @__PURE__ */ jsx("button", {
											onClick: () => handleDeletePayment(p),
											className: "p-1.5 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10 cursor-pointer",
											title: "Eliminar pago (devuelve el monto al saldo)",
											children: /* @__PURE__ */ jsx("svg", {
												className: "h-4 w-4",
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
									})
								})
							]
						}, p.id)) })]
					})
				})]
			}),
			showConfig && /* @__PURE__ */ jsx(ScheduleConfig, {
				onClose: () => setShowConfig(false),
				onSaved: refresh
			}),
			payCell && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ jsx("h3", {
								className: "text-lg font-bold",
								children: "Registrar Abono"
							}), /* @__PURE__ */ jsx("button", {
								onClick: () => setPayCell(null),
								className: "text-text-muted hover:text-text-primary cursor-pointer",
								children: "✕"
							})]
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-xs text-text-secondary",
							children: [
								"Pago programado de ",
								/* @__PURE__ */ jsx("strong", {
									className: "text-text-primary",
									children: payCell.debtName
								}),
								" del corte",
								" ",
								/* @__PURE__ */ jsx("strong", {
									className: "text-text-primary",
									children: payCell.date
								})
							]
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: handlePayCell,
							className: "space-y-3",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Monto ($)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "0.01",
									value: payAmount,
									onChange: (e) => setPayAmount(parseFloat(e.target.value) || 0),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Fecha de pago"
								}), /* @__PURE__ */ jsx("input", {
									type: "date",
									value: payDate,
									onChange: (e) => setPayDate(e.target.value),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Notas (opcional)"
								}), /* @__PURE__ */ jsx("input", {
									type: "text",
									value: payNotes,
									onChange: (e) => setPayNotes(e.target.value),
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none",
									placeholder: "Ej. pago cuota de octubre"
								})] }),
								modalError && /* @__PURE__ */ jsx("div", {
									className: "rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400",
									children: modalError
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex justify-end gap-3 pt-1",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => setPayCell(null),
										className: "rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer",
										children: "Cancelar"
									}), /* @__PURE__ */ jsx("button", {
										type: "submit",
										disabled: submitting,
										className: "rounded-xl bg-accent-500 px-5 py-2 text-xs font-semibold text-white hover:bg-accent-400 disabled:opacity-50 cursor-pointer",
										children: submitting ? "Procesando..." : "Confirmar Abono"
									})]
								})
							]
						})
					]
				})
			}),
			editPayment && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ jsx("h3", {
								className: "text-lg font-bold",
								children: "✏️ Editar Pago"
							}), /* @__PURE__ */ jsx("button", {
								onClick: () => setEditPayment(null),
								className: "text-text-muted hover:text-text-primary cursor-pointer",
								children: "✕"
							})]
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-xs text-text-secondary",
							children: [
								"Pago a ",
								/* @__PURE__ */ jsx("strong", {
									className: "text-text-primary",
									children: editPayment.debtName || "deuda"
								}),
								". El saldo de la deuda se ajustará por la diferencia."
							]
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: handleEditPayment,
							className: "space-y-3",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Monto ($)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "0.01",
									value: editAmount,
									onChange: (e) => setEditAmount(parseFloat(e.target.value) || 0),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
								})] }),
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "mb-1 block text-xs font-medium text-text-secondary",
										children: "Fecha"
									}), /* @__PURE__ */ jsx("input", {
										type: "date",
										value: editDate,
										onChange: (e) => setEditDate(e.target.value),
										required: true,
										className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
									})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "mb-1 block text-xs font-medium text-text-secondary",
										children: "Tipo"
									}), /* @__PURE__ */ jsxs("select", {
										value: editType,
										onChange: (e) => setEditType(e.target.value),
										className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none",
										children: [
											/* @__PURE__ */ jsx("option", {
												value: "minimum",
												children: "Mínimo"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "extra",
												children: "Extra a capital"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "full",
												children: "Liquidación"
											})
										]
									})] })]
								}),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Notas"
								}), /* @__PURE__ */ jsx("input", {
									type: "text",
									value: editNotes,
									onChange: (e) => setEditNotes(e.target.value),
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
								})] }),
								modalError && /* @__PURE__ */ jsx("div", {
									className: "rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400",
									children: modalError
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex justify-end gap-3 pt-1",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => setEditPayment(null),
										className: "rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer",
										children: "Cancelar"
									}), /* @__PURE__ */ jsx("button", {
										type: "submit",
										disabled: submitting,
										className: "rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50 cursor-pointer",
										children: submitting ? "Guardando..." : "Actualizar Pago 💾"
									})]
								})
							]
						})
					]
				})
			})
		]
	});
}
//#endregion
//#region src/pages/app/payments.astro
var payments_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Payments,
	file: () => $$file,
	url: () => $$url
});
var $$Payments = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Cronograma de Pagos" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PaymentsView", PaymentsView, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "@/components/payments/PaymentsView",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/payments.astro", void 0);
var $$file = "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/payments.astro";
var $$url = "/app/payments";
//#endregion
//#region \0virtual:astro:page:src/pages/app/payments@_@astro
var page = () => payments_exports;
//#endregion
export { page };
