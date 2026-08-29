import { A as addAttribute, D as renderTemplate, L as createAstro, O as maybeRenderHead, S as renderComponent, j as createRenderInstruction, w as renderSlot } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { t as $$BaseLayout } from "./BaseLayout_CF5Ip-cj.mjs";
//#region node_modules/astro/dist/runtime/server/render/script.js
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
//#endregion
//#region src/components/layout/Sidebar.astro
createAstro("https://astro.build");
var $$Sidebar = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Sidebar;
	const { currentPath } = Astro.props;
	const navItems = [
		{
			href: "/app/dashboard",
			label: "Dashboard",
			icon: "layout-dashboard"
		},
		{
			href: "/app/debts",
			label: "Deudas",
			icon: "credit-card"
		},
		{
			href: "/app/incomes",
			label: "Ingresos",
			icon: "trending-up"
		},
		{
			href: "/app/expenses",
			label: "Gastos",
			icon: "receipt"
		},
		{
			href: "/app/payments",
			label: "Pagos",
			icon: "banknote"
		},
		{
			href: "/app/settings",
			label: "Configuración",
			icon: "settings"
		}
	];
	function isActive(href) {
		if (href === "/app/dashboard") return currentPath === "/app/dashboard";
		return currentPath.startsWith(href);
	}
	return renderTemplate`${maybeRenderHead($$result)}<!-- Mobile overlay --><div id="sidebar-overlay" class="fixed inset-0 z-40 hidden bg-black/50 backdrop-blur-sm lg:hidden"></div><!-- Sidebar --><aside id="app-sidebar" class="fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-border-default bg-surface-50 transition-transform duration-300 ease-smooth lg:translate-x-0"><!-- Logo --><div class="flex h-16 items-center gap-3 border-b border-border-default px-6"><div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500"><svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><span class="text-lg font-bold gradient-text">FinanzasAP</span></div><!-- Navigation --><nav class="flex-1 space-y-1 px-3 py-4">${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(["group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200", isActive(item.href) ? "bg-brand-500/15 text-brand-400 shadow-sm" : "text-text-secondary hover:bg-surface-100 hover:text-text-primary"], "class:list")}><span${addAttribute(["flex h-5 w-5 items-center justify-center", isActive(item.href) ? "text-brand-400" : "text-text-muted group-hover:text-text-secondary"], "class:list")}><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">${item.icon === "layout-dashboard" && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"></path>`}${item.icon === "credit-card" && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>`}${item.icon === "trending-up" && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>`}${item.icon === "receipt" && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"></path>`}${item.icon === "banknote" && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zm10 3a2 2 0 100 4 2 2 0 000-4z"></path>`}${item.icon === "settings" && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>`}${item.icon === "settings" && renderTemplate`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>`}</svg></span>${item.label}</a>`)}</nav><!-- Bottom section --><div class="border-t border-border-default p-3"><a href="/api/auth/sign-out" class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger-400 transition-colors hover:bg-danger-500/10"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>Cerrar sesión</a></div></aside>`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/components/layout/Sidebar.astro", void 0);
//#endregion
//#region src/layouts/AppLayout.astro
createAstro("https://astro.build");
var $$AppLayout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$AppLayout;
	const { title, description } = Astro.props;
	const currentPath = Astro.url.pathname;
	const currentUser = Astro.locals.user;
	const initial = currentUser?.name ? currentUser.name[0].toUpperCase() : "D";
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {
		"title": title,
		"description": description
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="flex min-h-screen"><!-- Sidebar Navigation -->${renderComponent($$result, "Sidebar", $$Sidebar, { "currentPath": currentPath })}<!-- Main Content Area --><div class="flex flex-1 flex-col lg:ml-64"><!-- Top Header Bar --><header class="sticky top-0 z-30 flex h-16 items-center border-b border-border-default bg-surface-0/80 px-4 backdrop-blur-xl lg:px-8"><!-- Mobile menu button --><button id="mobile-menu-btn" class="mr-4 rounded-lg p-2 text-text-secondary hover:bg-surface-100 hover:text-text-primary lg:hidden" aria-label="Abrir menú"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button><div class="flex flex-1 items-center justify-between"><h1 class="text-lg font-semibold text-text-primary">${title}</h1><!-- User actions --><div class="flex items-center gap-2"><!-- Theme toggle --><button id="theme-toggle" class="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-100 hover:text-text-primary cursor-pointer" title="Cambiar tema claro / oscuro" aria-label="Cambiar tema"><svg id="theme-icon-moon" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg><svg id="theme-icon-sun" class="hidden h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg></button><!-- User menu --><div class="relative"><button id="user-menu-btn" class="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-100 cursor-pointer" aria-haspopup="true" aria-expanded="false"><span class="hidden sm:inline-block text-xs font-medium text-text-secondary">${currentUser?.email || ""}</span><div class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-400 border border-brand-500/30 shadow-sm">${initial}</div><svg class="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button><div id="user-menu" class="absolute right-0 top-full z-50 mt-2 hidden w-60 overflow-hidden rounded-xl border border-border-default bg-surface-50 shadow-xl"><div class="border-b border-border-default px-4 py-3"><div class="text-sm font-semibold text-text-primary">${currentUser?.name || "Usuario"}</div><div class="mt-0.5 text-xs text-text-muted">${currentUser?.email || ""}</div></div><nav class="p-1.5"><a href="/app/settings" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-100 hover:text-text-primary"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>Mi perfil</a><a href="/app/payments" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-100 hover:text-text-primary"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>Cronograma de pagos</a><a href="/app/settings" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-100 hover:text-text-primary"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>Configuración</a></nav><div class="border-t border-border-default p-1.5"><a href="/api/auth/sign-out" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger-400 transition-colors hover:bg-danger-500/10"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>Cerrar sesión</a></div></div></div></div></div></header><!-- Page Content --><main class="flex-1 p-4 lg:p-8">${renderSlot($$result, $$slots["default"])}</main></div></div>${renderScript($$result, "C:/Users/dgurumendi/Documents/finanzas-ap/src/layouts/AppLayout.astro?astro&type=script&index=0&lang.ts")}` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/layouts/AppLayout.astro", void 0);
//#endregion
export { $$AppLayout as t };
