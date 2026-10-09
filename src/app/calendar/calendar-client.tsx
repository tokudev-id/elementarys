"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { CalendarView, AcademicYearView } from "@/contracts/school-master";
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

export function CalendarClient({
  calendar,
  isAdmin,
  years,
  selectedYearId,
}: {
  calendar: CalendarView;
  isAdmin: boolean;
  years: AcademicYearView[];
  selectedYearId: string;
}) {
  const router = useRouter();
  const mutation = useMutation(`/api/academic-years/${calendar.year.id}/calendar`, "PUT");

  // Dialog states
  const [weekdaysOpen, setWeekdaysOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [deleteDate, setDeleteDate] = useState<string | null>(null);

  // Form states for override
  const [overrideDate, setOverrideDate] = useState(calendar.days[0]?.date ?? "");
  const [overrideIsSchoolDay, setOverrideIsSchoolDay] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Selected weekdays for editing
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(calendar.weekdays);

  // Pagination for overrides
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const prevMonth = getAdjacentMonth(calendar.month, -1);
  const nextMonth = getAdjacentMonth(calendar.month, 1);

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

  async function handleSaveWeekdays(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedWeekdays.length === 0) return;
    const ok = await mutation.mutate({
      expectedVersion: calendar.year.version,
      weekdays: selectedWeekdays,
      overrides: calendar.overrides,
    });
    if (ok) {
      setWeekdaysOpen(false);
    }
  }

  function openAddOverride(defaultDate?: string) {
    const target = defaultDate ?? calendar.days[0]?.date ?? calendar.year.startsOn;
    const existing = calendar.overrides.find((o) => o.date === target);
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
      ...calendar.overrides.filter((o) => o.date !== overrideDate),
      {
        date: overrideDate,
        isSchoolDay: overrideIsSchoolDay,
        reason: overrideReason.trim(),
      },
    ].sort((a, b) => a.date.localeCompare(b.date));

    const ok = await mutation.mutate({
      expectedVersion: calendar.year.version,
      weekdays: calendar.weekdays,
      overrides: nextOverrides,
    });
    if (ok) {
      setOverrideOpen(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteDate) return;
    const nextOverrides = calendar.overrides.filter((o) => o.date !== deleteDate);
    const ok = await mutation.mutate({
      expectedVersion: calendar.year.version,
      weekdays: calendar.weekdays,
      overrides: nextOverrides,
    });
    if (ok) {
      setDeleteDate(null);
    }
  }

  // Overrides in this calendar
  const currentOverrides = calendar.overrides;
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
      openAddOverride(targetDate);
    }
  }

  function handleOpenAddOverride() {
    openAddOverride();
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

      {/* Card 1: Grid Bulan */}
      <DataCard className="calendar-month-card">
        <DataCardHeader>
          <div className="calendar-header-row">
            <div className="calendar-month-stepper">
              <Link
                href={`/calendar?yearId=${selectedYearId}&month=${prevMonth}`}
                className="calendar-stepper-btn"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </Link>
              <h2 className="calendar-stepper-label">{formatMonthLabel(calendar.month)}</h2>
              <Link
                href={`/calendar?yearId=${selectedYearId}&month=${nextMonth}`}
                className="calendar-stepper-btn"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="calendar-legend" aria-label="Keterangan warna kalender">
              <span className="calendar-legend-item">
                <span className="calendar-legend-swatch calendar-legend-swatch--school" />
                <span>Hari belajar</span>
              </span>
              <span className="calendar-legend-item">
                <span className="calendar-legend-swatch calendar-legend-swatch--holiday" />
                <span>Hari libur</span>
              </span>
              <span className="calendar-legend-item">
                <span className="calendar-legend-swatch calendar-legend-swatch--override" />
                <span>Pengecualian</span>
              </span>
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
                length: new Date(`${calendar.days[0]?.date ?? "2026-01-01"}T12:00:00Z`).getUTCDay(),
              },
              (_, index) => (
                <li key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />
              ),
            )}
            {calendar.days.map((day) => {
              const dayNum = Number(day.date.slice(-2));
              const override = calendar.overrides.find((o) => o.date === day.date);
              const cellStatusText = !day.inYear
                ? "Di luar tahun ajaran"
                : day.isSchoolDay
                  ? "Hari belajar"
                  : "Hari libur";
              const titleText = `${day.date} (${cellStatusText})${
                override ? ` - ${override.reason}` : ""
              }${isAdmin ? " · Klik untuk atur pengecualian" : ""}`;

              return (
                <li
                  key={day.date}
                  className={`calendar-day-cell ${
                    !day.inYear
                      ? "is-out-of-year"
                      : day.isSchoolDay
                        ? "is-school-day"
                        : "is-holiday"
                  }${override ? " has-override" : ""}`}
                >
                  {isAdmin ? (
                    <button
                      type="button"
                      className="calendar-day-btn"
                      data-date={day.date}
                      onClick={handleDayClick}
                      title={titleText}
                      aria-label={`${day.date}, ${cellStatusText}${override ? `, ${override.reason}` : ""}`}
                    >
                      <time dateTime={day.date} className="calendar-day-num">
                        {dayNum}
                      </time>
                      {override && (
                        <>
                          <span
                            className={`calendar-day-dot calendar-day-dot--${
                              override.isSchoolDay ? "school" : "holiday"
                            }`}
                            aria-hidden="true"
                          />
                          <span
                            className={`calendar-day-chip calendar-day-chip--${
                              override.isSchoolDay ? "school" : "holiday"
                            }`}
                            title={override.reason}
                          >
                            {override.reason}
                          </span>
                        </>
                      )}
                      <span className="sr-only">{cellStatusText}</span>
                    </button>
                  ) : (
                    <div
                      className="calendar-day-content"
                      title={titleText}
                      aria-label={`${day.date}, ${cellStatusText}${override ? `, ${override.reason}` : ""}`}
                    >
                      <time dateTime={day.date} className="calendar-day-num">
                        {dayNum}
                      </time>
                      {override && (
                        <>
                          <span
                            className={`calendar-day-dot calendar-day-dot--${
                              override.isSchoolDay ? "school" : "holiday"
                            }`}
                            aria-hidden="true"
                          />
                          <span
                            className={`calendar-day-chip calendar-day-chip--${
                              override.isSchoolDay ? "school" : "holiday"
                            }`}
                            title={override.reason}
                          >
                            {override.reason}
                          </span>
                        </>
                      )}
                      <span className="sr-only">{cellStatusText}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </DataCardContent>
      </DataCard>

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
        <DataCardContent>
          <div className="weekday-chips">
            {calendar.weekdays.length > 0 ? (
              calendar.weekdays.map((d) => (
                <span key={d} className="weekday-chip">
                  {dayNames[d]}
                </span>
              ))
            ) : (
              <p className="empty-text">
                Hari belajar rutin belum diatur. Admin perlu melengkapinya.
              </p>
            )}
          </div>
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
