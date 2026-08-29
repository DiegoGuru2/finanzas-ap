import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function migrateAll() {
  console.log('🚀 Setting up complete tables in finanzas_ap...');

  // 1. Ensure user columns
  try {
    const userCols: any = await db.execute(sql`DESC \`user\``);
    console.log('user cols:', userCols.rows.map((r: any) => r.Field));
    const hasRole = userCols.rows.some((r: any) => r.Field === 'role');
    if (!hasRole) {
      await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`role\` VARCHAR(50) DEFAULT 'user';`);
      console.log('✅ Added role column to user table');
    }
  } catch (e: any) {
    console.error('User table check error:', e.message);
  }

  // 2. Debts table
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
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
    );
  `);
  console.log('✅ debts table ready');

  // 3. Payments table
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
  console.log('✅ payments table ready');

  // 4. Optimization plans
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
  console.log('✅ optimization_plans table ready');

  // 5. Alerts table
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
  console.log('✅ alerts table ready');
}

migrateAll().catch(console.error);
