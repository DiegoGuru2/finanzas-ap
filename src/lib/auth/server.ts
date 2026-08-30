import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

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
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        // Sin proveedor de correo configurado (ej. desarrollo local):
        // el enlace se imprime en la consola del servidor.
        console.log(`[FinanzasAP] Enlace de recuperación para ${user.email}: ${url}`);
        return;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'FinanzasAP <onboarding@resend.dev>',
          to: [user.email],
          subject: 'Restablece tu contraseña de FinanzasAP',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2>Restablecer contraseña</h2>
              <p>Hola ${user.name || ''}, recibimos una solicitud para restablecer tu contraseña.</p>
              <p><a href="${url}" style="display:inline-block;background:#4f6ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Crear nueva contraseña</a></p>
              <p style="color:#666;font-size:13px">El enlace expira en 1 hora. Si no fuiste tú, ignora este correo: tu contraseña no cambia.</p>
            </div>`,
        }),
      });
      if (!res.ok) {
        throw new Error(`No se pudo enviar el correo de recuperación (${res.status})`);
      }
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },
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
  secret: process.env.BETTER_AUTH_SECRET || 'finanzas_ap_super_secret_key_32_chars_long_minimum',
});
