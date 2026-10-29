import { and, count, eq } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { bookings, packageRequests, submissions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logout } from "../actions";
import { AdminShell, type MenuEntry } from "./_components/shell";

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="p-8 text-[14px] text-cms-text">Yüklənir…</div>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

/** Reads the session cookie at request time; redirects to login when signed out. */
async function Gate({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [{ unread }] = await db.select({ unread: count() }).from(submissions).where(eq(submissions.read, false));
  const [{ newBookings }] = await db
    .select({ newBookings: count() })
    .from(bookings)
    .where(and(eq(bookings.status, "new"), eq(bookings.read, false)));
  const [{ newRequests }] = await db
    .select({ newRequests: count() })
    .from(packageRequests)
    .where(and(eq(packageRequests.status, "new"), eq(packageRequests.read, false)));

  // PLAN.md §8; the badges count unseen new requests.
  const menu: MenuEntry[] = [
    { label: "Dashboard", href: "/admin", icon: "dashboard" },
    {
      label: "Rezervasiyalar",
      icon: "bookings",
      badge: newBookings,
      children: [
        { label: "Siyahı", href: "/admin/bookings" },
        { label: "Təqvim", href: "/admin/bookings/calendar" },
      ],
    },
    { label: "Paket müraciətləri", href: "/admin/package-requests", icon: "requests", badge: newRequests },
    { label: "Mesajlar", href: "/admin/submissions", icon: "submissions", badge: unread },
    { label: "Səhifələr", href: "/admin/pages", icon: "pages" },
    { label: "Studiyalar və dekorlar", href: "/admin/studios", icon: "studios" },
    { label: "Xidmətlər", href: "/admin/collections/services", icon: "services" },
    {
      label: "Paketlər",
      icon: "pricing",
      children: [
        { label: "Paketlər", href: "/admin/collections/packages" },
        { label: "Add-on xidmətlər", href: "/admin/collections/addons" },
      ],
    },
    { label: "İşlərimiz", href: "/admin/collections/works", icon: "portfolio" },
    { label: "Tərəfdaşlar", href: "/admin/collections/partners", icon: "partners" },
    { label: "Media kitabxanası", href: "/admin/media", icon: "media" },
    {
      label: "Ayarlar",
      icon: "settings",
      children: [
        { label: "Header (loqo)", href: "/admin/pages/global/header" },
        { label: "Menyu", href: "/admin/pages/global/menu" },
        { label: "Əlaqə və sosial şəbəkələr", href: "/admin/pages/global/contacts" },
        { label: "UI mətnləri", href: "/admin/pages/global/labels" },
        { label: "Şirkət məlumatları (SEO)", href: "/admin/pages/global/business" },
        { label: "Email bildirişləri", href: "/admin/pages/global/notifications" },
        { label: "Yönləndirmələr (301)", href: "/admin/redirects" },
      ],
    },
  ];

  return (
    <AdminShell menu={menu} user={{ name: user.name, email: user.email }} logout={logout}>
      {children}
    </AdminShell>
  );
}
