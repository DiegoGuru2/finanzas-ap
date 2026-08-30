import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface IncomeItem {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  isSalary: boolean;
  paymentScheme: 'monthly' | 'quincena_fin_mes';
  quincenaAmount: number;
  finDeMesAmount: number;
  deductIess: boolean;
  iessPercentage: number;
  iessDeduction: number;
  netAmount: number;
  category?: string;
  date?: string | null;
}

export default function IncomesManager() {
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState('Sueldo Principal');
  const [amount, setAmount] = useState<number>(1000);
  const [isSalary, setIsSalary] = useState(true);
  const [incomeType, setIncomeType] = useState<'recurrente' | 'unico'>('recurrente');
  const [incomeDate, setIncomeDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentScheme, setPaymentScheme] = useState<'monthly' | 'quincena_fin_mes'>('quincena_fin_mes');
  const [quincenaAmount, setQuincenaAmount] = useState<number>(450);
  const [finDeMesAmount, setFinDeMesAmount] = useState<number>(455.50);
  const [deductIess, setDeductIess] = useState(true);
  const [iessPercentage, setIessPercentage] = useState(9.45);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recalculate preview when amount, iess, or scheme changes
  useEffect(() => {
    const gross = amount || 0;
    const iess = deductIess ? (gross * (iessPercentage / 100)) : 0;
    const net = Math.max(0, gross - iess);

    if (paymentScheme === 'quincena_fin_mes') {
      const q = Math.round((net / 2) * 100) / 100;
      setQuincenaAmount(q);
      setFinDeMesAmount(Math.round((net - q) * 100) / 100);
    } else {
      setQuincenaAmount(0);
      setFinDeMesAmount(net);
    }
  }, [amount, deductIess, iessPercentage, paymentScheme]);

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incomes');
      const json = await res.json();
      if (json.data) {
        setIncomes(json.data);
      }
    } catch (err) {
      console.error('Error fetching incomes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const isOneTime = incomeType === 'unico';
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isOneTime
            ? {
                name,
                amount: Number(amount),
                frequency: 'once',
                isSalary: false,
                paymentScheme: 'monthly',
                quincenaAmount: 0,
                finDeMesAmount: 0,
                deductIess: false,
                iessPercentage: 0,
                category: 'Ingreso Único',
                date: incomeDate,
              }
            : {
                name,
                amount: Number(amount),
                frequency: 'monthly',
                isSalary,
                paymentScheme,
                quincenaAmount: Number(quincenaAmount),
                finDeMesAmount: Number(finDeMesAmount),
                deductIess,
                iessPercentage: Number(iessPercentage),
                category: isSalary ? 'Sueldo' : 'Ingreso Extra',
              }
        ),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar ingreso');
      }

      setShowModal(false);
      await fetchIncomes();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Deseas eliminar este ingreso?')) return;
    try {
      await fetch(`/api/incomes?id=${id}`, { method: 'DELETE' });
      await fetchIncomes();
    } catch (err) {
      console.error(err);
    }
  };

  // Aggregates
  const totalGross = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalIess = incomes.reduce((sum, i) => sum + (i.iessDeduction || 0), 0);
  const totalNet = incomes.reduce((sum, i) => sum + (i.netAmount || i.amount), 0);
  const totalQuincena = incomes.reduce((sum, i) => sum + (i.quincenaAmount || 0), 0);
  const totalFinDeMes = incomes.reduce((sum, i) => sum + (i.finDeMesAmount || (i.netAmount || i.amount)), 0);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ingresos y Configuración de Sueldo</h2>
          <p className="text-sm text-text-secondary">
            Configura tu sueldo nominal, esquema de pago (Quincena / Fin de Mes) y aporte al IESS.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Registrar Ingreso / Sueldo
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5">
          <span className="text-xs font-medium text-text-muted">Sueldo Bruto Total</span>
          <div className="mt-2 text-2xl font-bold text-text-primary">{formatCurrency(totalGross)}</div>
          <div className="mt-1 text-xs text-text-muted">Nominal registrado</div>
        </div>

        <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5">
          <span className="text-xs font-medium text-warning-400">Aporte Personal IESS (9.45%)</span>
          <div className="mt-2 text-2xl font-bold text-warning-400">-{formatCurrency(totalIess)}</div>
          <div className="mt-1 text-xs text-text-muted">Descuento de ley Ecuador</div>
        </div>

        <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5">
          <span className="text-xs font-medium text-accent-400">Sueldo Neto Líquido</span>
          <div className="mt-2 text-2xl font-bold text-accent-400">{formatCurrency(totalNet)}</div>
          <div className="mt-1 text-xs text-text-muted">Disponible en mano</div>
        </div>

        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5">
          <span className="text-xs font-medium text-brand-400">Distribución Mensual</span>
          <div className="mt-2 text-sm font-semibold text-text-primary">
            Quincena (15): <strong className="text-brand-400">{formatCurrency(totalQuincena)}</strong>
          </div>
          <div className="mt-1 text-sm font-semibold text-text-primary">
            Fin de Mes (30): <strong className="text-brand-400">{formatCurrency(totalFinDeMes)}</strong>
          </div>
        </div>
      </div>

      {/* Incomes List */}
      <div className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden">
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Tus Fuentes de Ingreso</h3>
          <span className="text-xs bg-surface-100 px-3 py-1 rounded-full text-text-secondary">
            {incomes.length} registro(s)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted">Cargando ingresos...</div>
        ) : incomes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-text-muted">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="mt-4 font-semibold text-text-primary">No tienes ingresos registrados</h4>
            <p className="mt-1 text-sm text-text-muted">Configura tu sueldo para calcular tu flujo disponible.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Agregar Sueldo
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {incomes.map((inc) => (
              <div key={inc.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-surface-100/50 transition-colors">
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-semibold text-text-primary">{inc.name}</span>
                    {inc.isSalary && (
                      <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-400 border border-brand-500/20">
                        Sueldo
                      </span>
                    )}
                    {inc.frequency === 'once' ? (
                      <span className="rounded-md bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-400 border border-accent-500/20">
                        Ingreso único{inc.date ? ` · ${String(inc.date).slice(0, 10)}` : ''}
                      </span>
                    ) : (
                      <span className="rounded-md bg-surface-200 px-2 py-0.5 text-xs text-text-secondary">
                        {inc.paymentScheme === 'quincena_fin_mes' ? 'Quincena + Fin de Mes' : 'Pago Único Fin de Mes'}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-text-muted">
                    <span>Bruto: <strong className="text-text-secondary">{formatCurrency(inc.amount)}</strong></span>
                    {inc.deductIess && (
                      <span className="text-warning-400">
                        IESS ({inc.iessPercentage}%): -{formatCurrency(inc.iessDeduction)}
                      </span>
                    )}
                    {inc.paymentScheme === 'quincena_fin_mes' && (
                      <span>
                        Quincena: <strong className="text-accent-400">{formatCurrency(inc.quincenaAmount)}</strong> | Fin de Mes: <strong className="text-accent-400">{formatCurrency(inc.finDeMesAmount)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent-400">{formatCurrency(inc.netAmount || inc.amount)}</div>
                    <div className="text-xs text-text-muted">
                      {inc.frequency === 'once' ? 'Monto único' : 'Líquido mensual'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(inc.id)}
                    className="p-2 text-text-muted hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-500/10"
                    title="Eliminar ingreso"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Agregar / Configurar Sueldo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Configurar Sueldo / Ingreso</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de ingreso */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIncomeType('recurrente')}
                  className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    incomeType === 'recurrente'
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                  }`}
                >
                  <div className="text-xs font-bold">Recurrente Mensual</div>
                  <div className="mt-1 text-[11px]">Sueldo o ingreso fijo cada mes</div>
                </button>
                <button
                  type="button"
                  onClick={() => setIncomeType('unico')}
                  className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    incomeType === 'unico'
                      ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                      : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                  }`}
                >
                  <div className="text-xs font-bold">Ingreso Único</div>
                  <div className="mt-1 text-[11px]">Décimo, fondos de reserva, bono</div>
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre o Concepto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder={incomeType === 'unico' ? 'Ej. Décimo Tercero / Fondos de Reserva' : 'Ej. Sueldo Empresa / Trabajo'}
                />
              </div>

              {incomeType === 'unico' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha en que lo recibes</label>
                  <input
                    type="date"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    Se sumará al ingreso disponible de esa quincena en el cronograma.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  {incomeType === 'unico' ? 'Monto a Recibir ($ USD)' : 'Sueldo Bruto / Nominal ($ USD)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="1000.00"
                />
              </div>

              {incomeType === 'recurrente' && (<>
              {/* Ecuador IESS Toggle */}
              <div className="rounded-xl border border-border-default bg-surface-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deductIess"
                      checked={deductIess}
                      onChange={(e) => setDeductIess(e.target.checked)}
                      className="rounded border-border-default text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="deductIess" className="text-xs font-medium text-text-primary cursor-pointer">
                      Descontar Aporte Personal al IESS (Ecuador)
                    </label>
                  </div>
                  {deductIess && (
                    <span className="text-xs font-semibold text-warning-400">9.45% de ley</span>
                  )}
                </div>

                {deductIess && (
                  <div className="text-xs text-text-muted flex justify-between pt-1 border-t border-border-default">
                    <span>Descuento estimado IESS:</span>
                    <strong className="text-warning-400">-${((amount * iessPercentage) / 100).toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {/* Modalidad de Pago: Quincena + Fin de Mes vs Un solo pago */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-secondary">Modalidad de Pago en el Mes</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentScheme('quincena_fin_mes')}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      paymentScheme === 'quincena_fin_mes'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <div className="text-xs font-bold">Quincena y Fin de Mes</div>
                    <div className="mt-1 text-[11px]">Pagos el 15 y el 30</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentScheme('monthly')}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      paymentScheme === 'monthly'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <div className="text-xs font-bold">Un Solo Pago</div>
                    <div className="mt-1 text-[11px]">Pago total a fin de mes</div>
                  </button>
                </div>
              </div>

              {/* Cantidades Quincena / Fin de mes si está activo */}
              {paymentScheme === 'quincena_fin_mes' && (
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-default bg-surface-100 p-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary">Anticipo Quincena (15)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quincenaAmount}
                      onChange={(e) => {
                        const q = parseFloat(e.target.value) || 0;
                        setQuincenaAmount(q);
                        const gross = amount || 0;
                        const iess = deductIess ? (gross * (iessPercentage / 100)) : 0;
                        const net = Math.max(0, gross - iess);
                        setFinDeMesAmount(Math.round(Math.max(0, net - q) * 100) / 100);
                      }}
                      className="mt-1 w-full rounded-lg border border-border-default bg-surface-50 px-2.5 py-1.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary">Saldo Fin de Mes (30)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={finDeMesAmount}
                      onChange={(e) => setFinDeMesAmount(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-border-default bg-surface-50 px-2.5 py-1.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Net preview badge */}
              <div className="rounded-xl bg-accent-500/10 border border-accent-500/20 p-3 flex justify-between items-center text-xs">
                <span className="text-text-secondary font-medium">Sueldo Neto Líquido Estimado:</span>
                <span className="text-sm font-bold text-accent-400">
                  {formatCurrency(Math.max(0, amount - (deductIess ? (amount * iessPercentage) / 100 : 0)))}
                </span>
              </div>
              </>)}

              {errorMessage && (
                <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-3 py-2 text-xs text-danger-400">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
