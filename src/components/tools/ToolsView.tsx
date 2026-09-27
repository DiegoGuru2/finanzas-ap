import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';
import { notifyFinancialSync } from '@/stores/sync';
import {
  Search, ShieldAlert, Eye, AlertTriangle, CheckCircle,
  AlertOctagon, TrendingDown, Zap, ToggleLeft, ToggleRight,
  DollarSign, Clock, ArrowRight, X, Shield, Flame, Info,
  CircleDollarSign, Gauge, ScanSearch, Power, Briefcase,
  Scale, Award, Calendar
} from 'lucide-react';

// ═══════════════════════════════════════════
// Shared formatter
// ═══════════════════════════════════════════
const fmt = (n: number) => formatCurrency(n);

// ═══════════════════════════════════════════
// TOOL 1: AffordCheck
// ═══════════════════════════════════════════

function AffordCheck() {
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCheck = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tools?tool=afford-check&amount=${val}`);
      const json = await res.json();
      setResult(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verdictStyles: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    green: {
      bg: 'bg-accent-500/10',
      border: 'border-accent-500/30',
      text: 'text-accent-400',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    },
    yellow: {
      bg: 'bg-warning-500/10',
      border: 'border-warning-500/30',
      text: 'text-warning-400',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    },
    red: {
      bg: 'bg-danger-500/10',
      border: 'border-danger-500/30',
      text: 'text-danger-400',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]',
    },
    neutral: {
      bg: 'bg-surface-100',
      border: 'border-border-default',
      text: 'text-text-muted',
      glow: '',
    },
  };

  const VerdictIcon = ({ v }: { v: string }) => {
    if (v === 'green') return <CheckCircle className="h-8 w-8 text-accent-400" />;
    if (v === 'yellow') return <AlertTriangle className="h-8 w-8 text-warning-400" />;
    if (v === 'red') return <AlertOctagon className="h-8 w-8 text-danger-400" />;
    return <Info className="h-8 w-8 text-text-muted" />;
  };

  return (
    <div className="space-y-5">
      {/* Input Section */}
      <div className="rounded-2xl border border-brand-500/20 bg-surface-50 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
            <CircleDollarSign className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Quiero comprar algo de:</h3>
            <p className="text-xs text-text-muted">Ingresa el monto y descubre al instante si tu quincena lo soporta</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">$</span>
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              placeholder="120.00"
              className="w-full rounded-xl border border-border-default bg-surface-0 py-3 pl-8 pr-4 text-lg font-bold text-text-primary outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <button
            onClick={handleCheck}
            disabled={loading || !amount}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Analizar
          </button>
        </div>

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-2">
          {[25, 50, 100, 200, 500].map((q) => (
            <button
              key={q}
              onClick={() => { setAmount(String(q)); setTimeout(handleCheck, 50); }}
              className="rounded-lg border border-border-default bg-surface-100 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-brand-500/40 hover:text-brand-400 transition-all cursor-pointer"
            >
              ${q}
            </button>
          ))}
        </div>
      </div>

      {/* Result Section */}
      {result && result.verdict && (
        <div className={`rounded-2xl border p-6 space-y-5 transition-all duration-500 ${verdictStyles[result.verdict]?.bg} ${verdictStyles[result.verdict]?.border} ${verdictStyles[result.verdict]?.glow}`}>
          {/* Verdict Header */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-0.5">
              <VerdictIcon v={result.verdict} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-bold ${verdictStyles[result.verdict]?.text}`}>
                {result.message}
              </h3>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                {result.description}
              </p>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-surface-0/60 border border-border-default/60 p-3 text-center">
              <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Ingreso en corte</div>
              <div className="text-sm font-bold text-text-primary mt-1">{fmt(result.incomeThisCut)}</div>
            </div>
            <div className="rounded-xl bg-surface-0/60 border border-border-default/60 p-3 text-center">
              <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Deudas pendientes</div>
              <div className="text-sm font-bold text-warning-400 mt-1">{fmt(result.pendingDebts)}</div>
            </div>
            <div className="rounded-xl bg-surface-0/60 border border-border-default/60 p-3 text-center">
              <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Antes de compra</div>
              <div className="text-sm font-bold text-text-primary mt-1">{fmt(result.freeCashBeforePurchase)}</div>
            </div>
            <div className="rounded-xl bg-surface-0/60 border border-border-default/60 p-3 text-center">
              <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Después de compra</div>
              <div className={`text-sm font-bold mt-1 ${result.freeCashAfterPurchase < 0 ? 'text-danger-400' : 'text-accent-400'}`}>
                {fmt(result.freeCashAfterPurchase)}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-2 rounded-xl bg-surface-0/40 border border-border-default/40 px-4 py-2.5 text-xs text-text-secondary">
            <Clock className="h-3.5 w-3.5 text-brand-400 shrink-0" />
            <span>Faltan <strong className="text-text-primary">{result.daysUntilCut} días</strong> para el corte de <strong className="text-text-primary">{result.currentCutLabel}</strong></span>
          </div>

          {/* Impacted debts */}
          {result.impactedDebts?.length > 0 && result.verdict === 'red' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-danger-400 uppercase tracking-wider">Compromisos en riesgo:</div>
              <div className="space-y-1.5">
                {result.impactedDebts.map((d: any) => (
                  <div key={d.name} className="flex items-center justify-between rounded-lg bg-danger-500/5 border border-danger-500/15 px-3 py-2 text-xs">
                    <span className="text-text-primary font-medium">{d.name}</span>
                    <span className="text-danger-400 font-bold">Día {d.dueDay} · {fmt(d.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// TOOL 2: LeakRadar
// ═══════════════════════════════════════════

function LeakRadar() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggledOff, setToggledOff] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    const handleSync = () => fetchData();
    window.addEventListener('finanzas:sync', handleSync);
    return () => window.removeEventListener('finanzas:sync', handleSync);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tools?tool=leak-radar');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLeak = (id: string) => {
    setToggledOff((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const nonEssentialLeaks = data.leaks?.filter((l: any) => !l.isEssential) || [];
  const essentialLeaks = data.leaks?.filter((l: any) => l.isEssential) || [];

  // Calculate the combined redirect impact of toggled-off leaks
  const savedMonthly = nonEssentialLeaks
    .filter((l: any) => toggledOff.has(l.id))
    .reduce((s: number, l: any) => s + l.monthlyAmount, 0);

  const savedAnnual = Math.round(savedMonthly * 12 * 100) / 100;

  // Combined interest saved and months saved from toggled items
  const combinedImpact = nonEssentialLeaks
    .filter((l: any) => toggledOff.has(l.id) && l.redirectImpact)
    .reduce(
      (acc: any, l: any) => ({
        interestSaved: acc.interestSaved + l.redirectImpact.interestSaved,
        monthsSaved: acc.monthsSaved + l.redirectImpact.monthsSaved,
      }),
      { interestSaved: 0, monthsSaved: 0 }
    );

  return (
    <div className="space-y-5">
      {/* Radar Summary */}
      <div className="rounded-2xl border border-brand-500/20 bg-surface-50 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-500/15">
            <ScanSearch className="h-5 w-5 text-warning-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Radar de Fugas Invisibles</h3>
            <p className="text-xs text-text-muted">Descubre cuánto dinero se escapa sin que te des cuenta y redirigelo a tus deudas</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-danger-500/5 border border-danger-500/20 p-3 text-center">
            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Fugas / mes</div>
            <div className="text-sm font-bold text-danger-400 mt-1">{fmt(data.summary?.totalNonEssentialMonthly || 0)}</div>
          </div>
          <div className="rounded-xl bg-danger-500/5 border border-danger-500/20 p-3 text-center">
            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Fugas / año</div>
            <div className="text-sm font-bold text-danger-400 mt-1">{fmt(data.summary?.totalNonEssentialAnnual || 0)}</div>
          </div>
          <div className="rounded-xl bg-accent-500/5 border border-accent-500/20 p-3 text-center">
            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Ahorrado (toggle)</div>
            <div className="text-sm font-bold text-accent-400 mt-1">{fmt(savedAnnual)}/año</div>
          </div>
          <div className="rounded-xl bg-brand-500/5 border border-brand-500/20 p-3 text-center">
            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Interés rescatado</div>
            <div className="text-sm font-bold text-brand-400 mt-1">{fmt(combinedImpact.interestSaved)}</div>
          </div>
        </div>

        {/* Combined impact bar */}
        {toggledOff.size > 0 && (
          <div className="rounded-xl bg-accent-500/10 border border-accent-500/25 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-accent-400">
              <Zap className="h-4 w-4" />
              Impacto de redirigir {toggledOff.size} gastos a tu deuda más cara
              {data.summary?.highestAprDebt && (
                <span className="text-text-muted font-normal">({data.summary.highestAprDebt.name} · {data.summary.highestAprDebt.apr}% APR)</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-accent-400">{fmt(savedMonthly)}</div>
                <div className="text-[10px] text-text-muted">Extra/mes a deuda</div>
              </div>
              <div>
                <div className="text-lg font-bold text-brand-400">{fmt(combinedImpact.interestSaved)}</div>
                <div className="text-[10px] text-text-muted">Interés que te ahorras</div>
              </div>
              <div>
                <div className="text-lg font-bold text-warning-400">{combinedImpact.monthsSaved} meses</div>
                <div className="text-[10px] text-text-muted">Antes libre de deuda</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Non-essential Leaks List */}
      {nonEssentialLeaks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-danger-400 flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Gastos No Esenciales ({nonEssentialLeaks.length})
          </h4>
          <div className="space-y-2">
            {nonEssentialLeaks.map((leak: any) => {
              const isOff = toggledOff.has(leak.id);
              return (
                <div
                  key={leak.id}
                  className={`rounded-xl border p-3.5 transition-all duration-300 ${
                    isOff
                      ? 'border-accent-500/30 bg-accent-500/5 opacity-75'
                      : 'border-border-default bg-surface-50 hover:border-warning-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isOff ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                          {leak.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-200 text-text-muted font-medium">{leak.category}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                        <span>{fmt(leak.monthlyAmount)}/mes</span>
                        <span className="text-danger-400 font-semibold">{fmt(leak.annualAmount)}/año</span>
                        <span>{leak.percentOfIncome}% del ingreso</span>
                      </div>
                      {leak.redirectImpact && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-brand-400">
                          <ArrowRight className="h-3 w-3" />
                          <span>
                            Redirigir: ahorras {fmt(leak.redirectImpact.interestSaved)} interés, {leak.redirectImpact.monthsSaved} meses antes
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleLeak(leak.id)}
                      className="shrink-0 p-1 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer"
                      title={isOff ? 'Reactivar gasto' : 'Simular eliminación'}
                    >
                      {isOff ? (
                        <ToggleRight className="h-7 w-7 text-accent-400" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-text-muted" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Essential Expenses (for reference) */}
      {essentialLeaks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Gastos Esenciales ({essentialLeaks.length}) — No eliminables
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {essentialLeaks.map((leak: any) => (
              <div
                key={leak.id}
                className="rounded-xl border border-border-default/60 bg-surface-50/60 p-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="h-3 w-3 text-accent-400 shrink-0" />
                  <span className="text-text-primary font-medium truncate">{leak.name}</span>
                </div>
                <span className="text-text-secondary font-bold shrink-0 ml-2">{fmt(leak.monthlyAmount)}/mes</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// TOOL 3: StressTest
// ═══════════════════════════════════════════

function StressTest() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [survivalMode, setSurvivalMode] = useState(false);
  const [cushionMode, setCushionMode] = useState<'pure' | 'resignation' | 'dismissal' | 'seasonal'>('pure');

  useEffect(() => {
    fetchData(false);
    const handleSync = () => fetchData(survivalMode);
    window.addEventListener('finanzas:sync', handleSync);
    return () => window.removeEventListener('finanzas:sync', handleSync);
  }, []);

  const fetchData = async (cut: boolean) => {
    try {
      const res = await fetch(`/api/tools?tool=stress-test&cutNonEssential=${cut}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSurvival = () => {
    const next = !survivalMode;
    setSurvivalMode(next);
    setLoading(true);
    fetchData(next);
  };

  if (loading && !data) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const severance = data.severance;
  const resignationAmount = severance?.resignation?.total || 0;
  const dismissalAmount = severance?.dismissal?.total || 0;
  const seasonalTotal = data.seasonalTotal || 0;

  // Active Cushion Calculation based on user scenario
  let activeSavings = data.totalSavings;
  let scenarioTitle = 'Solo fondo de ahorros actual';

  if (cushionMode === 'resignation') {
    activeSavings = data.totalSavings + resignationAmount;
    scenarioTitle = `Ahorros (${fmt(data.totalSavings)}) + Liquidación por Renuncia (${fmt(resignationAmount)})`;
  } else if (cushionMode === 'dismissal') {
    activeSavings = data.totalSavings + dismissalAmount;
    scenarioTitle = `Ahorros (${fmt(data.totalSavings)}) + Liquidación por Despido (${fmt(dismissalAmount)})`;
  } else if (cushionMode === 'seasonal') {
    activeSavings = data.totalSavings + seasonalTotal;
    scenarioTitle = `Ahorros (${fmt(data.totalSavings)}) + Décimos y Utilidades anuales (${fmt(seasonalTotal)})`;
  }

  const effectiveRunwayMonths = data.activeBurnRate > 0
    ? Math.round((activeSavings / data.activeBurnRate) * 10) / 10
    : activeSavings > 0 ? 999 : 0;

  const effectiveRunwayDays = Math.round(effectiveRunwayMonths * 30.44);

  // Dynamic Risk Level based on active scenario
  let riskLevel: 'critical' | 'danger' | 'warning' | 'safe' | 'strong';
  if (effectiveRunwayMonths < 1) riskLevel = 'critical';
  else if (effectiveRunwayMonths < 3) riskLevel = 'danger';
  else if (effectiveRunwayMonths < 6) riskLevel = 'warning';
  else if (effectiveRunwayMonths < 12) riskLevel = 'safe';
  else riskLevel = 'strong';

  const riskColors: Record<string, { bg: string; border: string; text: string; ring: string }> = {
    critical: { bg: 'bg-danger-500/10', border: 'border-danger-500/30', text: 'text-danger-400', ring: 'ring-danger-500/20' },
    danger: { bg: 'bg-danger-500/8', border: 'border-danger-500/25', text: 'text-danger-400', ring: 'ring-danger-500/15' },
    warning: { bg: 'bg-warning-500/10', border: 'border-warning-500/30', text: 'text-warning-400', ring: 'ring-warning-500/20' },
    safe: { bg: 'bg-accent-500/10', border: 'border-accent-500/30', text: 'text-accent-400', ring: 'ring-accent-500/20' },
    strong: { bg: 'bg-brand-500/10', border: 'border-brand-500/30', text: 'text-brand-400', ring: 'ring-brand-500/20' },
  };

  const rc = riskColors[riskLevel];
  const barPercent = Math.min(100, (effectiveRunwayMonths / 12) * 100);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className={`rounded-3xl border ${rc.border} ${rc.bg} p-6 sm:p-7 space-y-6 ring-1 ${rc.ring} shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${rc.bg} border ${rc.border} shrink-0`}>
              <ShieldAlert className={`h-6 w-6 ${rc.text}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Simulador de Supervivencia Financiera
              </h3>
              <p className={`text-xs mt-0.5 ${rc.text} font-medium leading-relaxed`}>
                {riskLevel === 'critical' && 'Situación crítica: menos de 1 mes cubierto sin ingresos.'}
                {riskLevel === 'danger' && 'Riesgo alto: menos de 3 meses de colchón. Se aconseja reforzar tu fondo.'}
                {riskLevel === 'warning' && 'Precaución: entre 3 y 6 meses de respaldo ante contingencias.'}
                {riskLevel === 'safe' && 'Buen respaldo: entre 6 y 12 meses de autonomía financiera.'}
                {riskLevel === 'strong' && 'Excelente: más de 1 año completo de tranquilidad asegurada.'}
              </p>
            </div>
          </div>

          {/* Scenario Selector: Pure Savings vs Severance vs Seasonal */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-surface-0/60 rounded-2xl border border-border-default/70 shrink-0">
            <button
              type="button"
              onClick={() => setCushionMode('pure')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                cushionMode === 'pure'
                  ? 'bg-surface-200 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Solo Ahorros
            </button>
            {severance && (
              <>
                <button
                  type="button"
                  onClick={() => setCushionMode('resignation')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cushionMode === 'resignation'
                      ? 'bg-accent-500 text-white shadow-sm'
                      : 'text-text-muted hover:text-accent-400'
                  }`}
                  title="Incluye liquidación si decides renunciar"
                >
                  🟢 + Si Renuncio
                </button>
                <button
                  type="button"
                  onClick={() => setCushionMode('dismissal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cushionMode === 'dismissal'
                      ? 'bg-danger-500 text-white shadow-sm'
                      : 'text-text-muted hover:text-danger-400'
                  }`}
                  title="Incluye indemnización de despido intempestivo"
                >
                  🔴 + Si me Despiden
                </button>
              </>
            )}
            {seasonalTotal > 0 && (
              <button
                type="button"
                onClick={() => setCushionMode('seasonal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  cushionMode === 'seasonal'
                    ? 'bg-warning-500 text-white shadow-sm'
                    : 'text-text-muted hover:text-warning-400'
                }`}
                title="Incluye décimos y utilidades anuales"
              >
                ⭐ + Décimos/Utilidades
              </button>
            )}
          </div>
        </div>

        {/* Big Runway Display */}
        <div className="text-center space-y-3 py-2">
          <div className={`text-6xl font-black ${rc.text} tabular-nums tracking-tight`}>
            {effectiveRunwayMonths}
            <span className="text-xl font-bold ml-1.5 opacity-75">meses</span>
          </div>
          <div className="text-xs text-text-muted">
            ({effectiveRunwayDays} días de supervivencia) con un colchón total de{' '}
            <strong className="text-text-primary font-bold">{fmt(activeSavings)}</strong>
          </div>
          <div className="text-[11px] text-text-secondary bg-surface-0/50 py-1 px-3 rounded-full inline-block border border-border-default/50">
            Escenario activo: <strong>{scenarioTitle}</strong>
          </div>

          {/* Runway Progress Bar */}
          <div className="relative w-full h-4 rounded-full bg-surface-200 overflow-hidden mt-4">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                riskLevel === 'critical' || riskLevel === 'danger'
                  ? 'bg-gradient-to-r from-danger-500 to-danger-400'
                  : riskLevel === 'warning'
                    ? 'bg-gradient-to-r from-warning-500 to-warning-400'
                    : 'bg-gradient-to-r from-accent-500 to-brand-500'
              }`}
              style={{ width: `${barPercent}%` }}
            />
            {/* Markers */}
            <div className="absolute top-0 left-[25%] h-full w-px bg-surface-0/30" title="3 meses" />
            <div className="absolute top-0 left-[50%] h-full w-px bg-surface-0/30" title="6 meses" />
            <div className="absolute top-0 left-[75%] h-full w-px bg-surface-0/30" title="9 meses" />
          </div>
          <div className="flex justify-between text-[9px] text-text-muted px-1 font-semibold">
            <span>0</span><span>3 meses (mínimo)</span><span>6 meses (recomendado)</span><span>9 meses</span><span>12+ meses</span>
          </div>
        </div>

        {/* Burn Rate Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-surface-0/70 border border-border-default/60 p-3.5 text-center">
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Gastos Esenciales</div>
            <div className="text-sm font-bold text-text-primary mt-1">{fmt(data.essentialMonthly)}</div>
          </div>
          <div className="rounded-2xl bg-surface-0/70 border border-border-default/60 p-3.5 text-center">
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Gastos No Esenciales</div>
            <div className={`text-sm font-bold mt-1 ${survivalMode ? 'text-text-muted line-through' : 'text-warning-400'}`}>
              {fmt(data.nonEssentialMonthly)}
            </div>
          </div>
          <div className="rounded-2xl bg-surface-0/70 border border-border-default/60 p-3.5 text-center">
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Deudas Mínimas</div>
            <div className="text-sm font-bold text-danger-400 mt-1">{fmt(data.minimumDebts)}</div>
          </div>
          <div className="rounded-2xl bg-surface-0/70 border border-border-default/60 p-3.5 text-center">
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Gasto Mensual Activo</div>
            <div className="text-sm font-bold text-text-primary mt-1">{fmt(data.activeBurnRate)}/mes</div>
          </div>
        </div>
      </div>

      {/* Grid: Labor Cushion & Seasonal Boosts */}
      {severance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card A: Escudo de Liquidación Laboral */}
          <div className="rounded-3xl border border-border-default bg-surface-50 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-2">
                <Scale className="h-4 w-4 text-brand-400" />
                Escudo Laboral Legal (Ecuador)
              </span>
              <span className="text-[10px] bg-brand-500/10 text-brand-400 font-bold px-2 py-0.5 rounded-full">
                {severance.contractType === 'emergente' ? 'Contrato Emergente' : 'Contrato Indefinido'}
              </span>
            </div>

            <div className="text-xs text-text-muted">
              Antigüedad registrada: <strong className="text-text-primary font-bold">{severance.tenure.formatted}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div
                onClick={() => setCushionMode('resignation')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  cushionMode === 'resignation'
                    ? 'border-accent-500 bg-accent-500/10 ring-1 ring-accent-500'
                    : 'border-border-default bg-surface-100 hover:border-accent-500/40'
                }`}
              >
                <div className="text-[10px] font-bold text-accent-400 uppercase">Si Renuncias</div>
                <div className="text-lg font-black text-text-primary mt-0.5">{fmt(resignationAmount)}</div>
                <div className="text-[10px] text-text-muted mt-1">
                  +{data.resignationRunwayMonths} meses de pista
                </div>
              </div>

              <div
                onClick={() => setCushionMode('dismissal')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  cushionMode === 'dismissal'
                    ? 'border-danger-500 bg-danger-500/10 ring-1 ring-danger-500'
                    : 'border-border-default bg-surface-100 hover:border-danger-500/40'
                }`}
              >
                <div className="text-[10px] font-bold text-danger-400 uppercase">Si te Despiden</div>
                <div className="text-lg font-black text-danger-400 mt-0.5">{fmt(dismissalAmount)}</div>
                <div className="text-[10px] text-text-muted mt-1">
                  +{data.dismissalRunwayMonths} meses de pista
                </div>
              </div>
            </div>

            <p className="text-[10px] text-text-muted leading-relaxed">
              En caso de contingencia o desvinculación, tu liquidación legal te otorga un escudo inmediato para financiar tu costo de vida sin recurrir a deudas.
            </p>
          </div>

          {/* Card B: Inyecciones de Liquidez Estacional (Décimos y Utilidades) */}
          <div className="rounded-3xl border border-border-default bg-surface-50 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-2">
                <Award className="h-4 w-4 text-warning-400" />
                Inyecciones de Décimos y Utilidades
              </span>
              <span className="text-[10px] bg-warning-500/10 text-warning-400 font-bold px-2 py-0.5 rounded-full">
                Cobro Anual
              </span>
            </div>

            <p className="text-xs text-text-muted">
              Si acumulas décimos o utilidades, estos pagos extraordinarios representan liquidez estacional clave:
            </p>

            {data.seasonalBenefits && data.seasonalBenefits.length > 0 ? (
              <div className="space-y-1.5">
                {data.seasonalBenefits.map((b: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-surface-100 border border-border-default">
                    <span className="text-text-primary font-medium">{b.label}</span>
                    <strong className="text-warning-400">{fmt(b.amount)}</strong>
                  </div>
                ))}
                <div className="flex justify-between items-center text-xs pt-1.5 font-bold text-text-primary">
                  <span>Total refuerzo estacional:</span>
                  <span className="text-accent-400 font-black">+{fmt(seasonalTotal)}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-surface-100 border border-border-default text-xs text-text-muted text-center">
                Actualmente tus décimos llegan mensualizados cada mes en tu rol de pagos.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extreme Survival Mode (Recorte Extremo) */}
      <div className={`rounded-3xl border p-6 transition-all duration-500 ${
        survivalMode
          ? 'border-accent-500/30 bg-accent-500/5 shadow-[0_0_30px_rgba(16,185,129,0.08)]'
          : 'border-border-default bg-surface-50'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Power className={`h-6 w-6 ${survivalMode ? 'text-accent-400' : 'text-text-muted'}`} />
            <div>
              <h4 className="text-sm font-bold text-text-primary">Protocolo de Recorte Extremo</h4>
              <p className="text-xs text-text-muted mt-0.5">
                Simula pausar todos tus gastos no esenciales para extender tu horizonte de supervivencia
              </p>
            </div>
          </div>
          <button
            onClick={toggleSurvival}
            className="shrink-0 cursor-pointer"
          >
            {survivalMode ? (
              <ToggleRight className="h-9 w-9 text-accent-400" />
            ) : (
              <ToggleLeft className="h-9 w-9 text-text-muted" />
            )}
          </button>
        </div>

        {/* Runway Comparison */}
        {data.runwayGain > 0 && (
          <div className="mt-5 rounded-2xl bg-surface-0/60 border border-border-default/50 p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Sin recortes</div>
              <div className="text-base font-bold text-text-primary mt-1">{data.fullRunway} meses</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
                <ArrowRight className="h-2.5 w-2.5" />
                Ganancia neta
              </div>
              <div className="text-base font-bold text-accent-400 mt-1">+{data.runwayGain} meses</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Con recortes</div>
              <div className="text-base font-bold text-accent-400 mt-1">{data.survivalRunway} meses</div>
            </div>
          </div>
        )}
      </div>

      {/* Cut List */}
      {survivalMode && data.nonEssentialExpenses?.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-danger-400 flex items-center gap-1.5">
            <X className="h-3.5 w-3.5" />
            Gastos no esenciales a congelar ({data.nonEssentialExpenses.length})
          </h4>
          <div className="space-y-1.5">
            {data.nonEssentialExpenses.map((e: any) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-danger-500/15 bg-danger-500/5 p-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <X className="h-3.5 w-3.5 text-danger-400 shrink-0" />
                  <span className="text-text-primary font-medium line-through truncate">{e.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200 text-text-muted shrink-0">{e.category}</span>
                </div>
                <span className="text-danger-400 font-bold shrink-0 ml-2">-{fmt(e.monthlyAmount)}/mes</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-text-muted text-center pt-1">
            Ahorro mensual obtenido: <strong className="text-danger-400">{fmt(data.nonEssentialMonthly)}/mes</strong>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN TOOLS VIEW (Tabs)
// ═══════════════════════════════════════════

type ToolTab = 'afford' | 'leaks' | 'stress';

export default function ToolsView() {
  const [activeTab, setActiveTab] = useState<ToolTab>('afford');

  const tabs: { id: ToolTab; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'afford',
      label: 'Termómetro de Decisiones',
      icon: <CircleDollarSign className="h-4 w-4" />,
      description: '¿Me lo puedo permitir?',
    },
    {
      id: 'leaks',
      label: 'Radar de Fugas',
      icon: <ScanSearch className="h-4 w-4" />,
      description: 'Gastos Hormiga',
    },
    {
      id: 'stress',
      label: 'Prueba de Estrés',
      icon: <ShieldAlert className="h-4 w-4" />,
      description: 'Supervivencia',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-brand-400" />
          Herramientas Inteligentes
        </h2>
        <p className="text-sm text-text-muted">
          Tres herramientas de análisis financiero para tomar mejores decisiones y proteger tu bolsillo
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                : 'border border-border-default bg-surface-50 text-text-secondary hover:border-brand-500/40 hover:text-brand-400'
            }`}
          >
            {tab.icon}
            <div className="text-left">
              <div>{tab.label}</div>
              <div className={`text-[10px] font-normal ${activeTab === tab.id ? 'text-white/70' : 'text-text-muted'}`}>
                {tab.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Active Tool */}
      <div className="min-h-[300px]">
        {activeTab === 'afford' && <AffordCheck />}
        {activeTab === 'leaks' && <LeakRadar />}
        {activeTab === 'stress' && <StressTest />}
      </div>
    </div>
  );
}
