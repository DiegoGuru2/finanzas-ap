import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { D as renderTemplate, S as renderComponent } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { t as $$AppLayout } from "./AppLayout_D5tnGjTt.mjs";
import { t as formatCurrency } from "./utils_DIO8eMIb.mjs";
import { useEffect, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/debts/DebtsManager.tsx
function DebtsManager() {
	const [debts, setDebts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [showPaymentModal, setShowPaymentModal] = useState(false);
	const [selectedDebt, setSelectedDebt] = useState(null);
	const [editingDebtId, setEditingDebtId] = useState(null);
	const [name, setName] = useState("");
	const [creditor, setCreditor] = useState("Banco Pichincha");
	const [currentBalance, setCurrentBalance] = useState(1200);
	const [originalBalance, setOriginalBalance] = useState(1500);
	const [apr, setApr] = useState(24.5);
	const [minimumPayment, setMinimumPayment] = useState(65);
	const [dueDay, setDueDay] = useState(15);
	const [type, setType] = useState("credit_card");
	const [paymentTiming, setPaymentTiming] = useState("quincena");
	const [hasInstallmentPlan, setHasInstallmentPlan] = useState(false);
	const [termMonths, setTermMonths] = useState(12);
	const [submitting, setSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	const [paymentAmount, setPaymentAmount] = useState(65);
	const [paymentType, setPaymentType] = useState("minimum");
	const [paymentDate, setPaymentDate] = useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [paymentNotes, setPaymentNotes] = useState("");
	const fetchDebts = async () => {
		try {
			setLoading(true);
			const json = await (await fetch("/api/debts")).json();
			if (json.data) setDebts(json.data);
		} catch (err) {
			console.error("Error fetching debts:", err);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchDebts();
	}, []);
	const handleOpenCreateModal = () => {
		setEditingDebtId(null);
		setName("");
		setCreditor("Banco Pichincha");
		setCurrentBalance(1e3);
		setOriginalBalance(1200);
		setApr(24.5);
		setMinimumPayment(50);
		setDueDay(15);
		setType("credit_card");
		setPaymentTiming("quincena");
		setHasInstallmentPlan(false);
		setTermMonths(12);
		setErrorMessage(null);
		setShowModal(true);
	};
	const handleOpenEditModal = (debt) => {
		setEditingDebtId(debt.id);
		setName(debt.name);
		setCreditor(debt.creditor || "Banco Pichincha");
		setCurrentBalance(debt.currentBalance);
		setOriginalBalance(debt.originalBalance);
		setApr(debt.apr);
		setMinimumPayment(debt.minimumPayment);
		setDueDay(debt.dueDay || 15);
		setType(debt.type || "credit_card");
		setPaymentTiming(debt.paymentTiming || "quincena");
		setHasInstallmentPlan(!!debt.hasInstallmentPlan);
		setTermMonths(debt.termMonths || 12);
		setErrorMessage(null);
		setShowModal(true);
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		setErrorMessage(null);
		try {
			const isEditing = !!editingDebtId;
			const url = "/api/debts";
			const method = isEditing ? "PUT" : "POST";
			const installmentAmount = hasInstallmentPlan && termMonths > 0 ? Math.round(Number(currentBalance) / termMonths * 100) / 100 : null;
			const payload = {
				name,
				creditor,
				currentBalance: Number(currentBalance),
				originalBalance: Number(originalBalance || currentBalance),
				apr: Number(apr),
				minimumPayment: installmentAmount ?? Number(minimumPayment),
				dueDay: Number(dueDay),
				type,
				paymentTiming,
				hasInstallmentPlan,
				termMonths: hasInstallmentPlan ? Number(termMonths) : null,
				currency: "USD",
				status: "active"
			};
			if (isEditing) payload.id = editingDebtId;
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Error al guardar deuda");
			setShowModal(false);
			setEditingDebtId(null);
			setName("");
			await fetchDebts();
		} catch (err) {
			setErrorMessage(err.message || "Error al procesar");
		} finally {
			setSubmitting(false);
		}
	};
	const handleRecordPayment = async (e) => {
		e.preventDefault();
		if (!selectedDebt) return;
		setSubmitting(true);
		try {
			const res = await fetch("/api/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					debtId: selectedDebt.id,
					amount: Number(paymentAmount),
					type: paymentType,
					paidAt: paymentDate,
					notes: paymentNotes
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error || "Error al abonar");
			setShowPaymentModal(false);
			setSelectedDebt(null);
			await fetchDebts();
		} catch (err) {
			alert(err.message || "Error al procesar pago");
		} finally {
			setSubmitting(false);
		}
	};
	const handleDelete = async (id, debtName) => {
		if (!confirm(`¿Estás seguro de que deseas eliminar la deuda "${debtName}"? Esta acción no se puede deshacer.`)) return;
		try {
			const res = await fetch(`/api/debts?id=${id}`, { method: "DELETE" });
			if (!res.ok) {
				const json = await res.json();
				alert(json.error || "Error al eliminar deuda");
				return;
			}
			await fetchDebts();
		} catch (err) {
			console.error(err);
		}
	};
	const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
	const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
	const avgApr = debts.length > 0 ? debts.reduce((sum, d) => sum + d.apr, 0) / debts.length : 0;
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "text-2xl font-bold",
					children: "Gestión y Configuración de Deudas"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-text-secondary",
					children: "Administra, edita o elimina tus tarjetas, préstamos quirografarios del BIESS y créditos bancarios."
				})] }), /* @__PURE__ */ jsxs("button", {
					onClick: handleOpenCreateModal,
					className: "inline-flex items-center gap-2 rounded-xl bg-danger-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-danger-500/25 transition-all hover:bg-danger-400 cursor-pointer",
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
					}), "Nueva Deuda / Crédito"]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-1 gap-4 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-danger-500/20 bg-danger-500/5 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-danger-400",
								children: "Saldo Total Adeudado"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-danger-400",
								children: formatCurrency(totalDebt)
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-1 text-xs text-text-muted",
								children: [debts.length, " obligación(es) activa(s)"]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-warning-400",
								children: "Compromiso Mensual Mínimo"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 text-2xl font-bold text-warning-400",
								children: formatCurrency(totalMin)
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Total de cuotas / mínimos al mes"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-border-default bg-surface-50 p-5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-medium text-text-muted",
								children: "Tasa APR Promedio"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-2 text-2xl font-bold text-text-primary",
								children: [avgApr.toFixed(1), "%"]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-1 text-xs text-text-muted",
								children: "Costo anual financiero"
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
						children: "Detalle de Tus Deudas"
					}), /* @__PURE__ */ jsx("span", {
						className: "text-xs text-text-muted",
						children: "Ordenadas por saldo"
					})]
				}), loading ? /* @__PURE__ */ jsx("div", {
					className: "p-8 text-center text-text-muted",
					children: "Cargando deudas..."
				}) : debts.length === 0 ? /* @__PURE__ */ jsxs("div", {
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
									d: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
								})
							})
						}),
						/* @__PURE__ */ jsx("h4", {
							className: "mt-4 font-semibold text-text-primary",
							children: "No tienes deudas registradas"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-text-muted",
							children: "¡Excelente! O registra tus tarjetas y préstamos para calcular tu plan de amortización."
						}),
						/* @__PURE__ */ jsx("button", {
							onClick: handleOpenCreateModal,
							className: "mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white",
							children: "Registrar Deuda"
						})
					]
				}) : /* @__PURE__ */ jsx("div", {
					className: "divide-y divide-border-default",
					children: debts.map((debt) => {
						const paidPercent = debt.originalBalance > 0 ? Math.min(100, Math.max(0, Math.round((debt.originalBalance - debt.currentBalance) / debt.originalBalance * 100))) : 0;
						return /* @__PURE__ */ jsxs("div", {
							className: "p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-surface-100/50 transition-colors",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "space-y-1.5 flex-1",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-3",
										children: [
											/* @__PURE__ */ jsx("span", {
												className: "font-semibold text-text-primary text-base",
												children: debt.name
											}),
											debt.creditor && /* @__PURE__ */ jsx("span", {
												className: "text-xs bg-surface-200 px-2 py-0.5 rounded text-text-secondary",
												children: debt.creditor
											}),
											/* @__PURE__ */ jsxs("span", {
												className: "text-xs bg-danger-500/10 text-danger-400 border border-danger-500/20 px-2 py-0.5 rounded font-medium",
												children: [debt.apr, "% APR"]
											}),
											/* @__PURE__ */ jsxs("span", {
												className: "text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded font-medium",
												children: ["Paga en: ", debt.paymentTiming === "quincena" ? "Quincena (15)" : "Fin de Mes (30)"]
											}),
											debt.hasInstallmentPlan && debt.termMonths ? /* @__PURE__ */ jsxs("span", {
												className: "text-xs bg-accent-500/10 text-accent-400 border border-accent-500/20 px-2 py-0.5 rounded font-medium",
												children: [
													debt.termMonths,
													" cuotas de ",
													formatCurrency(debt.minimumPayment)
												]
											}) : null
										]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-4 text-xs text-text-muted pt-1",
										children: [
											/* @__PURE__ */ jsxs("span", { children: ["Día de pago: ", /* @__PURE__ */ jsxs("strong", { children: ["Día ", debt.dueDay] })] }),
											/* @__PURE__ */ jsxs("span", { children: ["Mínimo requerido: ", /* @__PURE__ */ jsx("strong", {
												className: "text-warning-400",
												children: formatCurrency(debt.minimumPayment)
											})] }),
											/* @__PURE__ */ jsxs("span", { children: ["Progreso pago: ", /* @__PURE__ */ jsxs("strong", { children: [paidPercent, "%"] })] })
										]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "w-full bg-surface-200 h-1.5 rounded-full overflow-hidden mt-2",
										children: /* @__PURE__ */ jsx("div", {
											className: "bg-accent-400 h-full rounded-full transition-all duration-500",
											style: { width: `${paidPercent}%` }
										})
									})
								]
							}), /* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between lg:justify-end gap-5",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "text-right",
									children: [/* @__PURE__ */ jsx("div", {
										className: "text-xl font-extrabold text-danger-400",
										children: formatCurrency(debt.currentBalance)
									}), /* @__PURE__ */ jsxs("div", {
										className: "text-xs text-text-muted",
										children: ["de ", formatCurrency(debt.originalBalance)]
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ jsx("button", {
											onClick: () => {
												setSelectedDebt(debt);
												setPaymentAmount(debt.minimumPayment);
												setShowPaymentModal(true);
											},
											className: "rounded-xl bg-accent-500/10 border border-accent-500/20 px-3 py-2 text-xs font-semibold text-accent-400 hover:bg-accent-500/20 transition-all cursor-pointer",
											children: "Abonar"
										}),
										/* @__PURE__ */ jsx("button", {
											onClick: () => handleOpenEditModal(debt),
											className: "p-2 text-text-muted hover:text-brand-400 transition-colors rounded-lg hover:bg-brand-500/10 cursor-pointer",
											title: "Modificar deuda",
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
											onClick: () => handleDelete(debt.id, debt.name),
											className: "p-2 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10 cursor-pointer",
											title: "Eliminar deuda",
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
							})]
						}, debt.id);
					})
				})]
			}),
			showModal && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-lg rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "text-lg font-bold",
							children: editingDebtId ? "✏️ Modificar Deuda o Crédito" : "➕ Registrar Deuda o Crédito"
						}), /* @__PURE__ */ jsx("button", {
							onClick: () => setShowModal(false),
							className: "text-text-muted hover:text-text-primary cursor-pointer",
							children: "✕"
						})]
					}), /* @__PURE__ */ jsxs("form", {
						onSubmit: handleSubmit,
						className: "space-y-3",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "mb-1 block text-xs font-medium text-text-secondary",
								children: "Nombre de la Deuda"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								value: name,
								onChange: (e) => setName(e.target.value),
								required: true,
								className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none",
								placeholder: "Ej. Visa Signature Banco Pichincha / Préstamo BIESS"
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Acreedor / Institución"
								}), /* @__PURE__ */ jsx("input", {
									type: "text",
									value: creditor,
									onChange: (e) => setCreditor(e.target.value),
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none",
									placeholder: "Banco Pichincha / BIESS / Diners"
								})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Tipo de Obligación"
								}), /* @__PURE__ */ jsxs("select", {
									value: type,
									onChange: (e) => setType(e.target.value),
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none",
									children: [
										/* @__PURE__ */ jsx("option", {
											value: "credit_card",
											children: "Tarjeta de Crédito"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "biess_quirografario",
											children: "BIESS Quirografario"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "biess_hipotecario",
											children: "BIESS Hipotecario"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "personal_loan",
											children: "Préstamo Personal / Bancario"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "auto_loan",
											children: "Crédito Automotriz"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "other",
											children: "Otro"
										})
									]
								})] })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Saldo Actual ($)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "0",
									value: currentBalance,
									onChange: (e) => setCurrentBalance(parseFloat(e.target.value) || 0),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
								})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Monto Original ($)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "0",
									value: originalBalance,
									onChange: (e) => setOriginalBalance(parseFloat(e.target.value) || 0),
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
								})] })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-3 gap-3",
								children: [
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "mb-1 block text-xs font-medium text-text-secondary",
										children: "Tasa APR (%)"
									}), /* @__PURE__ */ jsx("input", {
										type: "number",
										step: "0.1",
										min: "0",
										max: "100",
										value: apr,
										onChange: (e) => setApr(parseFloat(e.target.value) || 0),
										required: true,
										className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
									})] }),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "mb-1 block text-xs font-medium text-text-secondary",
										children: hasInstallmentPlan ? "Cuota Mensual ($)" : "Pago Mínimo ($)"
									}), /* @__PURE__ */ jsx("input", {
										type: "number",
										step: "0.01",
										min: "0",
										value: hasInstallmentPlan && termMonths > 0 ? Math.round(currentBalance / termMonths * 100) / 100 : minimumPayment,
										onChange: (e) => setMinimumPayment(parseFloat(e.target.value) || 0),
										required: true,
										disabled: hasInstallmentPlan,
										className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none disabled:opacity-60"
									})] }),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "mb-1 block text-xs font-medium text-text-secondary",
										children: "Día de Corte/Pago"
									}), /* @__PURE__ */ jsx("input", {
										type: "number",
										min: "1",
										max: "31",
										value: dueDay,
										onChange: (e) => setDueDay(parseInt(e.target.value) || 1),
										required: true,
										className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
									})] })
								]
							}),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "mb-1 block text-xs font-medium text-text-secondary",
								children: "Momento de Pago Habitual"
							}), /* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setPaymentTiming("quincena"),
									className: `rounded-xl border p-2 text-xs font-medium cursor-pointer ${paymentTiming === "quincena" ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-border-default bg-surface-100 text-text-muted"}`,
									children: "Pagar con la Quincena (15)"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setPaymentTiming("fin_de_mes"),
									className: `rounded-xl border p-2 text-xs font-medium cursor-pointer ${paymentTiming === "fin_de_mes" ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-border-default bg-surface-100 text-text-muted"}`,
									children: "Pagar a Fin de Mes (30)"
								})]
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "rounded-xl border border-border-default bg-surface-100 p-3 space-y-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ jsx("input", {
										type: "checkbox",
										id: "hasInstallmentPlan",
										checked: hasInstallmentPlan,
										onChange: (e) => setHasInstallmentPlan(e.target.checked),
										className: "rounded border-border-default text-brand-500 focus:ring-brand-500"
									}), /* @__PURE__ */ jsx("label", {
										htmlFor: "hasInstallmentPlan",
										className: "text-xs font-medium text-text-primary cursor-pointer",
										children: "Pagar esta deuda en cuotas fijas"
									})]
								}), hasInstallmentPlan && /* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3 items-end",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "mb-1 block text-xs font-medium text-text-secondary",
										children: "Número de Cuotas"
									}), /* @__PURE__ */ jsx("input", {
										type: "number",
										min: "1",
										max: "360",
										value: termMonths,
										onChange: (e) => setTermMonths(parseInt(e.target.value) || 1),
										required: true,
										className: "w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
									})] }), /* @__PURE__ */ jsx("div", {
										className: "rounded-lg bg-brand-500/10 border border-brand-500/20 px-3 py-2 text-xs text-brand-400",
										children: termMonths > 0 ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
											termMonths,
											" cuota(s) de",
											" ",
											/* @__PURE__ */ jsx("strong", { children: formatCurrency(Math.round(currentBalance / termMonths * 100) / 100) })
										] }) : "Ingresa el número de cuotas"
									})]
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
									className: "rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer",
									children: "Cancelar"
								}), /* @__PURE__ */ jsx("button", {
									type: "submit",
									disabled: submitting,
									className: "rounded-xl bg-danger-500 px-5 py-2 text-xs font-semibold text-white hover:bg-danger-400 disabled:opacity-50 cursor-pointer",
									children: submitting ? "Guardando..." : editingDebtId ? "Actualizar Deuda 💾" : "Registrar Deuda"
								})]
							})
						]
					})]
				})
			}),
			showPaymentModal && selectedDebt && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-md rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ jsx("h3", {
								className: "text-lg font-bold",
								children: "Registrar Abono"
							}), /* @__PURE__ */ jsx("button", {
								onClick: () => setShowPaymentModal(false),
								className: "text-text-muted hover:text-text-primary cursor-pointer",
								children: "✕"
							})]
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-xs text-text-secondary",
							children: [
								"Abonando a: ",
								/* @__PURE__ */ jsx("strong", {
									className: "text-text-primary",
									children: selectedDebt.name
								}),
								" (Saldo actual: ",
								formatCurrency(selectedDebt.currentBalance),
								")"
							]
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: handleRecordPayment,
							className: "space-y-4",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Monto del Pago ($)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.01",
									min: "0.01",
									max: selectedDebt.currentBalance,
									value: paymentAmount,
									onChange: (e) => setPaymentAmount(parseFloat(e.target.value) || 0),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
								})] }),
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-3 gap-2",
									children: [
										/* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => {
												setPaymentType("minimum");
												setPaymentAmount(selectedDebt.minimumPayment);
											},
											className: `rounded-lg border p-2 text-xs font-medium cursor-pointer ${paymentType === "minimum" ? "border-brand-500 bg-brand-500/10 text-brand-400" : "border-border-default bg-surface-100 text-text-muted"}`,
											children: [
												"Mínimo ($",
												selectedDebt.minimumPayment,
												")"
											]
										}),
										/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => setPaymentType("extra"),
											className: `rounded-lg border p-2 text-xs font-medium cursor-pointer ${paymentType === "extra" ? "border-accent-500 bg-accent-500/10 text-accent-400" : "border-border-default bg-surface-100 text-text-muted"}`,
											children: "Extra a Capital"
										}),
										/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => {
												setPaymentType("full");
												setPaymentAmount(selectedDebt.currentBalance);
											},
											className: `rounded-lg border p-2 text-xs font-medium cursor-pointer ${paymentType === "full" ? "border-warning-500 bg-warning-500/10 text-warning-400" : "border-border-default bg-surface-100 text-text-muted"}`,
											children: "Liquidar Total"
										})
									]
								}),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "mb-1 block text-xs font-medium text-text-secondary",
									children: "Fecha de Pago"
								}), /* @__PURE__ */ jsx("input", {
									type: "date",
									value: paymentDate,
									onChange: (e) => setPaymentDate(e.target.value),
									required: true,
									className: "w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
								})] }),
								/* @__PURE__ */ jsxs("div", {
									className: "flex justify-end gap-3 pt-2",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => setShowPaymentModal(false),
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
			})
		]
	});
}
//#endregion
//#region src/pages/app/debts.astro
var debts_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Debts,
	file: () => $$file,
	url: () => $$url
});
var $$Debts = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Deudas y Créditos" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "DebtsManager", DebtsManager, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "@/components/debts/DebtsManager",
		"client:component-export": "default"
	})}` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/debts.astro", void 0);
var $$file = "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/app/debts.astro";
var $$url = "/app/debts";
//#endregion
//#region \0virtual:astro:page:src/pages/app/debts@_@astro
var page = () => debts_exports;
//#endregion
export { page };
