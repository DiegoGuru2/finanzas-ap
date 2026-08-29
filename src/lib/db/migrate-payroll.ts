import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function updatePayrollCols() {
  console.log('🔄 Checking incomes and debts columns in TiDB Cloud...');

  // Incomes columns check
  const [incRows]: any = await db.execute(sql`DESC \`incomes\``);
  const incColNames = incRows.map((r: any) => r.Field);
  console.log('Incomes cols:', incColNames);

  if (!incColNames.includes('isSalary')) {
    await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`isSalary\` BOOLEAN DEFAULT TRUE;`);
    console.log('Added isSalary to incomes');
  }
  if (!incColNames.includes('paymentScheme')) {
    await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`paymentScheme\` VARCHAR(50) DEFAULT 'quincena_fin_mes';`);
    console.log('Added paymentScheme to incomes');
  }
  if (!incColNames.includes('quincenaAmount')) {
    await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`quincenaAmount\` DECIMAL(15,2) DEFAULT 0.00;`);
    console.log('Added quincenaAmount to incomes');
  }
  if (!incColNames.includes('finDeMesAmount')) {
    await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`finDeMesAmount\` DECIMAL(15,2) DEFAULT 0.00;`);
    console.log('Added finDeMesAmount to incomes');
  }
  if (!incColNames.includes('deductIess')) {
    await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`deductIess\` BOOLEAN DEFAULT TRUE;`);
    console.log('Added deductIess to incomes');
  }
  if (!incColNames.includes('iessPercentage')) {
    await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`iessPercentage\` DECIMAL(5,2) DEFAULT 9.45;`);
    console.log('Added iessPercentage to incomes');
  }

  // Debts columns check
  const [debtRows]: any = await db.execute(sql`DESC \`debts\``);
  const debtColNames = debtRows.map((r: any) => r.Field);
  console.log('Debts cols:', debtColNames);

  if (!debtColNames.includes('paymentTiming')) {
    await db.execute(sql`ALTER TABLE \`debts\` ADD COLUMN \`paymentTiming\` VARCHAR(50) DEFAULT 'fin_de_mes';`);
    console.log('Added paymentTiming to debts');
  }

  console.log('✅ Payroll schema migration in TiDB Cloud completed!');
}

updatePayrollCols().catch(console.error);
