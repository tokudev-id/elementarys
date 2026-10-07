import type { createAuth } from "./factory";
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
  return auth.api.createUser({
    body: {
      email: input.email,
      name: input.name,
      password: input.password,
      role: input.role,
      data: { mustChangePassword: input.mustChangePassword ?? true },
    },
  });
}
