import { requireOrigin } from "@/server/auth/guards";
import { changeAccountPassword } from "@/server/auth/password";
import { getAuth } from "@/server/auth/runtime";
import { pool } from "@/server/db/pool";
import { handler, json } from "@/server/http";
export const POST = handler(async (request, id) => {
  requireOrigin(request);
  const changed = await changeAccountPassword(
    request.headers,
    await request.json(),
    pool,
    getAuth(),
  );
  const response = json({ changed: true }, id);
  for (const cookie of changed.headers.getSetCookie())
    response.headers.append("Set-Cookie", cookie);
  return response;
});
