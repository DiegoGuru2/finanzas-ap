import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface Breakdown {
  score: number;
  max: number;
  ratio?: number;
  rate?: number;
  compliance?: number;
  budgetsCount?: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

interface HealthData {
  score: number;
  level: string;
  levelColor: string;
  breakdown: {
    debtManagement: Breakdown;
    savings: Breakdown;
    paymentCompliance: Breakdown;
    budgetDiscipline: Breakdown;
  };
  badges: Badge[];
  stats: {
    totalIncome: number;
    totalExpenses: number;
    totalDebt: number;
    totalSaved: number;
    debtToIncomeRatio: number;
  };
}

export default function HealthScoreWidget() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchScore();
  }, []);

  const fetchScore = async () => {
    try {
      const res = await fetch('/api/dashboard/health-score');
      const json = await res.json();
      if (json.score !== undefined) setData(json);
    } catch (err) {
      console.error('Error fetching health score:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-default bg-surface-50 p-6 animate-pulse">
        <div className="h-6 w-40 rounded bg-surface-200 mb-4" />
        <div className="h-32 w-32 rounded-full bg-surface-200 mx-auto" />
      </div>
    );
  }

  if (!data) return null;

  const circumference = 2 * Math.PI * 58;
  const strokeDashoffset = circumference - (data.score / 100) * circumference;

  const scoreColor =
    data.score >= 85 ? '#10b981' :
    data.score >= 70 ? '#3b82f6' :
    data.score >= 55 ? '#f59e0b' :
    data.score >= 35 ? '#f97316' : '#ef4444';

  const breakdownItems = [
    { key: 'debtManagement', label: 'Manejo de Deuda', data: data.breakdown.debtManagement, detail: `Ratio deuda/ingreso: ${data.breakdown.debtManagement.ratio}%` },
    { key: 'savings', label: 'Ahorro', data: data.breakdown.savings, detail: `Cobertura de emergencia: ${data.breakdown.savings.rate}%` },
    { key: 'paymentCompliance', label: 'Cumplimiento de Pagos', data: data.breakdown.paymentCompliance, detail: `Cumplimiento: ${data.breakdown.paymentCompliance.compliance}%` },
    { key: 'budgetDiscipline', label: 'Disciplina Presupuestaria', data: data.breakdown.budgetDiscipline, detail: `${data.breakdown.budgetDiscipline.budgetsCount} presupuestos` },
  ];

  const unlockedBadges = data.badges.filter((b) => b.unlocked);
  const lockedBadges = data.badges.filter((b) => !b.unlocked);

  return (
    <div className="space-y-6">
      {/* Score Principal */}
      <div className="rounded-2xl border border-border-default bg-surface-50 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-text-primary">Salud Financiera</h3>
            <p className="text-xs text-text-secondary mt-0.5">Score general basado en tus finanzas personales</p>
          </div>
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="text-xs font-semibold text-brand-400 hover:underline cursor-pointer"
          >
            {showDetail ? 'Ocultar detalle' : 'Ver desglose'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Círculo de score */}
          <div className="relative flex-shrink-0">
            <svg className="h-36 w-36 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-200" />
              <circle
                cx="64" cy="64" r="58" fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ color: scoreColor }}>{data.score}</span>
              <span className="text-[10px] font-semibold text-text-muted">/100</span>
            </div>
          </div>

          {/* Nivel y stats */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div>
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: scoreColor }}
              >
                {data.level}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-100 p-2.5 border border-border-default">
                <div className="text-[10px] text-text-muted">Ingresos</div>
                <div className="text-sm font-bold text-text-primary">{formatCurrency(data.stats.totalIncome)}</div>
              </div>
              <div className="rounded-xl bg-surface-100 p-2.5 border border-border-default">
                <div className="text-[10px] text-text-muted">Gastos</div>
                <div className="text-sm font-bold text-text-primary">{formatCurrency(data.stats.totalExpenses)}</div>
              </div>
              <div className="rounded-xl bg-surface-100 p-2.5 border border-border-default">
                <div className="text-[10px] text-text-muted">Deuda</div>
                <div className="text-sm font-bold text-danger-400">{formatCurrency(data.stats.totalDebt)}</div>
              </div>
              <div className="rounded-xl bg-surface-100 p-2.5 border border-border-default">
                <div className="text-[10px] text-text-muted">Ahorrado</div>
                <div className="text-sm font-bold text-accent-400">{formatCurrency(data.stats.totalSaved)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Desglose */}
        {showDetail && (
          <div className="pt-4 border-t border-border-default space-y-3">
            <h4 className="text-xs font-bold text-text-primary">Desglose del Score</h4>
            {breakdownItems.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">{item.label}</span>
                  <span className="text-xs font-bold text-text-primary">
                    {item.data.score}/{item.data.max}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-700 ease-out"
                    style={{ width: `${(item.data.score / item.data.max) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-text-muted">{item.detail}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insignias */}
      <div className="rounded-2xl border border-border-default bg-surface-50 p-6 space-y-4">
        <h3 className="text-base font-bold text-text-primary">Insignias y Logros</h3>

        {unlockedBadges.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-accent-400 mb-2">✨ Desbloqueadas ({unlockedBadges.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unlockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 rounded-xl border border-accent-500/30 bg-accent-500/5 p-3 transition-all hover:scale-[1.02]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/20 text-xl flex-shrink-0">
                    {badge.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text-primary truncate">{badge.name}</div>
                    <div className="text-[10px] text-text-secondary line-clamp-2">{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lockedBadges.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-text-muted mb-2">🔒 Por desbloquear ({lockedBadges.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-100/50 p-3 opacity-60"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-200 text-xl flex-shrink-0 grayscale">
                    {badge.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text-muted truncate">{badge.name}</div>
                    <div className="text-[10px] text-text-muted line-clamp-2">{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
