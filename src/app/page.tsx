import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/guards";
import { DomainError } from "@/domain/errors";
import { Logout } from "./login/form";
export default async function Home() {
  let actor;
  try { actor = await requireActor(await headers()); }
  catch(error) { redirect(error instanceof DomainError && error.code === "PASSWORD_CHANGE_REQUIRED" ? "/change-password" : "/login"); }
  return <main>
    <h1>Absensi Sekolah</h1>
    <p>Masuk sebagai {actor.name}. Pencatatan kehadiran sedang disiapkan.</p>
    <p><a href="/change-password">Ganti password</a></p>
    <Logout/>
  </main>;
}
