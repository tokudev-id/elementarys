"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/field";
import { useZodForm } from "@/components/use-zod-form";
import { FormErrorSummary } from "@/components/form-error-summary";
import { loginSchema, changePasswordSchema } from "@/contracts/auth";

export function AccountForm({ change = false }: { change?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const loginForm = useZodForm(loginSchema, {
    defaultValues: { email: "", password: "" },
    onSubmit: async (data) => {
      setPending(true);
      setMessage("");
      try {
        const response = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          setMessage(
            response.status === 401
              ? "Email atau password tidak sesuai. Coba kembali."
              : (error.error?.message ?? "Belum berhasil. Periksa isian lalu coba kembali."),
          );
        } else {
          router.push("/attendance");
          router.refresh();
        }
      } catch {
        setMessage("Belum terhubung. Periksa internet lalu coba kembali.");
      } finally {
        setPending(false);
      }
    },
  });

  const changeForm = useZodForm(changePasswordSchema, {
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    onSubmit: async (data) => {
      setPending(true);
      setMessage("");
      try {
        const response = await fetch("/api/account/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          setMessage(error.error?.message ?? "Belum berhasil. Periksa isian lalu coba kembali.");
        } else {
          router.push("/attendance");
          router.refresh();
        }
      } catch {
        setMessage("Belum terhubung. Periksa internet lalu coba kembali.");
      } finally {
        setPending(false);
      }
    },
  });

  if (change) {
    return (
      <form className="account-form" {...changeForm.formProps}>
        <FormErrorSummary errors={changeForm.errorSummary} />
        <Field
          label="Password saat ini"
          type="password"
          required
          autoComplete="current-password"
          maxLength={128}
          {...changeForm.register("currentPassword")}
        />
        <Field
          label="Password baru"
          type="password"
          required
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          hint="Gunakan minimal 12 karakter."
          {...changeForm.register("newPassword")}
        />
        <Field
          label="Ulangi password baru"
          type="password"
          required
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          {...changeForm.register("confirmNewPassword")}
        />
        {message && <p role="alert">{message}</p>}
        <Button disabled={pending} type="submit" pending={pending}>
          Simpan password baru
        </Button>
      </form>
    );
  }

  return (
    <form className="account-form" {...loginForm.formProps}>
      <FormErrorSummary errors={loginForm.errorSummary} />
      <Field
        label="Email"
        type="email"
        required
        autoComplete="username"
        maxLength={254}
        {...loginForm.register("email")}
      />
      <Field
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        maxLength={128}
        {...loginForm.register("password")}
      />
      {message && <p role="alert">{message}</p>}
      <Button disabled={pending} type="submit" pending={pending}>
        Masuk
      </Button>
    </form>
  );
}

export function Logout({ asMenuItem = false }: { asMenuItem?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (response.ok) {
        router.push("/login");
        router.refresh();
      } else setMessage("Belum berhasil keluar. Coba kembali.");
    } catch {
      setMessage("Belum terhubung. Coba keluar kembali.");
    } finally {
      setPending(false);
    }
  }

  function selectLogout(event: Event) {
    event.preventDefault();
    void logout();
  }

  return (
    <>
      {asMenuItem ? (
        <DropdownMenuItem disabled={pending} onSelect={selectLogout}>
          Keluar
        </DropdownMenuItem>
      ) : (
        <Button variant="ghost" disabled={pending} onClick={logout}>
          Keluar
        </Button>
      )}
      {message && <p role="alert">{message}</p>}
    </>
  );
}
