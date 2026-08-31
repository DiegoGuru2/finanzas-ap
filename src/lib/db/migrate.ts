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

  console.log('🎉 Todas las tablas fueron migradas y verificadas.');
}

migrateAll().catch(console.error);
