import Link from "next/link";
import { lang as langParam } from "next/root-params";
import { buttonClass } from "@/components/site/ui";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { href } from "@/i18n/routes";

const text: Record<Locale, { title: string; body: string; home: string }> = {
  az: { title: "Səhifə tapılmadı", body: "Axtardığınız səhifə silinib və ya ünvanı dəyişib.", home: "Ana səhifəyə qayıt" },
  en: { title: "Page not found", body: "The page you are looking for was removed or has moved.", home: "Back to the home page" },
};

/** 404 inside the site layout (no header: the content cache is not available here). */
export default async function NotFound() {
  const value = await langParam();
  const lang = value && hasLocale(value) ? value : defaultLocale;
  const t = text[lang];
  return (
    <main className="container-page flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-84 leading-none font-bold text-primary-600">404</p>
      <h1 className="text-28 leading-[1.05] font-semibold tracking-tight desktop:text-48">{t.title}</h1>
      <p className="text-16 leading-[1.5] text-neutral-850 desktop:text-20">{t.body}</p>
      <Link href={href("home", lang)} className={buttonClass("primary", "h-12")}>
        {t.home}
      </Link>
    </main>
  );
}
