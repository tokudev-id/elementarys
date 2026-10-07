import { getAuth } from "@/server/auth/runtime";
import { dispatchAuth } from "@/server/auth/dispatch";
import { pool } from "@/server/db/pool";
import { errorResponse } from "@/server/http";
export const runtime = "nodejs";
async function dispatch(request: Request) {
  try {
    return await dispatchAuth(
      request,
      getAuth(),
      pool,
      process.env.BETTER_AUTH_SECRET!,
      process.env.BETTER_AUTH_URL!,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = dispatch;
export const POST = dispatch;
