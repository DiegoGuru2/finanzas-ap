import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function migrateTelegram() {
  console.log('🔄 Checking and applying Telegram migration to user table...');

  try {
    const [cols]: any = await db.execute(sql`DESC \`user\``);
    const colNames = Array.isArray(cols) ? cols.map((r: any) => r.Field) : [];

    if (!colNames.includes('telegramChatId')) {
      await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`telegramChatId\` VARCHAR(50);`);
      console.log('✅ Added telegramChatId column to user table');
    }
    if (!colNames.includes('telegramUsername')) {
      await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`telegramUsername\` VARCHAR(100);`);
      console.log('✅ Added telegramUsername column to user table');
    }
    if (!colNames.includes('telegramLinkCode')) {
      await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`telegramLinkCode\` VARCHAR(64);`);
      console.log('✅ Added telegramLinkCode column to user table');
    }
    if (!colNames.includes('telegramLinkExpires')) {
      await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`telegramLinkExpires\` TIMESTAMP NULL;`);
      console.log('✅ Added telegramLinkExpires column to user table');
    }
    if (!colNames.includes('telegramNotificationsEnabled')) {
      await db.execute(sql`ALTER TABLE \`user\` ADD COLUMN \`telegramNotificationsEnabled\` BOOLEAN DEFAULT TRUE;`);
      console.log('✅ Added telegramNotificationsEnabled column to user table');
    }

    console.log('🎉 Telegram migration completed successfully!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error during Telegram migration:', err);
    process.exit(1);
  }
}

migrateTelegram();
