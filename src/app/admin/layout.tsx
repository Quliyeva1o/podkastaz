import type { Metadata } from "next";
import "@/lib/fonts/fonts.css";
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin — Podkast.az",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="az" className="admin-root antialiased">
      <body className="min-h-dvh bg-cms-bg font-cms text-[14px] text-cms-text" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
