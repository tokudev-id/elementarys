import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const auth = betterAuth({
  database: drizzleAdapter(drizzle(new Pool({ connectionString: process.env.DATABASE_URL })), { provider: "pg" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: { additionalFields: { mustChangePassword: { type: "boolean", defaultValue: false, input: false } } },
  plugins: [admin()],
});
