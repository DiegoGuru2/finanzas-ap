import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { sendPasswordResetEmail } from '../email';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'mysql',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl: url,
        });
      } catch (err: any) {
        console.error('[ProyecAhorro] Error enviando correo de recuperación:', err.message || err);
      }
    },
  },
  /* socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  }, */
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
      birthDate: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://finanzas-ap-black.vercel.app'),
  trustedOrigins: [
    'http://localhost:4321',
    'http://localhost:3000',
    'http://127.0.0.1:4321',
    'https://finanzas-ap.vercel.app',
    'https://finanzas-ap-black.vercel.app',
    'https://*.vercel.app',
    ...(process.env.PUBLIC_APP_URL ? [process.env.PUBLIC_APP_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  secret: (() => {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'BETTER_AUTH_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres). ' +
        'Genera uno con: node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"'
      );
    }
    return secret;
  })(),
});
