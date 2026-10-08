import { config } from "dotenv";
config({ path: process.env.RELEASE_ENV_FILE ?? ".local/release.env", quiet: true });
async function main() {
  const base = new URL(process.env.SMOKE_BASE_URL ?? "http://localhost:3101");
  if (
    base.username ||
    base.password ||
    (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname))
  )
    throw new Error("Origin smoke belum valid.");
  for (const path of ["/api/health", "/login"]) {
    const response = await fetch(new URL(path, base), {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if (response.status !== 200) throw new Error("Halaman smoke tidak tersedia.");
  }
  const protectedResponse = await fetch(new URL("/api/me", base), {
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  if (protectedResponse.status !== 401) throw new Error("Gerbang sesi smoke tidak sesuai.");
  if (process.env.SMOKE_AUTH_COOKIE) {
    const own = await fetch(new URL("/api/me", base), {
      headers: { Cookie: process.env.SMOKE_AUTH_COOKIE },
      signal: AbortSignal.timeout(20000),
    });
    if (own.status !== 200) throw new Error("Sesi smoke belum valid.");
  }
  console.log(
    "Smoke read-only lulus: health/login/guard sesi; tidak ada penulisan absensi atau data contoh.",
  );
}
main().catch(() => {
  console.error(
    "Smoke read-only gagal. Periksa target dan status melalui runbook; cookie dan respons data tidak dicetak.",
  );
  process.exitCode = 1;
});
