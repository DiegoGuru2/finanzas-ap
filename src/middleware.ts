import { defineMiddleware } from 'astro:middleware';
import { auth } from '@/lib/auth/server';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

const AUTH_API_PREFIX = '/api/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // ─── Allow auth API routes to pass through directly ───
  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return next();
  }

  // ─── Public routes — check session if present, but do not block ───
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname === route + '/'
  );

  let session = null;
  try {
    session = await auth.api.getSession({
      headers: context.request.headers,
    });
  } catch {
    session = null;
  }

  context.locals.user = session ? session.user : null;
  context.locals.session = session ? session.session : null;

  // If user is logged in and visits login or register, redirect to dashboard
  if (session && (pathname === '/login' || pathname === '/register')) {
    return context.redirect('/app/dashboard');
  }

  // If user is NOT logged in and visits a protected route (/app/*)
  if (!isPublicRoute && !session) {
    return context.redirect('/login');
  }

  // ─── Set security headers on response ───
  const response = await next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
});
