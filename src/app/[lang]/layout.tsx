import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, htmlLang, locales } from "@/i18n/config";
import "@/lib/fonts/fonts.css";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fd5902" },
    { media: "(prefers-color-scheme: dark)", color: "#fd5902" },
  ],
};

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={htmlLang[lang]} className="antialiased" suppressHydrationWarning>
      <head>
        {/* Scrollbar width → --sbw, so the fluid rem scale uses the real content width (see globals.css). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var d=document.documentElement;function s(){d.style.setProperty('--sbw',(innerWidth-d.clientWidth)+'px')}s();addEventListener('resize',s)})()",
          }}
        />
      </head>
      {/* Extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before React hydrates. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
