import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { calculateSalaryDetails } from '@/modules/financial-engine/cashflow';
import { calculateBenefits } from '@/modules/financial-engine/benefits';
import {
  calculateSeverance,
  calculateTenure,
  getEmergentContractInfo,
} from '@/modules/financial-engine/severance';
import { DEFAULT_SBU, round } from '@/modules/financial-engine/constants';
import type { Income } from '@/modules/financial-engine/types';
import { notifyFinancialSync } from '@/stores/sync';
import {
  Briefcase, Calendar, ShieldCheck, ShieldAlert, AlertTriangle,
  CheckCircle2, DollarSign, Clock, HelpCircle, Info, ChevronRight,
  Sparkles, Save, FileText, ArrowRight, Percent, Scale, Award, X, TrendingUp
} from 'lucide-react';

export default function SettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    title: string;
    description: string;
  } | null>(null);

  // Auto-dismiss corner toast after 4.5s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

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

  // 📅 Vínculo Laboral y Contrato
  const [workStartDate, setWorkStartDate] = useState<string>('');
  const [contractType, setContractType] = useState<'indefinite' | 'emergente'>('indefinite');
  const [contractDurationMonths, setContractDurationMonths] = useState<number>(12);

  // 📈 Variación Salarial y Horas Extras (Art. 111 y 95)
  const [hasSalaryChange, setHasSalaryChange] = useState(false);
  const [previousSalaryAmount, setPreviousSalaryAmount] = useState<number>(504.21);
  const [salaryChangeDate, setSalaryChangeDate] = useState<string>('2026-09-01');
  const [monthlyOvertimeAmount, setMonthlyOvertimeAmount] = useState<number>(0);

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

  // UI Interactive simulator tab
  const [severanceTab, setSeveranceTab] = useState<'resignation' | 'dismissal'>('resignation');

  const sbuAmount = parseFloat(sbuInput) || 0; // el motor usa el SBU default si queda en 0
  const sbuEfectivo = sbuAmount > 0 ? sbuAmount : DEFAULT_SBU;

  // El mismo objeto Income que usa el motor
  const draftIncome: Income = {
    id: salaryId || '',
    name: salaryName,
    amount: salaryAmount || 0,
    frequency: 'monthly',
    isSalary: true,
    paymentScheme,
    quincenaAmount: 0,
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
    workStartDate: workStartDate || null,
    contractType,
    contractDurationMonths,
    hasSalaryChange,
    previousSalaryAmount: Number(previousSalaryAmount),
    salaryChangeDate: salaryChangeDate || null,
    monthlyOvertimeAmount: Number(monthlyOvertimeAmount),
  };

  // Live recalculation (motor financiero)
  useEffect(() => {
    const details = calculateSalaryDetails(draftIncome);
    const savings = hasProgrammedSavings && programmedSavingsAmount > 0 ? programmedSavingsAmount : 0;

    if (paymentScheme !== 'quincena_fin_mes') {
      setQuincenaAmount(0);
      setFinDeMesAmount(details.finDeMesAmount);
    } else if (splitMode === 'manual') {
      setFinDeMesAmount(round(Math.max(0, details.netMonthly - quincenaAmount - savings)));
    } else {
      setQuincenaAmount(details.quincenaAmount);
      setFinDeMesAmount(details.finDeMesAmount);
    }
  }, [
    salaryAmount,
    deductIess,
    iessPercentage,
    paymentScheme,
    hasProgrammedSavings,
    programmedSavingsAmount,
    splitMode,
    quincenaAmount,
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incomes');
      const json = await res.json();

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

        // Vínculo laboral
        if (principal.workStartDate) {
          const rawDate = typeof principal.workStartDate === 'string'
            ? principal.workStartDate.slice(0, 10)
            : '';
          setWorkStartDate(rawDate);
        }
        setContractType(principal.contractType || 'indefinite');
        setContractDurationMonths(Number(principal.contractDurationMonths) || 12);

        // Variación Salarial y Horas Extras
        setHasSalaryChange(!!principal.hasSalaryChange);
        setPreviousSalaryAmount(Number(principal.previousSalaryAmount) || 504.21);
        if (principal.salaryChangeDate) {
          const rawDate = typeof principal.salaryChangeDate === 'string'
            ? principal.salaryChangeDate.slice(0, 10)
            : '';
          setSalaryChangeDate(rawDate);
        }
        setMonthlyOvertimeAmount(Number(principal.monthlyOvertimeAmount) || 0);

        // Reparto quincena/fin de mes
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
    setToast(null);

    try {
      const url = '/api/incomes';
      const res = await fetch(url, {
        method: salaryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(salaryId ? { id: salaryId } : {}),
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
          workStartDate: workStartDate || null,
          contractType,
          contractDurationMonths: Number(contractDurationMonths),
          hasSalaryChange,
          previousSalaryAmount: Number(previousSalaryAmount),
          salaryChangeDate: salaryChangeDate || null,
          monthlyOvertimeAmount: Number(monthlyOvertimeAmount),
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
      setToast({
        type: 'success',
        title: '¡Configuración Guardada!',
        description: 'Se actualizaron tu sueldo, contrato, beneficios y liquidación con éxito.',
      });
      notifyFinancialSync();
    } catch (err: any) {
      setToast({
        type: 'error',
        title: 'Error al guardar',
        description: err.message || 'No se pudo guardar la configuración salarial.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-3"></div>
        Cargando configuración laboral y salarial...
      </div>
    );
  }

  // Cálculos del motor financiero y liquidaciones
  const salaryDetails = calculateSalaryDetails(draftIncome);
  const benefits = calculateBenefits(draftIncome);
  const severance = calculateSeverance({
    salary: salaryAmount || 0,
    sbu: sbuEfectivo,
    workStartDate: workStartDate || null,
    contractType,
    contractDurationMonths,
    region,
    decimoTerceroMensualizado,
    decimoCuartoMensualizado,
    hasSalaryChange,
    previousSalaryAmount: Number(previousSalaryAmount),
    salaryChangeDate: salaryChangeDate || null,
    monthlyOvertimeAmount: Number(monthlyOvertimeAmount),
  });

  const tenure = severance.tenure;
  const emergentInfo = severance.emergentInfo;
  const iessDeduction = salaryDetails.iessDeduction;
  const netSalary = salaryDetails.netMonthly;
  const activeSavings = salaryDetails.programmedSavings;
  const fondosReservaMensual = benefits.fondosReservaMonthly;
  const decimoTerceroMensual = benefits.decimoTerceroMonthly;
  const decimoCuartoMensual = benefits.decimoCuartoMonthly;
  const utilidadesMensual = benefits.utilidadesMonthly;
  const totalBeneficiosMensual = round(benefits.monthlyRecurring + benefits.utilidadesMonthly);

  const activeSeverance = severanceTab === 'resignation' ? severance.resignation : severance.dismissal;

  return (
    <div className="w-full space-y-6">
      {/* Floating Corner Notification (Toast) */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed top-4 right-4 left-4 sm:left-auto sm:top-5 sm:right-6 z-[70] flex items-start gap-3.5 rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in fade-in slide-in-from-top-3 sm:slide-in-from-right-6 sm:max-w-md sm:w-full ${
            toast.type === 'success'
              ? 'bg-surface-50/95 border-accent-500/40 text-accent-400 shadow-accent-500/20 ring-1 ring-accent-500/30'
              : 'bg-surface-50/95 border-danger-500/40 text-danger-400 shadow-danger-500/20 ring-1 ring-danger-500/30'
          }`}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
              toast.type === 'success' ? 'bg-accent-500/20 text-accent-400' : 'bg-danger-500/20 text-danger-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="text-sm font-bold text-text-primary tracking-tight">{toast.title}</div>
            <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{toast.description}</div>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-100 cursor-pointer transition-colors shrink-0"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight flex items-center gap-2.5">
            <Briefcase className="h-6 w-6 text-brand-400" />
            Configuración Laboral y Salarial
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            Gestiona tu contrato, sueldo neto, beneficios de ley y simulador de liquidación oficial en Ecuador.
          </p>
        </div>

        {/* Global Save Button in header for convenience */}
        <button
          type="button"
          onClick={handleSaveSalary}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

      {/* Main 2-Column Responsive Dashboard */}
      <form onSubmit={handleSaveSalary}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ═══════════════════════════════════════════
              LEFT COLUMN: Form Inputs (7 Cols)
          ═══════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6">

            {/* CARD 1: Sueldo Principal */}
            <div className="rounded-3xl border border-border-default bg-surface-50 p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Ajuste de Sueldo e Ingreso Mensual</h3>
                  <p className="text-xs text-text-muted">Ingresa tu salario bruto nominal registrado en tu rol de pagos.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Nombre o Cargo del Empleo</label>
                  <input
                    type="text"
                    value={salaryName}
                    onChange={(e) => setSalaryName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                    placeholder="Ej. Desarrollador / Consultor"
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

              {/* Variación de Sueldo y Horas Extras */}
              <div className="rounded-2xl border border-brand-500/25 bg-brand-500/5 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="settingsSalaryChangeToggle"
                      checked={hasSalaryChange}
                      onChange={(e) => setHasSalaryChange(e.target.checked)}
                      className="h-4 w-4 rounded border-brand-500 text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="settingsSalaryChangeToggle" className="text-xs font-bold text-text-primary cursor-pointer flex items-center gap-1.5 flex-wrap">
                        <TrendingUp className="h-3.5 w-3.5 text-brand-400" />
                        <span>¿Tuviste aumento o cambio de sueldo este año?</span>
                        <span className="rounded bg-brand-500/20 text-brand-400 px-1.5 py-0.5 text-[9px] font-bold">Art. 111</span>
                      </label>
                      <p className="text-[11px] text-text-muted">
                        Pondera tu sueldo anterior y tu sueldo nuevo en el décimo de navidad según los meses trabajados
                      </p>
                    </div>
                  </div>
                </div>

                {hasSalaryChange && (
                  <div className="pt-2 border-t border-brand-500/20 space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          Sueldo Anterior ($ USD)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs">$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={previousSalaryAmount}
                            onChange={(e) => setPreviousSalaryAmount(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-xl border border-border-default bg-surface-50 pl-7 pr-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                            placeholder="504.21"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                          Mes en que empezó el nuevo sueldo
                        </label>
                        <input
                          type="date"
                          value={salaryChangeDate}
                          onChange={(e) => setSalaryChangeDate(e.target.value)}
                          className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-100/90 border border-brand-500/20 text-xs text-text-secondary leading-relaxed flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-text-primary block font-bold">Cálculo Ponderado Oficial:</strong>
                        <span>
                          Tu décimo de diciembre proyectado es de <strong className="text-accent-400 font-bold">{formatCurrency(benefits.decimoTerceroAnnual)}</strong> (ponderando tu sueldo anterior de {formatCurrency(previousSalaryAmount)} con tu nuevo sueldo de {formatCurrency(salaryAmount)}).
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Horas extras / Comisiones */}
                <div className="pt-3 border-t border-brand-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-text-primary flex items-center gap-1.5 flex-wrap">
                      <span>Horas Extras / Comisiones Promedio ($ USD/mes)</span>
                      <span className="rounded bg-accent-500/20 text-accent-400 px-1.5 py-0.5 text-[9px] font-bold">Art. 95</span>
                    </label>
                    <p className="text-[11px] text-text-muted">
                      Ingresos imponibles regulares que suman a la bolsa anual del décimo de navidad
                    </p>
                  </div>
                  <div className="relative w-full sm:w-36 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={monthlyOvertimeAmount}
                      onChange={(e) => setMonthlyOvertimeAmount(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-border-default bg-surface-50 pl-7 pr-3 py-2 text-xs font-bold text-accent-400 focus:border-brand-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* IESS */}
              <div className="rounded-2xl border border-border-default bg-surface-100/70 p-4 space-y-3">
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
                      <p className="text-[11px] text-text-muted">Aporte legal sobre tu salario nominal bruto</p>
                    </div>
                  </div>
                  {deductIess && (
                    <select
                      value={iessPercentage}
                      onChange={(e) => setIessPercentage(parseFloat(e.target.value))}
                      className="rounded-lg border border-border-default bg-surface-50 px-2.5 py-1 text-xs font-bold text-warning-400 focus:outline-none"
                    >
                      <option value={9.45}>9.45% (Sector privado / Dependencia)</option>
                      <option value={11.45}>11.45% (Sector público)</option>
                      <option value={17.60}>17.60% (Afiliación voluntaria)</option>
                      <option value={20.60}>20.60% (Sin relación de dependencia)</option>
                    </select>
                  )}
                </div>
                {deductIess && (
                  <div className="flex justify-between items-center text-xs pt-2.5 border-t border-border-default text-text-muted">
                    <span>Aporte personal mensual al IESS ({iessPercentage}%):</span>
                    <strong className="text-warning-400 text-sm">-{formatCurrency(iessDeduction)}</strong>
                  </div>
                )}
              </div>

              {/* Ahorro Programado */}
              <div className="rounded-2xl border border-accent-500/25 bg-accent-500/5 p-4 space-y-3">
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
                      <label htmlFor="settingsProgrammedSavingsToggle" className="text-xs font-bold text-text-primary cursor-pointer flex items-center gap-1.5">
                        <span>Ahorro Programado a Fin de Mes</span>
                        <span className="rounded bg-accent-500/20 text-accent-400 px-1.5 py-0.5 text-[9px] font-semibold">Día 30</span>
                      </label>
                      <p className="text-[11px] text-text-muted">Se separa automáticamente antes de calcular tu saldo libre</p>
                    </div>
                  </div>
                  {hasProgrammedSavings && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted font-medium">Monto:</span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="1"
                          value={programmedSavingsAmount}
                          onChange={(e) => setProgrammedSavingsAmount(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-accent-500/40 bg-surface-50 pl-6 pr-2 py-1 text-xs font-bold text-accent-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {hasProgrammedSavings && (
                  <div className="flex justify-between items-center text-xs pt-2.5 border-t border-accent-500/20 text-text-muted">
                    <span>Reserva mensual a Fin de Mes:</span>
                    <strong className="text-accent-400 text-sm">-{formatCurrency(programmedSavingsAmount)}</strong>
                  </div>
                )}
              </div>

              {/* Modalidad de Cobro */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-text-secondary">Modalidad de Cobro en el Mes</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentScheme('quincena_fin_mes')}
                    className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                      paymentScheme === 'quincena_fin_mes'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-sm ring-1 ring-brand-500'
                        : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>Quincena y Fin de Mes</span>
                    </div>
                    <div className="mt-1 text-[11px] opacity-80">Anticipo el día 15 y saldo el 30</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentScheme('monthly')}
                    className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                      paymentScheme === 'monthly'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-sm ring-1 ring-brand-500'
                        : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>Un Solo Pago Mensual</span>
                    </div>
                    <div className="mt-1 text-[11px] opacity-80">100% cobrado al cierre de mes</div>
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
                          <span>50/50 auto</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={quincenaAmount}
                      onChange={(e) => {
                        setSplitMode('manual');
                        setQuincenaAmount(parseFloat(e.target.value) || 0);
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
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={finDeMesAmount}
                      onChange={(e) => setFinDeMesAmount(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: Vínculo Laboral, Fecha de Inicio y Tipo de Contrato */}
            <div className="rounded-3xl border border-border-default bg-surface-50 p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Vínculo Laboral y Tipo de Contrato</h3>
                  <p className="text-xs text-text-muted">
                    Define la fecha de inicio y modalidad contractual para calcular antigüedad, décimos y liquidación.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-brand-400" />
                    <span>Fecha de Inicio que entró a laborar</span>
                  </label>
                  <input
                    type="date"
                    value={workStartDate}
                    onChange={(e) => setWorkStartDate(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                  {workStartDate && (
                    <p className="text-[11px] text-accent-400 font-medium mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      Antigüedad: {tenure.formatted}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Tipo de Contrato</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setContractType('indefinite')}
                      className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all cursor-pointer ${
                        contractType === 'indefinite'
                          ? 'border-brand-500 bg-brand-500/15 text-brand-400 ring-1 ring-brand-500'
                          : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                      }`}
                    >
                      Indefinido
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractType('emergente')}
                      className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all cursor-pointer ${
                        contractType === 'emergente'
                          ? 'border-warning-500 bg-warning-500/15 text-warning-400 ring-1 ring-warning-500'
                          : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                      }`}
                    >
                      Emergente
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1.5">
                    {contractType === 'indefinite'
                      ? 'Régimen general con estabilidad indefinida.'
                      : 'Ley Orgánica de Apoyo Humanitario (plazo máx 2 años).'}
                  </p>
                </div>
              </div>

              {/* Si es Contrato Emergente: Opciones Especiales */}
              {contractType === 'emergente' && (
                <div className="rounded-2xl border border-warning-500/30 bg-warning-500/5 p-4 sm:p-5 space-y-4 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-warning-500/20 text-warning-400 text-[10px] font-bold px-2 py-0.5">
                          Ley Humanitaria Art. 19
                        </span>
                        <h4 className="text-xs font-bold text-text-primary">Condiciones del Contrato Emergente</h4>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                        Este contrato se celebra por un plazo de <strong>hasta 1 año</strong>, renovable por una sola vez hasta por <strong>1 año adicional</strong> (máximo 24 meses).
                      </p>
                    </div>

                    <div className="w-full sm:w-44 shrink-0">
                      <label className="block text-[10px] font-bold text-text-secondary mb-1">Duración Pactada:</label>
                      <select
                        value={contractDurationMonths}
                        onChange={(e) => setContractDurationMonths(parseInt(e.target.value, 10))}
                        className="w-full max-w-full rounded-xl border border-warning-500/40 bg-surface-100 sm:bg-surface-50 px-3 py-2 text-xs font-bold text-warning-400 focus:border-warning-500 focus:outline-none focus:ring-1 focus:ring-warning-500 cursor-pointer"
                      >
                        <option value={6}>6 meses</option>
                        <option value={12}>12 meses (1 año)</option>
                        <option value={18}>18 meses (1.5 años)</option>
                        <option value={24}>24 meses (2 años máx)</option>
                      </select>
                    </div>
                  </div>

                  {/* Resumen de derechos de liquidación del contrato emergente */}
                  <div className="rounded-xl bg-surface-0/70 border border-border-default p-3 sm:p-4 space-y-2 text-xs">
                    <div className="font-bold text-text-primary flex items-center gap-1.5 flex-wrap">
                      <Scale className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                      <span>¿Da derecho a liquidación el contrato emergente?</span>
                    </div>
                    <ul className="text-[11px] text-text-muted space-y-1.5 pl-4 list-disc leading-relaxed">
                      <li>
                        <strong className="text-text-primary">Al terminar el plazo acordado:</strong> <strong className="text-accent-400">SÍ recibes liquidación</strong> de haberes proporcionales (Décimo 13ro, Décimo 14to, vacaciones) y <strong>bonificación por desahucio</strong> (25% por año).
                      </li>
                      <li>
                        <strong className="text-text-primary">Si te despiden antes del plazo:</strong> Tienes derecho adicional a la <strong className="text-danger-400">indemnización por despido intempestivo</strong> (mínimo 3 meses).
                      </li>
                      <li>
                        <strong className="text-text-primary">Al superar los 2 años:</strong> Pasa automáticamente a ser <strong className="text-brand-400">Contrato Indefinido</strong> con estabilidad laboral plena.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 3: Beneficios de Ley Ecuador */}
            <div className="rounded-3xl border border-border-default bg-surface-50 p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border-default pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/15 text-warning-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Beneficios de Ley (Ecuador)</h3>
                  <p className="text-xs text-text-muted">Fondos de reserva, décimos y utilidades para tu rol y proyecciones.</p>
                </div>
              </div>

              {/* Fondos de Reserva */}
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="hasFondosReserva"
                      checked={hasFondosReserva}
                      onChange={(e) => setHasFondosReserva(e.target.checked)}
                      className="h-4 w-4 rounded border-brand-500 text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="hasFondosReserva" className="text-xs font-bold text-text-primary cursor-pointer">
                        Fondos de Reserva (8.33% / 1 mes por año)
                      </label>
                      <p className="text-[11px] text-text-muted">
                        {tenure.years >= 1
                          ? `✓ Cumples con el requisito de 1 año (${tenure.years} años laborando)`
                          : 'Aplica a partir del 13er mes de labores continuas en la empresa'}
                      </p>
                    </div>
                  </div>
                  {hasFondosReserva && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFondosReservaMensualizado(true)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                          fondosReservaMensualizado ? 'bg-brand-500/15 text-brand-400 border border-brand-500' : 'bg-surface-100 text-text-muted border border-border-default'
                        }`}
                      >
                        En rol mensual
                      </button>
                      <button
                        type="button"
                        onClick={() => setFondosReservaMensualizado(false)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                          !fondosReservaMensualizado ? 'bg-brand-500/15 text-brand-400 border border-brand-500' : 'bg-surface-100 text-text-muted border border-border-default'
                        }`}
                      >
                        Acumulado IESS
                      </button>
                    </div>
                  )}
                </div>
                {hasFondosReserva && (
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-brand-500/20 text-text-muted">
                    <span>Monto de Fondos de Reserva (1/12):</span>
                    <strong className="text-brand-400 text-sm">{formatCurrency(fondosReservaMensual)}/mes</strong>
                  </div>
                )}
              </div>

              {/* Décimo Tercer Sueldo */}
              <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-text-primary block">Décimo Tercer Sueldo (Bono Navideño)</span>
                    <p className="text-[11px] text-text-muted">1/12 de todo lo percibido en el año ({formatCurrency(decimoTerceroMensual)}/mes)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDecimoTerceroMensualizado(true)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                        decimoTerceroMensualizado ? 'bg-warning-500/15 text-warning-400 border border-warning-500' : 'bg-surface-100 text-text-muted border border-border-default'
                      }`}
                    >
                      Mensualizado
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecimoTerceroMensualizado(false)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                        !decimoTerceroMensualizado ? 'bg-warning-500/15 text-warning-400 border border-warning-500' : 'bg-surface-100 text-text-muted border border-border-default'
                      }`}
                    >
                      Acumulado en Dic
                    </button>
                  </div>
                </div>
                {!decimoTerceroMensualizado && (
                  <div className="flex justify-between items-center text-xs pt-2.5 border-t border-warning-500/20 text-text-muted">
                    <div>
                      <span className="font-semibold text-text-primary block">Proyección a cobrar en Diciembre:</span>
                      {hasSalaryChange && (
                        <span className="text-[10px] text-accent-400 block mt-0.5 font-medium">
                          Ponderado por aumento salarial (Art. 111)
                        </span>
                      )}
                    </div>
                    <strong className="text-warning-400 text-sm font-black">
                      {formatCurrency(benefits.decimoTerceroAnnual)}
                    </strong>
                  </div>
                )}
              </div>

              {/* Décimo Cuarto Sueldo */}
              <div className="rounded-2xl border border-warning-500/20 bg-warning-500/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-text-primary block">Décimo Cuarto Sueldo (Bono Escolar)</span>
                    <p className="text-[11px] text-text-muted">1 SBU = {formatCurrency(sbuEfectivo)} ({formatCurrency(decimoCuartoMensual)}/mes)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDecimoCuartoMensualizado(true)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                        decimoCuartoMensualizado ? 'bg-warning-500/15 text-warning-400 border border-warning-500' : 'bg-surface-100 text-text-muted border border-border-default'
                      }`}
                    >
                      Mensualizado
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecimoCuartoMensualizado(false)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                        !decimoCuartoMensualizado ? 'bg-warning-500/15 text-warning-400 border border-warning-500' : 'bg-surface-100 text-text-muted border border-border-default'
                      }`}
                    >
                      Pago Anual
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-warning-500/20">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">Región de Régimen Escolar</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRegion('costa')}
                        className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                          region === 'costa' ? 'bg-brand-500/15 text-brand-400 border border-brand-500' : 'bg-surface-100 text-text-muted border border-border-default'
                        }`}
                      >
                        Costa (Marzo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegion('sierra')}
                        className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                          region === 'sierra' ? 'bg-brand-500/15 text-brand-400 border border-brand-500' : 'bg-surface-100 text-text-muted border border-border-default'
                        }`}
                      >
                        Sierra (Agosto)
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">SBU Vigente ($ USD)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="1"
                      value={sbuInput}
                      onChange={(e) => setSbuInput(e.target.value)}
                      placeholder={String(DEFAULT_SBU)}
                      className="w-full rounded-lg border border-border-default bg-surface-50 px-3 py-1 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Utilidades */}
              <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="hasUtilidades"
                      checked={hasUtilidades}
                      onChange={(e) => setHasUtilidades(e.target.checked)}
                      className="h-4 w-4 rounded border-accent-500 text-accent-500 focus:ring-accent-500 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="hasUtilidades" className="text-xs font-bold text-text-primary cursor-pointer">
                        La empresa reparte Utilidades (15%)
                      </label>
                      <p className="text-[11px] text-text-muted">Se pagan anualmente en Abril según las ganancias netas de la empresa</p>
                    </div>
                  </div>
                  {hasUtilidades && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted font-medium">Estimado anual:</span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={utilidadesAmount}
                          onChange={(e) => setUtilidadesAmount(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-accent-500/40 bg-surface-50 pl-6 pr-2 py-1 text-xs font-bold text-accent-400 focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 hover:shadow-brand-400/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Guardando cambios...' : 'Guardar y Sincronizar Sistema'}</span>
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              RIGHT COLUMN: Companion Live Dashboard (5 Cols)
              Fills the entire right side!
          ═══════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">

            {/* LIVE CARD A: Antigüedad y Estado del Contrato */}
            <div className="rounded-3xl border border-border-default bg-surface-50 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-brand-400" />
                  Vínculo Laboral
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  contractType === 'indefinite'
                    ? 'bg-accent-500/15 text-accent-400 border border-accent-500/30'
                    : emergentInfo.isOverTwoYears
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                      : 'bg-warning-500/15 text-warning-400 border border-warning-500/30'
                }`}>
                  {contractType === 'indefinite' ? 'Contrato Indefinido' : emergentInfo.statusLabel}
                </span>
              </div>

              {/* Antigüedad Display */}
              <div>
                <div className="text-2xl font-black text-text-primary tracking-tight">
                  {workStartDate ? tenure.formatted : 'Sin fecha configurada'}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {workStartDate
                    ? `Ingreso el ${new Date(`${workStartDate}T00:00:00`).toLocaleDateString('es-EC', { dateStyle: 'long' })}`
                    : 'Ingresa tu fecha de ingreso a la izquierda para activar los cálculos automáticos.'}
                </div>
              </div>

              {/* Emergente Contract Visual Meter */}
              {contractType === 'emergente' && (
                <div className="space-y-3 pt-3 border-t border-border-default">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Vigencia del Plazo:</span>
                    <strong className="text-text-primary">{emergentInfo.monthsWorked} de {contractDurationMonths} meses</strong>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative w-full h-3 rounded-full bg-surface-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        emergentInfo.isOverTwoYears
                          ? 'bg-gradient-to-r from-brand-500 to-accent-500'
                          : emergentInfo.isExpired
                            ? 'bg-gradient-to-r from-warning-500 to-danger-500'
                            : 'bg-gradient-to-r from-warning-500 to-brand-500'
                      }`}
                      style={{ width: `${Math.min(100, emergentInfo.progressPercent)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-text-secondary leading-relaxed bg-surface-100 p-3 rounded-xl border border-border-default/60">
                    {emergentInfo.legalNotice}
                  </p>
                </div>
              )}
            </div>

            {/* LIVE CARD B: Simulador de Liquidación Legal (Ecuador) */}
            <div className="rounded-3xl border border-brand-500/30 bg-gradient-to-b from-brand-500/5 to-surface-50 p-6 space-y-5 shadow-xl ring-1 ring-brand-500/20">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                    <Scale className="h-4 w-4 text-brand-400" />
                    Simulador de Liquidación Oficial
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Estimación exacta según el Código del Trabajo de Ecuador
                  </p>
                </div>
              </div>

              {/* Scenario Toggle Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-surface-100 p-1 rounded-2xl border border-border-default">
                <button
                  type="button"
                  onClick={() => setSeveranceTab('resignation')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    severanceTab === 'resignation'
                      ? 'bg-accent-500 text-white shadow-md shadow-accent-500/25'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  🟢 Si Renuncio
                </button>
                <button
                  type="button"
                  onClick={() => setSeveranceTab('dismissal')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    severanceTab === 'dismissal'
                      ? 'bg-danger-500 text-white shadow-md shadow-danger-500/25'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  🔴 Si me Despiden
                </button>
              </div>

              {/* Main Amount Box */}
              <div className={`p-4 rounded-2xl border text-center transition-all ${
                severanceTab === 'resignation'
                  ? 'border-accent-500/30 bg-accent-500/10'
                  : 'border-danger-500/30 bg-danger-500/10'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                  {severanceTab === 'resignation' ? 'Total por Renuncia Voluntaria' : 'Total por Despido Intempestivo'}
                </span>
                <div className={`text-3xl font-black mt-1 ${
                  severanceTab === 'resignation' ? 'text-accent-400' : 'text-danger-400'
                }`}>
                  {formatCurrency(activeSeverance.total)}
                </div>
                <span className="text-[11px] text-text-muted mt-1 block">
                  {severanceTab === 'resignation'
                    ? 'Haberes proporcionales acumulados + Desahucio'
                    : `Incluye +${formatCurrency(severance.dismissal.indemnityDismissal)} de indemnización por despido`}
                </span>
              </div>

              {/* Breakdown Table */}
              <div className="space-y-2 text-xs pt-1">
                <div className="flex justify-between items-center text-text-secondary py-1 border-b border-border-default/50">
                  <span className="flex items-center gap-1.5">
                    <span>Décimo 3ro proporcional</span>
                    <span className="text-[10px] text-text-muted">({decimoTerceroMensualizado ? 'mes en curso' : 'desde dic'})</span>
                  </span>
                  <strong className="text-text-primary font-bold">{formatCurrency(activeSeverance.decimoTercero)}</strong>
                </div>

                <div className="flex justify-between items-center text-text-secondary py-1 border-b border-border-default/50">
                  <span className="flex items-center gap-1.5">
                    <span>Décimo 4to proporcional</span>
                    <span className="text-[10px] text-text-muted">({region === 'costa' ? 'Costa' : 'Sierra'})</span>
                  </span>
                  <strong className="text-text-primary font-bold">{formatCurrency(activeSeverance.decimoCuarto)}</strong>
                </div>

                <div className="flex justify-between items-center text-text-secondary py-1 border-b border-border-default/50">
                  <span>Vacaciones no gozadas (15 días/año)</span>
                  <strong className="text-text-primary font-bold">{formatCurrency(activeSeverance.vacaciones)}</strong>
                </div>

                <div className="flex justify-between items-center text-text-secondary py-1 border-b border-border-default/50">
                  <span className="flex items-center gap-1.5">
                    <span>Bonificación por Desahucio</span>
                    <span className="text-[10px] text-brand-400 font-bold">Art. 185 (25%/año)</span>
                  </span>
                  <strong className="text-brand-400 font-bold">{formatCurrency(activeSeverance.desahucio)}</strong>
                </div>

                {severanceTab === 'dismissal' && (
                  <div className="flex justify-between items-center text-danger-400 py-1.5 border-b border-danger-500/20 font-bold bg-danger-500/5 px-2 rounded-lg">
                    <span className="flex items-center gap-1.5">
                      <span>Indemnización Despido</span>
                      <span className="text-[10px] bg-danger-500/20 px-1 rounded">Art. 188</span>
                    </span>
                    <span className="text-sm">+{formatCurrency(severance.dismissal.indemnityDismissal)}</span>
                  </div>
                )}
              </div>

              {/* Explanatory badge */}
              <div className="text-[10px] text-text-muted leading-relaxed bg-surface-100 p-3 rounded-xl border border-border-default/60">
                {severanceTab === 'resignation' ? (
                  <span>
                    💡 <strong>Renuncia:</strong> Tienes derecho a todos los proporcionales de décimos y vacaciones, más el 25% de tu remuneración por cada año laborado (desahucio).
                  </span>
                ) : (
                  <span>
                    ⚠️ <strong>Despido intempestivo:</strong> Si tienes menos de 3 años, la ley garantiza un piso mínimo de <strong>3 remuneraciones completas</strong>. Si tienes más de 3 años, recibes 1 remuneración por cada año o fracción.
                  </span>
                )}
              </div>
            </div>

            {/* LIVE CARD C: Resumen de Sueldo Neto y Quincenas */}
            <div className="rounded-3xl border border-border-default bg-surface-50 p-6 space-y-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-accent-400" />
                Resumen de tu Sueldo Líquido
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-surface-100 border border-border-default text-center">
                  <span className="text-[10px] text-text-muted block">Sueldo Bruto</span>
                  <span className="text-sm font-bold text-text-primary mt-0.5 block">{formatCurrency(salaryAmount)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-100 border border-border-default text-center">
                  <span className="text-[10px] text-text-muted block">Neto al Bolsillo</span>
                  <span className="text-sm font-black text-accent-400 mt-0.5 block">{formatCurrency(netSalary)}</span>
                </div>
              </div>

              {paymentScheme === 'quincena_fin_mes' && (
                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>Quincena (Día 15):</span>
                    <strong className="text-brand-400">{formatCurrency(quincenaAmount)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>Fin de Mes (Día 30):</span>
                    <strong className="text-accent-400">{formatCurrency(finDeMesAmount)}</strong>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border-default flex justify-between text-xs text-text-muted">
                <span>Beneficios de ley al año:</span>
                <strong className="text-warning-400 font-bold">+{formatCurrency(totalBeneficiosMensual * 12)}/año</strong>
              </div>
            </div>

          </div>

        </div>
      </form>
    </div>
  );
}
