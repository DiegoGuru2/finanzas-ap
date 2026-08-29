import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function inspect() {
  console.log('🔍 Connecting to TiDB Cloud with URL:', process.env.DATABASE_URL?.split('@')[1]);
  const tables = await db.execute(sql`SHOW TABLES;`);
  console.log('📊 Tables in database:', JSON.stringify(tables, null, 2));

  for (const table of ['user', 'session', 'account', 'verification', 'debts', 'incomes', 'expenses']) {
    try {
      const cols = await db.execute(sql.raw(`DESC \`${table}\``));
      console.log(`\n📋 Columns for ${table}:`, JSON.stringify(cols, null, 2));
    } catch (e: any) {
      console.log(`⚠️ Table ${table} does not exist or error:`, e.message);
    }
  }
}

inspect().catch(console.error);
