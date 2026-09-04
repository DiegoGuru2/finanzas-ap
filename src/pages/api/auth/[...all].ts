import { auth } from '@/lib/auth/server';
import type { APIRoute } from 'astro';
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginRateLimit,
} from '@/lib/auth/login-rate-limit';

export const ALL: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  const isSignIn = url.pathname.includes('/sign-in/email');

  if (isSignIn && ctx.request.method === 'POST') {
    let body: any = null;
    try {
      const cloned = ctx.request.clone();
      body = await cloned.json();
    } catch {}

    const email = body?.email ? String(body.email).toLowerCase().trim() : null;
    const clientIp = ctx.clientAddress || ctx.request.headers.get('x-forwarded-for') || 'ip';
    const identifier = email || clientIp;

    if (identifier) {
      // 1. Verificar si ya está bloqueado
      const limitStatus = await checkLoginRateLimit(identifier);
      if (!limitStatus.allowed) {
        return new Response(
          JSON.stringify({
            error: {
              message: limitStatus.message || 'Has superado el límite de 4 intentos de inicio de sesión. Por favor intenta más tarde.',
            },
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // 2. Ejecutar autenticación
      const response = await auth.handler(ctx.request);

      // 3. Procesar resultado
      if (response.ok) {
        // Login exitoso: restablecer intentos
        await resetLoginRateLimit(identifier);
        return response;
      } else {
        // Login fallido: registrar intento y calcular restantes
        const record = await recordFailedLoginAttempt(identifier);
        const errBody = await response.clone().json().catch(() => ({}));
        const userMsg = record.message || errBody.message || 'Credenciales inválidas';

        return new Response(
          JSON.stringify({
            error: {
              message: userMsg,
              attemptsLeft: record.attemptsLeft,
            },
          }),
          {
            status: record.allowed ? 401 : 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
  }

  return auth.handler(ctx.request);
};
