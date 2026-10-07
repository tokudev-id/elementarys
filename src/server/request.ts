import "server-only";
import { DomainError } from "@/domain/errors";

export async function readJsonBody(request: Request, limit = 128 * 1024): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > limit)
    throw new DomainError("INVALID_INPUT", "Permintaan terlalu besar.");
  const reader = request.body?.getReader();
  if (!reader) throw new DomainError("INVALID_INPUT", "Isi permintaan wajib.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new DomainError("INVALID_INPUT", "Permintaan terlalu besar.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError("INVALID_INPUT", "JSON tidak valid.");
  }
}
