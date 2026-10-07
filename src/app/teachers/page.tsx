import { requirePageActor } from "@/server/auth/page-actor";
import { listTeachers, unlinkedAccounts } from "@/server/services/teachers";
import { listAcademicYears, listClasses } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import {
  TeacherProfileForm,
  TeacherClassesForm,
  TeacherAccountForm,
  AccountAccessForm,
  PasswordResetForm,
} from "./forms";
export default async function Teachers() {
  const actor = await requirePageActor();
  const teachers = await listTeachers(actor);
  const settings = await getSchoolSettings();
  const accounts = actor.role === "admin" ? await unlinkedAccounts(actor) : [];
  const years = await listAcademicYears();
  const allClasses = await listClasses();
  const classes = allClasses.filter(
    (item) =>
      !item.archivedAt &&
      years.some((year) => year.id === item.yearId && year.isCurrent && !year.archivedAt),
  );
  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/teachers">
      <h1>Guru dan akun</h1>
      {actor.role === "admin" && (
        <section>
          <h2>Tambah profil guru</h2>
          <TeacherProfileForm />
        </section>
      )}
      {!teachers.length && <StateBanner state="empty">Belum ada profil guru.</StateBanner>}
      {teachers.map((teacher) => (
        <section
          className="resource-section"
          key={teacher.id}
          data-testid={`teacher-${teacher.id}`}
        >
          <h2>{teacher.fullName}</h2>
          <p>
            Profil {teacher.active ? "aktif" : "nonaktif"} ·{" "}
            {teacher.hasAccount ? "Akun tertaut" : "Belum ada akun"}
          </p>
          <p>
            Kelas utama: {teacher.classes.map((item) => item.name).join(", ") || "Belum dipilih"}
          </p>
          {actor.role === "admin" && (
            <>
              <TeacherProfileForm teacher={teacher} />
              <TeacherClassesForm teacher={teacher} classes={classes} />
              {teacher.account ? (
                <>
                  <p>
                    Akun {teacher.account.email} ·{" "}
                    {teacher.account.banned ? "Akses nonaktif" : "Akses aktif"}
                    {teacher.account.mustChangePassword ? " · Wajib ganti password" : ""}
                  </p>
                  <AccountAccessForm account={teacher.account} expectedVersion={teacher.version} />
                  <PasswordResetForm account={teacher.account} expectedVersion={teacher.version} />
                </>
              ) : (
                <TeacherAccountForm teacher={teacher} accounts={accounts} />
              )}
            </>
          )}
        </section>
      ))}
      {actor.role === "admin" && accounts.length > 0 && (
        <section>
          <h2>Akun tanpa profil guru</h2>
          {accounts.map((account) => (
            <section className="resource-section" key={account.id}>
              <h3>{account.name}</h3>
              <p>
                {account.email} · {account.role === "admin" ? "Admin" : "Belum tertaut profil guru"}
              </p>
              <AccountAccessForm account={account} expectedVersion={null} />
              <PasswordResetForm account={account} expectedVersion={null} />
            </section>
          ))}
        </section>
      )}
    </AppShell>
  );
}
