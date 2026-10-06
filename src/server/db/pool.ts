import "server-only";
import { Pool, type PoolClient } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
  statement_timeout: 15000,
});

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>, source = pool): Promise<T> {
  const client = await source.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function lockRows(client: PoolClient, table: "academic_years" | "students" | "classes" | "attendance_sessions", ids: string[], mode: "SHARE" | "UPDATE" = "UPDATE") {
  const sorted = [...new Set(ids)].sort();
  for (const rowId of sorted) await client.query(`SELECT id FROM ${table} WHERE id=$1 FOR ${mode}`, [rowId]);
}

export async function audit(client: PoolClient, actorId: string, action: string, entityType: string, entityId: string, requestId: string, changes: unknown, reason: string | null = null) {
  await client.query("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,request_id,changes_json,reason) VALUES($1,$2,$3,$4,$5,$6,$7)", [actorId, action, entityType, entityId, requestId, JSON.stringify(changes), reason]);
}
