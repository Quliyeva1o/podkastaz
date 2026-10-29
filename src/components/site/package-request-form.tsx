"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitPackageRequest, type PackageRequestState } from "@/lib/forms/package-request";
import { Check, choiceBorder, choiceCard, formHeading, groupTitle, Radio, SuccessModal, TickBox, withLinks } from "./form-controls";
import { TextField } from "./form-fields";
import { Turnstile } from "./turnstile";
import { buttonClass, cx } from "./ui";

export type RequestPackage = { slug: string; name: string; price: number };
export type RequestAddon = { id: string; name: string; price: number | null; customLabel: string };
export type PackageRequestLabels = Record<
  | "detailsTitle" | "addonsTitle" | "totalLabel" | "currency" | "customSuffix"
  | "personalTitle" | "firstName" | "firstNamePlaceholder" | "lastName" | "lastNamePlaceholder"
  | "phone" | "phonePlaceholder" | "email" | "emailPlaceholder"
  | "consentAccuracy" | "consentTerms" | "submit"
  | "successTitle" | "successText" | "successButton"
  | "errorInvalid" | "errorRate" | "errorServer",
  string
>;

type Props = {
  packages: RequestPackage[];
  addons: RequestAddon[];
  labels: PackageRequestLabels;
  lang: string;
  links: { home: string; privacy: string; terms: string };
  /** Pre-selected from `?paket=` (the Paketlər page's "Müraciət et"). */
  initial?: string;
  turnstileKey?: string;
};

/** Figma "Price": 24/600 number + 12/400 currency. */
function Price({ value, currency, className }: { value: string; currency?: string; className?: string }) {
  return (
    <span className={cx("flex items-end gap-1.5", className)}>
      {/* 28px line: Figma rounds the 24px text box (27.6) up to 28, so the cards are 85 tall. */}
      <span className="text-24 leading-7 font-semibold tracking-tight">{value}</span>
      {currency && <span className="text-12 leading-[1.5]">{currency}</span>}
    </span>
  );
}

/**
 * Paketə qoşul (Figma "Frame 1410104280"): package (radio cards), add-ons (checkbox cards) and
 * the live total on the left, personal data and consents on the right. The total shown here is a
 * preview; the server computes it again from the current prices.
 */
export function PackageRequestForm({ packages, addons, labels, lang, links, initial, turnstileKey }: Props) {
  const [state, action, pending] = useActionState<PackageRequestState, FormData>(submitPackageRequest, null);
  const [pkg, setPkg] = useState(packages.find((p) => p.slug === initial)?.slug ?? packages[0]?.slug ?? "");
  const [chosen, setChosen] = useState<string[]>([]);
  const [accuracy, setAccuracy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [done, setDone] = useState(false);
  const startedAt = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);

  const [handled, setHandled] = useState<PackageRequestState>(null);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) {
      setDone(true);
      setChosen([]);
      setAccuracy(false);
      setTerms(false);
    }
  }
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  const selected = addons.filter((a) => chosen.includes(a.id));
  const total = (packages.find((p) => p.slug === pkg)?.price ?? 0) + selected.reduce((s, a) => s + (a.price ?? 0), 0);
  const custom = selected.some((a) => a.price === null);
  const error =
    state && !state.ok ? { invalid: labels.errorInvalid, rate: labels.errorRate, server: labels.errorServer }[state.error] : "";

  return (
    <>
      <form ref={form} action={action} className="grid grid-cols-1 gap-[5.625rem] desktop:grid-cols-2 desktop:gap-20">
        <input ref={startedAt} type="hidden" name="startedAt" defaultValue="" />
        <div aria-hidden className="absolute -left-[9999px]">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="flex flex-col gap-6 desktop:gap-9">
          <h2 className={formHeading}>{labels.detailsTitle}</h2>
          <fieldset className="grid grid-cols-1 gap-4 tablet:grid-cols-3" aria-label={labels.detailsTitle}>
            {packages.map((p) => (
              <label key={p.slug} className={cx(choiceCard, "items-start", choiceBorder(pkg === p.slug))}>
                <input type="radio" name="package" value={p.slug} checked={pkg === p.slug} onChange={() => setPkg(p.slug)} className="sr-only" required />
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-14 leading-[1.5] font-semibold tracking-tight">{p.name}</span>
                  <Price value={String(p.price)} currency={labels.currency} />
                </span>
                <Radio checked={pkg === p.slug} />
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-5 desktop:gap-6">
            <legend className={cx(groupTitle, "mb-5 desktop:mb-6")}>{labels.addonsTitle}</legend>
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              {addons.map((a) => {
                const on = chosen.includes(a.id);
                return (
                  <label key={a.id} className={cx(choiceCard, "items-start", choiceBorder(on))}>
                    <input
                      type="checkbox"
                      name="addons"
                      value={a.id}
                      checked={on}
                      onChange={(e) => setChosen((c) => (e.target.checked ? [...c, a.id] : c.filter((id) => id !== a.id)))}
                      className="peer sr-only"
                    />
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="text-14 leading-[1.5] tracking-tight">{a.name}</span>
                      {a.price === null ? <Price value={a.customLabel} /> : <Price value={`+${a.price}`} currency={labels.currency} />}
                    </span>
                    <TickBox checked={on} className="peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300" />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className="flex items-center justify-between gap-2" aria-live="polite">
            <span className={groupTitle}>{labels.totalLabel}</span>
            <Price
              value={`${total}${custom ? ` ${labels.customSuffix}` : ""}`}
              currency={labels.currency}
              className="text-primary-600"
            />
          </p>
        </div>

        <div className="flex flex-col gap-6 desktop:gap-9">
          <h2 className={formHeading}>{labels.personalTitle}</h2>
          <div className="flex flex-col gap-4">
            <TextField label={labels.firstName} name="firstName" placeholder={labels.firstNamePlaceholder} autoComplete="given-name" required maxLength={100} />
            <TextField label={labels.lastName} name="lastName" placeholder={labels.lastNamePlaceholder} autoComplete="family-name" required maxLength={100} />
            <TextField label={labels.phone} name="phone" type="tel" placeholder={labels.phonePlaceholder} autoComplete="tel" required minLength={5} maxLength={50} />
            <TextField label={labels.email} name="email" type="email" placeholder={labels.emailPlaceholder} autoComplete="email" required maxLength={200} />
          </div>
          <div className="flex flex-col gap-3">
            <Check name="accuracy" label={labels.consentAccuracy} checked={accuracy} onChange={setAccuracy} />
            <Check name="terms" label={withLinks(labels.consentTerms, [links.privacy, links.terms])} checked={terms} onChange={setTerms} />
          </div>
          {turnstileKey && <Turnstile siteKey={turnstileKey} lang={lang} />}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={pending || !accuracy || !terms || !pkg}
              className={buttonClass("primary", "h-10 w-full disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-300")}
            >
              {labels.submit}
            </button>
            {error && (
              <p role="alert" className="text-14 leading-[1.5] text-[#e5484d]">
                {error}
              </p>
            )}
          </div>
        </div>
      </form>
      {done && (
        <SuccessModal title={labels.successTitle} text={labels.successText} button={labels.successButton} home={links.home} onClose={() => setDone(false)} />
      )}
    </>
  );
}

/** The form with the package chosen on the Paketlər page (`?paket=pro`). */
export function PackageRequestFromParams(props: Omit<Props, "initial">) {
  const initial = useSearchParams().get("paket") ?? undefined;
  return <PackageRequestForm key={initial} {...props} initial={initial} />;
}
