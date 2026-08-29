import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function migrateSavings() {
  console.log('🔄 Checking programmed savings columns in TiDB Cloud...');
  const [incRows]: any = await db.execute(sql`DESC \`incomes\``);
  const incCols = incRows.map((r: any) => r.Field);

  if (!incCols.includes('hasProgrammedSavings')) {
    await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`hasProgrammedSavings\` BOOLEAN DEFAULT FALSE;`);
    console.log('Added hasProgrammedSavings');
  }

  if (!incCols.includes('programmedSavingsAmount')) {
    await db.execute(sql`ALTER TABLE \`incomes\` ADD COLUMN \`programmedSavingsAmount\` DECIMAL(15,2) DEFAULT 0.00;`);
    console.log('Added programmedSavingsAmount');
  }

  console.log('✅ Programmed savings columns migrated in TiDB Cloud!');
}

migrateSavings().catch(console.error);
