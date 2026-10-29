import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, htmlLang, locales } from "@/i18n/config";
import { inter, roboto } from "@/lib/fonts";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={htmlLang[lang]} className={`${inter.variable} ${roboto.variable} antialiased`} suppressHydrationWarning>
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
