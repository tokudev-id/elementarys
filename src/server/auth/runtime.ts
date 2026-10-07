import "server-only";
import { createAuth } from "./factory";
import { pool } from "../db/pool";

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!instance) {
    const secret = process.env.BETTER_AUTH_SECRET;
    const baseURL = process.env.BETTER_AUTH_URL;
    if (!secret || secret.length < 32 || !baseURL)
      throw new Error("Konfigurasi autentikasi belum lengkap.");
    instance = createAuth(pool, secret, baseURL);
  }
  return instance;
}
