import { DomainError } from "@/domain/errors";
import type { createAuth } from "./factory";

// better-auth rejects with APIError whose body carries a machine code; surface the
// user-fixable ones as field errors instead of a generic 503
function accountError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "body" in error
      ? String((error as { body?: { code?: unknown } }).body?.code ?? "")
      : "";
  if (code.startsWith("USER_ALREADY_EXISTS"))
    return new DomainError("INVALID_INPUT", "Email sudah dipakai akun lain.", 409, {
      email: ["Email sudah dipakai akun lain. Gunakan email lain atau tautkan akun yang ada."],
    });
  if (code === "INVALID_EMAIL")
    return new DomainError("INVALID_INPUT", "Format email belum benar.", 400, {
      email: ["Format email belum benar."],
    });
  if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG")
    return new DomainError("INVALID_INPUT", "Panjang password belum sesuai.", 400, {
      password: ["Password harus 12–128 karakter."],
    });
  return error;
}

export async function createManagedAccount(
  auth: ReturnType<typeof createAuth>,
  input: {
    email: string;
    name: string;
    password: string;
    role: "admin" | "teacher";
    mustChangePassword?: boolean;
  },
) {
  try {
    return await auth.api.createUser({
      body: {
        email: input.email,
        name: input.name,
        password: input.password,
        role: input.role,
        data: { mustChangePassword: input.mustChangePassword ?? true },
      },
    });
  } catch (error) {
    throw accountError(error);
  }
}
