import Link from "next/link";
import { buttonClass } from "@/components/site/ui";

/** 404 inside the site layout (no header: the content cache is not available here). */
export default function NotFound() {
  return (
    <main className="container-page flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-84 leading-none font-bold text-primary-600">404</p>
      <h1 className="text-28 leading-[1.05] font-semibold tracking-tight desktop:text-48">Səhifə tapılmadı</h1>
      <p className="text-16 leading-[1.5] text-neutral-850 desktop:text-20">Axtardığınız səhifə silinib və ya ünvanı dəyişib.</p>
      <Link href="/" className={buttonClass("primary", "h-12")}>
        Ana səhifəyə qayıt
      </Link>
    </main>
  );
}
