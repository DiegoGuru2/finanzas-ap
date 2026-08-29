import { D as renderTemplate, L as createAstro, O as maybeRenderHead, S as renderComponent, w as renderSlot } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { t as $$BaseLayout } from "./BaseLayout_CF5Ip-cj.mjs";
import { createAuthClient } from "better-auth/react";
//#region src/layouts/AuthLayout.astro
createAstro("https://astro.build");
var $$AuthLayout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$AuthLayout;
	const { title, description } = Astro.props;
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"title": title,
		"description": description
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="flex min-h-screen items-center justify-center px-4 py-12"><!-- Background gradient decoration --><div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div class="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-500/10 blur-[120px]"></div><div class="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent-500/10 blur-[100px]"></div></div><!-- Auth content --><div class="relative z-10 w-full max-w-md">${renderSlot($$result, $$slots["default"])}</div></main>` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/layouts/AuthLayout.astro", void 0);
var { signIn, signUp, signOut, useSession } = createAuthClient({ baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:4321" });
//#endregion
export { signUp as n, $$AuthLayout as r, signIn as t };
