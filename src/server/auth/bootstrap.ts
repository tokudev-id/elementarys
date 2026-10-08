import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Pool } from "pg";
import { transaction, audit } from "@/server/db/pool";
import { createAuth } from "./factory";
import { createManagedAccount } from "./accounts";
const inputSchema = z
  .object({
    email: z.email().max(254),
    name: z.string().trim().min(1).max(200),
    password: z.string().min(12).max(128),
    teacherId: z.uuid().optional(),
  })
  .strict();
export async function bootstrapManagedAdmin(
  source: Pool,
  config: { secret: string; baseURL: string },
  body: unknown,
) {
  const input = inputSchema.parse(body);
  return transaction(async (client) => {
    await client.query('LOCK TABLE "user" IN SHARE ROW EXCLUSIVE MODE');
    if (
      (
        await client.query(
          "SELECT id FROM \"user\" WHERE role='admin' AND coalesce(banned,false)=false",
        )
      ).rowCount
    )
      throw new Error("Admin sudah ada.");
    if (
      input.teacherId &&
      !(
        await client.query(
          "SELECT id FROM teachers WHERE id=$1 AND user_id IS NULL AND active=true FOR UPDATE",
          [input.teacherId],
        )
      ).rowCount
    )
      throw new Error("Profil tidak tersedia.");
    const created = await createManagedAccount(createAuth(client, config.secret, config.baseURL), {
      email: input.email,
      name: input.name,
      password: input.password,
      role: "admin",
    });
    if (input.teacherId)
      await client.query(
        "UPDATE teachers SET user_id=$1,version=version+1 WHERE id=$2 AND user_id IS NULL",
        [created.user.id, input.teacherId],
      );
    await audit(client, created.user.id, "user.bootstrap", "user", created.user.id, randomUUID(), {
      actorName: input.name,
      before: null,
      after: {
        id: created.user.id,
        name: input.name,
        email: input.email,
        role: "admin",
        mustChangePassword: true,
        teacherId: input.teacherId ?? null,
      },
    });
    return { id: created.user.id };
  }, source);
}
