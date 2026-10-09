"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import type {
  CalendarView,
  AcademicYearView,
  CalendarAbsenceRecord,
} from "@/contracts/school-master";
import { monthDates } from "@/domain/report";
import { resolveSchoolDay } from "@/domain/calendar";
import { DataCard, DataCardHeader, DataCardContent, DataCardFooter } from "@/components/data-card";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { StatusBadge } from "@/components/status-badge";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const dayShortNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatMonthLabel(monthStr: string) {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getAdjacentMonth(monthStr: string, offset: number) {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function formatFullDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function statusLabel(status: "S" | "I" | "A") {
  switch (status) {
    case "S":
      return "Sakit";
    case "I":
      return "Izin";
    case "A":
      return "Alpa";
    default:
      return status;
  }
}

export function CalendarClient({
  calendar,
  isAdmin,
  years,
  selectedYearId,
  absences = [],
  todayDate,
}: {
  calendar: CalendarView;
  isAdmin: boolean;
  years: AcademicYearView[];
  selectedYearId: string;
  absences?: CalendarAbsenceRecord[];
  todayDate?: string;
}) {
  const router = useRouter();
  const mutation = useMutation(`/api/academic-years/${calendar.year.id}/calendar`, "PUT");

  // Selected date for Information panel
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (todayDate && todayDate.startsWith(calendar.month)) {
      return todayDate;
    }
    return calendar.days[0]?.date ?? "";
  });

  // Dialog states
  const [weekdaysOpen, setWeekdaysOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [deleteDate, setDeleteDate] = useState<string | null>(null);

  // Form states for override
  const [overrideDate, setOverrideDate] = useState(calendar.days[0]?.date ?? "");
  const [overrideIsSchoolDay, setOverrideIsSchoolDay] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Track version from mutation responses in ref (only accessed inside event handlers)
  const savedVersionRef = useRef<number | null>(null);

  const [currentWeekdays, setCurrentWeekdays] = useState(calendar.weekdays);
  const [currentOverrides, setCurrentOverrides] = useState(calendar.overrides);

  // Active month state for instant navigation without full-page server reloads
  const [activeMonth, setActiveMonth] = useState(calendar.month);
  const [absencesCache, setAbsencesCache] = useState<Record<string, CalendarAbsenceRecord[]>>(
    () => ({
      [calendar.month]: absences,
    }),
  );

  // Selected weekdays for editing
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(calendar.weekdays);

  // Pagination for overrides
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const currentTodayMonth = (todayDate ?? new Date().toISOString().slice(0, 10)).slice(0, 7);
  const prevMonth = getAdjacentMonth(activeMonth, -1);
  const nextMonth = getAdjacentMonth(activeMonth, 1);

  // Calculate days for active month (instant in client)
  const activeDays = useMemo(() => {
    if (activeMonth === calendar.month) {
      return calendar.days;
    }
    const dates = monthDates(activeMonth);
    return dates.map((date) => {
      const info = resolveSchoolDay(date, {
        startsOn: calendar.year.startsOn,
        endsOnExclusive: calendar.year.endsOnExclusive,
        weekdays: currentWeekdays,
        overrides: currentOverrides,
      });
      return {
        date,
        inYear: info.inYear,
        isSchoolDay: info.isSchoolDay,
        reason: info.reason,
      };
    });
  }, [
    activeMonth,
    calendar.month,
    calendar.days,
    calendar.year.startsOn,
    calendar.year.endsOnExclusive,
    currentWeekdays,
    currentOverrides,
  ]);

  const activeAbsences = useMemo(
    () => absencesCache[activeMonth] ?? (activeMonth === calendar.month ? absences : []),
    [absencesCache, activeMonth, calendar.month, absences],
  );

  // Group absences by date
  const absencesByDate = useMemo(() => {
    const map = new Map<string, CalendarAbsenceRecord[]>();
    for (const record of activeAbsences) {
      const list = map.get(record.date) ?? [];
      list.push(record);
      map.set(record.date, list);
    }
    return map;
  }, [activeAbsences]);

  const selectedDayInfo = activeDays.find((d) => d.date === selectedDate);
  const selectedOverride = currentOverrides.find((o) => o.date === selectedDate);
  const selectedDateAbsences = absencesByDate.get(selectedDate) ?? [];

  const schoolDaysCount = useMemo(
    () => activeDays.filter((d) => d.inYear && d.isSchoolDay).length,
    [activeDays],
  );
  const holidayDaysCount = useMemo(
    () => activeDays.filter((d) => d.inYear && !d.isSchoolDay).length,
    [activeDays],
  );
  const totalMonthAbsences = activeAbsences.length;

  const navigateToMonth = useCallback(
    (targetMonth: string) => {
      setActiveMonth(targetMonth);
      if (todayDate && todayDate.startsWith(targetMonth)) {
        setSelectedDate(todayDate);
      } else {
        setSelectedDate(`${targetMonth}-01`);
      }
      if (!absencesCache[targetMonth]) {
        fetch(`/api/calendar/absences?yearId=${calendar.year.id}&month=${targetMonth}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((data: CalendarAbsenceRecord[]) => {
            setAbsencesCache((prev) => ({ ...prev, [targetMonth]: data }));
          })
          .catch(() => {});
      }
      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `/calendar?yearId=${selectedYearId}&month=${targetMonth}`,
        );
      }
    },
    [calendar.year.id, selectedYearId, todayDate, absencesCache],
  );

  function handleYearChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const yearId = event.currentTarget.value;
    router.push(`/calendar?yearId=${yearId}`);
  }

  function openEditWeekdays() {
    setSelectedWeekdays(calendar.weekdays);
    setWeekdaysOpen(true);
  }

  function handleWeekdayToggle(weekday: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(weekday) ? prev.filter((d) => d !== weekday) : [...prev, weekday].sort(),
    );
  }

  function handleGoToToday() {
    navigateToMonth(currentTodayMonth);
  }

  function handleGoToPrevMonth() {
    navigateToMonth(prevMonth);
  }

  function handleGoToNextMonth() {
    navigateToMonth(nextMonth);
  }

  async function handleSaveWeekdays(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedWeekdays.length === 0) return;
    const expectedVersion = savedVersionRef.current ?? calendar.year.version;
    const ok = await mutation.mutate({
      expectedVersion,
      weekdays: selectedWeekdays,
      overrides: currentOverrides,
    });
    if (ok) {
      if (typeof (ok as { version?: number }).version === "number") {
        savedVersionRef.current = (ok as { version: number }).version;
      }
      setCurrentWeekdays(selectedWeekdays);
      setWeekdaysOpen(false);
    }
  }

  function openAddOverride(defaultDate?: string) {
    const target = defaultDate ?? activeDays[0]?.date ?? calendar.year.startsOn;
    const existing = currentOverrides.find((o) => o.date === target);
    setOverrideDate(target);
    setOverrideIsSchoolDay(existing ? existing.isSchoolDay : false);
    setOverrideReason(existing ? existing.reason : "");
    setOverrideError(null);
    setOverrideOpen(true);
  }

  async function handleSaveOverride(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overrideDate) {
      setOverrideError("Pilih tanggal pengecualian.");
      return;
    }
    if (!overrideReason.trim()) {
      setOverrideError("Isi alasan pengecualian.");
      return;
    }

    const nextOverrides = [
      ...currentOverrides.filter((o) => o.date !== overrideDate),
      {
        date: overrideDate,
        isSchoolDay: overrideIsSchoolDay,
        reason: overrideReason.trim(),
      },
    ].sort((a, b) => a.date.localeCompare(b.date));

    const expectedVersion = savedVersionRef.current ?? calendar.year.version;
    const ok = await mutation.mutate({
      expectedVersion,
      weekdays: currentWeekdays,
      overrides: nextOverrides,
    });
    if (ok) {
      if (typeof (ok as { version?: number }).version === "number") {
        savedVersionRef.current = (ok as { version: number }).version;
      }
      setCurrentOverrides(nextOverrides);
      setOverrideOpen(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteDate) return;
    const nextOverrides = currentOverrides.filter((o) => o.date !== deleteDate);
    const expectedVersion = savedVersionRef.current ?? calendar.year.version;
    const ok = await mutation.mutate({
      expectedVersion,
      weekdays: currentWeekdays,
      overrides: nextOverrides,
    });
    if (ok) {
      if (typeof (ok as { version?: number }).version === "number") {
        savedVersionRef.current = (ok as { version: number }).version;
      }
      setCurrentOverrides(nextOverrides);
      setDeleteDate(null);
    }
  }

  // Overrides in this calendar
  const totalPages = Math.max(1, Math.ceil(currentOverrides.length / pageSize));
  function handlePrevPage() {
    setPage((p) => Math.max(1, p - 1));
  }
  function handleNextPage() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  function handleDayClick(event: React.MouseEvent<HTMLButtonElement>) {
    const targetDate = event.currentTarget.getAttribute("data-date");
    if (targetDate) {
      setSelectedDate(targetDate);
    }
  }

  function handleOpenAddOverride() {
    openAddOverride();
  }

  function handleOpenOverrideForSelectedDate() {
    openAddOverride(selectedDate);
  }

  function handleDeleteClick(event: React.MouseEvent<HTMLButtonElement>) {
    const targetDate = event.currentTarget.getAttribute("data-date");
    if (targetDate) {
      setDeleteDate(targetDate);
    }
  }

  function handleCloseWeekdays() {
    setWeekdaysOpen(false);
  }

  function handleWeekdayChange(event: React.ChangeEvent<HTMLInputElement>) {
    const weekdayStr = event.currentTarget.getAttribute("data-weekday");
    if (weekdayStr !== null) {
      handleWeekdayToggle(Number(weekdayStr));
    }
  }

  function handleCloseOverride() {
    setOverrideOpen(false);
  }

  function handleOverrideDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    setOverrideDate(event.currentTarget.value);
  }

  function handleOverrideIsSchoolDayChange(event: React.ChangeEvent<HTMLInputElement>) {
    setOverrideIsSchoolDay(event.currentTarget.checked);
  }

  function handleOverrideReasonChange(event: React.ChangeEvent<HTMLInputElement>) {
    setOverrideReason(event.currentTarget.value);
  }

  function handleCloseDeleteConfirm() {
    setDeleteDate(null);
  }

  const paginatedOverrides = currentOverrides.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="calendar-page-layout">
      {/* Toolbar / Year Switcher */}
      <div className="calendar-toolbar-row">
        <div className="calendar-year-select">
          <SelectField label="Tahun ajaran" value={selectedYearId} onChange={handleYearChange}>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
                {y.isCurrent ? " (Aktif)" : ""}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <MutationFeedback mutation={mutation} />

      {/* Split Section: Kalender di Kiri, Informasi di Kanan */}
      <div className="calendar-split-layout">
        {/* Kolom Kiri: Grid Kalender */}
        <div className="calendar-split-main">
          <DataCard className="calendar-month-card">
            <DataCardHeader>
              <div className="calendar-header-row">
                <h2 className="calendar-month-title">{formatMonthLabel(activeMonth)}</h2>
                <div className="calendar-month-actions">
                  <button type="button" onClick={handleGoToToday} className="calendar-today-btn">
                    Hari ini
                  </button>
                  <div className="calendar-arrow-group">
                    <button
                      type="button"
                      onClick={handleGoToPrevMonth}
                      className="calendar-nav-btn"
                      aria-label="Bulan sebelumnya"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={handleGoToNextMonth}
                      className="calendar-nav-btn"
                      aria-label="Bulan berikutnya"
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </DataCardHeader>
            <DataCardContent className="calendar-card-content">
              <ol className="calendar-grid">
                {dayNames.map((day, idx) => (
                  <li
                    key={day}
                    className={`calendar-weekday ${idx === 0 ? "calendar-weekday--sunday" : ""}`}
                  >
                    <span className="weekday-full">{day}</span>
                    <span className="weekday-short">{dayShortNames[idx]}</span>
                  </li>
                ))}
                {Array.from(
                  {
                    length: new Date(
                      `${activeDays[0]?.date ?? `${activeMonth}-01`}T12:00:00Z`,
                    ).getUTCDay(),
                  },
                  (_, index) => (
                    <li key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />
                  ),
                )}
                {activeDays.map((day) => {
                  const dayNum = Number(day.date.slice(-2));
                  const override = currentOverrides.find((o) => o.date === day.date);
                  const isSelected = day.date === selectedDate;
                  const isToday = day.date === todayDate;
                  const dayAbsences = absencesByDate.get(day.date) ?? [];

                  const cellStatusText = !day.inYear
                    ? "Di luar tahun ajaran"
                    : day.isSchoolDay
                      ? "Hari belajar"
                      : "Hari libur";
                  const titleText = `${day.date} (${cellStatusText})${
                    override ? ` - ${override.reason}` : ""
                  }${dayAbsences.length > 0 ? ` · ${dayAbsences.length} siswa tidak hadir` : ""}`;

                  return (
                    <li
                      key={day.date}
                      className={`calendar-day-cell ${
                        !day.inYear
                          ? "is-out-of-year"
                          : day.isSchoolDay
                            ? "is-school-day"
                            : "is-holiday"
                      }${override ? " has-override" : ""}${isSelected ? " is-selected" : ""}${
                        isToday ? " is-today" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="calendar-day-btn"
                        data-date={day.date}
                        onClick={handleDayClick}
                        title={titleText}
                        aria-label={`${day.date}, ${cellStatusText}${
                          override ? `, ${override.reason}` : ""
                        }${dayAbsences.length > 0 ? `, ${dayAbsences.length} siswa tidak hadir` : ""}`}
                      >
                        <time dateTime={day.date} className="calendar-day-num">
                          {dayNum}
                        </time>
                        <div className="calendar-day-chips-area">
                          {dayAbsences.length > 0 && (
                            <span
                              className="calendar-absence-chip"
                              title={`${dayAbsences.length} siswa tidak hadir`}
                            >
                              {dayAbsences.length} siswa
                            </span>
                          )}
                          {override && dayAbsences.length === 0 && (
                            <span
                              className={`calendar-override-chip calendar-override-chip--${
                                override.isSchoolDay ? "school" : "holiday"
                              }`}
                              title={override.reason}
                            >
                              {override.reason}
                            </span>
                          )}
                        </div>
                        <span className="sr-only">{cellStatusText}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Legend di bawah kalender sesuai referensi */}
              <div className="calendar-legend" aria-label="Keterangan warna kalender">
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot calendar-legend-dot--holiday" />
                  <span>Hari libur</span>
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot calendar-legend-dot--absence" />
                  <span>Siswa tidak hadir</span>
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot calendar-legend-dot--today" />
                  <span>Hari ini</span>
                </span>
                <span className="calendar-legend-item">
                  <span className="calendar-legend-dot calendar-legend-dot--selected" />
                  <span>Terpilih</span>
                </span>
              </div>
            </DataCardContent>
          </DataCard>
        </div>

        {/* Kolom Kanan: Card Informasi sesuai referensi */}
        <div className="calendar-split-side">
          <DataCard className="calendar-info-card">
            <DataCardHeader>
              <div className="data-card__title-group">
                <h2 className="data-card__title">Informasi</h2>
                {selectedDate && (
                  <p className="calendar-info-date-sub">{formatFullDate(selectedDate)}</p>
                )}
              </div>
            </DataCardHeader>
            <DataCardContent className="calendar-info-content">
              {/* Status Banner Hari */}
              {selectedDayInfo && (
                <div
                  className={`calendar-info-status-banner ${
                    selectedDayInfo.isSchoolDay ? "is-school" : "is-holiday"
                  }`}
                >
                  <div className="calendar-info-status-title">
                    {selectedDayInfo.isSchoolDay ? "Hari Belajar" : "Hari Libur"}
                  </div>
                  {selectedOverride && (
                    <div className="calendar-info-status-reason">{selectedOverride.reason}</div>
                  )}
                </div>
              )}

              {/* Tabel Siswa Tidak Hadir */}
              <div className="calendar-info-section">
                <div className="calendar-info-section-header">
                  <h3 className="calendar-info-subtitle">
                    Siswa Tidak Hadir
                    {selectedDateAbsences.length > 0 && (
                      <span className="calendar-info-count-badge">
                        {selectedDateAbsences.length}
                      </span>
                    )}
                  </h3>
                </div>

                {selectedDateAbsences.length === 0 ? (
                  <p className="calendar-info-empty">
                    {selectedDayInfo?.isSchoolDay
                      ? "Semua siswa hadir (nihil catatan izin/sakit/alpa)."
                      : "Hari libur sekolah."}
                  </p>
                ) : (
                  <div className="calendar-info-table-wrapper">
                    <table className="calendar-info-table">
                      <thead>
                        <tr>
                          <th scope="col" className="col-idx">
                            #
                          </th>
                          <th scope="col" className="col-name">
                            Nama
                          </th>
                          <th scope="col" className="col-class">
                            Kelas
                          </th>
                          <th scope="col" className="col-status">
                            Keterangan
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDateAbsences.map((rec: CalendarAbsenceRecord, index: number) => (
                          <tr key={`${rec.studentName}-${rec.className}-${index}`}>
                            <td className="col-idx">{index + 1}</td>
                            <td className="col-name" title={rec.studentName}>
                              <strong>{rec.studentName}</strong>
                            </td>
                            <td className="col-class">{rec.className}</td>
                            <td className="col-status">
                              <StatusBadge
                                tone={
                                  rec.status === "S"
                                    ? "warning"
                                    : rec.status === "I"
                                      ? "neutral"
                                      : "danger"
                                }
                              >
                                {statusLabel(rec.status)}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Admin Action untuk Tanggal Terpilih */}
              {isAdmin && (
                <div className="calendar-info-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleOpenOverrideForSelectedDate}
                  >
                    Atur pengecualian tanggal ini
                  </Button>
                </div>
              )}

              {/* Ringkasan Bulan Ini */}
              <div className="calendar-month-summary">
                <h4 className="calendar-summary-title">Ringkasan Bulan Ini</h4>
                <div className="calendar-summary-grid">
                  <div className="calendar-summary-item">
                    <span className="calendar-summary-value">{schoolDaysCount}</span>
                    <span className="calendar-summary-label">Hari Belajar</span>
                  </div>
                  <div className="calendar-summary-item">
                    <span className="calendar-summary-value">{holidayDaysCount}</span>
                    <span className="calendar-summary-label">Hari Libur</span>
                  </div>
                  <div className="calendar-summary-item">
                    <span className="calendar-summary-value">{totalMonthAbsences}</span>
                    <span className="calendar-summary-label">Tidak Hadir</span>
                  </div>
                </div>
              </div>
            </DataCardContent>
          </DataCard>
        </div>
      </div>

      {/* Card 2: Hari Belajar Rutin */}
      <DataCard className="calendar-weekdays-card">
        <DataCardHeader
          title="Hari belajar rutin"
          actions={
            isAdmin ? (
              <Button variant="secondary" onClick={openEditWeekdays}>
                Ubah
              </Button>
            ) : undefined
          }
        />
        <DataCardContent className="calendar-weekdays-content">
          <div className="weekday-chips">
            {calendar.weekdays.length > 0 ? (
              calendar.weekdays.map((d) => (
                <span key={d} className="weekday-chip">
                  <span className="weekday-chip-dot" aria-hidden="true" />
                  {dayNames[d]}
                </span>
              ))
            ) : (
              <p className="empty-text">
                Hari belajar rutin belum diatur. Admin perlu melengkapinya.
              </p>
            )}
          </div>
          {calendar.weekdays.length > 0 && (
            <p className="calendar-weekdays-help">
              {calendar.weekdays.length} hari belajar per minggu (
              {calendar.weekdays.map((d) => dayNames[d]).join(", ")}). Hari lainnya otomatis
              diperlakukan sebagai libur mingguan.
            </p>
          )}
        </DataCardContent>
      </DataCard>

      {/* Card 3: Pengecualian Kalender */}
      <DataCard className="calendar-overrides-card">
        <DataCardHeader
          title="Pengecualian kalender"
          count={currentOverrides.length}
          actions={
            isAdmin ? (
              <Button variant="secondary" onClick={handleOpenAddOverride}>
                <Plus size={16} aria-hidden="true" />
                Tambah pengecualian
              </Button>
            ) : undefined
          }
        />
        <DataCardContent>
          {currentOverrides.length === 0 ? (
            <p className="empty-text empty-text--padded">
              Belum ada tanggal pengecualian untuk tahun ajaran ini.
            </p>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Status</th>
                    <th scope="col">Alasan</th>
                    {isAdmin && (
                      <th scope="col" className="cell-actions-header">
                        <span className="sr-only">Aksi</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedOverrides.map((item) => (
                    <tr key={item.date}>
                      <td>
                        <strong>{item.date}</strong>
                      </td>
                      <td>
                        <StatusBadge tone={item.isSchoolDay ? "success" : "neutral"}>
                          {item.isSchoolDay ? "Hari belajar" : "Libur"}
                        </StatusBadge>
                      </td>
                      <td>{item.reason}</td>
                      {isAdmin && (
                        <td className="cell-actions">
                          <Button
                            type="button"
                            variant="ghost"
                            data-date={item.date}
                            onClick={handleDeleteClick}
                            aria-label={`Hapus pengecualian ${item.date}`}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataCardContent>
        {currentOverrides.length > pageSize && (
          <DataCardFooter>
            <div className="data-pagination calendar-overrides-pagination">
              <span className="text-sm text-muted-foreground">
                Menampilkan {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, currentOverrides.length)} dari {currentOverrides.length}
              </span>
              <div className="calendar-pagination-buttons">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={handlePrevPage}
                >
                  Sebelumnya
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page * pageSize >= currentOverrides.length}
                  onClick={handleNextPage}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </DataCardFooter>
        )}
      </DataCard>

      {/* Dialog Ubah Hari Belajar Rutin */}
      <Dialog
        open={weekdaysOpen}
        onClose={handleCloseWeekdays}
        title="Ubah hari belajar rutin"
        variant="sheet"
      >
        <form className="resource-form redesigned-form" noValidate onSubmit={handleSaveWeekdays}>
          <fieldset disabled={mutation.pending}>
            <p>Pilih hari di mana kegiatan belajar rutin sekolah berlangsung:</p>
            <div className="checkbox-group calendar-weekdays-grid">
              {dayNames.map((name, weekday) => (
                <label className="checkbox-field" key={weekday}>
                  <input
                    type="checkbox"
                    name="weekday"
                    value={weekday}
                    data-weekday={weekday}
                    checked={selectedWeekdays.includes(weekday)}
                    onChange={handleWeekdayChange}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
            <div className="button-row">
              <Button type="button" variant="secondary" onClick={handleCloseWeekdays}>
                Batal
              </Button>
              <Button type="submit" pending={mutation.pending}>
                Simpan hari rutin
              </Button>
            </div>
          </fieldset>
        </form>
      </Dialog>

      {/* Dialog Tambah/Ubah Pengecualian */}
      <Dialog
        open={overrideOpen}
        onClose={handleCloseOverride}
        title="Atur pengecualian tanggal"
        variant="sheet"
      >
        <form className="resource-form redesigned-form" noValidate onSubmit={handleSaveOverride}>
          <fieldset disabled={mutation.pending}>
            <Field
              label="Tanggal pengecualian"
              name="date"
              type="date"
              required
              value={overrideDate}
              onChange={handleOverrideDateChange}
              min={calendar.year.startsOn}
              max={calendar.year.endsOnExclusive}
            />
            <label className="checkbox-field calendar-override-school-day">
              <input
                type="checkbox"
                name="isSchoolDay"
                checked={overrideIsSchoolDay}
                onChange={handleOverrideIsSchoolDayChange}
              />
              <span>Jadikan hari belajar tambahan</span>
            </label>
            <Field
              label="Alasan pengecualian"
              name="reason"
              required
              maxLength={300}
              value={overrideReason}
              onChange={handleOverrideReasonChange}
              error={overrideError ?? undefined}
              hint="Contoh: Libur Hari Raya, Cuti Bersama, dll."
            />
            <div className="button-row">
              <Button type="button" variant="secondary" onClick={handleCloseOverride}>
                Batal
              </Button>
              <Button type="submit" pending={mutation.pending}>
                Simpan pengecualian
              </Button>
            </div>
          </fieldset>
        </form>
      </Dialog>

      {/* Confirm Dialog Hapus Pengecualian */}
      <ConfirmDialog
        open={deleteDate !== null}
        onClose={handleCloseDeleteConfirm}
        title={`Hapus pengecualian ${deleteDate}?`}
        onConfirm={handleConfirmDelete}
        pending={mutation.pending}
        destructive
        label={`Hapus pengecualian ${deleteDate}`}
      >
        <p>Tanggal ini akan kembali mengikuti pola hari belajar rutin sekolah.</p>
      </ConfirmDialog>
    </div>
  );
}
