import { readFile, writeFile } from "node:fs/promises";

const css = await readFile("src/styles/tokens.css", "utf8");
const colors = new Map(
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]]),
);
function luminance(hex: string) {
  const values = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
const pairs: [string, string, number][] = [
  ["--foreground", "--surface", 4.5],
  ["--muted-foreground", "--background", 4.5],
  ["--muted-foreground", "--surface-muted", 4.5],
  ["--primary", "--primary-soft", 4.5],
  ["--primary-foreground", "--primary", 4.5],
  ["--primary-foreground", "--primary-hover", 4.5],
  ["--primary-foreground", "--destructive", 4.5],
  ["--status-pending", "--status-pending-soft", 4.5],
  ["--status-holiday", "--status-holiday-soft", 4.5],
  ["--control-border", "--surface", 3],
  ["--ring", "--surface", 3],
];
for (const status of ["h", "s", "i", "a"]) {
  pairs.push([`--status-${status}`, `--status-${status}-soft`, 4.5]);
  pairs.push(["--primary-foreground", `--status-${status}-selected`, 4.5]);
}
const rows = pairs.map(([foreground, background, minimum]) => {
  const fg = colors.get(foreground),
    bg = colors.get(background);
  if (!fg || !bg) throw new Error("Token warna tidak ditemukan.");
  const light = luminance(fg),
    dark = luminance(bg);
  const ratio = (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
  return { foreground, background, ratio, minimum, pass: ratio >= minimum };
});
await writeFile(
  "docs/redesign/CONTRAST.md",
  [
    "# Kontras token redesign",
    "",
    "Rasio dihitung dari token CSS dengan rumus luminansi relatif WCAG. Brand sky hanya aksen dekoratif; teks dan kontrol memakai turunan primary/ring. Border card adalah pemisah dekoratif, sedangkan kontrol memakai control-border yang memenuhi 3:1.",
    "",
    "| Teks/komponen | Latar | Rasio | Minimum | Hasil |",
    "|---|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.foreground} | ${row.background} | ${row.ratio.toFixed(2)}:1 | ${row.minimum}:1 | ${row.pass ? "PASS" : "FAIL"} |`,
    ),
    "",
    "Token terpilih Hadir/Sakit memakai turunan gelap agar teks putih memenuhi 4.5:1; nilai terang dari brief tidak memenuhi syarat tersebut. Teks Libur juga disesuaikan untuk kontras latar soft. Tidak ada mode gelap.",
    "",
  ].join("\n"),
);
for (const row of rows)
  console.log(
    `${row.foreground}/${row.background}: ${row.ratio.toFixed(2)} ${row.pass ? "PASS" : "FAIL"}`,
  );
if (rows.some((row) => !row.pass)) process.exitCode = 1;
