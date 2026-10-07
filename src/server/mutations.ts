import "server-only";
import type { Pool, PoolClient } from "pg";
import type { Actor } from "@/server/auth/guards";
import { DomainError } from "@/domain/errors";
import { pool, transaction } from "@/server/db/pool";

export function assertAdmin(actor: Actor) {
  if (actor.role !== "admin")
    throw new DomainError("ACCESS_DENIED", "Tindakan ini memerlukan akun admin.", 403);
}
export function assertVersion(actual: number | null, expected: number | null) {
  if (actual !== expected)
    throw new DomainError(
      "VERSION_CONFLICT",
      "Data telah berubah. Muat data terbaru sebelum menyimpan.",
      409,
    );
}
export async function mutationTransaction<T>(
  action: (client: PoolClient) => Promise<T>,
  source: Pool = pool,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await transaction(action, source);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error) {
        if (error.code === "40P01" && attempt < 2) continue;
        if (error.code === "23505")
          throw new DomainError(
            "INVALID_INPUT",
            "Nama, kode, atau tautan tersebut sudah digunakan.",
          );
        if (error.code === "23P01")
          throw new DomainError(
            "INVALID_INPUT",
            "Rentang tanggal bertumpang tindih dengan data yang sudah ada.",
          );
      }
      throw error;
    }
  }
}
