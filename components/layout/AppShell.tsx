"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Route } from "next";

interface NavItem {
  href: Route;
  label: string;
  key: string;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/snapshot", label: "Snapshot", key: "snapshot" },
  { href: "/timeline", label: "Timeline", key: "timeline" },
  { href: "/conditions", label: "Conditions", key: "conditions" },
  { href: "/specialists", label: "Specialists", key: "specialists" },
  { href: "/labs", label: "Labs", key: "labs" },
  { href: "/imaging", label: "Imaging", key: "imaging" },
  { href: "/records", label: "All Records", key: "records" },
  { href: "/verification", label: "Verification", key: "verification" }
];

function NavIcon({ name }: { name: string }): React.JSX.Element {
  const common = "h-4 w-4 stroke-[1.75]";

  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M4 12 12 4l8 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 10v10h12V10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "conditions":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M4 12h4l2-5 4 10 2-5h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "specialists":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <circle cx="9" cy="9" r="3" stroke="currentColor" />
          <path d="M3.5 19c1-2.7 3.3-4 5.5-4s4.5 1.3 5.5 4" stroke="currentColor" strokeLinecap="round" />
          <path d="M17 8h4m-2-2v4" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "symptoms":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M3 12h3l2-4 3 8 2-4h8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "labs":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M10 3v5l-5 8a3 3 0 0 0 2.6 5h8.8A3 3 0 0 0 19 16l-5-8V3" stroke="currentColor" />
          <path d="M8 14h8" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "imaging":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" />
          <path d="m7 15 3-3 2 2 3-3 2 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "assistant":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="m12 3 1.7 3.3L17 8l-3.3 1.7L12 13l-1.7-3.3L7 8l3.3-1.7L12 3Z" stroke="currentColor" />
          <circle cx="18.5" cy="15.5" r="2.5" stroke="currentColor" />
          <path d="M5 18h6" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "snapshot":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" />
          <path d="M8 7h8M8 11h8M8 15h4" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "timeline":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M12 4v16" stroke="currentColor" strokeLinecap="round" />
          <circle cx="12" cy="7" r="2" stroke="currentColor" />
          <circle cx="12" cy="12" r="2" stroke="currentColor" />
          <circle cx="12" cy="17" r="2" stroke="currentColor" />
          <path d="M14 7h4M14 12h6M14 17h3" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "records":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <path d="M4 4h16v16H4z" stroke="currentColor" />
          <path d="M4 9h16M9 4v16" stroke="currentColor" />
        </svg>
      );
    case "verification":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" />
          <path d="m8 12 2.5 3L16 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "share":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <circle cx="6" cy="12" r="3" stroke="currentColor" />
          <circle cx="18" cy="6" r="3" stroke="currentColor" />
          <circle cx="18" cy="18" r="3" stroke="currentColor" />
          <path d="M9 10.5 15 7.5M9 13.5l6 3" stroke="currentColor" />
        </svg>
      );
    case "appointments":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" />
          <path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <circle cx="12" cy="12" r="3" stroke="currentColor" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common}>
          <circle cx="12" cy="12" r="4" stroke="currentColor" />
        </svg>
      );
  }
}

function SideLink({ item, active }: { item: NavItem; active: boolean }): React.JSX.Element {
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        active ? "bg-[#15335A] text-white" : "text-[#E7EEF8] hover:bg-[#13304F]"
      )}
    >
      <NavIcon name={item.key} />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#696969] p-4 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1280px] grid-cols-1 overflow-hidden rounded-[2px] bg-[#F6F7F9] shadow-2xl lg:grid-cols-[240px_1fr]">
        <header className="col-span-full flex items-center justify-between border-b border-[#B8C0CC] bg-[#F6F7F9] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#8A98AA] bg-white text-xl">
              ❤️
            </span>
            <div>
              <p className="text-[13px] text-[#4D5B6A]">Medical Records</p>
              <p className="text-[32px] font-semibold tracking-tight text-[#111827]">Jennifer Beth Cartrette</p>
            </div>
          </div>
          <p className="hidden text-xs uppercase tracking-[0.24em] text-[#64748B] xl:block">Beth Health OS v2</p>
        </header>

        <aside className="border-r border-[#0A2340] bg-[#041D3D] p-4 overflow-y-auto">
          <nav aria-label="Main navigation" className="space-y-1">
            {PRIMARY_NAV.map((item) => (
              <SideLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
            ))}
          </nav>
        </aside>

        <main className="bg-[#F3F5F8] px-6 py-6">
          <div className="mb-5 border-b border-[#CCD3DD] pb-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-3xl text-sm text-[#526071]">{subtitle}</p> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
