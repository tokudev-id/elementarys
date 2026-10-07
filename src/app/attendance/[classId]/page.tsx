import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { requireActor } from "@/server/auth/guards";
import { DomainError } from "@/domain/errors";
import { getAttendance } from "@/server/queries/attendance";
import { pool } from "@/server/db/pool";
import { isTimezone,schoolToday } from "@/domain/calendar";
import { AttendanceForm } from "./form";

export default async function ClassAttendance({params,searchParams}:{params:Promise<{classId:string}>;searchParams:Promise<{date?:string}>}){
  let actor;
  try {actor=await requireActor(await headers());}
  catch(error){redirect(error instanceof DomainError&&error.code==="PASSWORD_CHANGE_REQUIRED"?"/change-password":"/login");}
  const {classId}=await params; const {date}=await searchParams;
  let config:{name:string;timezone:string}|undefined;
  let data;
  try {
    config=(await pool.query<{name:string;timezone:string}>("SELECT name,timezone FROM school_config WHERE id=1")).rows[0];
    if(!config||!isTimezone(config.timezone)) throw new DomainError("SETUP_INCOMPLETE","Identitas sekolah belum siap. Hubungi admin.",422);
    data=await getAttendance(classId,date??schoolToday(config.timezone));
  } catch(error){return <AppShell school={null} actor={actor}><h1>Absensi kelas</h1><StateBanner state="error">{error instanceof DomainError?error.message:"Belum dapat memuat daftar siswa. Muat ulang untuk mencoba kembali."}</StateBanner><Link href="/attendance">Kembali ke hari ini</Link></AppShell>;}
  return <AppShell school={{name:config.name,date:data.schoolToday,timezone:data.timezone}} actor={actor} currentPath="/attendance"><AttendanceForm key={`${data.classId}:${data.date}:${data.timezone}`} initial={data}/></AppShell>;
}
