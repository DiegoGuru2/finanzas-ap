import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { calculateMonthlyNeeded, calculateCompletionDate } from '@/modules/financial-engine/savings';
import { normalizeToMonthly } from '@/modules/financial-engine/cashflow';
import { catalogTint, DEFAULT_CATALOGS, fetchCatalog, type CatalogOption } from '@/lib/catalogs';

// ─── Category config ───
// Las categorías vienen del catálogo administrable (/admin/catalogs);
// estos colores se asignan cíclicamente a las opciones.
const COLOR_CYCLE = ['text-danger-400', 'text-brand-400', 'text-accent-400', 'text-warning-400', 'text-text-secondary'];

type CategoryMap = Record<string, { label: string; icon: string; color: string; hex: string | null }>;

const buildCategoryMap = (options: CatalogOption[]): CategoryMap => {
  const map: CategoryMap = {};
  options.forEach((opt, i) => {
    map[opt.value] = {
      label: opt.label,
      icon: opt.icon || '🎯',
      color: COLOR_CYCLE[i % COLOR_CYCLE.length],
      hex: opt.color || null,
    };
  });
  if (!map.other) map.other = { label: 'Otro', icon: '🎯', color: 'text-text-secondary', hex: null };
  return map;
};

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface ExpenseOption {
  id: string;
  name: string;
  amount: number;
  frequency: string;
}

interface GoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number; // efectivo (base + acumulado automático si hay vínculo)
  baseAmount: number; // lo depositado/registrado manualmente
  monthlyContribution: number;
  startDate: string;
  targetDate: string | null;
  category: string;
  icon: string;
  status: string;
  linkedExpenseId?: string | null;
  linkedSince?: string | null;
  linked: {
    expenseId: string;
    expenseName: string;
    monthlyAmount: number;
    monthsElapsed: number;
    accrued: number;
    since: string;
  } | null;
  projection: {
    snapshots: { month: number; date: string; accumulated: number; percentComplete: number; remaining: number }[];
    estimatedCompletionDate: string | null;
    estimatedMonthsToGoal: number | null;
    isOnTrack: boolean;
    monthlyNeeded: number;
    percentComplete: number;
    remaining: number;
    daysRemaining: number | null;
  };
}

interface Summary {
  totalSaved: number;
  totalTarget: number;
  totalMonthly: number;
  activeCount: number;
  completedCount: number;
  overallPercent: number;
}

