import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import * as schema from "../db/auth-schema";

export function createAuth(source: Pool | PoolClient, secret: string, baseURL: string) {
  return betterAuth({
    secret,
    baseURL,
    logger: { disabled: true },
    database: drizzleAdapter(drizzle(source), { provider: "pg", schema, transaction: false }),
    trustedOrigins: [baseURL],
    session: { cookieCache: { enabled: false } },
    advanced: { useSecureCookies: baseURL.startsWith("https://") },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 50 } },
    },
    emailAndPassword: { enabled: true, disableSignUp: true },
    user: {
      additionalFields: {
        mustChangePassword: { type: "boolean", defaultValue: false, input: false },
      },
    },
    plugins: [admin({ defaultRole: "teacher", roles: { admin: adminAc, teacher: userAc } })],
  });
}
