import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  int,
  date,
  json,
} from 'drizzle-orm/mysql-core';

// ═══════════════════════════════════════════
// Better Auth Core Tables
// ═══════════════════════════════════════════

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: varchar('role', { length: 50 }).default('user'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const session = mysqlTable('session', {
  id: varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
  ipAddress: varchar('ipAddress', { length: 45 }),
  userAgent: text('userAgent'),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = mysqlTable('account', {
  id: varchar('id', { length: 36 }).primaryKey(),
  accountId: varchar('accountId', { length: 255 }).notNull(),
  providerId: varchar('providerId', { length: 255 }).notNull(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  issuer: text('issuer'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const verification = mysqlTable('verification', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

// ═══════════════════════════════════════════
// Financial Domain Tables (Multi-tenant by userId)
// ═══════════════════════════════════════════

export const incomes = mysqlTable('incomes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  frequency: varchar('frequency', { length: 50 }).notNull().default('monthly'), // 'weekly' | 'biweekly' | 'monthly' | 'annual'
  isSalary: boolean('isSalary').default(true),
  paymentScheme: varchar('paymentScheme', { length: 50 }).default('quincena_fin_mes'), // 'monthly' | 'quincena_fin_mes'
  quincenaAmount: decimal('quincenaAmount', { precision: 15, scale: 2 }).default('0.00'),
  finDeMesAmount: decimal('finDeMesAmount', { precision: 15, scale: 2 }).default('0.00'),
  deductIess: boolean('deductIess').default(true),
  iessPercentage: decimal('iessPercentage', { precision: 5, scale: 2 }).default('9.45'),
  hasProgrammedSavings: boolean('hasProgrammedSavings').default(false),
  programmedSavingsAmount: decimal('programmedSavingsAmount', { precision: 15, scale: 2 }).default('0.00'),
  date: date('date'),
  category: varchar('category', { length: 100 }),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const expenses = mysqlTable('expenses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'housing', 'food', etc.
  frequency: varchar('frequency', { length: 50 }).notNull().default('monthly'),
  isEssential: boolean('isEssential').notNull().default(false),
  paymentTiming: varchar('paymentTiming', { length: 50 }).default('ambas'), // 'quincena' | 'fin_de_mes' | 'ambas'
  activeFrom: date('activeFrom'), // El gasto entra al cronograma desde esta fecha (null = siempre)
  activeUntil: date('activeUntil'), // Y sale después de esta fecha (null = indefinido)
  date: date('date'),
  description: varchar('description', { length: 255 }),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const debts = mysqlTable('debts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  creditor: varchar('creditor', { length: 255 }),
  currentBalance: decimal('currentBalance', { precision: 15, scale: 2 }).notNull(),
  originalBalance: decimal('originalBalance', { precision: 15, scale: 2 }).notNull(),
  apr: decimal('apr', { precision: 5, scale: 2 }).notNull(),
  minimumPayment: decimal('minimumPayment', { precision: 15, scale: 2 }).notNull(),
  dueDay: int('dueDay').notNull().default(15),
  type: varchar('type', { length: 50 }).notNull().default('credit_card'), // 'credit_card', 'biess_quirografario', etc.
  paymentTiming: varchar('paymentTiming', { length: 50 }).default('fin_de_mes'), // 'quincena' | 'fin_de_mes' | 'any'
  hasInstallmentPlan: boolean('hasInstallmentPlan').default(false), // Pagar en cuotas fijas
  termMonths: int('termMonths'), // Número de cuotas del plan (null si no aplica)
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const payments = mysqlTable('payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  debtId: varchar('debtId', { length: 36 })
    .notNull()
    .references(() => debts.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('minimum'),
  paidAt: date('paidAt').notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const optimizationPlans = mysqlTable('optimization_plans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  strategy: varchar('strategy', { length: 50 }).notNull().default('avalanche'),
  monthlyAvailable: decimal('monthlyAvailable', { precision: 15, scale: 2 }).notNull(),
  projectedInterest: decimal('projectedInterest', { precision: 15, scale: 2 }),
  projectedFreeDate: date('projectedFreeDate'),
  allocations: json('allocations'),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const alerts = mysqlTable('alerts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('isRead').default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});
