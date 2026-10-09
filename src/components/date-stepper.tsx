"use client";
import { useState, type ChangeEvent, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarView } from "@/contracts/school-master";
import { resolveSchoolDay } from "@/domain/calendar";
import { monthDates } from "@/domain/report";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field } from "./field";

export function offsetDate(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export function DateStepper({
  date,
  max,
  disabled,
  onChange,
  onSelect,
  calendar,
}: {
  date: string;
  max: string;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelect: (date: string) => void;
  calendar?: CalendarView;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(date.slice(0, 7));
  function previous() {
    onSelect(offsetDate(date, -1));
  }
  function next() {
    onSelect(offsetDate(date, 1));
  }
  function openCalendar() {
    setMonth(date.slice(0, 7));
    setOpen(true);
  }
  function closeCalendar() {
    setOpen(false);
  }
  function previousMonth() {
    setMonth(offsetDate(`${month}-01`, -1).slice(0, 7));
  }
  function nextMonth() {
    const value = new Date(`${month}-01T12:00:00Z`);
    value.setUTCMonth(value.getUTCMonth() + 1);
    setMonth(value.toISOString().slice(0, 7));
  }
  function chooseDate(event: MouseEvent<HTMLButtonElement>) {
    const selected = event.currentTarget.dataset.date;
    if (selected) {
      onSelect(selected);
      closeCalendar();
    }
  }
  const dates = monthDates(month);
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

  return (
    <>
      <div className="date-stepper unified-date-stepper">
        <Button
          variant="ghost"
          onClick={previous}
          disabled={disabled}
          aria-label="Tanggal sebelumnya"
          className="date-stepper-btn"
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </Button>
        <button
          type="button"
          onClick={openCalendar}
          disabled={disabled}
          className="date-stepper-label-btn"
          aria-label="Buka kalender tanggal"
        >
          {formattedDate}
        </button>
        <Button
          variant="ghost"
          onClick={next}
          disabled={disabled || date >= max}
          aria-label="Tanggal berikutnya"
          className="date-stepper-btn"
        >
          <ChevronRight aria-hidden="true" size={18} />
        </Button>
        <Field
          label="Tanggal absensi"
          type="date"
          value={date}
          max={max}
          disabled={disabled}
          onChange={onChange}
          className="date-stepper-hidden-input"
        />
      </div>
      {calendar && (
        <Dialog open={open} onClose={closeCalendar} title="Pilih tanggal absensi" variant="sheet">
          <div className="month-stepper">
            <Button variant="ghost" onClick={previousMonth} aria-label="Bulan sebelumnya">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <strong>
              {new Intl.DateTimeFormat("id-ID", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${month}-01T12:00:00Z`))}
            </strong>
            <Button
              variant="ghost"
              onClick={nextMonth}
              disabled={month >= max.slice(0, 7)}
              aria-label="Bulan berikutnya"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className="date-picker-grid">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <small key={day}>{day}</small>
            ))}
            {Array.from({ length: new Date(`${month}-01T12:00:00Z`).getUTCDay() }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {dates.map((value) => {
              const day = resolveSchoolDay(value, {
                startsOn: calendar.year.startsOn,
                endsOnExclusive: calendar.year.endsOnExclusive,
                weekdays: calendar.weekdays,
                overrides: calendar.overrides,
              });
              return (
                <button
                  type="button"
                  key={value}
                  data-date={value}
                  onClick={chooseDate}
                  disabled={value > max || !day.inYear}
                  className={
                    day.isSchoolDay ? "date-picker-day" : "date-picker-day date-picker-day--holiday"
                  }
                  aria-label={`${value}${!day.inYear ? " Di luar tahun ajaran" : day.isSchoolDay ? "" : " Libur"}`}
                  title={day.reason ?? undefined}
                >
                  <strong>{Number(value.slice(-2))}</strong>
                  {day.inYear && !day.isSchoolDay && <small>Libur</small>}
                </button>
              );
            })}
          </div>
        </Dialog>
      )}
    </>
  );
}
