import 'dotenv/config';
import { db } from './index';
import { user, account, session } from './schema';
import { auth } from '../auth/server';

async function resetAndSeedUsers() {
  console.log('🔄 Re-creating users cleanly via Better Auth API...');

  // Clean old users to guarantee fresh password hashes and accounts
  try {
    await db.delete(session);
    await db.delete(account);
    await db.delete(user);
    console.log('🧹 Cleaned previous user/account tables');
  } catch (e: any) {
    console.log('Note during cleanup:', e.message);
  }

  // 1. Diego Gurumendi
  try {
    const res = await auth.api.signUpEmail({
      body: {
        name: 'Diego Gurumendi',
        email: 'diego@finanzas.app',
        password: '12345678',
      },
    });
    console.log('✅ Created user Diego Gurumendi (diego@finanzas.app):', res.user?.id);
  } catch (err: any) {
    console.error('❌ Error creating Diego:', err.message || err);
  }

  // 2. Admin
  try {
    const res = await auth.api.signUpEmail({
      body: {
        name: 'Admin',
        email: 'admin@finanzas.app',
        password: 'adminpassword123',
      },
    });
    console.log('✅ Created user Admin (admin@finanzas.app):', res.user?.id);
  } catch (err: any) {
    console.error('❌ Error creating Admin:', err.message || err);
  }

  console.log('🎉 Users initialized successfully!');
}

resetAndSeedUsers().catch(console.error);
