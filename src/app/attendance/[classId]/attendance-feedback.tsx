import { StateBanner } from "@/components/state-banner";
import type { AttendanceView } from "@/contracts/attendance-view";

export function AttendanceSummary({ view }: { view: AttendanceView }) {
  if (!view.totals || !view.submittedBy || !view.submittedAt) return null;
  const submittedAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: view.timezone,
  }).format(new Date(view.submittedAt));

  return (
    <>
      <p>
        {view.totals.H} Hadir · {view.totals.S} Sakit · {view.totals.I} Izin · {view.totals.A} Alpa
      </p>
      <p>
        Dicatat oleh {view.submittedBy.name} pada {submittedAt}.
      </p>
    </>
  );
}

export function AttendanceAvailability({ view }: { view: AttendanceView }) {
  return (
    <>
      {!view.students.length && (
        <StateBanner state="empty">
          Kelas kosong pada tanggal ini. Hubungi admin untuk memeriksa daftar siswa.
        </StateBanner>
      )}
      {!view.isSchoolDay && (
        <StateBanner state="empty">
          Bukan hari belajar. {view.calendarReason ?? "Absensi tidak diperlukan."}
        </StateBanner>
      )}
      {!view.inAcademicYear && (
        <StateBanner state="error">Tanggal di luar tahun ajaran kelas.</StateBanner>
      )}
      {view.date > view.schoolToday && (
        <StateBanner state="empty">
          Tanggal ini belum tiba. Pilih hari ini atau hari belajar yang sudah lewat.
        </StateBanner>
      )}
      {!view.setupReady && (
        <StateBanner state="error">
          Kalender sekolah belum siap. Hubungi admin untuk melengkapinya.
        </StateBanner>
      )}
      {!view.isCurrentYear && <p>Tahun ajaran lama ditampilkan sebagai arsip.</p>}
      {view.sessionState === "voided" && (
        <StateBanner state="empty">Catatan pada tanggal ini dibatalkan. Hubungi admin.</StateBanner>
      )}
    </>
  );
}
