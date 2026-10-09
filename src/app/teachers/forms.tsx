"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { TeacherView, SchoolAccount } from "@/contracts/teachers";
import {
  teacherInputSchema,
  teacherPatchSchema,
  teacherAccountSchema,
  resetPasswordSchema,
} from "@/contracts/teachers";
import type { ClassView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { SwitchField } from "@/components/switch-field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";
import { useRouter } from "next/navigation";
import { useFormGuard } from "@/components/use-form-guard";
import { FormSection } from "@/components/form-section";
import { FormActions } from "@/components/form-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useZodForm } from "@/components/use-zod-form";
import { FormErrorSummary } from "@/components/form-error-summary";

type TeacherFormData = {
  fullName: string;
  active: boolean;
  expectedVersion?: number;
};

export function TeacherProfileForm({
  teacher,
  redirect = false,
}: {
  teacher?: TeacherView;
  redirect?: boolean;
}) {
  const router = useRouter();
  const mutation = useMutation(
    teacher ? `/api/teachers/${teacher.id}` : "/api/teachers",
    teacher ? "PATCH" : "POST",
    undefined,
    { refresh: !redirect, successMessage: "Data guru tersimpan" },
  );
  const { markDirty, markSaved } = useFormGuard(mutation.errors);
  const [deactivation, setDeactivation] = useState<{
    fullName: string;
    active: boolean;
    expectedVersion: number;
  } | null>(null);

  function closeDeactivation() {
    setDeactivation(null);
  }
  async function confirmDeactivation() {
    if (!deactivation) return;
    const saved = await mutation.mutate(deactivation);
    if (saved) {
      markSaved();
      setDeactivation(null);
      if (redirect) router.push(`/teachers/${saved.id}`);
    }
  }

  const schema = teacher ? teacherPatchSchema : teacherInputSchema;
  const form = useZodForm<TeacherFormData>(schema, {
    defaultValues: teacher
      ? {
          fullName: teacher.fullName,
          active: teacher.active,
          expectedVersion: teacher.version,
        }
      : {
          fullName: "",
          active: true,
        },
    serverErrors: mutation.errors,
    onSubmit: async (data: TeacherFormData) => {
      if (teacher?.active && !data.active) {
        setDeactivation({
          fullName: data.fullName,
          active: false,
          expectedVersion: teacher.version,
        });
        return;
      }
      const saved = await mutation.mutate(data);
      if (saved) {
        markSaved();
        if (redirect) router.push(`/teachers/${saved.id}`);
        else if (!teacher) form.reset({ fullName: "", active: true });
      }
    },
  });

  function handleActiveChange(checked: boolean) {
    form.setValue("active", checked);
  }

  return (
    <form
      className="resource-form redesigned-form"
      {...form.formProps}
      onChange={markDirty}
      data-testid={teacher ? `teacher-edit-${teacher.id}` : "teacher-create"}
    >
      <FormErrorSummary errors={form.errorSummary} />
      <fieldset disabled={mutation.pending} key={teacher?.version ?? "create"}>
        <FormSection
          title="Profil guru"
          actions={
            redirect ? (
              <FormActions
                cancelHref={teacher ? `/teachers/${teacher.id}` : "/teachers"}
                pending={mutation.pending}
                label={teacher ? "Simpan profil guru" : "Tambah profil guru"}
              />
            ) : (
              <Button type="submit" pending={mutation.pending}>
                {teacher ? "Simpan profil guru" : "Tambah profil guru"}
              </Button>
            )
          }
        >
          <Field
            label="Nama lengkap guru"
            required
            maxLength={200}
            {...form.register("fullName")}
          />
          <SwitchField
            label="Profil aktif"
            checked={Boolean(form.values.active ?? true)}
            onCheckedChange={handleActiveChange}
            name="active"
          />
          <p>Menonaktifkan profil juga menonaktifkan akun terhubung dan mengakhiri sesinya.</p>
        </FormSection>
      </fieldset>
      <MutationFeedback mutation={mutation} />
      <ConfirmDialog
        open={deactivation !== null}
        onClose={closeDeactivation}
        title="Nonaktifkan profil guru?"
        onConfirm={confirmDeactivation}
        pending={mutation.pending}
        destructive
        label="Nonaktifkan profil"
      >
        <p>
          Akun terhubung ikut dinonaktifkan dan sesinya berakhir. Riwayat absensi tetap tersedia.
        </p>
      </ConfirmDialog>
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
    await mutation.mutate({
      expectedVersion: teacher.version,
      classIds: data.getAll("classId"),
    });
  }
  return (
    <form className="resource-form" noValidate onSubmit={submit}>
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

type AccountFormData =
  | {
      mode: "create";
      expectedVersion: number;
      email: string;
      password: string;
      role: "teacher" | "admin";
    }
  | {
      mode: "existing";
      expectedVersion: number;
      userId: string;
    };

export function TeacherAccountForm({
  teacher,
  accounts,
  onSuccess,
}: {
  teacher: TeacherView;
  accounts: SchoolAccount[];
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<"create" | "existing">("create");
  const mutation = useMutation(`/api/teachers/${teacher.id}/account`, "POST");

  const form = useZodForm<AccountFormData>(teacherAccountSchema, {
    defaultValues: {
      mode: "create",
      expectedVersion: teacher.version,
      email: "",
      password: "",
      role: "teacher",
    },
    serverErrors: mutation.errors,
    onSubmit: async (data: AccountFormData) => {
      const saved = await mutation.mutate(data);
      if (saved) {
        form.reset({
          mode,
          expectedVersion: teacher.version,
          email: "",
          password: "",
          role: "teacher",
        });
        if (onSuccess) {
          onSuccess();
        }
      }
    },
  });

  function changeMode(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.currentTarget.value === "existing" ? "existing" : "create";
    setMode(nextMode);
    form.setValue("mode", nextMode);
  }

  return (
    <form className="resource-form" {...form.formProps}>
      <FormErrorSummary errors={form.errorSummary} />
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
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              {...form.register("email")}
            />
            <Field
              label="Password sementara"
              type="password"
              required
              maxLength={128}
              autoComplete="new-password"
              {...form.register("password")}
            />
            <SelectField label="Peran akun" required {...form.register("role")}>
              <option value="teacher">Guru</option>
              <option value="admin">Admin</option>
            </SelectField>
            <p>
              Sampaikan password melalui kanal yang disepakati. Guru wajib menggantinya saat masuk
              pertama.
            </p>
          </>
        ) : (
          <SelectField label="Akun yang belum tertaut" required {...form.register("userId")}>
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
  onSuccess,
}: {
  account: SchoolAccount;
  expectedVersion: number | null;
  onSuccess?: () => void;
}) {
  const mutation = useMutation(`/api/users/${encodeURIComponent(account.id)}/access`, "PATCH");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await mutation.mutate({
      expectedVersion,
      expectedRole: account.role,
      expectedBanned: account.banned,
      role: data.get("role"),
      banned: data.has("banned"),
    });
    if (ok && onSuccess) {
      onSuccess();
    }
  }
  return (
    <form
      className="resource-form"
      noValidate
      onSubmit={submit}
      aria-label={`Akses akun ${account.email}`}
    >
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

type ResetFormData = {
  expectedVersion: number | null;
  newPassword: string;
};

export function PasswordResetForm({
  account,
  expectedVersion,
  onSuccess,
}: {
  account: SchoolAccount;
  expectedVersion: number | null;
  onSuccess?: () => void;
}) {
  const mutation = useMutation(
    `/api/users/${encodeURIComponent(account.id)}/reset-password`,
    "POST",
  );

  const form = useZodForm<ResetFormData>(resetPasswordSchema, {
    defaultValues: {
      expectedVersion,
      newPassword: "",
    },
    serverErrors: mutation.errors,
    onSubmit: async (data: ResetFormData) => {
      const saved = await mutation.mutate(data);
      if (saved) {
        form.reset({ expectedVersion, newPassword: "" });
        if (onSuccess) {
          onSuccess();
        }
      }
    },
  });

  return (
    <form
      className="resource-form"
      {...form.formProps}
      aria-label={`Reset password ${account.email}`}
    >
      <FormErrorSummary errors={form.errorSummary} />
      <fieldset disabled={mutation.pending}>
        <legend>Reset password</legend>
        <Field
          label="Password sementara baru"
          type="password"
          required
          maxLength={128}
          autoComplete="new-password"
          {...form.register("newPassword")}
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
