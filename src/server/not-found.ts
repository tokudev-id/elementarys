import "server-only";
import { notFound } from "next/navigation";
import { DomainError } from "@/domain/errors";

// detail pages: a missing record or a malformed id in the url renders the 404 page
// instead of the generic error page
export async function orNotFound<T>(load: Promise<T>): Promise<T> {
  try {
    return await load;
  } catch (error) {
    if (error instanceof DomainError && (error.status === 404 || error.code === "INVALID_INPUT"))
      notFound();
    throw error;
  }
}
