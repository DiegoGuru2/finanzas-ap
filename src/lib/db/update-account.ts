import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function updateAccountCols() {
  console.log('🔄 Checking account table columns in TiDB Cloud...');
  const cols: any = await db.execute(sql`DESC \`account\``);
  const colNames = cols.rows.map((r: any) => r.Field);
  console.log('Current account cols:', colNames);

  if (!colNames.includes('issuer')) {
    await db.execute(sql`ALTER TABLE \`account\` ADD COLUMN \`issuer\` TEXT NULL;`);
    console.log('Added issuer');
  }
  console.log('✅ Account table updated successfully!');
}

updateAccountCols().catch(console.error);
