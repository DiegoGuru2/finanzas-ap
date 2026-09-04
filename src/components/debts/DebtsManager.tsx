import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_CATALOGS, fetchCatalog, type CatalogOption } from '@/lib/catalogs';

interface DebtItem {
  id: string;
  name: string;
  creditor?: string;
  currentBalance: number;
  originalBalance: number;
  apr: number;
  minimumPayment: number;
  dueDay: number;
  type: string;
  paymentTiming?: string;
  status: string;
  hasInstallmentPlan?: boolean;
  termMonths?: number | null;
}

export default function DebtsManager() {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Tipos de deuda administrables desde el panel de admin
  const [debtTypes, setDebtTypes] = useState<CatalogOption[]>(DEFAULT_CATALOGS.debt_type);

  useEffect(() => {
    fetchCatalog('debt_type').then(setDebtTypes);
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [currentBalance, setCurrentBalance] = useState<string>('');
  const [originalBalance, setOriginalBalance] = useState<string>('');
  const [apr, setApr] = useState<string>('');
  const [minimumPayment, setMinimumPayment] = useState<string>('');
  const [dueDay, setDueDay] = useState<string>('15');
  const [type, setType] = useState<string>('credit_card');
  const [paymentTiming, setPaymentTiming] = useState<string>('quincena');
  const [hasInstallmentPlan, setHasInstallmentPlan] = useState(false);
  const [payFullBalance, setPayFullBalance] = useState(false);
  const [termMonths, setTermMonths] = useState<string>('12');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'minimum' | 'extra' | 'full'>('minimum');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/debts');
      const json = await res.json();
      if (json.data) {
        setDebts(json.data);
      }
    } catch (err) {
      console.error('Error fetching debts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingDebtId(null);
    setName('');
    setCreditor('');
    setCurrentBalance('');
    setOriginalBalance('');
    setApr('');
    setMinimumPayment('');
    setDueDay('15');
    setType('credit_card');
    setPaymentTiming('quincena');
    setHasInstallmentPlan(false);
    setPayFullBalance(false);
    setTermMonths('12');
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (debt: DebtItem) => {
    setEditingDebtId(debt.id);
    setName(debt.name);
    setCreditor(debt.creditor || '');
    setCurrentBalance(String(debt.currentBalance));
    setOriginalBalance(String(debt.originalBalance));
    setApr(String(debt.apr));
    setMinimumPayment(String(debt.minimumPayment));
    setDueDay(String(debt.dueDay || 15));
    setType(debt.type || 'credit_card');
    setPaymentTiming(debt.paymentTiming || 'quincena');
    setHasInstallmentPlan(!!debt.hasInstallmentPlan);
    setPayFullBalance(false);
    setTermMonths(String(debt.termMonths || 12));
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const isEditing = !!editingDebtId;
      const url = '/api/debts';
      const method = isEditing ? 'PUT' : 'POST';

      const bal = parseFloat(currentBalance) || 0;
      const origBal = parseFloat(originalBalance) || bal;
      const tm = parseInt(termMonths) || 1;

      // Con plan de cuotas, la cuota mensual se deriva del saldo y reemplaza al pago mínimo
      const installmentAmount =
        hasInstallmentPlan && tm > 0
          ? Math.round((bal / tm) * 100) / 100
          : null;

      // Si paga valor total, el mínimo = saldo actual y termMonths = 1
      const finalMinimum = payFullBalance
        ? bal
        : (installmentAmount ?? (parseFloat(minimumPayment) || 0));

      const payload: any = {
        name,
        creditor,
        currentBalance: bal,
        originalBalance: origBal,
        apr: parseFloat(apr) || 0,
        minimumPayment: finalMinimum,
        dueDay: parseInt(dueDay) || 15,
        type,
        paymentTiming,
        hasInstallmentPlan: payFullBalance ? false : hasInstallmentPlan,
        termMonths: payFullBalance ? 1 : (hasInstallmentPlan ? tm : null),
        currency: 'USD',
        status: 'active',
      };

      if (isEditing) {
        payload.id = editingDebtId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar deuda');
      }

      setShowModal(false);
      setEditingDebtId(null);
      setName('');
      await fetchDebts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId: selectedDebt.id,
          amount: parseFloat(paymentAmount) || 0,
          type: paymentType,
          paidAt: paymentDate,
          notes: paymentNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al abonar');
      }

      setShowPaymentModal(false);
      setSelectedDebt(null);
      await fetchDebts();
    } catch (err: any) {
      alert(err.message || 'Error al procesar pago');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, debtName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la deuda "${debtName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/debts?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Error al eliminar deuda');
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

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión y Configuración de Deudas</h2>
          <p className="text-sm text-text-secondary">
            Administra, edita o elimina tus tarjetas, préstamos quirografarios del BIESS y créditos bancarios.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-danger-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-danger-500/25 transition-all hover:bg-danger-400 cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Deuda / Crédito
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-danger-500/20 bg-danger-500/5 p-5">
          <span className="text-xs font-medium text-danger-400">Saldo Total Adeudado</span>
          <div className="mt-2 text-2xl font-bold text-danger-400">{formatCurrency(totalDebt)}</div>
          <div className="mt-1 text-xs text-text-muted">{debts.length} obligación(es) activa(s)</div>
        </div>

        <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5">
          <span className="text-xs font-medium text-warning-400">Compromiso Mensual Mínimo</span>
          <div className="mt-2 text-2xl font-bold text-warning-400">{formatCurrency(totalMin)}</div>
          <div className="mt-1 text-xs text-text-muted">Total de cuotas / mínimos al mes</div>
        </div>

        <div className="rounded-2xl border border-border-default bg-surface-50 p-5">
          <span className="text-xs font-medium text-text-muted">Tasa APR Promedio</span>
          <div className="mt-2 text-2xl font-bold text-text-primary">{avgApr.toFixed(1)}%</div>
          <div className="mt-1 text-xs text-text-muted">Costo anual financiero</div>
        </div>
      </div>

      {/* Debts Table / Cards */}
      <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden">
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Detalle de Tus Deudas</h3>
          <span className="text-xs text-text-muted">Ordenadas por saldo</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted">Cargando deudas...</div>
        ) : debts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-text-muted">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h4 className="mt-4 font-semibold text-text-primary">No tienes deudas registradas</h4>
            <p className="mt-1 text-sm text-text-muted">¡Excelente! O registra tus tarjetas y préstamos para calcular tu plan de amortización.</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Registrar Deuda
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {debts.map((debt) => {
              const paidPercent = debt.originalBalance > 0
                ? Math.min(100, Math.max(0, Math.round(((debt.originalBalance - debt.currentBalance) / debt.originalBalance) * 100)))
                : 0;

              return (
                <div key={debt.id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-surface-100/50 transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="font-semibold text-text-primary text-base">{debt.name}</span>
                      {debt.creditor && (
                        <span className="text-xs bg-surface-200 px-2 py-0.5 rounded text-text-secondary">
                          {debt.creditor}
                        </span>
                      )}
                      <span className="text-xs bg-danger-500/10 text-danger-400 border border-danger-500/20 px-2 py-0.5 rounded font-medium">
                        {debt.apr}% APR
                      </span>
                      <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded font-medium">
                        Paga en: {debt.paymentTiming === 'quincena' ? 'Quincena (15)' : 'Fin de Mes (30)'}
                      </span>
                      {debt.hasInstallmentPlan && debt.termMonths ? (
                        <span className="text-xs bg-accent-500/10 text-accent-400 border border-accent-500/20 px-2 py-0.5 rounded font-medium">
                          {debt.termMonths} cuotas de {formatCurrency(debt.minimumPayment)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted pt-1">
                      <span>Día de pago: <strong>Día {debt.dueDay}</strong></span>
                      <span>Mínimo requerido: <strong className="text-warning-400">{formatCurrency(debt.minimumPayment)}</strong></span>
                      <span>Progreso pago: <strong>{paidPercent}%</strong></span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-surface-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-accent-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-5">
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-danger-400">{formatCurrency(debt.currentBalance)}</div>
                      <div className="text-xs text-text-muted">de {formatCurrency(debt.originalBalance)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botón Abonar */}
                      <button
                        onClick={() => {
                          setSelectedDebt(debt);
                          setPaymentAmount(String(debt.minimumPayment));
                          setShowPaymentModal(true);
                        }}
                        className="rounded-xl bg-accent-500/10 border border-accent-500/20 px-3 py-2 text-xs font-semibold text-accent-400 hover:bg-accent-500/20 transition-all cursor-pointer"
                      >
                        Abonar
                      </button>

                      {/* Botón Modificar / Editar */}
                      <button
                        onClick={() => handleOpenEditModal(debt)}
                        className="p-2 text-text-muted hover:text-brand-400 transition-colors rounded-lg hover:bg-brand-500/10 cursor-pointer"
                        title="Modificar deuda"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Botón Borrar / Eliminar */}
                      <button
                        onClick={() => handleDelete(debt.id, debt.name)}
                        className="p-2 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10 cursor-pointer"
                        title="Eliminar deuda"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear / Modificar Deuda */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                {editingDebtId ? (
                  <>
                    <svg className="h-5 w-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Modificar Deuda o Crédito</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Registrar Deuda o Crédito</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre de la Deuda</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Ej. Visa Signature Banco Pichincha / Préstamo BIESS"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Acreedor / Institución</label>
                  <input
                    type="text"
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                    placeholder="Banco Pichincha / BIESS / Diners"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Tipo de Obligación</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    {debtTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon ? `${t.icon} ` : ''}{t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Saldo Actual ($)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Monto Original ($)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={originalBalance}
                    onChange={(e) => setOriginalBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Tasa APR (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    max="100"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    required
                    placeholder="0.0"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    {payFullBalance ? 'Pago Total ($)' : hasInstallmentPlan ? 'Cuota Mensual ($)' : 'Pago Mínimo ($)'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={
                      payFullBalance
                        ? currentBalance
                        : hasInstallmentPlan && (parseInt(termMonths) || 0) > 0
                          ? String(Math.round(((parseFloat(currentBalance) || 0) / (parseInt(termMonths) || 1)) * 100) / 100)
                          : minimumPayment
                    }
                    onChange={(e) => setMinimumPayment(e.target.value)}
                    required
                    disabled={hasInstallmentPlan || payFullBalance}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Día de Corte/Pago</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    required
                    placeholder="15"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Momento de Pago Habitual</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentTiming('quincena')}
                    className={`rounded-xl border p-2 text-xs font-medium cursor-pointer ${
                      paymentTiming === 'quincena'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-border-default bg-surface-100 text-text-muted'
                    }`}
                  >
                    Pagar con la Quincena (15)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTiming('fin_de_mes')}
                    className={`rounded-xl border p-2 text-xs font-medium cursor-pointer ${
                      paymentTiming === 'fin_de_mes'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-border-default bg-surface-100 text-text-muted'
                    }`}
                  >
                    Pagar a Fin de Mes (30)
                  </button>
                </div>
              </div>

              {/* Pagar valor total (un solo pago) */}
              <div className="rounded-xl border border-accent-500/30 bg-accent-500/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="payFullBalance"
                    checked={payFullBalance}
                    onChange={(e) => {
                      setPayFullBalance(e.target.checked);
                      if (e.target.checked) {
                        setHasInstallmentPlan(false);
                      }
                    }}
                    className="h-4 w-4 rounded border-accent-500 text-accent-500 focus:ring-accent-500 cursor-pointer"
                  />
                  <label htmlFor="payFullBalance" className="text-xs font-bold text-accent-400 cursor-pointer">
                    💰 Pagar el valor total de esta deuda (un solo pago)
                  </label>
                </div>
                {payFullBalance && (parseFloat(currentBalance) || 0) > 0 && (
                  <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 px-3 py-2 text-xs text-accent-400">
                    Se programará 1 pago único de <strong>{formatCurrency(parseFloat(currentBalance) || 0)}</strong>
                  </div>
                )}
              </div>

              {/* Plan de cuotas fijas */}
              <div className={`rounded-xl border border-border-default bg-surface-100 p-3 space-y-3 ${payFullBalance ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasInstallmentPlan"
                    checked={hasInstallmentPlan}
                    onChange={(e) => setHasInstallmentPlan(e.target.checked)}
                    disabled={payFullBalance}
                    className="rounded border-border-default text-brand-500 focus:ring-brand-500"
                  />
                  <label htmlFor="hasInstallmentPlan" className="text-xs font-medium text-text-primary cursor-pointer">
                    Pagar esta deuda en cuotas fijas
                  </label>
                </div>

                {hasInstallmentPlan && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">Número de Cuotas</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="360"
                        value={termMonths}
                        onChange={(e) => setTermMonths(e.target.value)}
                        required
                        placeholder="12"
                        className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="rounded-lg bg-brand-500/10 border border-brand-500/20 px-3 py-2 text-xs text-brand-400">
                      {(parseInt(termMonths) || 0) > 0 ? (
                        <>
                          {termMonths} cuota(s) de{' '}
                          <strong>{formatCurrency(Math.round(((parseFloat(currentBalance) || 0) / (parseInt(termMonths) || 1)) * 100) / 100)}</strong>
                        </>
                      ) : (
                        'Ingresa el número de cuotas'
                      )}
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-danger-500 px-5 py-2 text-xs font-semibold text-white hover:bg-danger-400 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : editingDebtId ? 'Actualizar Deuda 💾' : 'Registrar Deuda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Abonar a Deuda */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Registrar Abono</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Abonando a: <strong className="text-text-primary">{selectedDebt.name}</strong> (Saldo actual: {formatCurrency(selectedDebt.currentBalance)})
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Monto del Pago ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max={selectedDebt.currentBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('minimum');
                    setPaymentAmount(String(selectedDebt.minimumPayment));
                  }}
                  className={`rounded-lg border p-2 text-xs font-medium cursor-pointer ${
                    paymentType === 'minimum' ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-border-default bg-surface-100 text-text-muted'
                  }`}
                >
                  Mínimo (${selectedDebt.minimumPayment})
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('extra')}
                  className={`rounded-lg border p-2 text-xs font-medium cursor-pointer ${
                    paymentType === 'extra' ? 'border-accent-500 bg-accent-500/10 text-accent-400' : 'border-border-default bg-surface-100 text-text-muted'
                  }`}
                >
                  Extra a Capital
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('full');
                    setPaymentAmount(String(selectedDebt.currentBalance));
                  }}
                  className={`rounded-lg border p-2 text-xs font-medium cursor-pointer ${
                    paymentType === 'full' ? 'border-warning-500 bg-warning-500/10 text-warning-400' : 'border-border-default bg-surface-100 text-text-muted'
                  }`}
                >
                  Liquidar Total
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha de Pago</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-accent-500 px-5 py-2 text-xs font-semibold text-white hover:bg-accent-400 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
