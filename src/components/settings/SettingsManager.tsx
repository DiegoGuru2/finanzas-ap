import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function SettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Salary / Income settings
  const [salaryId, setSalaryId] = useState<string | null>(null);
  const [salaryName, setSalaryName] = useState('Sueldo Principal');
  const [salaryAmount, setSalaryAmount] = useState<number>(1200);
  const [paymentScheme, setPaymentScheme] = useState<'quincena_fin_mes' | 'monthly'>('quincena_fin_mes');
  const [quincenaAmount, setQuincenaAmount] = useState<number>(500);
  const [finDeMesAmount, setFinDeMesAmount] = useState<number>(586.60);
  const [deductIess, setDeductIess] = useState(true);
  const [iessPercentage, setIessPercentage] = useState(9.45);

  // 💰 Ahorro Programado a Fin de Mes
  const [hasProgrammedSavings, setHasProgrammedSavings] = useState(false);
  const [programmedSavingsAmount, setProgrammedSavingsAmount] = useState<number>(100);

  // Live recalculation when amount, IESS, scheme, or programmed savings changes
  useEffect(() => {
    const gross = salaryAmount || 0;
    const iess = deductIess ? (gross * (iessPercentage / 100)) : 0;
    const net = Math.max(0, gross - iess);
    const savings = (hasProgrammedSavings && programmedSavingsAmount > 0) ? programmedSavingsAmount : 0;

    if (paymentScheme === 'quincena_fin_mes') {
      const q = Math.round((net / 2) * 100) / 100;
      setQuincenaAmount(q);
      setFinDeMesAmount(Math.round(Math.max(0, net - q - savings) * 100) / 100);
    } else {
      setQuincenaAmount(0);
      setFinDeMesAmount(Math.round(Math.max(0, net - savings) * 100) / 100);
    }
  }, [salaryAmount, deductIess, iessPercentage, paymentScheme, hasProgrammedSavings, programmedSavingsAmount]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incomes');
      const json = await res.json();

      if (json.data && json.data.length > 0) {
        // Find principal salary
        const principal = json.data.find((i: any) => i.isSalary) || json.data[0];
        setSalaryId(principal.id);
        setSalaryName(principal.name || 'Sueldo Principal');
        setSalaryAmount(Number(principal.amount) || 1200);
        setPaymentScheme(principal.paymentScheme || 'quincena_fin_mes');
        setQuincenaAmount(Number(principal.quincenaAmount) || 500);
        setFinDeMesAmount(Number(principal.finDeMesAmount) || 586.60);
        setDeductIess(principal.deductIess ?? true);
        setIessPercentage(Number(principal.iessPercentage) || 9.45);
        setHasProgrammedSavings(!!principal.hasProgrammedSavings);
        setProgrammedSavingsAmount(Number(principal.programmedSavingsAmount) || 100);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // If we have an existing salary, delete and re-insert or update
      if (salaryId) {
        await fetch(`/api/incomes?id=${salaryId}`, { method: 'DELETE' });
      }

      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: salaryName,
          amount: Number(salaryAmount),
          frequency: 'monthly',
          isSalary: true,
          paymentScheme,
          quincenaAmount: Number(quincenaAmount),
          finDeMesAmount: Number(finDeMesAmount),
          deductIess,
          iessPercentage: Number(iessPercentage),
          hasProgrammedSavings,
          programmedSavingsAmount: Number(programmedSavingsAmount),
          category: 'Sueldo',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al actualizar el sueldo');
      }

      setSalaryId(json.id);
      setSuccessMessage('✅ ¡Configuración guardada exitosamente! Sueldo, IESS y Ahorro Programado actualizados en toda la plataforma.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-3"></div>
        Cargando configuración...
      </div>
    );
  }

  const iessDeduction = deductIess ? (salaryAmount * (iessPercentage / 100)) : 0;
  const netSalary = Math.max(0, salaryAmount - iessDeduction);
  const activeSavings = (hasProgrammedSavings && programmedSavingsAmount > 0) ? programmedSavingsAmount : 0;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Configuración de la Cuenta</h2>
        <p className="text-sm text-text-secondary">
          Modifica tu sueldo si varía en el tiempo, configura ahorro programado descontado a fin de mes y ajusta tus aportes al IESS.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-2xl border border-accent-500/30 bg-accent-500/10 p-4 text-xs font-semibold text-accent-400 animate-in fade-in">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-danger-500/30 bg-danger-500/10 p-4 text-xs font-semibold text-danger-400 animate-in fade-in">
          {errorMessage}
        </div>
      )}

      {/* Salary & Ecuador Payroll Form */}
      <div className="rounded-3xl border border-border-default bg-surface-50 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border-default pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 text-xl">
            🇪🇨
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Ajuste de Sueldo e Ingreso Mensual</h3>
            <p className="text-xs text-text-muted">
              Si tu sueldo subió, cambió tu contrato o varias de ingresos, actualízalo aquí.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSalary} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Nombre o Concepto del Empleo
              </label>
              <input
                type="text"
                value={salaryName}
                onChange={(e) => setSalaryName(e.target.value)}
                required
                className="w-full rounded-xl border border-border-default bg-surface-100 px-4 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                placeholder="Ej. Sueldo Empresa / Nuevo Empleo"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Sueldo Bruto Nominal ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 pl-8 pr-4 py-2.5 text-sm font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="1200.00"
                />
              </div>
            </div>
          </div>

          {/* IESS Configuration Card */}
          <div className="rounded-2xl border border-border-default bg-surface-100/70 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="settingsIessToggle"
                  checked={deductIess}
                  onChange={(e) => setDeductIess(e.target.checked)}
                  className="h-4 w-4 rounded border-border-default text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <div>
                  <label htmlFor="settingsIessToggle" className="text-xs font-bold text-text-primary cursor-pointer">
                    Descontar Aporte Personal al IESS (Ecuador)
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Se calcula sobre el salario nominal bruto registrado
                  </p>
                </div>
              </div>

              {deductIess && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Porcentaje:</span>
                  <select
                    value={iessPercentage}
                    onChange={(e) => setIessPercentage(parseFloat(e.target.value))}
                    className="rounded-lg border border-border-default bg-surface-50 px-2.5 py-1 text-xs font-bold text-warning-400 focus:outline-none"
                  >
                    <option value={9.45}>9.45% (Bajo dependencia / Sector privado)</option>
                    <option value={11.45}>11.45% (Sector público)</option>
                    <option value={17.60}>17.60% (Afiliación voluntaria / Independiente)</option>
                    <option value={20.60}>20.60% (Sin relación de dependencia)</option>
                  </select>
                </div>
              )}
            </div>

            {deductIess && (
              <div className="flex justify-between items-center text-xs pt-3 border-t border-border-default text-text-muted">
                <span>Descuento de Ley IESS ({iessPercentage}%):</span>
                <strong className="text-warning-400 text-sm">-{formatCurrency(iessDeduction)}</strong>
              </div>
            )}
          </div>

          {/* 💰 SECCIÓN: AHORRO PROGRAMADO A FIN DE MES */}
          <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="settingsProgrammedSavingsToggle"
                  checked={hasProgrammedSavings}
                  onChange={(e) => setHasProgrammedSavings(e.target.checked)}
                  className="h-4 w-4 rounded border-accent-500 text-accent-500 focus:ring-accent-500 cursor-pointer"
                />
                <div>
                  <label htmlFor="settingsProgrammedSavingsToggle" className="text-xs font-bold text-text-primary cursor-pointer flex items-center gap-2">
                    <span>🏦 Activar Ahorro Programado / Débito Automático</span>
                    <span className="rounded bg-accent-500/20 text-accent-400 px-2 py-0.5 text-[10px] font-semibold">
                      Descontado a Fin de Mes
                    </span>
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Se reserva automáticamente de tu pago del día 30 para proteger tu fondo de ahorro o póliza.
                  </p>
                </div>
              </div>

              {hasProgrammedSavings && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-medium">Monto a reservar:</span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={programmedSavingsAmount}
                      onChange={(e) => setProgrammedSavingsAmount(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-accent-500/40 bg-surface-50 pl-6 pr-2 py-1 text-xs font-bold text-accent-400 focus:outline-none"
                      placeholder="100.00"
                    />
                  </div>
                </div>
              )}
            </div>

            {hasProgrammedSavings && (
              <div className="flex justify-between items-center text-xs pt-3 border-t border-accent-500/20 text-text-muted">
                <span>Reserva mensual retenida a Fin de Mes:</span>
                <strong className="text-accent-400 text-sm">-{formatCurrency(programmedSavingsAmount)}</strong>
              </div>
            )}
          </div>

          {/* Payment Scheme Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-text-secondary">
              Modalidad de Cobro en el Mes
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentScheme('quincena_fin_mes')}
                className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  paymentScheme === 'quincena_fin_mes'
                    ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-sm ring-1 ring-brand-500'
                    : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                }`}
              >
                <div className="text-xs font-bold">📅 Quincena y Fin de Mes</div>
                <div className="mt-1 text-[11px] opacity-80">Anticipo el día 15 y saldo el 30</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentScheme('monthly')}
                className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  paymentScheme === 'monthly'
                    ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-sm ring-1 ring-brand-500'
                    : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                }`}
              >
                <div className="text-xs font-bold">💳 Un Solo Pago</div>
                <div className="mt-1 text-[11px] opacity-80">100% cobrado a fin de mes</div>
              </button>
            </div>
          </div>

          {/* Quincena & Fin de Mes Amounts */}
          {paymentScheme === 'quincena_fin_mes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-border-default bg-surface-100 p-4">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Anticipo Quincena (Día 15)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quincenaAmount}
                  onChange={(e) => {
                    const q = parseFloat(e.target.value) || 0;
                    setQuincenaAmount(q);
                    setFinDeMesAmount(Math.round(Math.max(0, netSalary - q - activeSavings) * 100) / 100);
                  }}
                  className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Saldo Fin de Mes (Día 30) {hasProgrammedSavings && '(Tras Ahorro)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={finDeMesAmount}
                  onChange={(e) => setFinDeMesAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Live Summary Banner */}
          <div className="rounded-2xl border border-accent-500/30 bg-accent-500/10 p-5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-accent-400 block">Sueldo Neto Líquido Total:</span>
                <span className="text-xs text-text-muted">
                  Bruto ({formatCurrency(salaryAmount)}) - IESS ({formatCurrency(iessDeduction)})
                </span>
              </div>
              <div className="text-2xl font-extrabold text-accent-400">
                {formatCurrency(netSalary)}
              </div>
            </div>

            {hasProgrammedSavings && (
              <div className="pt-2 border-t border-accent-500/20 flex justify-between text-xs text-text-secondary">
                <span>Saldo disponible a Fin de Mes tras reservar Ahorro Programado ({formatCurrency(activeSavings)}):</span>
                <strong className="text-text-primary font-bold">{formatCurrency(finDeMesAmount)}</strong>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-brand-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 hover:shadow-brand-400/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Guardando cambios...' : 'Guardar y Actualizar Dashboard 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
