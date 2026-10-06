import { config } from "dotenv";
import { Pool } from "pg";
import { createAuth } from "../src/server/auth/factory";
import { createManagedAccount } from "../src/server/auth/accounts";
import { assertLocalTestDatabase } from "../src/server/db/safety";
config({path:".env.local",quiet:true});
const {DATABASE_URL,BETTER_AUTH_SECRET,BETTER_AUTH_URL,BOOTSTRAP_EMAIL,BOOTSTRAP_NAME,BOOTSTRAP_PASSWORD}=process.env;
if (!DATABASE_URL || !BETTER_AUTH_SECRET || !BETTER_AUTH_URL || !BOOTSTRAP_EMAIL || !BOOTSTRAP_NAME || !BOOTSTRAP_PASSWORD || BOOTSTRAP_PASSWORD.length<12) throw new Error("Isi konfigurasi dan credential bootstrap melalui environment aman (password minimal 12 karakter).");
if (process.env.APP_ENV!=="test") throw new Error("Bootstrap produksi dijalankan operator melalui runbook rilis, belum diaktifkan pada tahap ini.");
assertLocalTestDatabase(DATABASE_URL);
const source=new Pool({connectionString:DATABASE_URL,max:1});
try {
  const existing=await source.query('SELECT id FROM "user" WHERE role=\'admin\' AND coalesce(banned,false)=false');
  if (existing.rowCount) throw new Error("Admin aktif sudah ada; gunakan pengelolaan akun aplikasi.");
  if(process.env.BOOTSTRAP_TEACHER_ID){
    const teacher=await source.query("SELECT id FROM teachers WHERE id=$1 AND user_id IS NULL AND active=true",[process.env.BOOTSTRAP_TEACHER_ID]);
    if(!teacher.rowCount) throw new Error("Profil guru tidak aktif, tidak tersedia atau sudah memiliki akun.");
  }
  const created=await createManagedAccount(createAuth(source,BETTER_AUTH_SECRET,BETTER_AUTH_URL),{email:BOOTSTRAP_EMAIL,name:BOOTSTRAP_NAME,password:BOOTSTRAP_PASSWORD,role:"admin"});
  if (process.env.BOOTSTRAP_TEACHER_ID) await source.query("UPDATE teachers SET user_id=$1 WHERE id=$2 AND user_id IS NULL",[created.user.id,process.env.BOOTSTRAP_TEACHER_ID]);
  console.log("Admin awal dibuat; password wajib diganti saat masuk.");
} finally { await source.end(); }
