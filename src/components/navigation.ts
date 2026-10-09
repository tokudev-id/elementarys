export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  roles: readonly ("admin" | "teacher")[];
  ready: boolean;
};
export const navigation: readonly NavigationItem[] = [
  { id: "home", label: "Beranda", href: "/", roles: ["admin"], ready: true },
  {
    id: "attendance",
    label: "Absensi",
    href: "/attendance",
    roles: ["admin", "teacher"],
    ready: true,
  },
  { id: "reports", label: "Rekap", href: "/reports", roles: ["admin", "teacher"], ready: true },
  { id: "students", label: "Siswa", href: "/students", roles: ["admin", "teacher"], ready: true },
  { id: "teachers", label: "Guru", href: "/teachers", roles: ["admin", "teacher"], ready: true },
  { id: "classes", label: "Kelas", href: "/classes", roles: ["admin", "teacher"], ready: true },
  {
    id: "calendar",
    label: "Kalender",
    href: "/calendar",
    roles: ["admin", "teacher"],
    ready: true,
  },
  {
    id: "academic-years",
    label: "Tahun ajaran",
    href: "/academic-years",
    roles: ["admin", "teacher"],
    ready: true,
  },
  { id: "settings", label: "Sekolah", href: "/settings", roles: ["admin"], ready: true },
  { id: "audit", label: "Audit", href: "/audit", roles: ["admin"], ready: true },
  { id: "setup", label: "Persiapan sekolah", href: "/setup", roles: ["admin"], ready: true },
  {
    id: "account",
    label: "Ganti password",
    href: "/change-password",
    roles: ["admin", "teacher"],
    ready: true,
  },
];
export function availableNavigation(role: "admin" | "teacher") {
  return navigation.filter((item) => item.ready && item.roles.includes(role));
}
