import React, { useState, useEffect, lazy, Suspense } from 'react';
import { formatCurrency } from '@/lib/utils';
import { calculateSalaryDetails } from '@/modules/financial-engine/cashflow';
import { DEFAULT_CATALOGS } from '@/lib/catalogs';
import HealthScoreWidget from './HealthScoreWidget';

// Lazy-load recharts para reducir el bundle inicial (~500KB)
const LazyChart = lazy(() =>
  import('recharts').then((mod) => ({
    default: ({
      chartData,
      isLight,
    }: {
      chartData: { name: string; saldo: number; interesAcumulado: number; capitalPagado: number }[];
      isLight: boolean;
    }) => (
      <mod.ResponsiveContainer width="100%" height={260}>
        <mod.AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <mod.CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e5e7eb' : '#1e293b'} />
          <mod.XAxis dataKey="name" tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 11 }} />
          <mod.YAxis tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
          <mod.Tooltip
            contentStyle={{
              backgroundColor: isLight ? '#fff' : '#0f172a',
              border: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}`,
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
          />
          <mod.Area type="monotone" dataKey="saldo" stroke="#ef4444" fill="url(#colorSaldo)" strokeWidth={2} name="Saldo" />
          <mod.Area type="monotone" dataKey="capitalPagado" stroke="#10b981" fill="url(#colorCapital)" strokeWidth={2} name="Capital Pagado" />
        </mod.AreaChart>
      </mod.ResponsiveContainer>
    ),
  }))
);

const DONUT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
];

const LazyDonutChart = lazy(() =>
  import('recharts').then((mod) => ({
    default: ({
      data,
      isLight,
    }: {
      data: { name: string; amount: number; label: string }[];
      isLight: boolean;
    }) => (
      <mod.ResponsiveContainer width="100%" height={260}>
        <mod.PieChart>
          <mod.Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            dataKey="amount"
          >
            {data.map((_, index) => (
              <mod.Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
            ))}
          </mod.Pie>
          <mod.Tooltip
            contentStyle={{
              backgroundColor: isLight ? '#fff' : '#0f172a',
              border: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}`,
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '12px',
            }}
            formatter={(val: number, _name: any, item: any) => [
              formatCurrency(val),
              item.payload.label || item.payload.name,
            ]}
          />
        </mod.PieChart>
      </mod.ResponsiveContainer>
    ),
  }))
);

const STRATEGY_LABELS: Record<string, { name: string; desc: string }> = {
  avalanche: { name: 'Avalancha', desc: 'Prioriza la tasa de interés más alta: ahorras más en intereses.' },
  snowball: { name: 'Bola de Nieve', desc: 'Prioriza la deuda más pequeña: liquidas deudas más rápido y ganas motivación.' },
  liquidity: { name: 'Liquidez', desc: 'Prioriza la cuota mínima más baja: libera flujo de caja mensual antes.' },
};

