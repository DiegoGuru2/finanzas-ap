import { c as user, l as verification, n as account, s as session, t as db } from "./db_Gak7IQ5R.mjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
//#region src/lib/auth/server.ts
var auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "mysql",
		schema: {
			user,
			session,
			account,
			verification
		}
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8
	},
	user: { additionalFields: { role: {
		type: "string",
		required: false,
		defaultValue: "user",
		input: false
	} } },
	baseURL: process.env.PUBLIC_APP_URL || "http://localhost:4321",
	secret: process.env.BETTER_AUTH_SECRET || "finanzas_ap_super_secret_key_32_chars_long_minimum"
});
//#endregion
export { auth as t };
