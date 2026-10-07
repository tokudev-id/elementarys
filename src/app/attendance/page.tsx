import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { requirePageActor } from "@/server/auth/page-actor";
import { DomainError } from "@/domain/errors";
import { getDashboard } from "@/server/queries/dashboard";

export default async function Today() {
  const actor = await requirePageActor();
  let data;
  try {
    data = await getDashboard(actor);
  } catch (error) {
    return (
      <AppShell school={null} actor={actor} currentPath="/attendance">
        <h1>Hari ini</h1>
        <StateBanner
          state={
            error instanceof DomainError && error.code === "SETUP_INCOMPLETE" ? "empty" : "error"
          }
        >
          {error instanceof DomainError
            ? error.message
            : "Belum dapat memuat kelas. Coba muat ulang halaman."}
        </StateBanner>
      </AppShell>
    );
  }
  return (
    <AppShell
      school={{ name: data.schoolName, date: data.schoolToday, timezone: data.timezone }}
      actor={actor}
      currentPath="/attendance"
    >
      <h1>Hari ini</h1>
      <p>Pilih kelas untuk mencatat kehadiran. Kelas utama Anda tampil lebih dahulu.</p>
      {!data.setupReady && (
        <StateBanner state="error">
          Kalender sekolah belum siap. Hubungi admin untuk melengkapinya.
        </StateBanner>
      )}
      {data.setupReady && !data.isSchoolDay && (
        <StateBanner state="empty">
          Hari ini bukan hari belajar. {data.calendarReason ?? "Absensi tidak diperlukan."}
        </StateBanner>
      )}
      {!data.classes.length && (
        <StateBanner state="empty">
          Belum ada kelas. Hubungi admin untuk melengkapi data sekolah.
        </StateBanner>
      )}
      <div className="class-list">
        {data.classes.map((item) => (
          <section key={item.classId} className="class-row" data-testid="class-row">
            <div>
              <h2>{item.name}</h2>
              <p>
                {item.studentCount} siswa{item.isPrimary ? " · Kelas utama" : ""}
              </p>
              <strong>
                {!data.setupReady
                  ? "Kalender belum siap"
                  : item.state === "holiday"
                    ? "Hari libur"
                    : item.state === "empty"
                      ? "Kelas kosong"
                      : item.state === "submitted"
                        ? "Sudah dicatat"
                        : "Belum dicatat"}
              </strong>
              <p>
                {item.presentCount === null
                  ? "Jumlah hadir belum tersedia"
                  : `${item.presentCount} Hadir · ${item.totals!.S} Sakit · ${item.totals!.I} Izin · ${item.totals!.A} Alpa`}
              </p>
            </div>
            <Link
              className="button-link"
              prefetch={false}
              href={`/attendance/${item.classId}?date=${data.date}`}
            >
              {item.state === "submitted" ? "Lihat catatan" : "Buka kelas"}
            </Link>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
