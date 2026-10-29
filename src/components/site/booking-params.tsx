"use client";

import { useSearchParams } from "next/navigation";
import { Breadcrumb, type Crumb } from "./breadcrumb";
import { BookingForm } from "./booking-form";

type FormProps = Omit<Parameters<typeof BookingForm>[0], "initial">;

/** The booking form with the studio/decor chosen on the decor page (`?studiya=&dekor=`). */
export function BookingFormFromParams(props: FormProps) {
  const params = useSearchParams();
  const studio = params.get("studiya") ?? undefined;
  const decor = params.get("dekor") ?? undefined;
  // Remount when the query changes (client navigation from another decor).
  return <BookingForm key={`${studio}/${decor}`} {...props} initial={{ studio, decor }} />;
}

/**
 * Figma has two breadcrumbs for this page: "Ana səhifə > Rezervasiya et" when opened from the
 * menu or the home page, "Ana səhifə > Studiyalar > Dekorlar > Rezervasiya et" from a decor.
 */
export function BookingBreadcrumb({ base, studios, decors, decorsPath, label }: { base: Crumb[]; studios: Crumb; decors: string; decorsPath: string; label: string }) {
  const params = useSearchParams();
  const studio = params.get("studiya");
  if (!studio || !/^[a-z0-9-]{1,80}$/.test(studio)) return <Breadcrumb items={base} label={label} />;
  const [home, current] = [base[0], base.at(-1)!];
  return <Breadcrumb items={[home, studios, { name: decors, path: `${decorsPath}/${studio}` }, current]} label={label} />;
}
