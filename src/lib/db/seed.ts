import 'dotenv/config';
import { db } from './index';
import { user, account } from './schema';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/server';

async function seed() {
  console.log('🌱 Starting database seed...');

  const usersToSeed = [
    {
      name: 'Admin',
      email: 'admin@finanzas.app',
      password: 'adminpassword123',
      role: 'admin',
    },
    {
      name: 'Diego Gurumendi',
      email: 'diego@finanzas.app',
      password: '12345678',
      role: 'user',
    },
  ];

  for (const u of usersToSeed) {
    try {
      // Check if user already exists
      const existing = await db.select().from(user).where(eq(user.email, u.email));
      if (existing.length > 0) {
        console.log(`ℹ️ User ${u.email} already exists.`);
        continue;
      }

      // Create user via Better Auth API so password hashing is properly applied
      await auth.api.signUpEmail({
        body: {
          name: u.name,
          email: u.email,
          password: u.password,
        },
      });

      console.log(`✅ Created user: ${u.name} (${u.email})`);
    } catch (err: any) {
      console.error(`❌ Error creating user ${u.email}:`, err.message || err);
    }
  }

  console.log('🎉 Seeding completed!');
}

seed().catch(console.error);
