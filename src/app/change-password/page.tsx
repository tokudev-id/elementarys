import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/guards";
import { AccountForm, Logout } from "../login/form";
export default async function ChangePassword() {
  try {
    await requireActor(await headers(), { allowPasswordChange: true });
  } catch {
    redirect("/login");
  }
  return (
    <main>
      <h1>Ganti password</h1>
      <p>Ganti password sementara sebelum membuka data sekolah.</p>
      <AccountForm change />
      <Logout />
    </main>
  );
}
