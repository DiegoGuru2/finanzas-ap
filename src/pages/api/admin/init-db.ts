import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const GET: APIRoute = async (ctx) => {
  const currentUser = ctx.locals.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado: Se requiere rol de Administrador' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const logs: string[] = [];

  try {
    logs.push('🚀 Inicializando y verificando tablas en la base de datos...');

    // 1. Incomes table
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
        \`date\` DATE,
        \`category\` VARCHAR(50) DEFAULT 'salary',
        \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
      );
    `);
    logs.push('✅ Tabla incomes verificada');

    // 2. Expenses table
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
    logs.push('✅ Tabla expenses verificada');

    // 3. Debts table
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
    logs.push('✅ Tabla debts verificada');

    // 4. Payments (Historial de pagos) table
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
    logs.push('✅ Tabla payments (historial de pagos) verificada');

    // 5. Savings Goals (Metas de Ahorro) table
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
    logs.push('✅ Tabla savings_goals (metas de ahorro) verificada');

    // 6. Optimization plans table
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
    logs.push('✅ Tabla optimization_plans verificada');

    // 7. User preferences table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`user_preferences\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`userId\` VARCHAR(36) NOT NULL UNIQUE,
        \`defaultStrategy\` VARCHAR(50) NOT NULL DEFAULT 'avalanche',
        \`emergencyFundMonths\` INT NOT NULL DEFAULT 3,
        \`currency\` VARCHAR(10) NOT NULL DEFAULT 'USD',
        \`theme\` VARCHAR(20) NOT NULL DEFAULT 'dark',
        \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
      );
    `);
    logs.push('✅ Tabla user_preferences verificada');

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
    logs.push('✅ Tabla alerts verificada');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Todas las tablas de la base de datos han sido creadas / verificadas exitosamente',
        logs,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        logs,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
