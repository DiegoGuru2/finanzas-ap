import { A as addAttribute, D as renderTemplate, L as createAstro, k as renderHead, w as renderSlot } from "./sequence_EYuJgYEm.mjs";
import { t as createComponent } from "./compiler_VErPa8dz.mjs";
//#region src/layouts/BaseLayout.astro
createAstro("https://astro.build");
var $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BaseLayout;
	const { title, description = "Plataforma de gestión financiera personal con motor de optimización de deudas." } = Astro.props;
	return renderTemplate`<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description"${addAttribute(description, "content")}><meta name="theme-color" content="#1a1a2e"><!-- Aplicar el tema guardado ANTES del primer render para evitar parpadeo --><script>
      (function () {
        try {
          if (localStorage.getItem('finanzas-theme') === 'light') {
            document.documentElement.dataset.theme = 'light';
          }
        } catch (e) {}
      })();
    <\/script><!-- Preconnect to Google Fonts --><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"><!-- Security Headers --><meta http-equiv="X-Content-Type-Options" content="nosniff"><meta http-equiv="X-Frame-Options" content="DENY"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>${title} | FinanzasAP</title>${renderHead($$result)}</head><body class="min-h-screen bg-surface-0 text-text-primary antialiased">${renderSlot($$result, $$slots["default"])}</body></html>`;
}, "C:/Users/dgurumendi/Documents/finanzas-ap/src/layouts/BaseLayout.astro", void 0);
//#endregion
export { $$BaseLayout as t };
