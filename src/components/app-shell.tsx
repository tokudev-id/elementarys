"use client";
import Link from "next/link";
import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardCheck,
  FileSpreadsheet,
  Users,
  GraduationCap,
  School,
  CalendarDays,
  CalendarRange,
  Settings,
  ListChecks,
  History,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { Logout } from "@/app/login/form";
import { availableNavigation, navigation, type NavigationItem } from "./navigation";
import { Button } from "./button";
import { Dialog } from "./dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export interface ShellContextValue {
  breadcrumbs?: { label: string; href?: string }[];
  setBreadcrumbs: (crumbs: { label: string; href?: string }[] | undefined) => void;
  hideBottomNav: boolean;
  setHideBottomNav: (hide: boolean) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  return useContext(ShellContext);
}

function NestedShellSync({
  breadcrumbs,
  hideBottomNav,
  children,
}: {
  breadcrumbs?: { label: string; href?: string }[];
  hideBottomNav?: boolean;
  children: ReactNode;
}) {
  const shell = useShell();

  useEffect(() => {
    if (breadcrumbs && shell) {
      shell.setBreadcrumbs(breadcrumbs);
    }
    return () => {
      if (breadcrumbs && shell) {
        shell.setBreadcrumbs(undefined);
      }
    };
  }, [breadcrumbs, shell]);

  useEffect(() => {
    if (hideBottomNav !== undefined && shell) {
      shell.setHideBottomNav(hideBottomNav);
    }
    return () => {
      if (hideBottomNav !== undefined && shell) {
        shell.setHideBottomNav(false);
      }
    };
  }, [hideBottomNav, shell]);

  return <>{children}</>;
}

const icons: Record<string, LucideIcon> = {
  home: Home,
  attendance: ClipboardCheck,
  reports: FileSpreadsheet,
  students: Users,
  teachers: GraduationCap,
  classes: School,
  calendar: CalendarDays,
  "academic-years": CalendarRange,
  settings: Settings,
  setup: ListChecks,
  audit: History,
};
const groups = [
  { label: "Operasional", ids: ["home", "attendance", "reports"] },
  { label: "Data master", ids: ["students", "teachers", "classes"] },
  { label: "Akademik", ids: ["academic-years", "calendar"] },
  { label: "Sistem", ids: ["settings", "setup", "audit"] },
];

function active(item: NavigationItem, path: string) {
  return item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/");
}
function MenuLink({
  item,
  path,
  onNavigate,
}: {
  item: NavigationItem;
  path: string;
  onNavigate?: () => void;
}) {
  const Icon = icons[item.id];
  return (
    <Link
      href={item.href}
      className="shell-menu-link"
      aria-current={active(item, path) ? "page" : undefined}
      onClick={onNavigate}
    >
      {Icon && <Icon aria-hidden="true" size={20} strokeWidth={1.75} />}
      <span>{item.label}</span>
    </Link>
  );
}
function GroupedMenu({
  role,
  path,
  onNavigate,
}: {
  role: "admin" | "teacher";
  path: string;
  onNavigate?: () => void;
}) {
  const items = availableNavigation(role).filter((item) => item.id !== "account");
  return (
    <nav aria-label="Navigasi sekolah" className="shell-menu">
      {groups.map((group) => {
        const links = items.filter((item) => group.ids.includes(item.id));
        if (!links.length) return null;
        return (
          <section key={group.label} className="shell-menu-group">
            <h2>{group.label}</h2>
            {links.map((item) => (
              <MenuLink key={item.id} item={item} path={path} onNavigate={onNavigate} />
            ))}
          </section>
        );
      })}
    </nav>
  );
}
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="page-container" tabIndex={-1}>
      {children}
    </main>
  );
}
export function AppShell({
  school,
  actor,
  currentPath,
  breadcrumbs,
  hideBottomNav = false,
  children,
}: {
  school: { name: string; date: string; timezone: string } | null;
  actor: { name: string; role: "admin" | "teacher" };
  currentPath?: string;
  breadcrumbs?: { label: string; href?: string }[];
  hideBottomNav?: boolean;
  children: ReactNode;
}) {
  const parentShell = useContext(ShellContext);
  const pathname = usePathname() || currentPath || "/";

  if (parentShell) {
    return (
      <NestedShellSync breadcrumbs={breadcrumbs} hideBottomNav={hideBottomNav}>
        {children}
      </NestedShellSync>
    );
  }

  // Bypass shell on print and auth routes
  if (pathname === "/reports/print" || pathname === "/login" || pathname === "/change-password") {
    return <>{children}</>;
  }

  return (
    <RootShell
      school={school}
      actor={actor}
      currentPath={pathname}
      initialBreadcrumbs={breadcrumbs}
      initialHideBottomNav={hideBottomNav}
    >
      {children}
    </RootShell>
  );
}

