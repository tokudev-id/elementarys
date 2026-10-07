import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DomainError } from "@/domain/errors";
import { requireActor } from "./guards";

export async function requirePageActor() {
  try {
    return await requireActor(await headers());
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    redirect(error.code === "PASSWORD_CHANGE_REQUIRED" ? "/change-password" : "/login");
  }
}
