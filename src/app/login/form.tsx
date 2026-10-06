"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccountForm({ change = false }: { change?: boolean }) {
  const router = useRouter();
  const [message,setMessage]=useState(""); const [pending,setPending]=useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const data=new FormData(event.currentTarget);
    const body=change ? {currentPassword:data.get("password"),newPassword:data.get("newPassword")} : {email:data.get("email"),password:data.get("password")};
    try {
      const response=await fetch(change?"/api/account/change-password":"/api/auth/sign-in/email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if (!response.ok) {
        const error=await response.json();
        setMessage(response.status===401 ? "Email atau password tidak sesuai. Coba kembali." : error.error?.message ?? "Belum berhasil. Periksa isian lalu coba kembali.");
      } else { router.push("/"); router.refresh(); }
    } catch { setMessage("Belum terhubung. Periksa internet lalu coba kembali."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="account-form">
    {!change && <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>}
    <label>{change?"Password saat ini":"Password"}<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>
    {change && <><label>Password baru<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="new-password-help"/></label><small id="new-password-help">Gunakan minimal 12 karakter.</small></>}
    {message && <p role="alert">{message}</p>}
    <button disabled={pending} type="submit">{pending?"Mohon tunggu…":change?"Simpan password baru":"Masuk"}</button>
  </form>;
}

export function Logout() {
  const router = useRouter();
  const [message,setMessage]=useState("");
  const [pending,setPending]=useState(false);
  return <><button disabled={pending} onClick={async()=>{
    setPending(true);
    try { const response=await fetch("/api/auth/sign-out",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      if(response.ok) { router.push("/login"); router.refresh(); } else setMessage("Belum berhasil keluar. Coba kembali.");
    } catch {setMessage("Belum terhubung. Coba keluar kembali.");} finally {setPending(false);}
  }}>Keluar</button>{message&&<p role="alert">{message}</p>}</>;
}
