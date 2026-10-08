import "server-only";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { createAuth } from "./factory";
import { requireActor } from "./guards";
import { DomainError } from "@/domain/errors";
import { audit } from "@/server/db/pool";
import { mutationTransaction } from "@/server/mutations";
export async function changeAccountPassword(
  headers: Headers,
  body: unknown,
  source: Pool,
  auth: ReturnType<typeof createAuth>,
  requestId: string = randomUUID(),
) {
  const actor = await requireActor(headers, { allowPasswordChange: true }, source, auth);
  const input = z
    .object({
      currentPassword: z.string().min(1).max(128),
      newPassword: z.string().min(12).max(128),
    })
    .strict()
    .safeParse(body);
  if (!input.success) throw new DomainError("INVALID_INPUT", "Password baru minimal 12 karakter.");
  const secret = auth.options.secret;
  const baseURL = auth.options.baseURL;
  if (typeof secret !== "string" || typeof baseURL !== "string")
    throw new Error("Konfigurasi auth belum lengkap.");
  return mutationTransaction(async (client) => {
    await client.query('SELECT id FROM "user" WHERE id=$1 FOR NO KEY UPDATE', [actor.id]);
    const scopedAuth = createAuth(client, secret, baseURL);
    const latest = await requireActor(headers, { allowPasswordChange: true }, client, scopedAuth);
    const before = (
      await client.query<{ mustChangePassword: boolean }>(
        'SELECT must_change_password "mustChangePassword" FROM "user" WHERE id=$1',
        [actor.id],
      )
    ).rows[0];
    const response = await scopedAuth.api.changePassword({
      headers,
      body: { ...input.data, revokeOtherSessions: true },
      asResponse: true,
    });
    if (!response.ok)
      throw new DomainError(
        "INVALID_INPUT",
        "Password saat ini tidak sesuai. Periksa lalu coba kembali.",
      );
    await client.query(
      'UPDATE "user" SET must_change_password=false,updated_at=now() WHERE id=$1',
      [actor.id],
    );
    await audit(client, actor.id, "user.password-change", "user", actor.id, requestId, {
      actorName: latest.name,
      before,
      after: { mustChangePassword: false, otherSessionsRevoked: true },
    });
    return { changed: true, headers: response.headers };
  }, source);
}
