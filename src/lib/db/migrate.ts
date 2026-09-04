import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function migrateAll() {
  console.log('🚀 Configurando todas las tablas en la base de datos finanzas_ap...');

  // 1. Ensure user columns (role, birthDate)
  try {
    const [cols]: any = await db.execute(sql`DESC \`user\``);
    const colNames = Array.isArray(cols) ? cols.map((r: any) => r.Field) : [];
    if (!colNames.includes('role')) {
      await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`role\` VARCHAR(50) DEFAULT 'user';`);
      console.log('✅ Added role column to user table');
    }
    if (!colNames.includes('birthDate')) {
      await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`birthDate\` VARCHAR(20);`);
      console.log('✅ Added birthDate column to user table');
    }
  } catch (e: any) {
    console.error('User table check error:', e.message);
  }

  // 2. Incomes table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`incomes\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`amount\` DECIMAL(15,2) NOT NULL,
      \`frequency\` VARCHAR(50) NOT NULL DEFAULT 'monthly',
      \`isSalary\` BOOLEAN DEFAULT TRUE,
      \`paymentScheme\` VARCHAR(50) DEFAULT 'quincena_fin_mes',
      \`quincenaAmount\` DECIMAL(15,2) DEFAULT 0.00,
      \`finDeMesAmount\` DECIMAL(15,2) DEFAULT 0.00,
      \`deductIess\` BOOLEAN DEFAULT TRUE,
      \`iessPercentage\` DECIMAL(5,2) DEFAULT 9.45,
      \`hasProgrammedSavings\` BOOLEAN DEFAULT FALSE,
      \`programmedSavingsAmount\` DECIMAL(15,2) DEFAULT 0.00,
      \`hasFondosReserva\` BOOLEAN DEFAULT FALSE,
      \`fondosReservaMensualizado\` BOOLEAN DEFAULT TRUE,
      \`decimoTerceroMensualizado\` BOOLEAN DEFAULT TRUE,
      \`decimoCuartoMensualizado\` BOOLEAN DEFAULT TRUE,
      \`region\` VARCHAR(20) DEFAULT 'costa',
      \`sbuAmount\` DECIMAL(10,2) DEFAULT 460.00,
      \`hasUtilidades\` BOOLEAN DEFAULT TRUE,
      \`utilidadesAmount\` DECIMAL(15,2) DEFAULT 0.00,
      \`workStartDate\` DATE,
      \`date\` DATE,
      \`category\` VARCHAR(50) DEFAULT 'salary',
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);

  try {
    const [incCols]: any = await db.execute(sql`DESC \`incomes\``);
    const incColNames = Array.isArray(incCols) ? incCols.map((r: any) => r.Field) : [];
    if (!incColNames.includes('workStartDate')) {
      await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`workStartDate\` DATE;`);
      console.log('✅ Added workStartDate column to incomes table');
    }
  } catch (e: any) {
    console.error('Incomes workStartDate check:', e.message);
  }
  console.log('✅ Tabla incomes lista');

  // 3. Expenses table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`expenses\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`amount\` DECIMAL(15,2) NOT NULL,
      \`category\` VARCHAR(50) NOT NULL DEFAULT 'other',
      \`isEssential\` BOOLEAN NOT NULL DEFAULT TRUE,
      \`frequency\` VARCHAR(50) NOT NULL DEFAULT 'monthly',
      \`paymentTiming\` VARCHAR(50) NOT NULL DEFAULT 'ambas',
      \`activeFrom\` DATE,
      \`activeUntil\` DATE,
      \`dueDay\` INT,
      \`date\` DATE,
      \`description\` VARCHAR(255),
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla expenses lista');

  // 4. Debts table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`debts\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`creditor\` VARCHAR(255),
      \`currentBalance\` DECIMAL(15,2) NOT NULL,
      \`originalBalance\` DECIMAL(15,2) NOT NULL,
      \`apr\` DECIMAL(5,2) NOT NULL,
      \`minimumPayment\` DECIMAL(15,2) NOT NULL,
      \`dueDay\` INT NOT NULL DEFAULT 1,
      \`type\` VARCHAR(50) NOT NULL DEFAULT 'credit_card',
      \`currency\` VARCHAR(10) NOT NULL DEFAULT 'USD',
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'active',
      \`paymentTiming\` VARCHAR(50) NOT NULL DEFAULT 'fin_de_mes',
      \`hasInstallmentPlan\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`termMonths\` INT,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla debts lista');

  // 5. Payments (Historial de pagos) table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`payments\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`debtId\` VARCHAR(36) NOT NULL,
      \`amount\` DECIMAL(15,2) NOT NULL,
      \`type\` VARCHAR(50) NOT NULL DEFAULT 'minimum',
      \`paidAt\` DATE NOT NULL,
      \`notes\` TEXT,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`debtId\`) REFERENCES \`debts\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla payments (historial de pagos) lista');

  // 5.1 Expense Payments (Marcado de gastos pagados) table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`expense_payments\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`expenseId\` VARCHAR(36) NOT NULL,
      \`periodKey\` VARCHAR(30) NOT NULL,
      \`amount\` DECIMAL(15,2) NOT NULL,
      \`paidAt\` DATE NOT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`expenseId\`) REFERENCES \`expenses\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla expense_payments lista');

  // 6. Savings Goals (Metas de Ahorro) table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`savings_goals\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`targetAmount\` DECIMAL(15,2) NOT NULL,
      \`currentAmount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      \`monthlyContribution\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      \`startDate\` DATE NOT NULL,
      \`targetDate\` DATE,
      \`category\` VARCHAR(50) NOT NULL DEFAULT 'other',
      \`icon\` VARCHAR(10) DEFAULT '🎯',
      \`priority\` INT DEFAULT 1,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'active',
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla savings_goals (metas de ahorro) lista');

  // 7. Optimization plans table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`optimization_plans\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`strategy\` VARCHAR(50) NOT NULL DEFAULT 'avalanche',
      \`monthlyAvailable\` DECIMAL(15,2) NOT NULL,
      \`projectedInterest\` DECIMAL(15,2),
      \`projectedFreeDate\` DATE,
      \`allocations\` JSON,
      \`isActive\` BOOLEAN DEFAULT TRUE,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla optimization_plans lista');

  // 8. Alerts table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`alerts\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`type\` VARCHAR(50) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`isRead\` BOOLEAN DEFAULT FALSE,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla alerts lista');

  // 9. Vault Keys (Bóveda de Contraseñas - Semilla y Verificador de PIN)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`vault_keys\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL UNIQUE,
      \`salt\` VARCHAR(64) NOT NULL,
      \`verifier\` TEXT NOT NULL,
      \`verifierIv\` VARCHAR(64) NOT NULL,
      \`hint\` VARCHAR(255),
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla vault_keys lista');

  // 10. Vault Items (Contraseñas y Secretos Cifrados en Cliente)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`vault_items\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(50) NOT NULL DEFAULT 'other',
      \`websiteUrl\` VARCHAR(500),
      \`usernameEncrypted\` TEXT,
      \`passwordEncrypted\` TEXT NOT NULL,
      \`notesEncrypted\` TEXT,
      \`iv\` VARCHAR(64) NOT NULL,
      \`isFavorite\` BOOLEAN DEFAULT FALSE,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  // 11. Admin Settings (Configuración Global del Sistema)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`admin_settings\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`sbuAmount\` DECIMAL(10,2) DEFAULT 460.00,
      \`iessPercentagePrivate\` DECIMAL(5,2) DEFAULT 9.45,
      \`iessPercentagePublic\` DECIMAL(5,2) DEFAULT 11.45,
      \`maxDebtToIncomeRatio\` DECIMAL(5,2) DEFAULT 40.00,
      \`emergencyReserveMonthsDefault\` INT DEFAULT 3,
      \`systemName\` VARCHAR(100) DEFAULT 'ProyecAhorro',
      \`systemVersion\` VARCHAR(50) DEFAULT '1.2.0',
      \`legalDecimoTerceroDate\` VARCHAR(20) DEFAULT '12-24',
      \`legalDecimoCuartoCostaDate\` VARCHAR(20) DEFAULT '03-15',
      \`legalDecimoCuartoSierraDate\` VARCHAR(20) DEFAULT '08-15',
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);
  // Semilla inicial de admin_settings si está vacía
  const [existingSettings]: any = await db.execute(sql`SELECT COUNT(*) as cnt FROM \`admin_settings\``);
  if (existingSettings[0]?.cnt === 0 || existingSettings[0]?.cnt === '0') {
    await db.execute(sql`
      INSERT INTO \`admin_settings\` (\`id\`, \`sbuAmount\`, \`iessPercentagePrivate\`, \`iessPercentagePublic\`, \`maxDebtToIncomeRatio\`, \`emergencyReserveMonthsDefault\`, \`systemName\`, \`systemVersion\`, \`legalDecimoTerceroDate\`, \`legalDecimoCuartoCostaDate\`, \`legalDecimoCuartoSierraDate\`)
      VALUES ('global', 460.00, 9.45, 11.45, 40.00, 3, 'ProyecAhorro', '1.2.0', '12-24', '03-15', '08-15');
    `);
    console.log('✅ Configuración global sembrada');
  }
  console.log('✅ Tabla admin_settings lista');

  // 12. Institutions (Entidades Financieras de Ecuador)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`institutions\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`type\` VARCHAR(50) NOT NULL DEFAULT 'Banco',
      \`code\` VARCHAR(50) NOT NULL,
      \`defaultApr\` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
      \`maxTermMonths\` INT NOT NULL DEFAULT 60,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'active',
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  const [existingInst]: any = await db.execute(sql`SELECT COUNT(*) as cnt FROM \`institutions\``);
  if (existingInst[0]?.cnt === 0 || existingInst[0]?.cnt === '0') {
    await db.execute(sql`
      INSERT INTO \`institutions\` (\`id\`, \`name\`, \`type\`, \`code\`, \`defaultApr\`, \`maxTermMonths\`, \`status\`) VALUES
      ('1', 'Banco Pichincha', 'Banco', 'BPIC', 15.60, 60, 'active'),
      ('2', 'Banco Guayaquil', 'Banco', 'BGYE', 16.06, 60, 'active'),
      ('3', 'Produbanco', 'Banco', 'PROD', 15.80, 48, 'active'),
      ('4', 'Banco del Pacífico', 'Banco', 'BPAC', 15.20, 60, 'active'),
      ('5', 'Banco Bolivariano', 'Banco', 'BBOL', 16.00, 48, 'active'),
      ('6', 'Banco Internacional', 'Banco', 'BINT', 15.50, 48, 'active'),
      ('7', 'BIESS — Préstamo Quirografario', 'Pública', 'BIESS-Q', 11.00, 60, 'active'),
      ('8', 'BIESS — Préstamo Hipotecario', 'Pública', 'BIESS-H', 6.99, 300, 'active'),
      ('9', 'Coop. Policía Nacional', 'Cooperativa', 'CPN', 14.50, 60, 'active'),
      ('10', 'Coop. JEP (Juventud Ecuatoriana)', 'Cooperativa', 'JEP', 14.80, 60, 'active'),
      ('11', 'Coop. Alianza del Valle', 'Cooperativa', 'ADV', 15.00, 48, 'active'),
      ('12', 'Diners Club Ecuador', 'Tarjeta', 'DINERS', 16.06, 36, 'active');
    `);
    console.log('✅ Entidades financieras ecuatorianas sembradas');
  }
  console.log('✅ Tabla institutions lista');

  // 13. Budgets (Presupuestos Mensuales)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`budgets\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`userId\` VARCHAR(36) NOT NULL,
      \`category\` VARCHAR(100) NOT NULL,
      \`monthlyLimit\` DECIMAL(15,2) NOT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ Tabla budgets lista');

  try {
    await db.execute(sql`CREATE INDEX \`budgets_user_cat_idx\` ON \`budgets\` (\`userId\`, \`category\`);`);
    console.log('✅ Índice budgets_user_cat_idx creado');
  } catch {}

  // 14. Índices Compuestos para Alto Rendimiento
  try {
    await db.execute(sql`CREATE INDEX \`payments_user_paid_idx\` ON \`payments\` (\`userId\`, \`paidAt\`);`);
    console.log('✅ Índice payments_user_paid_idx creado');
  } catch {}

  try {
    await db.execute(sql`CREATE INDEX \`vault_items_user_fav_idx\` ON \`vault_items\` (\`userId\`, \`isFavorite\`);`);
    console.log('✅ Índice vault_items_user_fav_idx creado');
  } catch {}

  try {
    await db.execute(sql`CREATE INDEX \`debts_user_balance_idx\` ON \`debts\` (\`userId\`, \`currentBalance\`);`);
    console.log('✅ Índice debts_user_balance_idx creado');
  } catch {}

  // 15. Login Attempts (Protección contra fuerza bruta: 3-4 intentos)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`login_attempts\` (
      \`id\` VARCHAR(36) PRIMARY KEY,
      \`identifier\` VARCHAR(255) NOT NULL UNIQUE,
      \`attempts\` INT NOT NULL DEFAULT 0,
      \`lockedUntil\` TIMESTAMP NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Tabla login_attempts lista');

  console.log('🎉 Todas las tablas e índices fueron migrados y verificados.');
}

migrateAll().catch(console.error);

