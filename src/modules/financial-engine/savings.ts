/**
 * ═══════════════════════════════════════════
 * ProyecAhorro — Savings Goal Projection Engine
 * ═══════════════════════════════════════════
 *
 * Projects the monthly accumulation of savings towards a goal,
 * calculates required monthly contributions, and estimates completion dates.
 */

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  startDate: string; // YYYY-MM-DD
  targetDate: string | null; // YYYY-MM-DD or null
  category: string;
  icon: string;
  status: string;
  linkedExpenseId?: string | null; // Gasto que alimenta la meta automáticamente
  linkedSince?: string | null; // YYYY-MM-DD desde cuándo acumula
}

export interface LinkedAccrual {
  monthsElapsed: number; // Meses completos transcurridos desde linkedSince
  monthlyAmount: number; // Aporte mensual del gasto vinculado
  accrued: number; // Total acumulado automáticamente hasta hoy
}

/**
 * Acumulación automática de una meta vinculada a un gasto: cada vez que se
 * cumple un mes desde `linkedSince`, se suma el monto mensual del gasto.
 * (El primer aporte cuenta al cumplirse el primer mes, no el día del vínculo.)
 */
export function calculateLinkedAccrual(
  linkedSince: string,
  monthlyAmount: number,
  today: Date = new Date()
): LinkedAccrual {
  const since = new Date(`${linkedSince.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(since.getTime()) || monthlyAmount <= 0) {
    return { monthsElapsed: 0, monthlyAmount: Math.max(0, monthlyAmount), accrued: 0 };
  }

  let months =
    (today.getFullYear() - since.getFullYear()) * 12 +
    (today.getMonth() - since.getMonth());
  if (today.getDate() < since.getDate()) months -= 1;
  const monthsElapsed = Math.max(0, months);

  return {
    monthsElapsed,
    monthlyAmount: Math.round(monthlyAmount * 100) / 100,
    accrued: Math.round(monthsElapsed * monthlyAmount * 100) / 100,
  };
}

export interface SavingsSnapshot {
  month: number;
  date: string; // YYYY-MM-DD
  accumulated: number;
  contributed: number; // Amount added that month
  percentComplete: number;
  remaining: number;
}

export interface SavingsProjection {
  snapshots: SavingsSnapshot[];
  totalContributed: number;
  estimatedCompletionDate: string | null;
  estimatedMonthsToGoal: number | null;
  isOnTrack: boolean;
  monthlyNeeded: number; // What's needed per month to meet targetDate
  percentComplete: number;
  remaining: number;
  daysRemaining: number | null;
}

/**
 * Project savings accumulation month by month.
 * Shows how the savings grow over time towards the goal.
 */
export function projectSavingsGoal(goal: SavingsGoal, months = 24): SavingsProjection {
  const { targetAmount, currentAmount, monthlyContribution, startDate, targetDate } = goal;

  const remaining = Math.max(0, targetAmount - currentAmount);
  const percentComplete = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;

  // Days remaining to target date
  let daysRemaining: number | null = null;
  if (targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${targetDate}T00:00:00`);
    daysRemaining = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Calculate monthly needed to meet target date
  let monthlyNeeded = 0;
  if (targetDate && remaining > 0) {
    const today = new Date();
    const target = new Date(`${targetDate}T00:00:00`);
    const monthsDiff = Math.max(1,
      (target.getFullYear() - today.getFullYear()) * 12 +
      (target.getMonth() - today.getMonth())
    );
    monthlyNeeded = Math.round((remaining / monthsDiff) * 100) / 100;
  }

  // Is on track? If they contribute at least the required monthly amount
  const effectiveContribution = monthlyContribution > 0 ? monthlyContribution : 0;
  const isOnTrack = !targetDate || remaining === 0 || effectiveContribution >= monthlyNeeded;

  // Build monthly snapshots
  const snapshots: SavingsSnapshot[] = [];
  let accumulated = currentAmount;

  // Start from today for the projection
  const now = new Date();
  const startMonth = now.getMonth();
  const startYear = now.getFullYear();

  // Snapshot 0: current state
  snapshots.push({
    month: 0,
    date: `${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`,
    accumulated: currentAmount,
    contributed: 0,
    percentComplete,
    remaining,
  });

  for (let i = 1; i <= months; i++) {
    accumulated = Math.round((accumulated + effectiveContribution) * 100) / 100;
    const capped = Math.min(accumulated, targetAmount);

    const projMonth = startMonth + i;
    const year = startYear + Math.floor(projMonth / 12);
    const month = projMonth % 12;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const pct = targetAmount > 0 ? Math.min(100, (capped / targetAmount) * 100) : 100;

    snapshots.push({
      month: i,
      date: dateStr,
      accumulated: capped,
      contributed: effectiveContribution,
      percentComplete: Math.round(pct * 100) / 100,
      remaining: Math.max(0, Math.round((targetAmount - capped) * 100) / 100),
    });

    // Stop projecting once goal is met
    if (capped >= targetAmount) break;
  }

  // Estimated completion
  let estimatedMonthsToGoal: number | null = null;
  let estimatedCompletionDate: string | null = null;

  if (remaining <= 0) {
    estimatedMonthsToGoal = 0;
    estimatedCompletionDate = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`;
  } else if (effectiveContribution > 0) {
    estimatedMonthsToGoal = Math.ceil(remaining / effectiveContribution);
    const completionMonth = startMonth + estimatedMonthsToGoal;
    const cYear = startYear + Math.floor(completionMonth / 12);
    const cMonth = completionMonth % 12;
    estimatedCompletionDate = `${cYear}-${String(cMonth + 1).padStart(2, '0')}-01`;
  }

  const totalContributed = snapshots.reduce((sum, s) => sum + s.contributed, 0);

  return {
    snapshots,
    totalContributed,
    estimatedCompletionDate,
    estimatedMonthsToGoal,
    isOnTrack,
    monthlyNeeded,
    percentComplete: Math.round(percentComplete * 100) / 100,
    remaining,
    daysRemaining,
  };
}

/**
 * Calculate the monthly contribution needed to reach a target by a date.
 */
export function calculateMonthlyNeeded(
  targetAmount: number,
  currentAmount: number,
  targetDate: string
): number {
  const remaining = Math.max(0, targetAmount - currentAmount);
  if (remaining <= 0) return 0;

  const today = new Date();
  const target = new Date(`${targetDate}T00:00:00`);
  const monthsDiff = Math.max(1,
    (target.getFullYear() - today.getFullYear()) * 12 +
    (target.getMonth() - today.getMonth())
  );

  return Math.round((remaining / monthsDiff) * 100) / 100;
}

/**
 * Calculate when a goal will be completed given a monthly contribution.
 */
export function calculateCompletionDate(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number
): string | null {
  const remaining = Math.max(0, targetAmount - currentAmount);
  if (remaining <= 0) return new Date().toISOString().slice(0, 10);
  if (monthlyContribution <= 0) return null;

  const monthsNeeded = Math.ceil(remaining / monthlyContribution);
  const completion = new Date();
  completion.setMonth(completion.getMonth() + monthsNeeded);

  return completion.toISOString().slice(0, 10);
}
