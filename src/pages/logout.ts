import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth/server';

/**
 * Cierre de sesión por GET con redirección.
 * El endpoint nativo de better-auth (/api/auth/sign-out) solo acepta POST,
 * por eso un enlace directo daba 404. Aquí invalidamos la sesión en el
 * servidor y reenviamos las cookies de limpieza junto con el redirect.
 */
export const GET: APIRoute = async (ctx) => {
  const headers = new Headers({ Location: '/login' });

  try {
    const res = (await auth.api.signOut({
      headers: ctx.request.headers,
      asResponse: true,
    })) as Response;

    const setCookies =
      typeof (res.headers as any).getSetCookie === 'function'
        ? (res.headers as any).getSetCookie()
        : res.headers.get('set-cookie')
          ? [res.headers.get('set-cookie') as string]
          : [];
    for (const cookie of setCookies) {
      headers.append('Set-Cookie', cookie);
    }
  } catch {
    // Sin sesión activa: igual redirigimos al login
  }

  return new Response(null, { status: 302, headers });
};
