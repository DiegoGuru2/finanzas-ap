import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { calculateSalaryDetails } from '@/modules/financial-engine/cashflow';
import { calculateBenefits } from '@/modules/financial-engine/benefits';
import { DEFAULT_SBU, round } from '@/modules/financial-engine/constants';
import type { Income } from '@/modules/financial-engine/types';

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
  // 'auto' = 50/50 recalculado; 'manual' = el usuario definió su propio anticipo de quincena
  const [splitMode, setSplitMode] = useState<'auto' | 'manual'>('auto');
  const [deductIess, setDeductIess] = useState(true);
  const [iessPercentage, setIessPercentage] = useState(9.45);

  // 💰 Ahorro Programado a Fin de Mes
  const [hasProgrammedSavings, setHasProgrammedSavings] = useState(false);
  const [programmedSavingsAmount, setProgrammedSavingsAmount] = useState<number>(100);

  // 🇪🇨 Beneficios de Ley Ecuador
  const [hasFondosReserva, setHasFondosReserva] = useState(false);
  const [fondosReservaMensualizado, setFondosReservaMensualizado] = useState(true);
  const [decimoTerceroMensualizado, setDecimoTerceroMensualizado] = useState(true);
  const [decimoCuartoMensualizado, setDecimoCuartoMensualizado] = useState(true);
  const [region, setRegion] = useState<'costa' | 'sierra'>('costa');
  const [sbuInput, setSbuInput] = useState<string>(String(DEFAULT_SBU));
  const [hasUtilidades, setHasUtilidades] = useState(true);
  const [utilidadesAmount, setUtilidadesAmount] = useState<number>(0);

  const sbuAmount = parseFloat(sbuInput) || 0; // el motor usa el SBU default si queda en 0

  // El mismo objeto Income que usa el motor (una sola fórmula para todo)
  const draftIncome: Income = {
    id: salaryId || '',
    name: salaryName,
    amount: salaryAmount || 0,
    frequency: 'monthly',
    isSalary: true,
    paymentScheme,
    quincenaAmount: 0, // el reparto se resuelve abajo según splitMode
    finDeMesAmount: 0,
    deductIess,
    iessPercentage,
    hasProgrammedSavings,
    programmedSavingsAmount,
    hasFondosReserva,
    fondosReservaMensualizado,
    decimoTerceroMensualizado,
    decimoCuartoMensualizado,
    region,
    sbuAmount,
    hasUtilidades,
    utilidadesAmount,
  };

  // Live recalculation (motor financiero): en modo manual se respeta el
  // anticipo de quincena que definió el usuario y solo se ajusta el saldo.
  useEffect(() => {
    const details = calculateSalaryDetails(draftIncome);
    const savings = (hasProgrammedSavings && programmedSavingsAmount > 0) ? programmedSavingsAmount : 0;

    if (paymentScheme !== 'quincena_fin_mes') {
      setQuincenaAmount(0);
      setFinDeMesAmount(details.finDeMesAmount);
    } else if (splitMode === 'manual') {
      setFinDeMesAmount(round(Math.max(0, details.netMonthly - quincenaAmount - savings)));
    } else {
      setQuincenaAmount(details.quincenaAmount);
      setFinDeMesAmount(details.finDeMesAmount);
    }
  }, [salaryAmount, deductIess, iessPercentage, paymentScheme, hasProgrammedSavings, programmedSavingsAmount, splitMode, quincenaAmount]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incomes');
      const json = await res.json();

      // Solo tocamos el ingreso marcado como sueldo. Si no existe, el
      // formulario crea uno nuevo sin alterar otros ingresos (bonos, etc.).
      const principal = (json.data || []).find((i: any) => i.isSalary);
      if (principal) {
        setSalaryId(principal.id);
        setSalaryName(principal.name || 'Sueldo Principal');
        setSalaryAmount(Number(principal.amount) || 0);
        setPaymentScheme(principal.paymentScheme || 'quincena_fin_mes');
        setDeductIess(principal.deductIess ?? true);
        setIessPercentage(Number(principal.iessPercentage) || 9.45);
        setHasProgrammedSavings(!!principal.hasProgrammedSavings);
        setProgrammedSavingsAmount(Number(principal.programmedSavingsAmount) || 100);

        // Reparto quincena/fin de mes: si difiere del 50/50 automático,
        // el usuario lo personalizó — se respeta y no se recalcula encima.
        const q = Number(principal.quincenaAmount) || 0;
        const netHalf = round((Number(principal.netAmount) || 0) / 2);
        setQuincenaAmount(q);
        setFinDeMesAmount(Number(principal.finDeMesAmount) || 0);
        setSplitMode(q > 0 && Math.abs(q - netHalf) > 0.02 ? 'manual' : 'auto');

        // Beneficios de Ley
        setHasFondosReserva(!!principal.hasFondosReserva);
        setFondosReservaMensualizado(principal.fondosReservaMensualizado ?? true);
        setDecimoTerceroMensualizado(principal.decimoTerceroMensualizado ?? true);
        setDecimoCuartoMensualizado(principal.decimoCuartoMensualizado ?? true);
        setRegion(principal.region === 'sierra' ? 'sierra' : 'costa');
        setSbuInput(String(Number(principal.sbuAmount) || DEFAULT_SBU));
        setHasUtilidades(principal.hasUtilidades ?? true);
        setUtilidadesAmount(Number(principal.utilidadesAmount) || 0);
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
      // Actualiza en sitio (PUT) si el sueldo ya existe; nunca se borra
      // antes de guardar, así un fallo no puede perder la configuración.
      const url = salaryId ? `/api/incomes?id=${salaryId}` : '/api/incomes';
      const res = await fetch(url, {
        method: salaryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: salaryName,
          amount: Number(salaryAmount),
          frequency: 'monthly',
          isSalary: true,
          paymentScheme,
          quincenaAmount: splitMode === 'manual' ? Number(quincenaAmount) : 0,
          finDeMesAmount: Number(finDeMesAmount),
          deductIess,
          iessPercentage: Number(iessPercentage),
          hasProgrammedSavings,
          programmedSavingsAmount: Number(programmedSavingsAmount),
          // Beneficios de Ley
          hasFondosReserva,
          fondosReservaMensualizado,
          decimoTerceroMensualizado,
          decimoCuartoMensualizado,
          region,
          sbuAmount: sbuAmount > 0 ? sbuAmount : DEFAULT_SBU,
          hasUtilidades,
          utilidadesAmount: Number(utilidadesAmount),
          category: 'Sueldo',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al actualizar');

      setSalaryId(json.id);
      setSuccessMessage('✅ ¡Configuración guardada! Sueldo, IESS, Beneficios de Ley y Ahorro Programado actualizados.');
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

  // Todos los cálculos salen del motor financiero (la misma fórmula que usan
  // el Dashboard y el Cronograma) — nada se duplica aquí.
  const salaryDetails = calculateSalaryDetails(draftIncome);
  const benefits = calculateBenefits(draftIncome);

  const iessDeduction = salaryDetails.iessDeduction;
  const netSalary = salaryDetails.netMonthly;
  const activeSavings = salaryDetails.programmedSavings;
  const fondosReservaMensual = benefits.fondosReservaMonthly;
  const decimoTerceroMensual = benefits.decimoTerceroMonthly;
  const decimoCuartoMensual = benefits.decimoCuartoMonthly;
  const utilidadesMensual = benefits.utilidadesMonthly;
  // Solo lo que efectivamente llega mensualizado (+ utilidades prorrateadas)
  const totalBeneficiosMensual = round(benefits.monthlyRecurring + benefits.utilidadesMonthly);
  const sbuEfectivo = sbuAmount > 0 ? sbuAmount : DEFAULT_SBU;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Configuración de la Cuenta</h2>
        <p className="text-sm text-text-secondary">
          Modifica tu sueldo, beneficios de ley, ahorro programado y aportes al IESS.
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

      <form onSubmit={handleSaveSalary} className="space-y-8">
        {/* ═══ SUELDO ═══ */}
        <div className="rounded-3xl border border-border-default bg-surface-50 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-border-default pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="6" width="20" height="12" rx="3" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="2.5" strokeWidth="1.8" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Ajuste de Sueldo e Ingreso Mensual</h3>
              <p className="text-xs text-text-muted">Si tu sueldo subió, cambió tu contrato o varias de ingresos, actualízalo aquí.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Nombre o Concepto del Empleo</label>
              <input
                type="text"
                value={salaryName}
                onChange={(e) => setSalaryName(e.target.value)}
                required
                className="w-full rounded-xl border border-border-default bg-surface-100 px-4 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                placeholder="Ej. Sueldo Empresa"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Sueldo Bruto Nominal ($ USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">$</span>
                <input
                  type="number"
                  inputMode="decimal"
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

          {/* IESS */}
          <div className="rounded-2xl border border-border-default bg-surface-100/70 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="settingsIessToggle" checked={deductIess} onChange={(e) => setDeductIess(e.target.checked)} className="h-4 w-4 rounded border-border-default text-brand-500 focus:ring-brand-500 cursor-pointer" />
                <div>
                  <label htmlFor="settingsIessToggle" className="text-xs font-bold text-text-primary cursor-pointer">Descontar Aporte Personal al IESS (Ecuador)</label>
                  <p className="text-[11px] text-text-muted">Se calcula sobre el salario nominal bruto registrado</p>
                </div>
              </div>
              {deductIess && (
                <select value={iessPercentage} onChange={(e) => setIessPercentage(parseFloat(e.target.value))} className="rounded-lg border border-border-default bg-surface-50 px-2.5 py-1 text-xs font-bold text-warning-400 focus:outline-none">
                  <option value={9.45}>9.45% (Bajo dependencia / Sector privado)</option>
                  <option value={11.45}>11.45% (Sector público)</option>
                  <option value={17.60}>17.60% (Afiliación voluntaria)</option>
                  <option value={20.60}>20.60% (Sin relación de dependencia)</option>
                </select>
              )}
            </div>
            {deductIess && (
              <div className="flex justify-between items-center text-xs pt-3 border-t border-border-default text-text-muted">
                <span>Descuento de Ley IESS ({iessPercentage}%):</span>
                <strong className="text-warning-400 text-sm">-{formatCurrency(iessDeduction)}</strong>
              </div>
            )}
          </div>

          {/* Ahorro Programado */}
          <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="settingsProgrammedSavingsToggle" checked={hasProgrammedSavings} onChange={(e) => setHasProgrammedSavings(e.target.checked)} className="h-4 w-4 rounded border-accent-500 text-accent-500 focus:ring-accent-500 cursor-pointer" />
                <div>
                  <label htmlFor="settingsProgrammedSavingsToggle" className="text-xs font-bold text-text-primary cursor-pointer flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-accent-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
                        <circle cx="12" cy="12" r="5" strokeWidth="1.8" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                      </svg>
                      Activar Ahorro Programado / Débito Automático
                    </span>
                    <span className="rounded bg-accent-500/20 text-accent-400 px-2 py-0.5 text-[10px] font-semibold">Descontado a Fin de Mes</span>
                  </label>
                  <p className="text-[11px] text-text-muted">Se reserva automáticamente del pago del día 30.</p>
                </div>
              </div>
              {hasProgrammedSavings && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-medium">Monto:</span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs">$</span>
                    <input type="number" inputMode="decimal" step="0.01" min="1" value={programmedSavingsAmount} onChange={(e) => setProgrammedSavingsAmount(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-accent-500/40 bg-surface-50 pl-6 pr-2 py-1 text-xs font-bold text-accent-400 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
            {hasProgrammedSavings && (
              <div className="flex justify-between items-center text-xs pt-3 border-t border-accent-500/20 text-text-muted">
                <span>Reserva mensual a Fin de Mes:</span>
                <strong className="text-accent-400 text-sm">-{formatCurrency(programmedSavingsAmount)}</strong>
              </div>
            )}
          </div>

          {/* Modalidad de Cobro */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-text-secondary">Modalidad de Cobro en el Mes</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => setPaymentScheme('quincena_fin_mes')} className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${paymentScheme === 'quincena_fin_mes' ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-sm ring-1 ring-brand-500' : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'}`}>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="17" rx="3" strokeWidth="1.8" />
                    <line x1="3" y1="9" x2="21" y2="9" strokeWidth="1.8" />
                    <line x1="8" y1="2" x2="8" y2="5" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="16" y1="2" x2="16" y2="5" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span>Quincena y Fin de Mes</span>
                </div>
                <div className="mt-1 text-[11px] opacity-80">Anticipo el día 15 y saldo el 30</div>
              </button>
              <button type="button" onClick={() => setPaymentScheme('monthly')} className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${paymentScheme === 'monthly' ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-sm ring-1 ring-brand-500' : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'}`}>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="3" strokeWidth="1.8" />
                    <line x1="2" y1="10" x2="22" y2="10" strokeWidth="1.8" />
                    <line x1="6" y1="15" x2="8" y2="15" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="11" y1="15" x2="13" y2="15" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span>Un Solo Pago</span>
                </div>
                <div className="mt-1 text-[11px] opacity-80">100% cobrado a fin de mes</div>
              </button>
            </div>
          </div>

          {/* Quincena & Fin de Mes Amounts */}
          {paymentScheme === 'quincena_fin_mes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-border-default bg-surface-100 p-4">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[11px] font-semibold text-text-secondary">Anticipo Quincena (Día 15)</label>
                  {splitMode === 'manual' && (
                    <button
                      type="button"
                      onClick={() => setSplitMode('auto')}
                      title="Volver al reparto automático 50/50"
                      className="inline-flex items-center gap-1 rounded bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-400 hover:bg-brand-500/20 cursor-pointer"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>50/50</span>
                    </button>
                  )}
                </div>
                <input type="number" inputMode="decimal" step="0.01" min="0" value={quincenaAmount} onChange={(e) => { setSplitMode('manual'); setQuincenaAmount(parseFloat(e.target.value) || 0); }} className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none" />
                {splitMode === 'manual' && (
                  <p className="mt-1 text-[10px] text-text-muted">Reparto personalizado: se conserva al guardar.</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Saldo Fin de Mes (Día 30) {hasProgrammedSavings && '(Tras Ahorro)'}</label>
                <input type="number" inputMode="decimal" step="0.01" min="0" value={finDeMesAmount} onChange={(e) => setFinDeMesAmount(parseFloat(e.target.value) || 0)} className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
          )}

          {/* Live Summary */}
          <div className="rounded-2xl border border-accent-500/30 bg-accent-500/10 p-5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-accent-400 block">Sueldo Neto Líquido Total:</span>
                <span className="text-xs text-text-muted">Bruto ({formatCurrency(salaryAmount)}) - IESS ({formatCurrency(iessDeduction)})</span>
              </div>
              <div className="text-2xl font-extrabold text-accent-400">{formatCurrency(netSalary)}</div>
            </div>
            {hasProgrammedSavings && (
              <div className="pt-2 border-t border-accent-500/20 flex justify-between text-xs text-text-secondary">
                <span>Disponible a Fin de Mes tras Ahorro ({formatCurrency(activeSavings)}):</span>
                <strong className="text-text-primary font-bold">{formatCurrency(finDeMesAmount)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ═══ BENEFICIOS DE LEY ECUADOR ═══ */}
        <div className="rounded-3xl border border-border-default bg-surface-50 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-border-default pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/20 text-warning-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3v18m-7-5l7-13 7 13M5 16a3.5 3.5 0 0 1-3.5-3.5h7A3.5 3.5 0 0 1 5 16zm14 0a3.5 3.5 0 0 1-3.5-3.5h7a3.5 3.5 0 0 1-3.5 3.5zM8 21h8" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Beneficios de Ley (Ecuador)</h3>
              <p className="text-xs text-text-muted">Configura fondos de reserva, décimos y utilidades. Se reflejan en el Dashboard.</p>
            </div>
          </div>

          {/* Fondos de Reserva */}
          <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="hasFondosReserva" checked={hasFondosReserva} onChange={(e) => setHasFondosReserva(e.target.checked)} className="h-4 w-4 rounded border-brand-500 text-brand-500 focus:ring-brand-500 cursor-pointer" />
                <div>
                  <label htmlFor="hasFondosReserva" className="text-xs font-bold text-text-primary cursor-pointer flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Fondos de Reserva (8.33%)</span>
                  </label>
                  <p className="text-[11px] text-text-muted">Se genera después de cumplir 1 año en la empresa</p>
                </div>
              </div>
              {hasFondosReserva && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setFondosReservaMensualizado(true)} className={`rounded-lg px-3 py-1 text-[11px] font-semibold cursor-pointer ${fondosReservaMensualizado ? 'bg-brand-500/15 text-brand-400 border border-brand-500' : 'bg-surface-100 text-text-muted border border-border-default'}`}>Mensualizado</button>
                  <button type="button" onClick={() => setFondosReservaMensualizado(false)} className={`rounded-lg px-3 py-1 text-[11px] font-semibold cursor-pointer ${!fondosReservaMensualizado ? 'bg-brand-500/15 text-brand-400 border border-brand-500' : 'bg-surface-100 text-text-muted border border-border-default'}`}>Acumulado en IESS</button>
                </div>
              )}
            </div>
            {hasFondosReserva && (
              <div className="flex justify-between items-center text-xs pt-3 border-t border-brand-500/20 text-text-muted">
                <span>Fondos de Reserva mensual (1/12 de {formatCurrency(salaryAmount)}):</span>
                <strong className="text-brand-400 text-sm">{formatCurrency(fondosReservaMensual)}/mes</strong>
              </div>
            )}
          </div>

          {/* Décimo Tercer Sueldo */}
          <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-warning-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="8" width="18" height="13" rx="2" strokeWidth="1.8" />
                    <line x1="12" y1="8" x2="12" y2="21" strokeWidth="1.8" />
                    <line x1="3" y1="13" x2="21" y2="13" strokeWidth="1.8" />
                  </svg>
                  <span>Décimo Tercer Sueldo</span>
                </span>
                <p className="text-[11px] text-text-muted">1/12 del sueldo = {formatCurrency(decimoTerceroMensual)}/mes · Pago en Diciembre o Mensualizado</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDecimoTerceroMensualizado(true)} className={`rounded-lg px-3 py-1 text-[11px] font-semibold cursor-pointer ${decimoTerceroMensualizado ? 'bg-warning-500/15 text-warning-400 border border-warning-500' : 'bg-surface-100 text-text-muted border border-border-default'}`}>Mensualizado</button>
                <button type="button" onClick={() => setDecimoTerceroMensualizado(false)} className={`rounded-lg px-3 py-1 text-[11px] font-semibold cursor-pointer ${!decimoTerceroMensualizado ? 'bg-warning-500/15 text-warning-400 border border-warning-500' : 'bg-surface-100 text-text-muted border border-border-default'}`}>Pago en Diciembre</button>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs pt-3 border-t border-warning-500/20 text-text-muted">
              <span>{decimoTerceroMensualizado ? 'Recibes cada mes:' : 'Recibes en Diciembre (anual):'}</span>
              <strong className="text-warning-400 text-sm">{formatCurrency(decimoTerceroMensualizado ? decimoTerceroMensual : salaryAmount)}</strong>
            </div>
          </div>

          {/* Décimo Cuarto Sueldo */}
          <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-warning-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4l9 5-9 5-9-5 9-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 11.5v4.5c0 2 3.6 3.6 8 3.6s8-1.6 8-3.6v-4.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 9v6" />
                  </svg>
                  <span>Décimo Cuarto Sueldo (Bono Escolar)</span>
                </span>
                <p className="text-[11px] text-text-muted">1 SBU = {formatCurrency(sbuEfectivo)} · Pago en {region === 'costa' ? 'Marzo (Costa)' : 'Agosto (Sierra)'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDecimoCuartoMensualizado(true)} className={`rounded-lg px-3 py-1 text-[11px] font-semibold cursor-pointer ${decimoCuartoMensualizado ? 'bg-warning-500/15 text-warning-400 border border-warning-500' : 'bg-surface-100 text-text-muted border border-border-default'}`}>Mensualizado</button>
                <button type="button" onClick={() => setDecimoCuartoMensualizado(false)} className={`rounded-lg px-3 py-1 text-[11px] font-semibold cursor-pointer ${!decimoCuartoMensualizado ? 'bg-warning-500/15 text-warning-400 border border-warning-500' : 'bg-surface-100 text-text-muted border border-border-default'}`}>Pago Anual</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-warning-500/20">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">Región</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRegion('costa')} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold cursor-pointer ${region === 'costa' ? 'bg-brand-500/15 text-brand-400 border border-brand-500' : 'bg-surface-100 text-text-muted border border-border-default'}`}>
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
                      <path strokeLinecap="round" strokeWidth="1.8" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                    </svg>
                    <span>Costa (Marzo)</span>
                  </button>
                  <button type="button" onClick={() => setRegion('sierra')} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold cursor-pointer ${region === 'sierra' ? 'bg-brand-500/15 text-brand-400 border border-brand-500' : 'bg-surface-100 text-text-muted border border-border-default'}`}>
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 20l7-12 5 8 2-3 4 7H3z" />
                    </svg>
                    <span>Sierra (Agosto)</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">SBU Vigente ($)</label>
                <input type="number" inputMode="decimal" step="0.01" min="1" value={sbuInput} onChange={(e) => setSbuInput(e.target.value)} placeholder={String(DEFAULT_SBU)} className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-1.5 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-text-muted">
              <span>{decimoCuartoMensualizado ? 'Recibes cada mes:' : `Recibes en ${region === 'costa' ? 'Marzo' : 'Agosto'} (anual):`}</span>
              <strong className="text-warning-400 text-sm">{formatCurrency(decimoCuartoMensualizado ? decimoCuartoMensual : sbuEfectivo)}</strong>
            </div>
          </div>

          {/* Utilidades */}
          <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="hasUtilidades" checked={hasUtilidades} onChange={(e) => setHasUtilidades(e.target.checked)} className="h-4 w-4 rounded border-accent-500 text-accent-500 focus:ring-accent-500 cursor-pointer" />
                <div>
                  <label htmlFor="hasUtilidades" className="text-xs font-bold text-text-primary cursor-pointer flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-accent-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="17 6 23 6 23 12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>La empresa reparte Utilidades (15%)</span>
                  </label>
                  <p className="text-[11px] text-text-muted">Si tu empresa no reparte utilidades (sin fines de lucro, pública, etc.), desactiva esto.</p>
                </div>
              </div>
              {hasUtilidades && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-medium">Monto:</span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs">$</span>
                    <input type="number" inputMode="decimal" step="0.01" min="0" value={utilidadesAmount} onChange={(e) => setUtilidadesAmount(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-accent-500/40 bg-surface-50 pl-6 pr-2 py-1 text-xs font-bold text-accent-400 focus:outline-none" placeholder="0.00" />
                  </div>
                </div>
              )}
            </div>
            {hasUtilidades && utilidadesAmount > 0 && (
              <div className="flex justify-between items-center text-xs pt-3 border-t border-accent-500/20 text-text-muted">
                <span>Utilidades mensualizadas ({formatCurrency(utilidadesAmount)}/año):</span>
                <strong className="text-accent-400 text-sm">{formatCurrency(utilidadesMensual)}/mes</strong>
              </div>
            )}
          </div>

          {/* Resumen de Beneficios */}
          <div className="rounded-2xl border border-border-default bg-surface-100 p-5">
            <h4 className="text-xs font-bold text-text-primary mb-3 flex items-center gap-1.5">
              <svg className="h-4 w-4 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              <span>Resumen de Beneficios Mensualizados</span>
            </h4>
            <div className="space-y-2 text-xs">
              {hasFondosReserva && (
                <div className="flex justify-between text-text-secondary">
                  <span>Fondos de Reserva (8.33%) {!fondosReservaMensualizado && <span className="text-text-muted">(acumulado en IESS)</span>}</span>
                  <strong className={fondosReservaMensualizado ? 'text-brand-400' : 'text-text-muted'}>{formatCurrency(fondosReservaMensual)}</strong>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <span>Décimo 13ro (1/12 sueldo) {!decimoTerceroMensualizado && <span className="text-text-muted">(pago en Dic)</span>}</span>
                <strong className={decimoTerceroMensualizado ? 'text-warning-400' : 'text-text-muted'}>{formatCurrency(decimoTerceroMensual)}</strong>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Décimo 14to (1 SBU) {!decimoCuartoMensualizado && <span className="text-text-muted">(pago en {region === 'costa' ? 'Mar' : 'Ago'})</span>}</span>
                <strong className={decimoCuartoMensualizado ? 'text-warning-400' : 'text-text-muted'}>{formatCurrency(decimoCuartoMensual)}</strong>
              </div>
              {hasUtilidades && utilidadesAmount > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Utilidades (estimado)</span>
                  <strong className="text-accent-400">{formatCurrency(utilidadesMensual)}</strong>
                </div>
              )}
              <div className="flex justify-between text-text-primary pt-2 border-t border-border-default font-bold">
                <span>Total ingreso adicional mensualizado:</span>
                <span className="text-lg text-accent-400">+{formatCurrency(totalBeneficiosMensual)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-brand-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 hover:shadow-brand-400/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{saving ? 'Guardando cambios...' : 'Guardar y Actualizar Dashboard'}</span>
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
