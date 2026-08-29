import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function fixColumnDefaults() {
  console.log('🔧 Modifying date columns to be nullable in incomes & expenses...');

  await db.execute(sql`ALTER TABLE \`incomes\` MODIFY COLUMN \`date\` DATE NULL;`);
  await db.execute(sql`ALTER TABLE \`expenses\` MODIFY COLUMN \`date\` DATE NULL;`);

  console.log('✅ Date columns are now nullable!');
}

fixColumnDefaults().catch(console.error);
