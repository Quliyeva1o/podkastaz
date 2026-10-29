"use client";

import {
  Article,
  Briefcase,
  CalendarCheck,
  Microphone,
  CaretDown,
  CaretRight,
  CornersOut,
  CurrencyCircleDollar,
  Envelope,
  GearSix,
  House,
  Image as ImageIcon,
  ImagesSquare,
  List,
  ListBullets,
  Package,
  SignOut,
  UserCircle,
  Users,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem = { label: string; href: string; icon?: string; badge?: number; children?: never };
export type MenuGroup = { label: string; icon: string; badge?: number; children: { label: string; href: string }[]; href?: never };
export type MenuEntry = MenuItem | MenuGroup;

const icons: Record<string, Icon> = {
  dashboard: House,
  bookings: CalendarCheck,
  requests: Package,
  studios: Microphone,
  partners: Briefcase,
  team: Users,
  services: Wrench,
  pricing: CurrencyCircleDollar,
  pages: ListBullets,
  submissions: Envelope,
  portfolio: ImagesSquare,
  blog: Article,
  media: ImageIcon,
  settings: GearSix,
};

const matches = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));

/** The single menu href that best matches the path (longest prefix), so "Səhifələr" and "Komanda" never light up together. */
function activeHref(menu: MenuEntry[], path: string) {
  const all = menu.flatMap((e) => (e.children ? e.children.map((c) => c.href) : [e.href]));
  return all.filter((h) => matches(path, h)).sort((a, b) => b.length - a.length)[0];
}

/** Previous-CMS layout: fixed dark sidebar (240px), white top bar, light content area. */
export function AdminShell({
  menu,
  user,
  logout,
  children,
}: {
  menu: MenuEntry[];
  user: { name: string; email: string };
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const path = usePathname();
  const active = activeHref(menu, path);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    // Navigating closes the mobile drawer and the user menu.
    setLastPath(path);
    setMobileOpen(false);
    setUserOpen(false);
  }

  useEffect(() => {
    if (!userOpen) return;
    const close = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [userOpen]);

  const toggleMenu = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((c) => !c);
    else setMobileOpen((o) => !o);
  };

  return (
    <div className="min-h-dvh bg-cms-bg font-cms text-[14px] text-cms-text">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-cms-nav text-cms-nav-text transition-[width,transform] duration-200 ${
          collapsed ? "lg:w-15" : "lg:w-60"
        } w-60 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <Link href="/admin" aria-label="Dashboard" className="flex h-16 shrink-0 items-center overflow-hidden px-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
          {collapsed ? <BrandMark /> : <img src="/admin-logo.png" alt="Podkast.az" width={124} height={23} className="h-5.75 w-auto" />}
        </Link>
        <nav aria-label="Admin menyu" className="flex-1 overflow-x-hidden overflow-y-auto pb-6">
          {!collapsed && <p className="px-5 pt-4 pb-2 text-[11px] font-medium tracking-[0.12em] text-neutral-600 uppercase">General</p>}
          <ul className="flex flex-col gap-0.5 px-3">
            {menu.map((entry) =>
              entry.children ? (
                <Group key={entry.label} group={entry} active={active} collapsed={collapsed} />
              ) : (
                <li key={entry.href}>
                  <NavLink item={entry} active={active === entry.href} collapsed={collapsed} />
                </li>
              ),
            )}
          </ul>
        </nav>
      </aside>
      {mobileOpen && (
        <button aria-label="Menyunu bağla" className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Top bar */}
      <header
        className={`fixed top-0 right-0 left-0 z-20 flex h-16 items-center justify-between border-b border-cms-line bg-white px-5 transition-[left] duration-200 ${
          collapsed ? "lg:left-15" : "lg:left-60"
        }`}
      >
        <div className="flex items-center gap-5 text-cms-text">
          <button type="button" aria-label="Menyu" onClick={toggleMenu} className="rounded-full p-2 hover:bg-cms-bg">
            <List size={24} />
          </button>
          <button
            type="button"
            aria-label="Tam ekran"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
            className="hidden rounded-full p-2 hover:bg-cms-bg sm:block"
          >
            <CornersOut size={20} />
          </button>
          <a href="/" target="_blank" className="hidden items-center gap-2 rounded-full border border-cms-border px-3.5 py-1.5 text-[13px] hover:border-ink sm:inline-flex">
            <span aria-hidden className="size-2 rounded-full bg-highlight" />
            Sayta bax ↗
          </a>
        </div>
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setUserOpen((o) => !o)}
            aria-expanded={userOpen}
            aria-label="İstifadəçi menyusu"
            className="flex items-center gap-2.5 py-2"
          >
            <span className="relative">
              <UserCircle size={36} weight="fill" className="text-ink" />
              <span className="absolute right-0 bottom-0.5 size-2.5 rounded-full border-2 border-white bg-highlight" />
            </span>
            <span className="hidden sm:inline">{user.name}</span>
            <CaretDown size={14} />
          </button>
          {userOpen && (
            <div className="absolute right-0 mt-1 w-56 overflow-hidden rounded-2xl border border-cms-line bg-white py-2 shadow-lg">
              <p className="truncate px-4 py-2 text-[13px] text-cms-muted">{user.email}</p>
              <form action={logout}>
                <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-cms-bg">
                  <SignOut size={16} /> Çıxış
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      <main className={`pt-16 transition-[padding] duration-200 ${collapsed ? "lg:pl-15" : "lg:pl-60"}`}>
        <div className="p-4 sm:p-7">{children}</div>
        <footer className="px-7 pb-6 text-[13px] text-cms-muted">
          Copyright © {new Date().getFullYear()} <span className="text-cms-text">Podkast.az</span>
        </footer>
      </main>
    </div>
  );
}

function NavLink({ item, active, collapsed }: { item: MenuItem; active: boolean; collapsed: boolean }) {
  const Icon = icons[item.icon ?? ""] ?? ListBullets;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`relative flex items-center gap-3.5 rounded-xl py-2.5 pr-3 pl-3 transition-colors ${
        active ? "bg-cms-nav-dark text-white" : "hover:bg-cms-nav-dark hover:text-white"
      }`}
    >
      {active && <span aria-hidden className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-highlight" />}
      <Icon size={20} className={`shrink-0 ${active ? "text-highlight" : ""}`} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className="rounded-full bg-highlight px-2 text-[11px] leading-[18px] font-medium text-white">{item.badge}</span>
      ) : null}
    </Link>
  );
}

