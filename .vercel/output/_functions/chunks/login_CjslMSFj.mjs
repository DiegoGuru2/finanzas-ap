import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { D as renderTemplate, O as maybeRenderHead, S as renderComponent } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
import { i as loginSchema } from "./validators_DCe3gEV7.mjs";
import { r as $$AuthLayout, t as signIn } from "./client_BEwP0yzp.mjs";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/auth/LoginForm.tsx
function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	const handleSubmit = async (e) => {
		e.preventDefault();
		setErrorMessage(null);
		const validation = loginSchema.safeParse({
			email,
			password
		});
		if (!validation.success) {
			setErrorMessage(validation.error.issues[0]?.message || "Datos inválidos");
			return;
		}
		setLoading(true);
		try {
			const res = await signIn.email({
				email,
				password
			});
			if (res?.error) {
				setErrorMessage(res.error.message || "Credenciales incorrectas");
				setLoading(false);
				return;
			}
			window.location.href = "/app/dashboard";
		} catch (err) {
			setErrorMessage(err.message || "Error al iniciar sesión");
			setLoading(false);
		}
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: handleSubmit,
		className: "space-y-5",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
				htmlFor: "email",
				className: "mb-1.5 block text-sm font-medium text-text-secondary",
				children: "Correo electrónico"
			}), /* @__PURE__ */ jsx("input", {
				type: "email",
				id: "email",
				name: "email",
				value: email,
				onChange: (e) => setEmail(e.target.value),
				required: true,
				autoComplete: "email",
				placeholder: "admin@finanzas.app",
				className: "w-full rounded-xl border border-border-default bg-surface-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
			})] }),
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
				className: "mb-1.5 flex items-center justify-between",
				children: [/* @__PURE__ */ jsx("label", {
					htmlFor: "password",
					className: "text-sm font-medium text-text-secondary",
					children: "Contraseña"
				}), /* @__PURE__ */ jsx("a", {
					href: "/forgot-password",
					className: "text-xs font-medium text-brand-400 hover:text-brand-300",
					children: "¿Olvidaste tu contraseña?"
				})]
			}), /* @__PURE__ */ jsx("input", {
				type: "password",
				id: "password",
				name: "password",
				value: password,
				onChange: (e) => setPassword(e.target.value),
				required: true,
				autoComplete: "current-password",
				placeholder: "••••••••",
				className: "w-full rounded-xl border border-border-default bg-surface-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
			})] }),
			errorMessage && /* @__PURE__ */ jsx("div", {
				className: "rounded-lg bg-danger-500/10 border border-danger-500/20 px-4 py-3 text-sm text-danger-400",
				children: errorMessage
			}),
			/* @__PURE__ */ jsx("button", {
				type: "submit",
				disabled: loading,
				className: "w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-400/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
				children: loading ? "Iniciando sesión..." : "Iniciar sesión"
			})
		]
	});
}
//#endregion
//#region src/pages/login.astro
var login_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Login,
	file: () => $$file,
	url: () => $$url
});
var $$Login = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "AuthLayout", $$AuthLayout, {
		"title": "Iniciar sesión",
		"description": "Inicia sesión en tu cuenta de FinanzasAP"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="glass rounded-2xl p-8 shadow-2xl"><!-- Logo --><div class="mb-8 text-center"><div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 shadow-lg shadow-brand-500/25"><svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><h1 class="mt-4 text-2xl font-bold">Bienvenido de nuevo</h1><p class="mt-1 text-sm text-text-secondary">Ingresa a tu cuenta para continuar</p></div><!-- Login Form Island -->${renderComponent($$result, "LoginForm", LoginForm, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "@/components/auth/LoginForm",
		"client:component-export": "default"
	})}<!-- Register link --><p class="mt-6 text-center text-sm text-text-muted">¿No tienes cuenta?${" "}<a href="/register" class="font-medium text-brand-400 hover:text-brand-300">Crear cuenta</a></p></div>` })}`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/login.astro", void 0);
var $$file = "C:/Users/dgurumendi/Documents/finanzas-ap/src/pages/login.astro";
var $$url = "/login";
//#endregion
//#region \0virtual:astro:page:src/pages/login@_@astro
var page = () => login_exports;
//#endregion
export { page };
