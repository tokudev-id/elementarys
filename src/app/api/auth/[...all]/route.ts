import { getAuth } from "@/server/auth/runtime";
import { dispatchAuth } from "@/server/auth/dispatch";
import { pool } from "@/server/db/pool";
import { handler } from "@/server/http";
export const runtime = "nodejs";
const dispatch = handler(async (request, requestId) => {
  return await dispatchAuth(
    request,
    getAuth(),
    pool,
    process.env.BETTER_AUTH_SECRET!,
    process.env.BETTER_AUTH_URL!,
    requestId,
  );
}, "auth.request");
export const GET = dispatch;
export const POST = dispatch;