function Group({ group, active, collapsed }: { group: MenuGroup; active: string | undefined; collapsed: boolean }) {
  const hasActive = group.children.some((c) => c.href === active);
  const [open, setOpen] = useState(hasActive);
  const Icon = icons[group.icon] ?? ListBullets;
  return (
    <li className={`rounded-xl ${hasActive || open ? "bg-cms-nav-dark" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={collapsed ? group.label : undefined}
        className={`flex w-full items-center gap-3.5 rounded-xl py-2.5 pr-3 pl-3 text-left hover:text-white ${hasActive ? "text-white" : ""}`}
      >
        <Icon size={20} className={`shrink-0 ${hasActive ? "text-highlight" : ""}`} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{group.label}</span>
            {group.badge ? (
              <span className="rounded-full bg-highlight px-2 text-[11px] leading-[18px] font-medium text-white">{group.badge}</span>
            ) : null}
            {open ? <CaretDown size={14} /> : <CaretRight size={14} />}
          </>
        )}
      </button>
      {open && !collapsed && (
        <ul className="pb-2">
          {group.children.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className={`flex items-center gap-2 py-2 pr-3 pl-12.5 hover:text-white ${c.href === active ? "text-white" : ""}`}
              >
                <span aria-hidden className={`size-1.5 rounded-full ${c.href === active ? "bg-highlight" : "bg-neutral-700"}`} />
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Brand mark (the orange sound wave of the logo). */
function BrandMark() {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG
  return <img src="/admin-mark.png" alt="" width={32} height={32} className="size-8 shrink-0" />;
}
