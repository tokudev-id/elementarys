"use client";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import type { CalendarView } from "@/contracts/school-master";
import { DateStepper } from "@/components/date-stepper";

export function AttendanceDatePicker({
  date,
  max,
  calendar,
}: {
  date: string;
  max: string;
  calendar?: CalendarView;
}) {
  const router = useRouter();
  function select(value: string) {
    router.push(`/attendance?date=${encodeURIComponent(value)}`);
  }
  function change(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.value) select(event.currentTarget.value);
  }
  return (
    <DateStepper date={date} max={max} calendar={calendar} onChange={change} onSelect={select} />
  );
}
