"use client";
import type { FormEvent } from "react";
import type { CalendarView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export function CalendarEditor({ calendar }: { calendar: CalendarView }) {
  const mutation = useMutation(`/api/academic-years/${calendar.year.id}/calendar`, "PUT");
  async function saveWeekdays(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.mutate({
      expectedVersion: calendar.year.version,
      weekdays: data.getAll("weekday").map(Number),
      overrides: calendar.overrides,
    });
  }
  async function addOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const date = String(data.get("date"));
    const overrides = [
      ...calendar.overrides.filter((item) => item.date !== date),
      { date, isSchoolDay: data.has("isSchoolDay"), reason: String(data.get("reason")) },
    ];
    if (
      await mutation.mutate({
        expectedVersion: calendar.year.version,
        weekdays: calendar.weekdays,
        overrides,
      })
    )
      form.reset();
  }
  return (
    <section>
      <h2>Atur kalender</h2>
      <form className="resource-form" onSubmit={saveWeekdays}>
        <fieldset disabled={mutation.pending} key={calendar.year.version}>
          <legend>Hari belajar rutin</legend>
          {dayNames.map((name, weekday) => (
            <label className="checkbox-field" key={weekday}>
              <input
                type="checkbox"
                name="weekday"
                value={weekday}
                defaultChecked={calendar.weekdays.includes(weekday)}
              />
              {name}
            </label>
          ))}
          <Button type="submit" pending={mutation.pending}>
            Simpan hari rutin
          </Button>
        </fieldset>
      </form>
      <form className="resource-form" onSubmit={addOverride}>
        <fieldset disabled={mutation.pending}>
          <legend>Tanggal libur atau hari tambahan</legend>
          <Field
            label="Tanggal pengecualian"
            name="date"
            type="date"
            required
            min={calendar.year.startsOn}
            max={calendar.year.endsOnExclusive}
          />
          <label className="checkbox-field">
            <input type="checkbox" name="isSchoolDay" />
            Jadikan hari belajar tambahan
          </label>
          <Field label="Alasan pengecualian" name="reason" required maxLength={300} />
          <Button type="submit" pending={mutation.pending}>
            Simpan pengecualian
          </Button>
        </fieldset>
      </form>
      <MutationFeedback mutation={mutation} />
      <h3>Pengecualian tersimpan</h3>
      {calendar.overrides.map((item) => (
        <OverrideRow key={item.date} calendar={calendar} date={item.date} />
      ))}
    </section>
  );
}
function OverrideRow({ calendar, date }: { calendar: CalendarView; date: string }) {
  const item = calendar.overrides.find((value) => value.date === date)!;
  const mutation = useMutation(`/api/academic-years/${calendar.year.id}/calendar`, "PUT");
  async function remove() {
    await mutation.mutate({
      expectedVersion: calendar.year.version,
      weekdays: calendar.weekdays,
      overrides: calendar.overrides.filter((value) => value.date !== date),
    });
  }
  return (
    <div className="resource-section">
      <p>
        {date} · {item.isSchoolDay ? "Hari belajar" : "Libur"} · {item.reason}
      </p>
      <Button type="button" variant="secondary" pending={mutation.pending} onClick={remove}>
        Hapus pengecualian {date}
      </Button>
      <MutationFeedback mutation={mutation} />
    </div>
  );
}
