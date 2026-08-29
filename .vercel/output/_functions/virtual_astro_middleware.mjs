import { at as defineMiddleware, t as sequence } from "./chunks/sequence_EYuJgYEm.mjs";
import { t as auth } from "./chunks/server_CLk_DP_6.mjs";
//#region src/middleware.ts
var PUBLIC_ROUTES = [
	"/",
	"/login",
	"/register",
	"/forgot-password",
	"/verify-email"
];
var AUTH_API_PREFIX = "/api/auth";
var onRequest$1 = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	if (pathname.startsWith(AUTH_API_PREFIX)) return next();
	const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname === route + "/");
	let session = null;
	try {
		session = await auth.api.getSession({ headers: context.request.headers });
	} catch {
		session = null;
	}
	context.locals.user = session ? session.user : null;
	context.locals.session = session ? session.session : null;
	if (session && (pathname === "/login" || pathname === "/register")) return context.redirect("/app/dashboard");
	if (!isPublicRoute && !session) return context.redirect("/login");
	const response = await next();
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-XSS-Protection", "1; mode=block");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	return response;
});
//#endregion
//#region \0virtual:astro:middleware
var onRequest = sequence(onRequest$1);
//#endregion
export { onRequest };
