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
  index,
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
  birthDate: varchar('birthDate', { length: 20 }),
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
  // ═══ Beneficios de Ley Ecuador ═══
  hasFondosReserva: boolean('hasFondosReserva').default(false), // Fondos de reserva (8.33% después de 1 año)
  fondosReservaMensualizado: boolean('fondosReservaMensualizado').default(true), // true = pago mensual, false = acumulado en IESS
  decimoTerceroMensualizado: boolean('decimoTerceroMensualizado').default(true), // true = recibo mensual 1/12, false = pago en diciembre
  decimoCuartoMensualizado: boolean('decimoCuartoMensualizado').default(true), // true = recibo mensual, false = pago anual
  region: varchar('region', { length: 20 }).default('costa'), // 'costa' | 'sierra' para décimo 14to
  sbuAmount: decimal('sbuAmount', { precision: 15, scale: 2 }).default('460.00'), // Salario Básico Unificado vigente
  hasUtilidades: boolean('hasUtilidades').default(true), // La empresa reparte utilidades (15%)
  utilidadesAmount: decimal('utilidadesAmount', { precision: 15, scale: 2 }).default('0.00'), // Monto estimado anual de utilidades
  workStartDate: date('workStartDate'), // Fecha de inicio de labores (para cálculo automático de Fondos de Reserva)
  date: date('date'),
  category: varchar('category', { length: 100 }),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const expenses = mysqlTable(
  'expenses',
  {
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
  },
  (table) => [
    index('expenses_user_timing_idx').on(table.userId, table.paymentTiming),
  ]
);

export const debts = mysqlTable(
  'debts',
  {
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
  },
  (table) => [
    index('debts_user_balance_idx').on(table.userId, table.currentBalance),
  ]
);

export const payments = mysqlTable(
  'payments',
  {
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
  },
  (table) => [
    index('payments_user_paid_idx').on(table.userId, table.paidAt),
  ]
);

export const expensePayments = mysqlTable('expense_payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expenseId: varchar('expenseId', { length: 36 })
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),
  periodKey: varchar('periodKey', { length: 30 }).notNull(), // e.g. "2026-7-fin_de_mes"
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paidAt: date('paidAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
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

// ═══════════════════════════════════════════
// Savings Goals — Metas de Ahorro
// ═══════════════════════════════════════════

export const savingsGoals = mysqlTable('savings_goals', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  targetAmount: decimal('targetAmount', { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal('currentAmount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  monthlyContribution: decimal('monthlyContribution', { precision: 15, scale: 2 }).notNull().default('0.00'),
  startDate: date('startDate').notNull(),
  targetDate: date('targetDate'),
  category: varchar('category', { length: 50 }).notNull().default('other'), // 'emergency', 'vacation', 'education', 'housing', 'vehicle', 'retirement', 'other'
  icon: varchar('icon', { length: 10 }).default('🎯'),
  priority: int('priority').default(1), // 1 = highest
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'completed', 'paused'
  // ═══ Vínculo con un gasto (ahorro programado) ═══
  linkedExpenseId: varchar('linkedExpenseId', { length: 36 }), // Gasto que alimenta esta meta (null = sin vínculo)
  linkedSince: date('linkedSince'), // El acumulado automático corre desde esta fecha
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

// ═══════════════════════════════════════════
// Catálogos administrables (selects de la app)
// Globales — los gestiona el admin; los usuarios los consumen en los selects.
// ═══════════════════════════════════════════

export const catalogOptions = mysqlTable('catalog_options', {
  id: varchar('id', { length: 36 }).primaryKey(),
  catalog: varchar('catalog', { length: 50 }).notNull(), // 'expense_category' | 'debt_type' | 'savings_category'
  value: varchar('value', { length: 100 }).notNull(), // clave estable guardada en los registros
  label: varchar('label', { length: 150 }).notNull(), // texto visible en la app
  icon: varchar('icon', { length: 10 }), // emoji opcional
  color: varchar('color', { length: 20 }), // color pastel (hex) para las tarjetas
  sortOrder: int('sortOrder').default(0),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

// ═══════════════════════════════════════════
// Bóveda de Contraseñas (Password Vault)
// ═══════════════════════════════════════════

export const vaultKeys = mysqlTable('vault_keys', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  salt: varchar('salt', { length: 64 }).notNull(), // Hex/Base64 de la semilla PBKDF2
  verifier: text('verifier').notNull(), // Canario cifrado para verificar PIN sin guardarlo
  verifierIv: varchar('verifierIv', { length: 64 }).notNull(), // IV de cifrado del canario
  hint: varchar('hint', { length: 255 }), // Pista opcional
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const vaultItems = mysqlTable(
  'vault_items',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('userId', { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 50 }).notNull().default('other'), // 'banking', 'cards', 'email', 'social', 'streaming', 'notes', 'other'
    websiteUrl: varchar('websiteUrl', { length: 500 }),
    usernameEncrypted: text('usernameEncrypted'), // Base64 de ciphertext
    passwordEncrypted: text('passwordEncrypted').notNull(), // Base64 de ciphertext
    notesEncrypted: text('notesEncrypted'), // Base64 de ciphertext
    iv: varchar('iv', { length: 64 }).notNull(), // Base64 del IV de este registro
    isFavorite: boolean('isFavorite').default(false),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index('vault_items_user_fav_idx').on(table.userId, table.isFavorite),
  ]
);

// ═══════════════════════════════════════════
// Configuración Global y Entidades del Sistema
// ═══════════════════════════════════════════

export const adminSettings = mysqlTable('admin_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sbuAmount: decimal('sbuAmount', { precision: 10, scale: 2 }).default('460.00'),
  iessPercentagePrivate: decimal('iessPercentagePrivate', { precision: 5, scale: 2 }).default('9.45'),
  iessPercentagePublic: decimal('iessPercentagePublic', { precision: 5, scale: 2 }).default('11.45'),
  maxDebtToIncomeRatio: decimal('maxDebtToIncomeRatio', { precision: 5, scale: 2 }).default('40.00'),
  emergencyReserveMonthsDefault: int('emergencyReserveMonthsDefault').default(3),
  systemName: varchar('systemName', { length: 100 }).default('ProyecAhorro'),
  systemVersion: varchar('systemVersion', { length: 50 }).default('1.2.0'),
  legalDecimoTerceroDate: varchar('legalDecimoTerceroDate', { length: 20 }).default('12-24'),
  legalDecimoCuartoCostaDate: varchar('legalDecimoCuartoCostaDate', { length: 20 }).default('03-15'),
  legalDecimoCuartoSierraDate: varchar('legalDecimoCuartoSierraDate', { length: 20 }).default('08-15'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});

export const institutions = mysqlTable('institutions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('Banco'), // 'Banco' | 'Cooperativa' | 'Pública' | 'Tarjeta'
  code: varchar('code', { length: 50 }).notNull(),
  defaultApr: decimal('defaultApr', { precision: 5, scale: 2 }).notNull().default('15.00'),
  maxTermMonths: int('maxTermMonths').notNull().default(60),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'inactive'
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
});