const isoDay = (v?: string | null): string => {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(v as any);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function SavingsGoalsManager() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [CATEGORIES, setCategories] = useState<CategoryMap>(() =>
    buildCategoryMap(DEFAULT_CATALOGS.savings_category)
  );
  const [expensesList, setExpensesList] = useState<ExpenseOption[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('other');
  const [icon, setIcon] = useState('🎯');
  const [linkedExpenseId, setLinkedExpenseId] = useState('');
  const [linkedSince, setLinkedSince] = useState(new Date().toISOString().slice(0, 10));

  // Projection detail
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // Deposit modal
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/savings');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setGoals(json.data || []);
      setSummary(json.summary || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // Catálogo de categorías (administrable) + gastos para vincular
  useEffect(() => {
    fetchCatalog('savings_category').then((opts) => setCategories(buildCategoryMap(opts)));
    fetch('/api/expenses')
      .then((r) => r.json())
      .then((json) => {
        const list = (json.data || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          amount: Number(e.amount) || 0,
          frequency: e.frequency || 'monthly',
        }));
        setExpensesList(list);
      })
      .catch(() => {});
  }, []);

  const linkedExpense = expensesList.find((e) => e.id === linkedExpenseId) || null;
  const linkedMonthly = linkedExpense
    ? Math.round(normalizeToMonthly(linkedExpense.amount, linkedExpense.frequency as any) * 100) / 100
    : 0;

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setMonthlyContribution('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setTargetDate('');
    setCategory('other');
    setIcon('🎯');
    setLinkedExpenseId('');
    setLinkedSince(new Date().toISOString().slice(0, 10));
    setEditingId(null);
    setFormError(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (g: GoalData) => {
    setEditingId(g.id);
    setName(g.name);
    setTargetAmount(String(g.targetAmount));
    // Se edita la base manual; el acumulado automático del vínculo se recalcula solo
    setCurrentAmount(String(g.baseAmount ?? g.currentAmount));
    setMonthlyContribution(String(g.monthlyContribution));
    setStartDate(isoDay(g.startDate) || new Date().toISOString().slice(0, 10));
    setTargetDate(isoDay(g.targetDate) || '');
    setCategory(g.category);
    setIcon(g.icon);
    setLinkedExpenseId(g.linked?.expenseId || '');
    setLinkedSince(isoDay(g.linked?.since) || new Date().toISOString().slice(0, 10));
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const payload: any = {
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount) || 0,
        // Con gasto vinculado, el aporte mensual es el monto del gasto
        monthlyContribution: linkedExpenseId ? linkedMonthly : Number(monthlyContribution) || 0,
        startDate,
        targetDate: targetDate || null,
        category,
        icon: CATEGORIES[category]?.icon || icon,
        linkedExpenseId: linkedExpenseId || null,
        linkedSince: linkedExpenseId ? linkedSince : null,
      };

      const isEditing = !!editingId;
      if (isEditing) payload.id = editingId;

      const res = await fetch('/api/savings', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');

      setShowModal(false);
      resetForm();
      await fetchGoals();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta meta de ahorro?')) return;
    try {
      await fetch(`/api/savings?id=${id}`, { method: 'DELETE' });
      await fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoalId) return;
    const goal = goals.find((g) => g.id === depositGoalId);
    if (!goal) return;

    const amount = Number(depositAmount);
    if (!amount || amount <= 0) return;

    try {
      // El depósito manual suma a la BASE (el acumulado automático del
      // vínculo se calcula aparte y no debe duplicarse aquí)
      const newCurrent = Math.round(((goal.baseAmount ?? goal.currentAmount) + amount) * 100) / 100;
      const res = await fetch('/api/savings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: newCurrent,
          monthlyContribution: goal.monthlyContribution,
          startDate: goal.startDate,
          targetDate: goal.targetDate,
          category: goal.category,
          icon: goal.icon,
          linkedExpenseId: goal.linked?.expenseId || null,
          linkedSince: goal.linked?.since || null,
        }),
      });

      if (!res.ok) throw new Error('Error al registrar depósito');

      setDepositGoalId(null);
      setDepositAmount('');
      await fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-calculate monthly if target date changes
  const autoCalcMonthly = () => {
    const tgt = Number(targetAmount);
    const cur = Number(currentAmount) || 0;
    if (tgt > 0 && targetDate) {
      const needed = calculateMonthlyNeeded(tgt, cur, targetDate);
      setMonthlyContribution(String(needed));
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto mb-3" />
        Cargando metas de ahorro...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger-500/20 bg-danger-500/5 p-6 text-sm text-danger-400">
        {error}
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">🎯 Metas de Ahorro</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Define tus objetivos financieros, contribuye mensualmente y proyecta cuándo los alcanzarás.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition-all hover:bg-accent-400 cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Meta
        </button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4">
            <span className="text-[11px] font-medium text-accent-400">Total Ahorrado</span>
            <div className="mt-1.5 text-lg sm:text-2xl font-bold text-accent-400">{formatCurrency(summary.totalSaved)}</div>
            <div className="mt-0.5 text-[10px] text-text-muted">de {formatCurrency(summary.totalTarget)} objetivo</div>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface-50 p-4">
            <span className="text-[11px] font-medium text-text-muted">Progreso General</span>
            <div className="mt-1.5 text-lg sm:text-2xl font-bold text-text-primary">{summary.overallPercent}%</div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
              <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${Math.min(100, summary.overallPercent)}%` }} />
            </div>
          </div>
          <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
            <span className="text-[11px] font-medium text-brand-400">Aporte Mensual</span>
            <div className="mt-1.5 text-lg sm:text-2xl font-bold text-brand-400">{formatCurrency(summary.totalMonthly)}</div>
            <div className="mt-0.5 text-[10px] text-text-muted">Compromiso total a metas</div>
          </div>
          <div className="rounded-2xl border border-border-default bg-surface-50 p-4">
            <span className="text-[11px] font-medium text-text-muted">Metas</span>
            <div className="mt-1.5 text-lg sm:text-2xl font-bold text-text-primary">
              {summary.activeCount} <span className="text-sm font-normal text-text-muted">activas</span>
            </div>
            {summary.completedCount > 0 && (
              <div className="mt-0.5 text-[10px] text-accent-400 font-semibold">✓ {summary.completedCount} completadas</div>
            )}
          </div>
        </div>
      )}

      {/* Active Goals */}
      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <div className="rounded-2xl border border-border-default bg-surface-50 p-12 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-bold text-text-primary">Aún no tienes metas de ahorro</h3>
          <p className="text-sm text-text-secondary mt-1">
            Crea tu primera meta para empezar a proyectar tu futuro financiero.
          </p>
          <button onClick={openCreate} className="mt-4 rounded-xl bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-accent-400 transition-all cursor-pointer">
            Crear mi primera meta
          </button>
        </div>
      )}

      <div className="space-y-4">
        {activeGoals.map((goal) => {
          const cat = CATEGORIES[goal.category] || CATEGORIES.other;
          const proj = goal.projection;
          const isExpanded = expandedGoalId === goal.id;

          return (
            <div key={goal.id} className="rounded-2xl border border-border-default bg-surface-50 overflow-hidden transition-all hover:border-accent-500/30">
              {/* Main card */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl border ${
                        cat.hex ? 'cat-tint' : 'bg-accent-500/15 border-transparent'
                      }`}
                      style={catalogTint(cat.hex)}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">{goal.name}</h3>
                      <span className={`text-[11px] font-semibold ${cat.color}`}>{cat.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {goal.linked && (
                      <span
                        className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[10px] font-bold text-brand-400"
                        title={`Acumula ${formatCurrency(goal.linked.monthlyAmount)} cada mes desde ${goal.linked.since}`}
                      >
                        🔗 {goal.linked.expenseName}
                      </span>
                    )}
                    {proj.isOnTrack ? (
                      <span className="rounded-full bg-accent-500/15 px-2.5 py-0.5 text-[10px] font-bold text-accent-400">✓ En camino</span>
                    ) : (
                      <span className="rounded-full bg-warning-500/15 px-2.5 py-0.5 text-[10px] font-bold text-warning-400">⚠ Atrasado</span>
                    )}
                    <button onClick={() => setDepositGoalId(goal.id)} className="rounded-lg bg-accent-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-accent-400 transition-colors cursor-pointer">
                      💰 Depositar
                    </button>
                    <button onClick={() => openEdit(goal)} className="rounded-lg border border-border-default px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(goal.id)} className="rounded-lg border border-danger-500/30 px-2.5 py-1 text-[11px] font-semibold text-danger-400 hover:bg-danger-500/10 transition-colors cursor-pointer">
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-xs text-text-secondary">
                      <strong className="text-accent-400 text-sm">{formatCurrency(goal.currentAmount)}</strong>
                      <span className="text-text-muted"> de {formatCurrency(goal.targetAmount)}</span>
                    </span>
                    <span className="text-xs font-bold text-text-primary">{proj.percentComplete.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-surface-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        proj.percentComplete >= 100 ? 'bg-accent-500' : proj.isOnTrack ? 'bg-brand-500' : 'bg-warning-500'
                      }`}
                      style={{ width: `${Math.min(100, proj.percentComplete)}%` }}
                    />
                  </div>
                  {goal.linked && (
                    <p className="mt-1.5 text-[10px] text-text-muted">
                      🔗 Base {formatCurrency(goal.baseAmount)} +{' '}
                      <strong className="text-accent-400">{formatCurrency(goal.linked.accrued)} abonados</strong>
                      {' '}({goal.linked.monthsElapsed} {goal.linked.monthsElapsed === 1 ? 'pago realizado' : 'pagos realizados'} marcados en cronograma desde el {goal.linked.since})
                    </p>
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-text-muted font-medium">Falta</div>
                    <div className="text-xs font-bold text-text-primary">{formatCurrency(proj.remaining)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted font-medium">Aporte Mensual</div>
                    <div className="text-xs font-bold text-brand-400">{formatCurrency(goal.monthlyContribution)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted font-medium">Meta estimada</div>
                    <div className="text-xs font-bold text-text-primary">
                      {proj.estimatedMonthsToGoal !== null ? `${proj.estimatedMonthsToGoal} meses` : '∞'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted font-medium">Fecha estimada</div>
                    <div className="text-xs font-bold text-text-primary">
                      {proj.estimatedCompletionDate
                        ? (() => {
                            const [y, m] = proj.estimatedCompletionDate.split('-');
                            return `${MONTH_SHORT[parseInt(m) - 1]} ${y}`;
                          })()
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Expand button */}
                <button
                  onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-100 transition-all cursor-pointer"
                >
                  {isExpanded ? '▲ Ocultar proyección' : '▼ Ver proyección mensual'}
                </button>
              </div>

              {/* Expanded projection chart */}
              {isExpanded && (
                <div className="border-t border-border-default bg-surface-100/50 p-4">
                  <h4 className="text-xs font-bold text-text-primary mb-3">📈 Proyección de Ahorro Acumulado</h4>
                  <div className="overflow-x-auto">
                    <div className="flex gap-1 min-w-0" style={{ minWidth: `${proj.snapshots.length * 50}px` }}>
                      {proj.snapshots.map((s, idx) => {
                        const barHeight = goal.targetAmount > 0 ? (s.accumulated / goal.targetAmount) * 100 : 0;
                        const [, m] = s.date.split('-');
                        return (
                          <div key={idx} className="flex flex-col items-center flex-1 min-w-[42px]">
                            <div className="text-[9px] text-text-muted font-bold mb-1">
                              {formatCurrency(s.accumulated)}
                            </div>
                            <div className="w-full h-24 flex items-end rounded-t-md overflow-hidden bg-surface-200">
                              <div
                                className={`w-full rounded-t-md transition-all ${
                                  s.percentComplete >= 100 ? 'bg-accent-500' : 'bg-brand-500/70'
                                }`}
                                style={{ height: `${Math.min(100, barHeight)}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-text-muted mt-1">
                              {s.month === 0 ? 'Hoy' : MONTH_SHORT[parseInt(m) - 1]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
                    <span>Meta: {formatCurrency(goal.targetAmount)}</span>
                    {goal.targetDate && <span>Fecha límite: {goal.targetDate}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-accent-400 mb-3">✅ Metas Completadas ({completedGoals.length})</h3>
          <div className="space-y-2">
            {completedGoals.map((goal) => {
              const cat = CATEGORIES[goal.category] || CATEGORIES.other;
              return (
                <div key={goal.id} className="flex items-center justify-between rounded-xl border border-accent-500/20 bg-accent-500/5 p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{cat.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-text-primary">{goal.name}</span>
                      <span className="text-[10px] text-accent-400 ml-2">✓ {formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className="text-[10px] text-text-muted hover:text-danger-400 cursor-pointer">🗑️</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ Create/Edit Modal ══════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">{editingId ? '✏️ Editar Meta' : '🎯 Nueva Meta de Ahorro'}</h3>
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-danger-500/20 bg-danger-500/10 p-3 text-xs text-danger-400">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre de la Meta</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Ej. Vacaciones en Galápagos, Fondo de emergencia..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Categoría</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setCategory(key); setIcon(val.icon); }}
                      className={`flex flex-col items-center gap-0.5 rounded-xl p-2 text-center transition-all cursor-pointer ${
                        category === key
                          ? val.hex
                            ? 'cat-tint border-2 shadow-sm'
                            : 'bg-accent-500/15 border-2 border-accent-500/50 shadow-sm'
                          : 'bg-surface-100 border border-border-default hover:bg-surface-200'
                      }`}
                      style={category === key ? catalogTint(val.hex) : undefined}
                    >
                      <span className="text-lg">{val.icon}</span>
                      <span className="text-[9px] font-medium text-text-secondary leading-tight">{val.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Monto Objetivo ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="1"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      onBlur={autoCalcMonthly}
                      required
                      className="w-full rounded-xl border border-border-default bg-surface-100 pl-8 pr-3 py-2 text-xs font-bold text-text-primary focus:border-brand-500 focus:outline-none"
                      placeholder="5000.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Ya Ahorrado ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      onBlur={autoCalcMonthly}
                      className="w-full rounded-xl border border-border-default bg-surface-100 pl-8 pr-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha Límite (opcional)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => { setTargetDate(e.target.value); }}
                    onBlur={autoCalcMonthly}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* ─── Vincular con un gasto (ahorro programado) ─── */}
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3 space-y-2">
                <label className="block text-xs font-bold text-text-primary">
                  🔗 Vincular con un gasto (opcional)
                </label>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Si registras el ahorro como un gasto (ej. "Ahorro mensual"), vincúlalo aquí:
                  la meta <strong className="text-brand-400">acumulará ese monto automáticamente cada mes</strong>,
                  sin que tengas que registrar depósitos.
                </p>
                <select
                  value={linkedExpenseId}
                  onChange={(e) => setLinkedExpenseId(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Sin vínculo — depósitos manuales</option>
                  {expensesList.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.name} · {formatCurrency(exp.amount)}/{exp.frequency === 'monthly' ? 'mes' : exp.frequency}
                    </option>
                  ))}
                </select>
                {linkedExpenseId && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-text-secondary">Acumular desde</label>
                      <input
                        type="date"
                        value={linkedSince}
                        onChange={(e) => setLinkedSince(e.target.value)}
                        className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="text-[11px] text-text-secondary pb-2">
                      Aporte: <strong className="text-brand-400">{formatCurrency(linkedMonthly)}/mes</strong>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Contribución Mensual ($)
                  {linkedExpenseId && <span className="ml-2 text-brand-400">(definida por el gasto vinculado)</span>}
                  {!linkedExpenseId && targetDate && (
                    <button type="button" onClick={autoCalcMonthly} className="ml-2 text-brand-400 font-semibold cursor-pointer hover:underline">
                      ⚡ Auto-calcular
                    </button>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={linkedExpenseId ? String(linkedMonthly) : monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    disabled={!!linkedExpenseId}
                    className="w-full rounded-xl border border-border-default bg-surface-100 pl-8 pr-3 py-2 text-xs font-bold text-brand-400 focus:border-brand-500 focus:outline-none disabled:opacity-60"
                    placeholder="200.00"
                  />
                </div>
                {(() => {
                  const contrib = linkedExpenseId ? linkedMonthly : Number(monthlyContribution);
                  if (!(Number(targetAmount) > 0 && contrib > 0)) return null;
                  return (
                    <p className="text-[10px] text-text-muted mt-1">
                      📅 Estimación: alcanzarás la meta en{' '}
                      <strong className="text-brand-400">
                        {Math.ceil((Number(targetAmount) - (Number(currentAmount) || 0)) / contrib)} meses
                      </strong>
                      {' '}({calculateCompletionDate(Number(targetAmount), Number(currentAmount) || 0, contrib) || '—'})
                    </p>
                  );
                })()}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 rounded-xl border border-border-default px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-accent-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-accent-400 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? 'Guardando...' : editingId ? 'Actualizar Meta' : 'Crear Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ Deposit Modal ══════════ */}
      {depositGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">💰 Registrar Depósito</h3>
              <button
                type="button"
                onClick={() => { setDepositGoalId(null); setDepositAmount(''); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Agrega un monto al ahorro acumulado de <strong className="text-text-primary">{goals.find((g) => g.id === depositGoalId)?.name}</strong>.
            </p>

            <form onSubmit={handleDeposit} className="space-y-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border-default bg-surface-100 pl-8 pr-3 py-3 text-sm font-bold text-accent-400 focus:border-accent-500 focus:outline-none"
                  placeholder="100.00"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setDepositGoalId(null); setDepositAmount(''); }}
                  className="flex-1 rounded-xl border border-border-default px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-accent-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-accent-400 cursor-pointer"
                >
                  Depositar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
