import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as auth } from "./server_CLk_DP_6.mjs";
//#region src/pages/api/auth/[...all].ts
var ____all__exports = /* @__PURE__ */ __exportAll({ ALL: () => ALL });
var ALL = async (ctx) => {
	return auth.handler(ctx.request);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/[...all]@_@ts
var page = () => ____all__exports;
//#endregion
export { page };
