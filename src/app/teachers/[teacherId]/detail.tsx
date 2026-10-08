"use client";
import Link from "next/link";
import type { SchoolAccount, TeacherView } from "@/contracts/teachers";
import type { ClassView } from "@/contracts/school-master";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { TeacherClassesForm, TeacherAccountForm } from "../forms";
import { AccountPanel } from "../account-panel";

export function TeacherDetailView({
  teacher,
  admin,
  classes,
  accounts,
}: {
  teacher: TeacherView;
  admin: boolean;
  classes: ClassView[];
  accounts: SchoolAccount[];
}) {
  return (
    <Tabs defaultValue="profile" className="record-tabs">
      <TabsList>
        <TabsTrigger value="profile">Profil</TabsTrigger>
        <TabsTrigger value="classes">Kelas utama</TabsTrigger>
        {admin && <TabsTrigger value="account">Akun & akses</TabsTrigger>}
      </TabsList>
      <TabsContent value="profile">
        <section className="form-section">
          <h2>Profil guru</h2>
          <dl className="record-summary">
            <div>
              <dt>Nama lengkap</dt>
              <dd>{teacher.fullName}</dd>
            </div>
            <div>
              <dt>Status profil</dt>
              <dd>
                <StatusBadge tone={teacher.active ? "success" : "neutral"}>
                  {teacher.active ? "Aktif" : "Nonaktif"}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt>Akun</dt>
              <dd>{teacher.hasAccount ? "Terhubung" : "Belum punya akun"}</dd>
            </div>
          </dl>
        </section>
      </TabsContent>
      <TabsContent value="classes">
        <section className="form-section">
          <h2>Kelas utama</h2>
          <p>Kelas utama mengatur urutan daftar; guru aktif tetap dapat mencatat kelas lainnya.</p>
          {admin ? (
            <TeacherClassesForm teacher={teacher} classes={classes} />
          ) : (
            <ul>
              {teacher.classes.map((item) => (
                <li key={item.id}>
                  <Link href={`/classes/${item.id}`}>{item.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </TabsContent>
      {admin && (
        <TabsContent value="account">
          {teacher.account ? (
            <AccountPanel
              key={`${teacher.version}:${teacher.account.banned}:${teacher.account.mustChangePassword}`}
              account={teacher.account}
              expectedVersion={teacher.version}
            />
          ) : (
            <section className="form-section">
              <h2>Hubungkan akun</h2>
              <TeacherAccountForm teacher={teacher} accounts={accounts} />
            </section>
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}
