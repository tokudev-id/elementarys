import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { createAuth } from "./factory";
import { DomainError } from "@/domain/errors";
import { errorResponse } from "../http";
import { requireOrigin } from "./guards";

export async function dispatchAuth(
  request: Request,
  auth: ReturnType<typeof createAuth>,
  source: Pool,
  secret: string,
  baseURL: string,
) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
    const method = request.method;
    if (!(
      (method === "POST" && ["/sign-in/email", "/sign-out"].includes(path)) ||
      (method === "GET" && path === "/get-session")
    )) {
      throw new DomainError("ACCESS_DENIED", "Operasi akun ini tidak tersedia.", 403);
    }
    if (method === "POST") requireOrigin(request, baseURL);
    if (path === "/sign-in/email") {
      const body = await request.clone().json();
      if (typeof body.email !== "string" || body.email.length > 254)
        throw new DomainError("INVALID_INPUT", "Periksa email.");
      const key =
        "login-email:" +
        createHmac("sha256", secret).update(body.email.trim().toLowerCase()).digest("hex");
      const now = Date.now();
      const result = await source.query(
        `INSERT INTO rate_limit(id,key,count,last_request) VALUES($1,$2,1,$3)
        ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limit.last_request<$3-60000 THEN 1 ELSE rate_limit.count+1 END,
        last_request=CASE WHEN rate_limit.last_request<$3-60000 THEN $3 ELSE rate_limit.last_request END
        WHERE rate_limit.count<5 OR rate_limit.last_request<$3-60000 RETURNING count`,
        [randomUUID(), key, now],
      );
      if (!result.rowCount)
        throw new DomainError(
          "RATE_LIMITED",
          "Terlalu banyak percobaan masuk. Tunggu satu menit.",
          429,
        );
    }
    const response = await auth.handler(request);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
