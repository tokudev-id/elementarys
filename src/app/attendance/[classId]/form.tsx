"use client";
import { useState,useEffect,useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/field";
import { StatusChoices } from "@/components/status-choices";
import { StateBanner, type BannerState } from "@/components/state-banner";
import { attendanceTotals,type AttendanceStatus } from "@/domain/attendance";
import type { getAttendance } from "@/server/queries/attendance";

type AttendanceView=Awaited<ReturnType<typeof getAttendance>>;
const labels:Record<AttendanceStatus,string>={H:"Hadir",S:"Sakit",I:"Izin",A:"Alpa"};
const choices=(data:AttendanceView)=>Object.fromEntries(data.students.map(s=>[s.enrollmentId,s.status])) as Record<string,AttendanceStatus|null>;
function dateLabel(date:string){return new Intl.DateTimeFormat("id-ID",{dateStyle:"full",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));}

export function AttendanceForm({initial}:{initial:AttendanceView}){
  const router=useRouter(); const [view,setView]=useState(initial); const [draft,setDraft]=useState(()=>choices(initial));
  const [date,setDate]=useState(initial.date); const [pending,setPending]=useState(false); const [loading,setLoading]=useState(false);
  const [confirm,setConfirm]=useState(false); const [notice,setNotice]=useState<{state:BannerState;message:string}|null>(null);
  const feedbackRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(notice||view.sessionState==="submitted"){
      feedbackRef.current?.focus({preventScroll:true});
      feedbackRef.current?.scrollIntoView({block:"center"});
    }
  },[notice,view.sessionState]);
  const canRecord=view.sessionState==="not_recorded"&&view.isCurrentYear&&view.inAcademicYear&&view.isSchoolDay&&view.setupReady&&view.date<=view.schoolToday&&view.students.length>0;
  const entries=view.students.map(s=>({enrollmentId:s.enrollmentId,status:draft[s.enrollmentId]??"H" as AttendanceStatus}));
  const totals=attendanceTotals(entries);
  async function load(nextDate:string,conflict=false){
    setLoading(true);
    try {
      const response=await fetch(`/api/classes/${view.classId}/attendance?date=${encodeURIComponent(nextDate)}`,{cache:"no-store"});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error?.message??"Belum dapat memuat catatan terbaru.");
      setView(body);setDraft(choices(body));setDate(nextDate);
      window.history.replaceState(null,"",`/attendance/${body.classId}?date=${encodeURIComponent(body.date)}`);
      setNotice(conflict?{state:"conflict",message:"Catatan terbaru sudah dimuat. Periksa status dan nama pencatat."}:null);
    } catch(error){setDate(view.date);setNotice({state:conflict?"conflict":"error",message:error instanceof Error?error.message:"Belum dapat memuat daftar siswa. Coba kembali."});}
    finally {setLoading(false);}
  }
  async function save(){
    setPending(true);
    try {
      const response=await fetch(`/api/classes/${view.classId}/attendance/${view.date}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedVersion:view.sessionVersion,entries,reason:null})});
      const body=await response.json();setConfirm(false);
      if(response.status===409){await load(view.date,true);return;}
      if(!response.ok){setNotice({state:response.status===401?"session-expired":"error",message:response.status===401?"Pilihan belum tersimpan. Masuk kembali, lalu buka kelas dan isi ulang.":body.error?.message??"Belum tersimpan. Coba kembali; pilihan tetap di halaman ini."});return;}
      setView({...view,...body,students:view.students.map(s=>({...s,status:entries.find(e=>e.enrollmentId===s.enrollmentId)!.status}))});
      setDraft(Object.fromEntries(entries.map(e=>[e.enrollmentId,e.status])));setNotice(null);router.refresh();
    } catch {setConfirm(false);setNotice({state:"error",message:"Belum mendapat konfirmasi penyimpanan. Periksa internet lalu coba kembali; pilihan tetap di halaman ini."});}
    finally {setPending(false);}
  }
  return <div className="attendance-form">
    <header className="attendance-toolbar"><div><h1>{view.className}</h1><p>{view.students.length} siswa · {dateLabel(view.date)}</p></div>
      <Field label="Tanggal absensi" type="date" value={date} max={view.schoolToday} disabled={pending||loading} onChange={event=>{
        const next=event.target.value;if(!next)return;
        const dirty=view.students.some(s=>draft[s.enrollmentId]!==s.status);
        if(dirty&&!window.confirm("Pilihan belum tersimpan. Ganti tanggal dan mulai isian baru?"))return;
        setDate(next);void load(next);
      }}/>
    </header>
    <Link href="/attendance" prefetch={false}>Kembali ke hari ini</Link>
    {notice&&<div ref={feedbackRef} tabIndex={-1}><StateBanner state={notice.state} action={notice.state==="session-expired"?<Link href="/login">Masuk kembali</Link>:notice.state==="conflict"?<Button variant="secondary" disabled={loading} onClick={()=>load(view.date,true)}>Muat data terbaru</Button>:undefined}>{notice.message}</StateBanner></div>}
    {loading?<StateBanner state="loading">Sedang mengambil catatan untuk tanggal yang dipilih.</StateBanner>:<>
      {view.sessionState==="submitted"&&<div ref={notice?undefined:feedbackRef} tabIndex={-1}><StateBanner state="saved"><p>{view.totals!.H} Hadir · {view.totals!.S} Sakit · {view.totals!.I} Izin · {view.totals!.A} Alpa</p><p>Dicatat oleh {view.submittedBy!.name} pada {new Intl.DateTimeFormat("id-ID",{dateStyle:"short",timeStyle:"short",timeZone:view.timezone}).format(new Date(view.submittedAt!))}.</p></StateBanner></div>}
      {!view.students.length&&<StateBanner state="empty">Kelas kosong pada tanggal ini. Hubungi admin untuk memeriksa daftar siswa.</StateBanner>}
      {!view.isSchoolDay&&<StateBanner state="empty">Bukan hari belajar. {view.calendarReason??"Absensi tidak diperlukan."}</StateBanner>}
      {!view.inAcademicYear&&<StateBanner state="error">Tanggal di luar tahun ajaran kelas.</StateBanner>}
      {view.date>view.schoolToday&&<StateBanner state="empty">Tanggal ini belum tiba. Pilih hari ini atau hari belajar yang sudah lewat.</StateBanner>}
      {!view.setupReady&&<StateBanner state="error">Kalender sekolah belum siap. Hubungi admin untuk melengkapinya.</StateBanner>}
      {!view.isCurrentYear&&<p>Tahun ajaran lama ditampilkan sebagai arsip.</p>}
      {view.sessionState==="voided"&&<StateBanner state="empty">Catatan pada tanggal ini dibatalkan. Hubungi admin.</StateBanner>}
      {canRecord&&<p>Periksa kehadiran siswa. Tandai yang tidak hadir, lalu simpan kehadiran kelas.</p>}
      <div>{view.students.map(student=><section key={student.enrollmentId} className="student-attendance-row" data-testid="student-row">
        <h2>{student.fullName}</h2><small>{student.studentCode}</small>
        {canRecord?<><p>{draft[student.enrollmentId]?labels[draft[student.enrollmentId]!]:"Belum dicatat"}</p><StatusChoices name={student.enrollmentId} legend={`Kehadiran ${student.fullName} (${student.studentCode})`} value={draft[student.enrollmentId]??undefined} disabled={pending} onChange={value=>{setDraft(current=>({...current,[student.enrollmentId]:value}));setNotice(null);}}/></>:<p>{student.status?labels[student.status]:"Belum dicatat"}</p>}
      </section>)}</div>
    </>}
    {canRecord&&<div className="attendance-actions"><Button pending={pending} disabled={loading} onClick={()=>setConfirm(true)}>{pending?"Sedang menyimpan…":"Simpan, siswa lainnya hadir"}</Button></div>}
    <Dialog open={confirm} closeDisabled={pending} onClose={()=>{if(!pending)setConfirm(false);}} title={`Konfirmasi absensi ${view.className}`} variant="sheet" actions={<><Button variant="secondary" disabled={pending} onClick={()=>setConfirm(false)}>Batal</Button><Button pending={pending} onClick={save}>{pending?"Sedang menyimpan…":"Konfirmasi simpan"}</Button></>}>
      <p>{dateLabel(view.date)}</p><div className="attendance-totals">{Object.entries(totals).map(([status,count])=><p key={status}><strong>{count}</strong> {labels[status as AttendanceStatus]}</p>)}</div>
      <p>Anda memastikan siswa yang belum ditandai hadir. Setelah dikonfirmasi, seluruh kelas disimpan bersama.</p>
    </Dialog>
  </div>;
}
