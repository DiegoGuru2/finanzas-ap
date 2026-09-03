import 'dotenv/config';
import { auth } from './server';

async function testLogin() {
  console.log('🔐 Testing Better Auth login verification for Diego Gurumendi...');
  try {
    const res = await auth.api.signInEmail({
      body: {
        email: 'diego@finanzas.app',
        password: '12345678',
      },
    });

    console.log('✅ Login SUCCESS! User verified:', res.user?.name, res.user?.email);
    console.log('🎟️ Session token created:', (res as any).session?.token || res.token ? 'OK' : 'NONE');
  } catch (err: any) {
    console.error('❌ Login failed:', err.message || err);
  }
}

testLogin().catch(console.error);
