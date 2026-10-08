"use client";
import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { StudentDetail } from "@/contracts/students";
import type { AcademicYearView, ClassView } from "@/contracts/school-master";
import type { AttendanceTotals } from "@/domain/attendance";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlacementForm, EndEnrollmentForm, StudentArchiveForm } from "../lifecycle-forms";

function formatted(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function lastDay(exclusive: string) {
  const date = new Date(`${exclusive}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return formatted(date.toISOString().slice(0, 10));
}

export function StudentDetailView({
  student,
  classes,
  years,
  today,
  admin,
  requestedAction,
  attendance,
}: {
  student: StudentDetail;
  classes: ClassView[];
  years: AcademicYearView[];
  today: string;
  admin: boolean;
  requestedAction?: string;
  attendance?: { totals: AttendanceTotals; href: string; month: string };
}) {
  const [dialog, setDialog] = useState({
    version: student.version,
    action: requestedAction ?? null,
  });
  if (dialog.version !== student.version) setDialog({ version: student.version, action: null });
  const current = student.enrollments.find(
    (item) => !item.cancelled && item.startsOn <= today && item.endsOnExclusive > today,
  );
  const openEnrollments = student.enrollments.filter(
    (item) => !item.cancelled && item.endsOnExclusive > today,
  );
  function openPlacement() {
    setDialog({ version: student.version, action: "placement" });
  }
  function openEnd() {
    setDialog({ version: student.version, action: "end" });
  }
  function openArchive() {
    setDialog({ version: student.version, action: "archive" });
  }
  function close() {
    setDialog({ version: student.version, action: null });
  }
  return (
    <>
      <PageHeader
        title={student.fullName}
        meta={
          <StatusBadge tone={student.archivedAt ? "neutral" : "success"}>
            {student.archivedAt ? "Diarsipkan" : "Aktif"}
          </StatusBadge>
        }
        description={`${student.studentCode} · ${current?.className ?? "Belum ditempatkan"}`}
        actions={
          admin ? (
            <>
              <Link href={`/students/${student.id}/edit`} className="button-link">
                Ubah
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" aria-label="Aksi siswa">
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!student.archivedAt && (
                    <DropdownMenuItem onSelect={openPlacement}>Pindah kelas</DropdownMenuItem>
                  )}
                  {openEnrollments.length > 0 && (
                    <DropdownMenuItem onSelect={openEnd}>Tutup penempatan</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={openArchive}>
                    {student.archivedAt ? "Aktifkan kembali siswa" : "Arsipkan siswa"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : undefined
        }
      />
      <Tabs defaultValue="summary" className="record-tabs">
        <TabsList>
          <TabsTrigger value="summary">Ringkasan</TabsTrigger>
          <TabsTrigger value="history">Riwayat penempatan</TabsTrigger>
          {attendance && <TabsTrigger value="attendance">Kehadiran</TabsTrigger>}
        </TabsList>
        <TabsContent value="summary">
          <section className="form-section">
            <h2>Identitas siswa</h2>
            <dl className="record-summary">
              <div>
                <dt>Nama lengkap</dt>
                <dd>{student.fullName}</dd>
              </div>
              <div>
                <dt>Kode</dt>
                <dd>{student.studentCode}</dd>
              </div>
              <div>
                <dt>NIS</dt>
                <dd>{student.nis ?? "Belum diisi"}</dd>
              </div>
              <div>
                <dt>NISN</dt>
                <dd>{student.nisn ?? "Belum diisi"}</dd>
              </div>
              <div>
                <dt>Kelas aktif</dt>
                <dd>{current?.className ?? "Belum ditempatkan"}</dd>
              </div>
              <div>
                <dt>Tahun ajaran</dt>
                <dd>{current?.yearLabel ?? "Belum ditempatkan"}</dd>
              </div>
            </dl>
          </section>
          {student.archivedAt && <p>Siswa diarsipkan. Riwayat tetap tersedia.</p>}
        </TabsContent>
        <TabsContent value="history">
          <section className="form-section">
            <h2>Riwayat penempatan</h2>
            <ol className="placement-timeline">
              {student.enrollments.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.className} · {item.yearLabel}
                  </strong>
                  <p>
                    {item.cancelled
                      ? `Rencana mulai ${formatted(item.startsOn)}`
                      : `${formatted(item.startsOn)} – ${lastDay(item.endsOnExclusive)}`}
                  </p>
                  <StatusBadge
                    tone={
                      item.cancelled
                        ? "neutral"
                        : item.startsOn > today
                          ? "info"
                          : item.endsOnExclusive <= today
                            ? "neutral"
                            : "success"
                    }
                  >
                    {item.cancelled
                      ? "Dibatalkan sebelum mulai"
                      : item.startsOn > today
                        ? "Mendatang"
                        : item.endsOnExclusive <= today
                          ? "Selesai"
                          : "Berjalan"}
                  </StatusBadge>
                </li>
              ))}
            </ol>
            {!student.enrollments.length && <p>Belum ada penempatan.</p>}
          </section>
        </TabsContent>
        {attendance && (
          <TabsContent value="attendance">
            <section className="form-section">
              <h2>Kehadiran {attendance.month}</h2>
              <div className="attendance-totals">
                {(["H", "S", "I", "A"] as const).map((status) => (
                  <p key={status} className={`status-text--${status}`}>
                    <strong>{attendance.totals[status]}</strong> {status}
                  </p>
                ))}
              </div>
              <Link href={attendance.href}>Buka rekap bulan ini</Link>
            </section>
          </TabsContent>
        )}
      </Tabs>
      {admin && (
        <>
          <Dialog
            open={dialog.action === "placement"}
            onClose={close}
            title="Pindah kelas / penempatan"
          >
            <PlacementForm student={student} classes={classes} years={years} today={today} />
          </Dialog>
          <Dialog open={dialog.action === "end"} onClose={close} title="Tutup penempatan">
            {openEnrollments.map((item) => (
              <section key={item.id}>
                <h3>{item.className}</h3>
                <EndEnrollmentForm student={student} enrollment={item} today={today} />
              </section>
            ))}
          </Dialog>
          <Dialog
            open={dialog.action === "archive"}
            onClose={close}
            title={student.archivedAt ? "Aktifkan kembali siswa?" : "Arsipkan siswa?"}
          >
            <StudentArchiveForm student={student} />
          </Dialog>
        </>
      )}
    </>
  );
}