function RootShell({
  school,
  actor,
  currentPath,
  initialBreadcrumbs,
  initialHideBottomNav = false,
  children,
}: {
  school: { name: string; date: string; timezone: string } | null;
  actor: { name: string; role: "admin" | "teacher" };
  currentPath: string;
  initialBreadcrumbs?: { label: string; href?: string }[];
  initialHideBottomNav?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dynamicBreadcrumbs, setDynamicBreadcrumbs] = useState<
    { label: string; href?: string }[] | undefined
  >(initialBreadcrumbs);
  const [dynamicHideBottomNav, setDynamicHideBottomNav] = useState(initialHideBottomNav);

  const activeBreadcrumbs = dynamicBreadcrumbs ?? initialBreadcrumbs;
  const activeHideBottomNav = dynamicHideBottomNav;

  const name =
    school?.name.replace(/\s*\(data sintetis\)/gi, "").trim() ?? "Identitas sekolah belum diatur";
  const synthetic = /data sintetis|lingkungan uji|sekolah uji/i.test(school?.name ?? "");
  const page = navigation.find((item) => item.id !== "account" && active(item, currentPath));
  const initials = actor.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const bottomIds =
    actor.role === "admin"
      ? ["home", "attendance", "students"]
      : ["attendance", "reports", "students"];
  const parentCrumb =
    activeBreadcrumbs && activeBreadcrumbs.length > 1
      ? [...activeBreadcrumbs.slice(0, -1)].reverse().find((item) => Boolean(item.href))
      : undefined;

  function toggleCollapse() {
    setCollapsed((value) => !value);
  }
  function openMenu() {
    setMenuOpen(true);
  }
  function closeMenu() {
    setMenuOpen(false);
  }

  const contextValue: ShellContextValue = {
    breadcrumbs: activeBreadcrumbs,
    setBreadcrumbs: setDynamicBreadcrumbs,
    hideBottomNav: activeHideBottomNav,
    setHideBottomNav: setDynamicHideBottomNav,
  };

  return (
    <ShellContext.Provider value={contextValue}>
      <div
        className="school-shell"
        data-collapsed={collapsed}
        data-no-bottom-nav={activeHideBottomNav ? "true" : undefined}
      >
        <a className="skip-link" href="#main-content">
          Langsung ke isi halaman
        </a>
        <aside className="shell-sidebar">
          <div className="shell-school-name">
            <strong title={name}>{name}</strong>
          </div>
          <Button variant="ghost" className="shell-expand-rail" onClick={openMenu}>
            <PanelLeftOpen aria-hidden="true" />
            <span>Buka menu</span>
          </Button>
          <div className="shell-sidebar-nav">
            <GroupedMenu role={actor.role} path={currentPath} />
          </div>
          <Button
            variant="ghost"
            className="shell-collapse"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
            <span>{collapsed ? "Perluas" : "Ciutkan"}</span>
          </Button>
        </aside>
        <div className="shell-workspace">
          <header className="shell-topbar">
            <div className="shell-topbar__identity">
              {parentCrumb?.href && (
                <Link
                  href={parentCrumb.href}
                  className="shell-mobile-back"
                  aria-label={`Kembali ke ${parentCrumb.label.toLowerCase()}`}
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                  <span className="sr-only">Kembali ke {parentCrumb.label.toLowerCase()}</span>
                </Link>
              )}
              <div className="shell-mobile-school">
                <strong title={name}>{name}</strong>
                {school && (
                  <time className="shell-mobile-date" dateTime={school.date}>
                    {new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(school.date + "T12:00:00Z"))}
                  </time>
                )}
              </div>
              <nav className="shell-breadcrumb" aria-label="Breadcrumb">
                {activeBreadcrumbs ? (
                  <ol>
                    {activeBreadcrumbs.map((item, index) => (
                      <li key={`${item.label}:${index}`}>
                        {item.href ? (
                          <Link href={item.href}>{item.label}</Link>
                        ) : (
                          <span>{item.label}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span>{page?.label ?? "Sekolah"}</span>
                )}
              </nav>
              {synthetic && <span className="data-label">Data uji</span>}
            </div>
            <div className="shell-topbar__account">
              {school && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="shell-date" type="button">
                      <time dateTime={school.date}>
                        {new Intl.DateTimeFormat("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(school.date + "T12:00:00Z"))}
                      </time>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Zona waktu sekolah: {school.timezone}</TooltipContent>
                </Tooltip>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="user-menu-trigger" aria-label="Menu pengguna">
                    <span className="user-initials" aria-hidden="true">
                      {initials}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="user-menu-content">
                  <DropdownMenuLabel>
                    {actor.name} · {actor.role === "admin" ? "Admin" : "Guru"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/change-password">Ganti password</Link>
                  </DropdownMenuItem>
                  <Logout asMenuItem />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <PageContainer>{children}</PageContainer>
        </div>
        {!activeHideBottomNav && (
          <nav className="shell-bottom-nav" aria-label="Navigasi utama">
            {bottomIds.map((id) => {
              const item = navigation.find((value) => value.id === id);
              if (!item) return null;
              return <MenuLink key={id} item={item} path={currentPath} />;
            })}
            <button type="button" onClick={openMenu} aria-label="Lainnya">
              <MoreHorizontal aria-hidden="true" size={20} strokeWidth={1.75} />
              <span>Lainnya</span>
            </button>
          </nav>
        )}
        <Dialog open={menuOpen} title="Menu sekolah" onClose={closeMenu} variant="sheet">
          <GroupedMenu role={actor.role} path={currentPath} onNavigate={closeMenu} />
        </Dialog>
      </div>
    </ShellContext.Provider>
  );
}
