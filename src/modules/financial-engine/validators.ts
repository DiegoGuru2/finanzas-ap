/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Financial Engine Validators
 * ═══════════════════════════════════════════
 *
 * Zod schemas for validating financial data in Ecuador and internationally.
 */

import { z } from 'zod';

// ─── Enums ───

export const frequencySchema = z.enum(['weekly', 'biweekly', 'monthly', 'annual', 'once']);

export const salaryPaymentSchemeSchema = z.enum(['monthly', 'quincena_fin_mes']);

export const debtTypeSchema = z.enum([
  'credit_card',
  'personal_loan',
  'mortgage',
  'auto_loan',
  'student_loan',
  'biess_quirografario',
  'biess_hipotecario',
  'other',
]);

export const expenseCategorySchema = z.enum([
  'housing',
  'food',
  'transport',
  'utilities',
  'insurance',
  'health',
  'education',
  'entertainment',
  'savings',
  'other',
]);

export const strategySchema = z.enum(['avalanche', 'snowball', 'liquidity', 'custom']);
export const currencySchema = z.enum(['USD', 'EUR']);

// ─── Income & Ecuadorian Salary ───

export const incomeSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre o concepto es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres'),
  amount: z
    .number()
    .positive('El monto debe ser mayor a 0')
    .max(999999999.99, 'El monto excede el límite permitido'),
  frequency: frequencySchema.default('monthly'),
  isSalary: z.boolean().default(true),
  paymentScheme: salaryPaymentSchemeSchema.default('quincena_fin_mes'),
  quincenaAmount: z.number().min(0).optional().default(0),
  finDeMesAmount: z.number().min(0).optional().default(0),
  deductIess: z.boolean().default(true), // Descuento 9.45% IESS Ecuador
  iessPercentage: z.number().min(0).max(100).default(9.45),
  hasProgrammedSavings: z.boolean().default(false),
  programmedSavingsAmount: z.number().min(0).optional().default(0),
  // ─── Beneficios de Ley Ecuador ───
  hasFondosReserva: z.boolean().default(false),
  fondosReservaMensualizado: z.boolean().default(true),
  decimoTerceroMensualizado: z.boolean().default(true),
  decimoCuartoMensualizado: z.boolean().default(true),
  region: z.enum(['costa', 'sierra']).default('costa'),
  sbuAmount: z
    .number()
    .min(0, 'El SBU no puede ser negativo')
    .max(99999, 'El SBU excede el límite')
    .default(460),
  hasUtilidades: z.boolean().default(true),
  utilidadesAmount: z
    .number()
    .min(0, 'Las utilidades no pueden ser negativas')
    .max(999999999.99, 'El monto excede el límite')
    .default(0),
  workStartDate: z.string().nullable().optional(),
  date: z.string().optional(),
  category: z.string().optional(),
});

// ─── Expense ───

export const expenseSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre o descripción del gasto es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres'),
  amount: z
    .number()
    .positive('El monto debe ser mayor a 0')
    .max(999999999.99, 'El monto excede el límite'),
  category: expenseCategorySchema.default('housing'),
  isEssential: z.boolean().default(true),
  frequency: frequencySchema.default('monthly'),
  paymentTiming: z.enum(['quincena', 'fin_de_mes', 'ambas']).default('ambas'),
  activeFrom: z.string().nullable().optional(),
  activeUntil: z.string().nullable().optional(),
  date: z.string().optional(),
  description: z.string().max(255).optional(),
});

// ─── Debt ───

export const debtSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la deuda o tarjeta es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres'),
  creditor: z
    .string()
    .max(255, 'El banco o acreedor no puede exceder 255 caracteres')
    .optional(),
  currentBalance: z
    .number()
    .min(0, 'El saldo no puede ser negativo')
    .max(999999999.99, 'El saldo excede el límite'),
  originalBalance: z
    .number()
    .min(0, 'El saldo original no puede ser negativo')
    .max(999999999.99, 'El saldo excede el límite'),
  apr: z
    .number()
    .min(0, 'La tasa APR no puede ser negativa')
    .max(100, 'La tasa APR no puede exceder 100%'),
  minimumPayment: z
    .number()
    .min(0, 'El pago mínimo no puede ser negativo')
    .max(999999999.99, 'El pago mínimo excede el límite'),
  dueDay: z
    .number()
    .int('El día de pago debe ser un entero')
    .min(1, 'El día debe ser entre 1 y 31')
    .max(31, 'El día debe ser entre 1 y 31')
    .default(15),
  type: debtTypeSchema.default('credit_card'),
  currency: currencySchema.default('USD'),
  status: z.enum(['active', 'paid_off', 'defaulted']).default('active'),
  paymentTiming: z.enum(['quincena', 'fin_de_mes', 'any']).default('fin_de_mes'),
  hasInstallmentPlan: z.boolean().default(false),
  termMonths: z
    .number()
    .int('El número de cuotas debe ser un entero')
    .min(1, 'Debe ser al menos 1 cuota')
    .max(360, 'Máximo 360 cuotas')
    .nullable()
    .optional(),
});

// ─── Payment ───

export const paymentSchema = z.object({
  debtId: z.string().min(1, 'ID de deuda requerido'),
  amount: z
    .number()
    .positive('El monto del abono debe ser mayor a 0')
    .max(999999999.99, 'El monto excede el límite'),
  type: z.enum(['minimum', 'extra', 'full']).default('minimum'),
  paidAt: z.string().min(1, 'Fecha de pago requerida'),
  notes: z.string().max(500, 'Las notas no pueden exceder 500 caracteres').optional(),
});

// ─── Savings Goal ───

export const savingsGoalCategorySchema = z.enum([
  'emergency',
  'vacation',
  'education',
  'housing',
  'vehicle',
  'retirement',
  'other',
]);

export const savingsGoalSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre de la meta es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres'),
  targetAmount: z
    .number()
    .positive('El monto objetivo debe ser mayor a 0')
    .max(999999999.99, 'El monto excede el límite'),
  currentAmount: z.number().min(0).default(0),
  monthlyContribution: z
    .number()
    .min(0, 'La contribución mensual no puede ser negativa')
    .max(999999999.99, 'El monto excede el límite')
    .default(0),
  startDate: z.string().min(1, 'Fecha de inicio requerida'),
  targetDate: z.string().nullable().optional(),
  category: savingsGoalCategorySchema.default('other'),
  icon: z.string().max(10).default('🎯'),
  priority: z.number().int().min(1).max(10).default(1),
  status: z.enum(['active', 'completed', 'paused']).default('active'),
});

// ─── Auth ───

export const loginSchema = z.object({
  email: z
    .string()
    .email('Correo electrónico inválido')
    .max(255, 'El correo no puede exceder 255 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(255, 'El nombre no puede exceder 255 caracteres'),
  email: z
    .string()
    .email('Correo electrónico inválido')
    .max(255, 'El correo no puede exceder 255 caracteres'),
  birthDate: z.string().optional(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// ─── Type exports ───

export type IncomeInput = z.infer<typeof incomeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