export default function DashboardView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball' | 'liquidity'>('avalanche');
  const [isLight, setIsLight] = useState(
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
  );

  // Repintar el gráfico cuando cambia el tema claro/oscuro
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsLight(document.documentElement.dataset.theme === 'light')
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Onboarding Form State
  const [onboardingSalaryName, setOnboardingSalaryName] = useState('Sueldo Principal');
  const [onboardingAmount, setOnboardingAmount] = useState<number>(1000);
  const [onboardingScheme, setOnboardingScheme] = useState<'quincena_fin_mes' | 'monthly'>('quincena_fin_mes');
  const [onboardingQuincena, setOnboardingQuincena] = useState<number>(452.75);
  const [onboardingFinDeMes, setOnboardingFinDeMes] = useState<number>(452.75);
  const [deductIess, setDeductIess] = useState(true);
  const [iessPercentage, setIessPercentage] = useState(9.45);
  const [onboardingWorkStartDate, setOnboardingWorkStartDate] = useState('');
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  // Vista previa con la misma fórmula del motor financiero (nada duplicado)
  const onboardingPreview = calculateSalaryDetails({
    id: '',
    name: '',
    amount: onboardingAmount || 0,
    frequency: 'monthly',
    isSalary: true,
    paymentScheme: onboardingScheme,
    quincenaAmount: 0,
    finDeMesAmount: 0,
    deductIess,
    iessPercentage,
  });

  // Live calculation of IESS and Quincena/Fin de mes for Onboarding
  useEffect(() => {
    setOnboardingQuincena(onboardingPreview.quincenaAmount);
    setOnboardingFinDeMes(onboardingPreview.finDeMesAmount);
  }, [onboardingAmount, deductIess, iessPercentage, onboardingScheme]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch(`/api/dashboard?strategy=${strategy}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error del servidor HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        // If user has NO incomes recorded yet, automatically trigger Onboarding Wizard
        if (!json.data.incomes || json.data.incomes.length === 0) {
          setShowOnboarding(true);
        }
      } else {
        throw new Error(json.error || 'Respuesta de datos vacía');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
      setFetchError(err.message || 'Error al conectar con la base de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [strategy]);

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOnboarding(true);
    setOnboardingError(null);

    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: onboardingSalaryName,
          amount: Number(onboardingAmount),
          frequency: 'monthly',
          isSalary: true,
          paymentScheme: onboardingScheme,
          quincenaAmount: Number(onboardingQuincena),
          finDeMesAmount: Number(onboardingFinDeMes),
          deductIess,
          iessPercentage: Number(iessPercentage),
          workStartDate: onboardingWorkStartDate || null,
          category: 'Sueldo',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar sueldo inicial');
      }

      setShowOnboarding(false);
      await fetchDashboard();
    } catch (err: any) {
      setOnboardingError(err.message || 'Error al registrar configuración inicial');
    } finally {
      setSavingOnboarding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-text-muted">Calculando tu motor financiero con TiDB Cloud...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-2xl border border-danger-500/20 bg-danger-500/5">
          <div className="text-3xl">⚠️</div>
          <h3 className="text-lg font-bold text-text-primary">Error al cargar el Dashboard</h3>
          <p className="text-xs text-danger-400">{fetchError}</p>
          <button
            onClick={() => fetchDashboard()}
            className="rounded-xl bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow transition-all cursor-pointer"
          >
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const optimization = data?.optimization || {};
  const projection = data?.projection || {};
  const debts = data?.debts || [];
  const savingsGoals = data?.savingsGoals || [];
  const recentPayments = data?.recentPayments || [];
  const userName = data?.user?.name || 'Usuario';

  // Chart data format
  const chartData = projection.snapshots?.map((s: any) => ({
    name: `Mes ${s.month}`,
    saldo: s.totalBalance,
    interesAcumulado: s.totalInterestPaid,
    capitalPagado: s.totalPrincipalPaid,
  })) || [];

  // Donut chart: Distribución de Gastos por Categoría
  const rawExpensesByCategory = data?.expensesByCategory || [];
  const categoryCatalog = DEFAULT_CATALOGS.expense_category;
  const donutChartData = rawExpensesByCategory.map((item: any) => {
    const found = categoryCatalog.find((c) => c.value === item.name);
    return {
      name: item.name,
      amount: item.amount,
      label: found ? `${found.icon} ${found.label}` : item.name,
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Buenos días, <span className="gradient-text">{userName}</span>
          </h2>
          <p className="text-sm text-text-secondary">
            Resumen consolidado de sueldo, descuento IESS, quincena y optimización de deudas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOnboarding(true)}
            className="rounded-xl bg-surface-100 hover:bg-surface-200 border border-border-default px-4 py-2 text-xs font-semibold text-text-primary transition-all cursor-pointer"
          >
            ⚙️ Ajustar Sueldo e IESS
          </button>
          <a
            href="/app/debts"
            className="rounded-xl bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 transition-all"
          >
            + Añadir Deuda
          </a>
        </div>
      </div>

      {/* Ecuadorian Payroll & Cashflow Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Debt */}
        <div className="rounded-2xl border border-danger-500/25 bg-surface-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-danger-500">Deuda Total Activa</span>
            <span className="rounded-md bg-danger-500/10 border border-danger-500/20 px-2.5 py-0.5 text-[11px] font-bold text-danger-500">
              {summary.activeDebtsCount || 0} activa{summary.activeDebtsCount === 1 ? '' : 's'}
              {summary.paidOffDebtsCount > 0 ? ` · ${summary.paidOffDebtsCount} liquidada(s)` : ''}
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-danger-500">
            {formatCurrency(summary.totalDebt || 0)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-text-secondary">
            <span>Mínimo: {formatCurrency(summary.totalMinimumPayments || 0)}/mes</span>
            {summary.totalDebtPaidOff > 0 && (
              <span className="font-bold text-accent-500">
                Pagado: {formatCurrency(summary.totalDebtPaidOff)} ({summary.totalDebtProgress}%)
              </span>
            )}
          </div>
        </div>

        {/* Sueldo Neto Líquido */}
        <div className="rounded-2xl border border-accent-500/25 bg-surface-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-accent-500">Sueldo Neto Líquido</span>
            <span className="rounded-md bg-surface-200/80 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
              Descontado IESS
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-accent-500">
            {formatCurrency(summary.totalNetIncome || 0)}
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            Bruto: {formatCurrency(summary.totalGrossIncome || 0)} (IESS: -{formatCurrency(summary.totalIessDeductions || 0)})
          </div>
          {(summary.totalBenefitsMonthly || 0) > 0 && (
            <div className="mt-1 text-xs font-bold text-accent-500">
              + {formatCurrency(summary.totalBenefitsMonthly)} beneficios de ley mensualizados
            </div>
          )}
        </div>

        {/* Flujo Quincena / Fin de mes */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-500">Flujo Quincena vs Fin de Mes</span>
            {summary.totalProgrammedSavings > 0 && (
              <span className="text-[11px] font-bold text-accent-500 bg-accent-500/10 px-2.5 py-0.5 rounded-md border border-accent-500/30">
                Ahorro: {formatCurrency(summary.totalProgrammedSavings)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-secondary">Quincena (15):</span>
              <strong className="text-text-primary font-bold">{formatCurrency(summary.quincenaAvailable || 0)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Fin de Mes (30):</span>
              <strong className="text-text-primary font-bold">{formatCurrency(summary.finDeMesAvailable || 0)}</strong>
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-border-default text-[11px] text-text-secondary">
            Gastos fijos: <strong className="text-text-primary font-semibold">{formatCurrency(summary.totalExpenses || 0)}</strong>
          </div>
        </div>

        {/* Excedente Libre */}
        <div className="rounded-2xl border border-brand-500/25 bg-surface-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-500">Excedente para Pagar Deuda</span>
            <span
              className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold border ${
                summary.status === 'healthy'
                  ? 'bg-accent-500/10 border-accent-500/30 text-accent-500'
                  : summary.status === 'tight'
                  ? 'bg-warning-500/10 border-warning-500/30 text-warning-500'
                  : 'bg-danger-500/10 border-danger-500/30 text-danger-500'
              }`}
            >
              {summary.status === 'healthy' ? 'Saludable' : summary.status === 'tight' ? 'Ajustado' : 'Déficit'}
            </span>
          </div>
          <div className={`mt-3 text-2xl font-extrabold ${summary.surplus < 0 ? 'text-danger-500' : 'text-brand-500'}`}>
            {formatCurrency(summary.surplus || 0)}
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            Libre tras gastos y cuotas mínimas
          </div>
        </div>

        {/* Metas de Ahorro Acumulado */}
        <div className="rounded-2xl border border-emerald-500/25 bg-surface-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Ahorro en Metas</span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md font-bold">
              {summary.totalSavingsTarget > 0
                ? `${summary.savingsProgress}% de meta`
                : 'Activo'}
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.totalSaved || 0)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-text-secondary">
            <span>Objetivo: {formatCurrency(summary.totalSavingsTarget || 0)}</span>
            {(summary.totalMonthlySavingsContribution || 0) > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{formatCurrency(summary.totalMonthlySavingsContribution)}/mes
              </span>
            )}
          </div>
        </div>

        {/* Ratio Deuda/Ingreso (DTI) */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary">Carga Financiera (DTI)</span>
            <span
              className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold border ${
                (summary.debtToIncomeRatio || 0) <= 20
                  ? 'bg-accent-500/10 border-accent-500/30 text-accent-500'
                  : (summary.debtToIncomeRatio || 0) <= 40
                  ? 'bg-warning-500/10 border-warning-500/30 text-warning-500'
                  : 'bg-danger-500/10 border-danger-500/30 text-danger-500'
              }`}
            >
              {(summary.debtToIncomeRatio || 0) <= 20
                ? 'Excelente'
                : (summary.debtToIncomeRatio || 0) <= 40
                ? 'Moderado'
                : 'Riesgo Alto'}
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-text-primary">
            {summary.debtToIncomeRatio || 0}%
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            Máx recomendado Ecuador: 40%
          </div>
        </div>
      </div>

      {/* Recommendation Card */}
      <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-surface-50 to-surface-50 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 4a6 6 0 106 6 6 6 0 00-6-6zm0 3a3 3 0 103 3 3 3 0 00-3-3z" />
              </svg>
              <h3 className="text-base font-bold text-brand-400">
                Recomendación de Pago del Mes (Estrategia {STRATEGY_LABELS[strategy].name})
              </h3>
            </div>
            <p className="text-xs text-text-secondary max-w-2xl">
              El motor distribuye tu excedente de <strong>{formatCurrency(summary.surplus || 0)}</strong>.{' '}
              {STRATEGY_LABELS[strategy].desc}
            </p>
          </div>

          <div className="text-left md:text-right bg-surface-100/90 p-3.5 rounded-xl border border-border-default shadow-sm">
            <div className="text-xs font-semibold text-text-muted">Fecha estimada libre de deuda</div>
            <div className="text-lg font-extrabold text-accent-400">
              {debts.length === 0
                ? '¡Sin deudas activas! 🎉'
                : (optimization.projectedDebtFreeDate || 'Calculando...')}
            </div>
          </div>
        </div>

        {/* Selector y comparación de estrategias */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['avalanche', 'snowball', 'liquidity'] as const).map((s) => {
            const comp = data?.strategyComparison?.[s];
            const active = strategy === s;
            return (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  active
                    ? 'border-brand-500 bg-brand-500/15 ring-2 ring-brand-500/40 shadow-sm'
                    : 'border-border-default bg-surface-100/80 hover:bg-surface-200/80 hover:border-border-hover'
                }`}
              >
                <div className={`text-xs font-bold ${active ? 'text-brand-400' : 'text-text-primary'}`}>
                  {STRATEGY_LABELS[s].name} {active && '✓'}
                </div>
                {comp ? (
                  <div className="mt-1.5 text-[11px] text-text-secondary space-y-0.5">
                    <div>
                      Intereses proyectados:{' '}
                      <strong className="text-warning-400 font-semibold">{formatCurrency(comp.totalInterest || 0)}</strong>
                    </div>
                    {comp.debtFreeDate && (
                      <div className="text-text-muted">Libre de deuda: {comp.debtFreeDate}</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-text-muted">
                    {s === 'avalanche' ? 'Menos intereses' : s === 'snowball' ? 'Mayor motivación' : 'Mayor liquidez'}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Allocations breakdown */}
        {optimization.allocations && optimization.allocations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border-default grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {optimization.allocations.map((a: any, idx: number) => (
              <div key={idx} className="rounded-xl bg-surface-100 p-3 border border-border-default flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-text-primary">{a.debtName}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    a.type === 'extra' ? 'bg-accent-500/10 text-accent-400' : 'bg-surface-200 text-text-muted'
                  }`}>
                    {a.type === 'extra' ? 'Mínimo + Abono Extra' : 'Solo Cuota Mínima'}
                  </span>
                </div>
                <div className="text-right font-extrabold text-sm text-text-primary">
                  {formatCurrency(a.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Charts Grid: Amortización + Distribución de Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projection Chart (Recharts) */}
        <div className="lg:col-span-2 rounded-2xl border border-border-default bg-surface-50 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-text-primary">📉 Proyección de Amortización (24 Meses)</h3>
              <p className="text-xs text-text-muted">Visualización mes a mes de la reducción de capital e intereses</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-danger-500"></div>
                <span className="text-text-secondary">Saldo Deuda</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-accent-400"></div>
                <span className="text-text-secondary">Capital Amortizado</span>
              </div>
            </div>
          </div>

          {chartData.length > 0 && debts.length > 0 ? (
            <div className="h-72 w-full pt-4">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-text-muted">Cargando gráfico...</div>}>
                <LazyChart chartData={chartData} isLight={isLight} />
              </Suspense>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border-default text-xs text-text-muted">
              Registra tus deudas para generar la curva de amortización
            </div>
          )}
        </div>

        {/* Expenses by Category Donut Chart */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-text-primary">🥧 Distribución de Gastos</h3>
            <p className="text-xs text-text-muted">Desglose mensual de tus egresos por categoría</p>
          </div>

          {donutChartData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-56 w-full">
                <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-text-muted">Cargando gráfica...</div>}>
                  <LazyDonutChart data={donutChartData} isLight={isLight} />
                </Suspense>
              </div>

              {/* Leyenda compacta de categorías top */}
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {donutChartData.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                      />
                      <span className="text-text-secondary truncate">{item.label}</span>
                    </div>
                    <span className="font-bold text-text-primary shrink-0 ml-2">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border-default text-xs text-text-muted">
              Añade tus gastos para ver la distribución porcentual
            </div>
          )}
        </div>
      </div>

      {/* 📊 SECCIÓN DEDICADA: PROGRESO DE PAGOS DE DEUDAS Y METAS DE AHORRO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Estado y Progreso de Pagos de Deudas */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <span>💳</span> Progreso de Amortización de Deudas
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Seguimiento de cuánto has amortizado del monto original
              </p>
            </div>
            <a
              href="/app/debts"
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              Ver todas →
            </a>
          </div>

          {/* Resumen Global de Amortización */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-100 p-3 text-center border border-border-default">
            <div>
              <div className="text-[10px] text-text-muted">Total Original</div>
              <div className="text-xs sm:text-sm font-bold text-text-primary">
                {formatCurrency(summary.totalOriginalDebt || 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">Amortizado</div>
              <div className="text-xs sm:text-sm font-bold text-accent-400">
                {formatCurrency(summary.totalDebtPaidOff || 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">Saldo Restante</div>
              <div className="text-xs sm:text-sm font-bold text-danger-400">
                {formatCurrency(summary.totalDebt || 0)}
              </div>
            </div>
          </div>

          {/* Lista de deudas con progreso individual */}
          {debts.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {debts.map((d: any) => {
                const isPaid = d.currentBalance <= 0;
                return (
                  <div
                    key={d.id}
                    className={`rounded-xl border p-3 space-y-2 transition-all ${
                      isPaid
                        ? 'border-accent-500/20 bg-accent-500/5'
                        : 'border-border-default bg-surface-100/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-sm">{isPaid ? '✅' : '💳'}</span>
                        <div className="truncate">
                          <span className="font-bold text-xs text-text-primary truncate block">
                            {d.name}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {d.creditor || 'Crédito'} · Mínimo: {formatCurrency(d.minimumPayment)}/mes
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold ${isPaid ? 'text-accent-400' : 'text-text-primary'}`}>
                          {isPaid ? '¡Completamente pagada!' : formatCurrency(d.currentBalance)}
                        </span>
                        <div className="text-[10px] text-text-muted">
                          de {formatCurrency(d.originalBalance)}
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso de pago */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-accent-400 font-medium">
                          Amortizado: {formatCurrency(d.paidAmount || 0)}
                        </span>
                        <span className="font-bold text-text-primary">{d.progress || 0}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isPaid ? 'bg-accent-500' : (d.progress || 0) > 50 ? 'bg-brand-500' : 'bg-warning-500'
                          }`}
                          style={{ width: `${Math.min(100, d.progress || 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border-default text-xs text-text-muted text-center p-4">
              <div>
                <p>No tienes deudas registradas.</p>
                <a href="/app/debts" className="mt-2 inline-block text-xs text-brand-400 font-semibold hover:underline">
                  + Registrar mi primera deuda
                </a>
              </div>
            </div>
          )}

          {/* Historial rápido de abonos recientes */}
          {recentPayments.length > 0 && (
            <div className="pt-2 border-t border-border-default">
              <div className="text-[11px] font-bold text-text-secondary mb-1.5 flex items-center justify-between">
                <span>Últimos abonos registrados:</span>
                <a href="/app/payments" className="text-[10px] text-brand-400 hover:underline">Ver historial</a>
              </div>
              <div className="space-y-1">
                {recentPayments.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] text-text-muted">
                    <span className="truncate">{p.debtName} ({p.paidAt ? String(p.paidAt).slice(0, 10) : 'Fecha'})</span>
                    <span className="font-bold text-accent-400 shrink-0 ml-2">+{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Progreso de Metas de Ahorro */}
        <div className="rounded-2xl border border-border-default bg-surface-50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 4a6 6 0 106 6 6 6 0 00-6-6zm0 3a3 3 0 103 3 3 3 0 00-3-3z" />
                </svg>
                Progreso de Metas de Ahorro
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Visualiza cuánto llevas ahorrado en cada meta activa
              </p>
            </div>
            <a
              href="/app/savings"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Gestionar metas →
            </a>
          </div>

          {/* Resumen Global de Ahorros */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-100 p-3 text-center border border-border-default">
            <div>
              <div className="text-[10px] text-text-muted">Total Ahorrado</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-400">
                {formatCurrency(summary.totalSaved || 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">Objetivo Total</div>
              <div className="text-xs sm:text-sm font-bold text-text-primary">
                {formatCurrency(summary.totalSavingsTarget || 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">Aporte Mensual</div>
              <div className="text-xs sm:text-sm font-bold text-brand-400">
                +{formatCurrency(summary.totalMonthlySavingsContribution || 0)}
              </div>
            </div>
          </div>

          {/* Lista de Metas con Progreso */}
          {savingsGoals.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {savingsGoals.map((g: any) => {
                const isCompleted = g.status === 'completed' || g.percent >= 100;
                return (
                  <div
                    key={g.id}
                    className={`rounded-xl border p-3 space-y-2 transition-all ${
                      isCompleted
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-border-default bg-surface-100/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-base">{g.icon || '🎯'}</span>
                        <div className="truncate">
                          <span className="font-bold text-xs text-text-primary truncate block">
                            {g.name}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            Aporte: {formatCurrency(g.monthlyContribution)}/mes
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatCurrency(g.currentAmount)}
                        </span>
                        <div className="text-[10px] text-text-muted">
                          de {formatCurrency(g.targetAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso de ahorro */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-text-muted font-medium">
                          {isCompleted ? '¡Meta alcanzada! 🎉' : `Faltan ${formatCurrency(Math.max(0, g.targetAmount - g.currentAmount))}`}
                        </span>
                        <span className="font-bold text-emerald-400">{g.percent}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(100, g.percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border-default text-xs text-text-muted text-center p-4">
              <div>
                <p>No tienes metas de ahorro configuradas.</p>
                <a href="/app/savings" className="mt-2 inline-block text-xs text-emerald-400 font-semibold hover:underline">
                  + Crear mi primera meta de ahorro
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🏆 Score de Salud Financiera y Gamificación */}
      <HealthScoreWidget />

      {/* 🚀 ONBOARDING WIZARD MODAL FOR NEW REGISTERED USERS */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-brand-500/30 bg-surface-50 p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Close button X */}
            <button
              type="button"
              onClick={() => setShowOnboarding(false)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/20 text-2xl">
                🇪🇨
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary">
                ¡Bienvenido a ProyecAhorro, <span className="gradient-text">{userName}</span>!
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
                Para calcular tu flujo real y plan de optimización de deudas, configuremos tu sueldo y esquema de cobro en Ecuador.
              </p>
            </div>

            <form onSubmit={handleSaveOnboarding} className="space-y-4">
              {/* Paso 1: Sueldo Bruto */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  1. ¿Cuánto es tu sueldo bruto mensual? ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={onboardingAmount}
                    onChange={(e) => setOnboardingAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full rounded-xl border border-border-default bg-surface-100 pl-9 pr-4 py-3 text-base font-bold text-text-primary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="1000.00"
                  />
                </div>
              </div>

              {/* Fecha de inicio de labores */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Fecha de inicio de labores <span className="text-[10px] text-text-muted font-normal">(Para Fondos de Reserva)</span>
                </label>
                <input
                  type="date"
                  value={onboardingWorkStartDate}
                  onChange={(e) => setOnboardingWorkStartDate(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Paso 2: Aporte IESS */}
              <div className="rounded-2xl border border-border-default bg-surface-100/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="onboardingDeductIess"
                      checked={deductIess}
                      onChange={(e) => setDeductIess(e.target.checked)}
                      className="h-4 w-4 rounded border-border-default text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                    <label htmlFor="onboardingDeductIess" className="text-xs font-semibold text-text-primary cursor-pointer">
                      Descontar automáticamente el Aporte al IESS (Ecuador)
                    </label>
                  </div>
                  {deductIess && (
                    <span className="text-xs font-bold text-warning-400 bg-warning-500/10 px-2 py-0.5 rounded border border-warning-500/20">
                      9.45% de ley
                    </span>
                  )}
                </div>

                {deductIess && (
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-border-default text-text-muted">
                    <span>Descuento IESS retenido:</span>
                    <strong className="text-warning-400 text-sm">-${onboardingPreview.iessDeduction.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {/* Paso 3: Esquema de cobro */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-secondary">
                  2. ¿Cómo recibes tus pagos en el mes?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardingScheme('quincena_fin_mes')}
                    className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                      onboardingScheme === 'quincena_fin_mes'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-md shadow-brand-500/10 ring-1 ring-brand-500'
                        : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <svg className="h-4 w-4 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Quincena y Fin de Mes</span>
                    </div>
                    <div className="mt-1 text-[11px] opacity-80">Cobro el 15 y el 30</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnboardingScheme('monthly')}
                    className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                      onboardingScheme === 'monthly'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-md shadow-brand-500/10 ring-1 ring-brand-500'
                        : 'border-border-default bg-surface-100 text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <svg className="h-4 w-4 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span>Un Solo Pago</span>
                    </div>
                    <div className="mt-1 text-[11px] opacity-80">100% a fin de mes</div>
                  </button>
                </div>
              </div>

              {/* Detalle Quincena / Fin de mes */}
              {onboardingScheme === 'quincena_fin_mes' && (
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border-default bg-surface-100 p-4">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary">Anticipo Quincena (15)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={onboardingQuincena}
                      onChange={(e) => {
                        const q = parseFloat(e.target.value) || 0;
                        setOnboardingQuincena(q);
                        setOnboardingFinDeMes(Math.round(Math.max(0, onboardingPreview.netMonthly - q) * 100) / 100);
                      }}
                      className="mt-1 w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary">Saldo Fin de Mes (30)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={onboardingFinDeMes}
                      onChange={(e) => setOnboardingFinDeMes(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded-xl border border-border-default bg-surface-50 px-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Preview Total Líquido en mano */}
              <div className="rounded-2xl bg-accent-500/10 border border-accent-500/30 p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs font-medium text-text-secondary block">Sueldo Neto Líquido Disponible:</span>
                  <span className="text-[11px] text-text-muted">Dinero real que ingresa a tu cuenta bancaria</span>
                </div>
                <div className="text-xl font-extrabold text-accent-400">
                  {formatCurrency(Math.max(0, onboardingAmount - (deductIess ? (onboardingAmount * iessPercentage) / 100 : 0)))}
                </div>
              </div>

              {onboardingError && (
                <div className="rounded-xl bg-danger-500/10 border border-danger-500/20 px-4 py-2.5 text-xs text-danger-400">
                  {onboardingError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingOnboarding}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 hover:shadow-brand-400/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{savingOnboarding ? 'Guardando configuración...' : 'Comenzar a optimizar mis finanzas'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
