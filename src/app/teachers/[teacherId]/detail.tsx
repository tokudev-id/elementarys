"use client";

import { useState } from "react";
import Link from "next/link";
import type { SchoolAccount, TeacherView } from "@/contracts/teachers";
import type { ClassView } from "@/contracts/school-master";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
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
  const [classesOpen, setClassesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  function handleOpenClasses() {
    setClassesOpen(true);
  }
  function handleCloseClasses() {
    setClassesOpen(false);
  }
  function handleOpenAccount() {
    setAccountOpen(true);
  }
  function handleCloseAccount() {
    setAccountOpen(false);
  }

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
          <div className="section-header-row">
            <div>
              <h2>Kelas utama</h2>
              <p>Kelas utama mengatur urutan daftar; guru aktif tetap dapat mencatat kelas lainnya.</p>
            </div>
            {admin && (
              <Button variant="secondary" onClick={handleOpenClasses}>
                Ubah kelas utama
              </Button>
            )}
          </div>
          {teacher.classes.length > 0 ? (
            <ul className="record-list">
              {teacher.classes.map((item) => (
                <li key={item.id}>
                  <Link href={`/classes/${item.id}`}>{item.name}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">Belum ada kelas utama yang ditugaskan.</p>
          )}
        </section>
        {admin && (
          <Dialog
            open={classesOpen}
            onClose={handleCloseClasses}
            title="Ubah kelas utama guru"
            variant="sheet"
          >
            <TeacherClassesForm
              teacher={teacher}
              classes={classes}
            />
          </Dialog>
        )}
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
              <h2>Akun guru</h2>
              <p>Guru belum terhubung ke akun sistem.</p>
              <div className="button-row">
                <Button variant="secondary" onClick={handleOpenAccount}>
                  Hubungkan akun guru
                </Button>
              </div>
              <Dialog
                open={accountOpen}
                onClose={handleCloseAccount}
                title="Hubungkan akun guru"
                variant="sheet"
              >
                <TeacherAccountForm
                  teacher={teacher}
                  accounts={accounts}
                  onSuccess={handleCloseAccount}
                />
              </Dialog>
            </section>
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}
