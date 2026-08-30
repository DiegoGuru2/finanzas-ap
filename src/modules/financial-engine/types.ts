/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Financial Engine Types
 * ═══════════════════════════════════════════
 */

// ─── Income & Ecuadorian Payroll ───

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'annual' | 'once';

export type SalaryPaymentScheme = 'monthly' | 'quincena_fin_mes';

export interface Income {
  id: string;
  name: string;
  amount: number; // Monto mensual total o sueldo nominal
  frequency: Frequency;
  isSalary?: boolean;
  paymentScheme?: SalaryPaymentScheme; // 'quincena_fin_mes' o 'monthly'
  quincenaAmount?: number; // Anticipo del 15
  finDeMesAmount?: number; // Saldo de fin de mes
  deductIess?: boolean; // Descuento IESS (Ecuador)
  iessPercentage?: number; // Default 9.45% (Aporte personal sector privado)
  iessDeduction?: number; // Monto calculado de IESS
  hasProgrammedSavings?: boolean; // Ahorro programado
  programmedSavingsAmount?: number; // Monto de ahorro programado a fin de mes
  netAmount?: number; // Monto líquido en mano
  date?: string | null; // Fecha del ingreso (para frequency 'once': décimos, bonos)
  // ─── Beneficios de Ley Ecuador ───
  hasFondosReserva?: boolean; // Fondos de reserva (tras 1 año en la empresa)
  fondosReservaMensualizado?: boolean; // true = llegan en el rol, false = acumulados en el IESS
  decimoTerceroMensualizado?: boolean; // true = 1/12 mensual, false = pago en diciembre
  decimoCuartoMensualizado?: boolean; // true = 1/12 SBU mensual, false = pago anual
  region?: 'costa' | 'sierra'; // Define el mes de pago del décimo cuarto
  sbuAmount?: number; // SBU vigente (configurable; cambia cada año)
  hasUtilidades?: boolean; // La empresa reparte utilidades
  utilidadesAmount?: number; // Estimado anual de utilidades
}

// ─── Expense ───

export type ExpenseCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'insurance'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'savings'
  | 'other';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  isEssential: boolean;
  frequency: Frequency;
  dueDay?: number; // 1-31 (útil para planificar contra quincena o fin de mes)
  paymentTiming?: 'quincena' | 'fin_de_mes' | 'ambas'; // En qué corte se paga (default 'ambas': repartido)
  activeFrom?: string | null; // Entra al cronograma desde esta fecha (ISO, null = siempre)
  activeUntil?: string | null; // Sale del cronograma después de esta fecha (ISO, null = indefinido)
}

// ─── Debt ───

export type DebtType =
  | 'credit_card'
  | 'personal_loan'
  | 'mortgage'
  | 'auto_loan'
  | 'student_loan'
  | 'biess_quirografario'
  | 'biess_hipotecario'
  | 'other';

export interface Debt {
  id: string;
  name: string;
  creditor?: string;
  currentBalance: number;
  originalBalance: number;
  apr: number; // Annual Percentage Rate (0-100)
  minimumPayment: number;
  dueDay: number; // Day of month (1-31)
  type: DebtType;
  paymentTiming?: 'quincena' | 'fin_de_mes' | 'any'; // Para alinear con el flujo de quincena
  hasInstallmentPlan?: boolean; // Pagar en cuotas fijas
  termMonths?: number | null; // Número de cuotas (la cuota mensual = saldo / cuotas)
}

// ─── Strategy ───

export type Strategy = 'avalanche' | 'snowball' | 'liquidity' | 'custom';

// ─── Cashflow ───

export interface CashflowInput {
  incomes: Income[];
  expenses: Expense[];
  minimumPayments: number; // Sum of all minimum debt payments
}

export interface CashflowResult {
  totalGrossIncome: number;
  totalMonthlyIncome?: number; // Alias for backward compatibility
  totalIessDeductions: number;
  totalProgrammedSavings: number; // Ahorro programado retenido a fin de mes
  totalNetIncome: number; // Líquido real disponible
  totalBenefitsMonthly: number; // Beneficios de ley mensualizados que llegan en el rol
  quincenaAvailable: number; // Disponible en el corte de quincena
  finDeMesAvailable: number; // Disponible en el corte de fin de mes
  totalMonthlyExpenses: number;
  totalEssentialExpenses: number;
  totalNonEssentialExpenses: number;
  minimumPayments: number;
  surplus: number; // Excedente libre para amortizar deudas
  savingsRate: number;
  status: 'healthy' | 'tight' | 'risk_payment' | 'deficit';
}

// ─── Optimization ───

export interface OptimizationInput {
  surplus: number;
  debts: Debt[];
  strategy: Strategy;
  emergencyReservePercent?: number;
}

export interface PaymentAllocation {
  debtId: string;
  debtName: string;
  amount: number;
  type: 'minimum' | 'extra';
}

export interface OptimizationResult {
  allocations: PaymentAllocation[];
  totalAllocated: number;
  emergencyReserve: number;
  projectedTotalInterest: number;
  projectedDebtFreeDate: string; // ISO date
  strategy: Strategy;
  warnings: OptimizationWarning[];
}

export interface OptimizationWarning {
  type: 'insufficient_funds' | 'minimum_not_met' | 'high_risk' | 'zero_surplus';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

// ─── Projection ───

export interface ProjectionInput {
  debts: Debt[];
  monthlyPayment: number;
  strategy: Strategy;
  months: number;
  startDate?: string;
}

export interface MonthlySnapshot {
  month: number;
  date: string;
  debts: DebtSnapshot[];
  totalBalance: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  monthlyInterest: number;
  monthlyPrincipal: number;
}

export interface DebtSnapshot {
  debtId: string;
  debtName: string;
  remainingBalance: number;
  interestCharged: number;
  principalPaid: number;
  amountPaid: number;
  isPaidOff: boolean;
}

export interface ProjectionResult {
  snapshots: MonthlySnapshot[];
  totalInterestPaid: number;
  totalPaid: number;
  debtFreeMonth: number | null;
  debtFreeDate: string | null;
  averageMonthlyInterest: number;
}
