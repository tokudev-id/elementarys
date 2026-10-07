"use client";
import { useState, type FormEvent, type ChangeEvent } from "react";
import type { TeacherView, SchoolAccount } from "@/contracts/teachers";
import type { ClassView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";

export function TeacherProfileForm({ teacher }: { teacher?: TeacherView }) {
  const mutation = useMutation(
    teacher ? `/api/teachers/${teacher.id}` : "/api/teachers",
    teacher ? "PATCH" : "POST",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (
      (await mutation.mutate({
        fullName: data.get("fullName"),
        active: data.has("active"),
        ...(teacher ? { expectedVersion: teacher.version } : {}),
      })) &&
      !teacher
    )
      form.reset();
  }
  return (
    <form
      className="resource-form"
      onSubmit={submit}
      data-testid={teacher ? `teacher-edit-${teacher.id}` : "teacher-create"}
    >
      <fieldset disabled={mutation.pending} key={teacher?.version ?? "create"}>
        <Field
          label="Nama lengkap guru"
          name="fullName"
          required
          maxLength={200}
          defaultValue={teacher?.fullName}
        />
        <label className="checkbox-field">
          <input type="checkbox" name="active" defaultChecked={teacher?.active ?? true} />
          Profil aktif
        </label>
        <p>Menonaktifkan profil juga menonaktifkan akun terhubung dan mengakhiri sesinya.</p>
        <Button type="submit" pending={mutation.pending}>
          {teacher ? "Simpan profil guru" : "Tambah profil guru"}
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
export function TeacherClassesForm({
  teacher,
  classes,
}: {
  teacher: TeacherView;
  classes: ClassView[];
}) {
  const mutation = useMutation(`/api/teachers/${teacher.id}/classes`, "PUT");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.mutate({ expectedVersion: teacher.version, classIds: data.getAll("classId") });
  }
  return (
    <form className="resource-form" onSubmit={submit}>
      <fieldset disabled={mutation.pending} key={teacher.version}>
        <legend>Kelas utama</legend>
        <p>Kelas utama mengatur urutan. Guru aktif tetap dapat mencatat seluruh kelas.</p>
        {classes.map((item) => (
          <label className="checkbox-field" key={item.id}>
            <input
              type="checkbox"
              name="classId"
              value={item.id}
              defaultChecked={teacher.classes.some((current) => current.id === item.id)}
            />
            {item.name}
          </label>
        ))}
        <Button type="submit" pending={mutation.pending}>
          Simpan kelas utama
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
export function TeacherAccountForm({
  teacher,
  accounts,
}: {
  teacher: TeacherView;
  accounts: SchoolAccount[];
}) {
  const [mode, setMode] = useState<"create" | "existing">("create");
  const mutation = useMutation(`/api/teachers/${teacher.id}/account`, "POST");
  function changeMode(event: ChangeEvent<HTMLSelectElement>) {
    setMode(event.currentTarget.value === "existing" ? "existing" : "create");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input =
      mode === "existing"
        ? { mode, expectedVersion: teacher.version, userId: data.get("userId") }
        : {
            mode,
            expectedVersion: teacher.version,
            email: data.get("email"),
            password: data.get("password"),
            role: data.get("role"),
          };
    if (await mutation.mutate(input)) form.reset();
  }
  return (
    <form className="resource-form" onSubmit={submit}>
      <fieldset disabled={mutation.pending || !teacher.active}>
        <legend>Hubungkan akun</legend>
        <SelectField label="Jenis akun" value={mode} onChange={changeMode}>
          <option value="create">Buat akun baru</option>
          <option value="existing">Tautkan akun yang sudah ada</option>
        </SelectField>
        {mode === "create" ? (
          <>
            <Field
              label="Email akun guru"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
            />
            <Field
              label="Password sementara"
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
            <SelectField label="Peran akun" name="role" defaultValue="teacher">
              <option value="teacher">Guru</option>
              <option value="admin">Admin</option>
            </SelectField>
            <p>
              Sampaikan password melalui kanal yang disepakati. Guru wajib menggantinya saat masuk
              pertama.
            </p>
          </>
        ) : (
          <SelectField label="Akun yang belum tertaut" name="userId" required defaultValue="">
            <option value="">Pilih akun</option>
            {accounts.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </SelectField>
        )}
        <Button type="submit" pending={mutation.pending}>
          Hubungkan akun guru
        </Button>
      </fieldset>
      {!teacher.active && <p>Aktifkan profil terlebih dahulu.</p>}
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
export function AccountAccessForm({
  account,
  expectedVersion,
}: {
  account: SchoolAccount;
  expectedVersion: number | null;
}) {
  const mutation = useMutation(`/api/users/${encodeURIComponent(account.id)}/access`, "PATCH");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.mutate({
      expectedVersion,
      expectedRole: account.role,
      expectedBanned: account.banned,
      role: data.get("role"),
      banned: data.has("banned"),
    });
  }
  return (
    <form className="resource-form" onSubmit={submit} aria-label={`Akses akun ${account.email}`}>
      <fieldset
        disabled={mutation.pending}
        key={`${expectedVersion}:${account.role}:${account.banned}`}
      >
        <legend>Akses akun {account.email}</legend>
        <SelectField label="Peran akun" name="role" defaultValue={account.role}>
          <option value="teacher">Guru</option>
          <option value="admin">Admin</option>
        </SelectField>
        <label className="checkbox-field">
          <input name="banned" type="checkbox" defaultChecked={account.banned} />
          Nonaktifkan akses akun
        </label>
        <Button type="submit" pending={mutation.pending}>
          Simpan akses akun
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
export function PasswordResetForm({
  account,
  expectedVersion,
}: {
  account: SchoolAccount;
  expectedVersion: number | null;
}) {
  const mutation = useMutation(
    `/api/users/${encodeURIComponent(account.id)}/reset-password`,
    "POST",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (
      await mutation.mutate({
        expectedVersion,
        newPassword: data.get("newPassword"),
      })
    )
      form.reset();
  }
  return (
    <form
      className="resource-form"
      onSubmit={submit}
      aria-label={`Reset password ${account.email}`}
    >
      <fieldset disabled={mutation.pending}>
        <legend>Reset password</legend>
        <Field
          label="Password sementara baru"
          name="newPassword"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
        <p>
          Semua sesi akun akan dicabut. Pengguna wajib mengganti password setelah masuk kembali.
        </p>
        <Button type="submit" pending={mutation.pending}>
          Reset password akun
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
