import "server-only";
import { z } from "zod";
import type { Pool } from "pg";
import type { createAuth } from "./factory";
import { requireActor } from "./guards";
import { DomainError } from "@/domain/errors";
export async function changeAccountPassword(headers:Headers,body:unknown,source:Pool,auth:ReturnType<typeof createAuth>){
  const actor=await requireActor(headers,{allowPasswordChange:true},source,auth);
  const input=z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(12).max(128)}).safeParse(body);
  if(!input.success) throw new DomainError("INVALID_INPUT","Password baru minimal 12 karakter.");
  const response=await auth.api.changePassword({headers,body:{...input.data,revokeOtherSessions:true},asResponse:true});
  if(!response.ok) throw new DomainError("INVALID_INPUT","Password saat ini tidak sesuai. Periksa lalu coba kembali.");
  await source.query('UPDATE "user" SET must_change_password=false WHERE id=$1',[actor.id]);
  return {changed:true,headers:response.headers};
}
