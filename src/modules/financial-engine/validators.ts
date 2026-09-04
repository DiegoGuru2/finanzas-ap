/**
 * ═══════════════════════════════════════════
 * FinanzasAP — Financial Engine Validators
 * ═══════════════════════════════════════════
 *
 * Zod schemas for validating financial data in Ecuador and internationally.
 */

import { z } from 'zod';
import { sanitizeString } from '@/lib/utils';

/**
 * Reusable sanitized string schema that strips HTML/Script tags and malicious injections
 */
export const cleanString = (min = 1, max = 255, requiredMsg = 'Este campo es requerido') =>
  z
    .string()
    .transform((val) => sanitizeString(val))
    .pipe(
      z
        .string()
        .min(min, requiredMsg)
        .max(max, `No puede exceder ${max} caracteres`)
    );

export const optionalCleanString = (max = 255) =>
  z
    .string()
    .transform((val) => sanitizeString(val))
    .pipe(z.string().max(max, `No puede exceder ${max} caracteres`))
    .optional();

// ─── Enums ───

export const frequencySchema = z.enum(['weekly', 'biweekly', 'monthly', 'annual', 'once']);

export const salaryPaymentSchemeSchema = z.enum(['monthly', 'quincena_fin_mes']);

// Tipos y categorías son catálogos administrables desde el panel de admin
// (tabla catalog_options), por eso aceptan cualquier clave razonable en vez
// de un enum cerrado.
export const debtTypeSchema = cleanString(1, 50, 'El tipo de deuda es requerido');

export const expenseCategorySchema = cleanString(1, 100, 'La categoría es requerida');

export const strategySchema = z.enum(['avalanche', 'snowball', 'liquidity', 'custom']);
export const currencySchema = z.enum(['USD', 'EUR']);

// ─── Income & Ecuadorian Salary ───

// ─── Income & Ecuadorian Salary ───

export const incomeSchema = z.object({
  name: cleanString(1, 255, 'El nombre o concepto es requerido'),
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
  workStartDate: optionalCleanString(50).nullable(),
  date: optionalCleanString(50),
  category: optionalCleanString(50),
});

// ─── Expense ───

export const expenseSchema = z.object({
  name: cleanString(1, 255, 'El nombre o descripción del gasto es requerido'),
  amount: z
    .number()
    .positive('El monto debe ser mayor a 0')
    .max(999999999.99, 'El monto excede el límite'),
  category: expenseCategorySchema.default('housing'),
  isEssential: z.boolean().default(true),
  frequency: frequencySchema.default('monthly'),
  paymentTiming: z.enum(['quincena', 'fin_de_mes', 'ambas']).default('ambas'),
  activeFrom: optionalCleanString(50).nullable(),
  activeUntil: optionalCleanString(50).nullable(),
  date: optionalCleanString(50),
  description: optionalCleanString(255),
});

// ─── Debt ───

export const debtSchema = z.object({
  name: cleanString(1, 255, 'El nombre de la deuda o tarjeta es requerido'),
  creditor: optionalCleanString(255),
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
  debtId: cleanString(1, 64, 'ID de deuda requerido'),
  amount: z
    .number()
    .positive('El monto del abono debe ser mayor a 0')
    .max(999999999.99, 'El monto excede el límite'),
  type: z.enum(['minimum', 'extra', 'full']).default('minimum'),
  paidAt: cleanString(1, 50, 'Fecha de pago requerida'),
  notes: optionalCleanString(500),
});

// ─── Savings Goal ───

// Catálogo administrable desde el panel de admin (igual que gastos y deudas)
export const savingsGoalCategorySchema = cleanString(1, 50, 'La categoría es requerida');

export const savingsGoalSchema = z.object({
  name: cleanString(1, 255, 'El nombre de la meta es requerido'),
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
  startDate: cleanString(1, 50, 'Fecha de inicio requerida'),
  targetDate: optionalCleanString(50).nullable(),
  category: savingsGoalCategorySchema.default('other'),
  icon: optionalCleanString(10).default('🎯'),
  priority: z.number().int().min(1).max(10).default(1),
  status: z.enum(['active', 'completed', 'paused']).default('active'),
  linkedExpenseId: optionalCleanString(36).nullable(),
  linkedSince: optionalCleanString(50).nullable(),
});

// ─── Auth ───

export const loginSchema = z.object({
  email: z
    .string()
    .transform((val) => sanitizeString(val).toLowerCase())
    .pipe(
      z
        .string()
        .email('Correo electrónico inválido')
        .max(255, 'El correo no puede exceder 255 caracteres')
    ),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres'),
});

export const registerSchema = z.object({
  name: cleanString(2, 255, 'El nombre debe tener al menos 2 caracteres'),
  email: z
    .string()
    .transform((val) => sanitizeString(val).toLowerCase())
    .pipe(
      z
        .string()
        .email('Correo electrónico inválido')
        .max(255, 'El correo no puede exceder 255 caracteres')
    ),
  birthDate: optionalCleanString(50),
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

