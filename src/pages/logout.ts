import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth/server';

/**
 * Cierre de sesión vía POST (el GET de antes permitía que cualquier página
 * externa cerrara la sesión del usuario — CSRF de logout).
 *
 * Si better-auth falla, igualmente se expiran las cookies de sesión en el
 * navegador para que el usuario nunca "rebote" de vuelta como logueado.
 */

const EXPIRED = 'Max-Age=0; Path=/; HttpOnly; SameSite=Lax';

function clearSessionCookies(headers: Headers) {
  headers.append('Set-Cookie', `better-auth.session_token=; ${EXPIRED}`);
  headers.append('Set-Cookie', `__Secure-better-auth.session_token=; ${EXPIRED}; Secure`);
}

export const POST: APIRoute = async (ctx) => {
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
    if (setCookies.length === 0) clearSessionCookies(headers);
  } catch {
    // El servidor no pudo invalidar la sesión: al menos se limpia el navegador
    clearSessionCookies(headers);
  }

  return new Response(null, { status: 302, headers });
};

// Un GET (enlace viejo, marcador) no cierra sesión: solo redirige.
export const GET: APIRoute = async () =>
  new Response(null, { status: 302, headers: { Location: '/app/dashboard' } });
