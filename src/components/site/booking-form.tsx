"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createBooking, type BookingState } from "@/lib/booking/actions";
import type { DaySlots } from "@/lib/booking/slots";
import { DatePicker, TimePicker } from "./booking-pickers";
import { Check, choiceCard, formHeading, groupTitle, Radio, SuccessModal, withLinks } from "./form-controls";
import { TextArea, TextField } from "./form-fields";
import { Turnstile } from "./turnstile";
import { buttonClass, cx } from "./ui";

export type BookingStudio = {
  slug: string;
  name: string;
  address: string;
  decors: { slug: string; name: string; thumb: ReactNode }[];
};

export type BookingLabels = Record<
  | "detailsTitle" | "studioLabel" | "decorLabel" | "otherTitle" | "otherText" | "otherRequest" | "otherRequestPlaceholder"
  | "dateTimeTitle" | "dateLabel" | "datePlaceholder" | "startLabel" | "endLabel" | "timePlaceholder"
  | "calendarToday" | "calendarTaken" | "calendarSelected" | "months" | "weekdays" | "prevMonth" | "nextMonth" | "hourLabel" | "minuteLabel" | "confirmTime"
  | "closedDay" | "noSlots" | "chooseStudioFirst" | "chooseDateFirst"
  | "personalTitle" | "firstName" | "firstNamePlaceholder" | "lastName" | "lastNamePlaceholder"
  | "phone" | "phonePlaceholder" | "email" | "emailPlaceholder"
  | "consentAccuracy" | "consentTerms" | "submit"
  | "successTitle" | "successText" | "successButton"
  | "errorTaken" | "errorInvalid" | "errorRate" | "errorServer",
  string
>;

type Props = {
  studios: BookingStudio[];
  labels: BookingLabels;
  lang: string;
  links: { home: string; privacy: string; terms: string };
  /** Pre-selected from `?studiya=&dekor=` (the decor page's "Rezervasiya et"). */
  initial: { studio?: string; decor?: string };
  turnstileKey?: string;
};

const heading = formHeading;
const card = choiceCard;

/**
 * Rezervasiya et (Figma "Frame 1410104280"): studio, decor, date and times on the left, personal
 * data, the two consents and the button on the right (one column on mobile). Free days and
 * times come from /api/availability: the calendar greys taken days, the time picker taken hours
 * and minutes (booking-pickers.tsx). The server re-checks everything.
 */
export function BookingForm({ studios, labels, links, initial, lang, turnstileKey }: Props) {
  const [state, action, pending] = useActionState<BookingState, FormData>(createBooking, null);
  const firstStudio = studios.find((s) => s.slug === initial.studio) ?? (studios.length === 1 ? studios[0] : undefined);
  const [studio, setStudio] = useState(firstStudio?.slug ?? "");
  const [decor, setDecor] = useState(firstStudio?.decors.some((d) => d.slug === initial.decor) ? initial.decor! : "");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [slots, setSlots] = useState<DaySlots | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [accuracy, setAccuracy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [done, setDone] = useState(false);
  const startedAt = useRef<HTMLInputElement>(null);

  const current = studios.find((s) => s.slug === studio);
  // Before a studio is chosen the decor cards still show (Figma "Rezervasiya et" from the home
  // page), disabled, with the first studio's decors; choosing a studio shows its own.
  const decorStudio = current ?? studios[0];

  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);

  // Free times of the chosen studio and day (again after a "taken" answer).
  useEffect(() => {
    if (!studio || !date) return;
    const ctrl = new AbortController();
    fetch(`/api/availability?studio=${studio}&date=${date}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: DaySlots | null) => setSlots(s))
      .catch(() => {});
    return () => ctrl.abort();
  }, [studio, date, refresh]);

  // The server's answer: success opens the modal, a taken time reloads the free times.
  const [handled, setHandled] = useState<BookingState>(null);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) {
      setDone(true);
      setDate("");
      setStart("");
      setEnd("");
      setSlots(null);
      setAccuracy(false);
      setTerms(false);
    } else if (state?.error === "taken") {
      setStart("");
      setEnd("");
      setRefresh((n) => n + 1);
    }
  }

  const open = slots?.status === "open" ? slots.starts : [];
  const ends = open.find((s) => s.time === start)?.ends ?? [];
  const dayMessage = !studio
    ? labels.chooseStudioFirst
    : !date
      ? ""
      : slots && slots.status !== "open"
        ? labels.closedDay
        : slots && !open.some((s) => s.ends.length)
          ? labels.noSlots
          : "";

  const error =
    state && !state.ok
      ? { taken: labels.errorTaken, invalid: labels.errorInvalid, rate: labels.errorRate, server: labels.errorServer }[state.error]
      : "";

  return (
    <>
      <form action={action} className="grid grid-cols-1 gap-[5.625rem] desktop:grid-cols-2 desktop:gap-20">
        <input type="hidden" name="locale" value={lang} />
        <input ref={startedAt} type="hidden" name="startedAt" defaultValue="" />
        <input type="hidden" name="source" value={initial.decor ? "decor" : "direct"} />
        <div aria-hidden className="absolute -left-[9999px]">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="flex flex-col gap-6 desktop:gap-9">
          <h2 className={heading}>{labels.detailsTitle}</h2>

          <fieldset className="flex flex-col gap-4">
            {/* Figma mobile has no "Studiya" label above the cards (screen readers still get it); not-sr-only resets the margin, hence the !. */}
            <legend className={cx(groupTitle, "sr-only desktop:not-sr-only desktop:mb-4!")}>{labels.studioLabel}</legend>
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              {studios.map((s) => (
                <label key={s.slug} className={cx(card, "items-start", studio === s.slug ? "border-primary-600" : "border-neutral-200 hover:border-neutral-400")}>
                  <input
                    type="radio"
                    name="studio"
                    value={s.slug}
                    checked={studio === s.slug}
                    onChange={() => {
                      setStudio(s.slug);
                      setDecor("");
                      setStart("");
                      setEnd("");
                      setSlots(null);
                    }}
                    className="sr-only"
                    required
                  />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-14 leading-[1.5] tracking-tight">{s.name}</span>
                    <span className="text-18 leading-[1.15] font-medium tracking-tight">{s.address}</span>
                  </span>
                  <Radio checked={studio === s.slug} />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4" disabled={!current}>
            <legend className={cx(groupTitle, "mb-4 desktop:mb-4")}>{labels.decorLabel}</legend>
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              {(decorStudio?.decors ?? []).map((d) => (
                <label key={d.slug} className={cx(card, "items-center", decor === d.slug ? "border-primary-600" : "border-neutral-200 hover:border-neutral-400")}>
                  <input type="radio" name="decor" value={d.slug} checked={decor === d.slug} onChange={() => setDecor(d.slug)} className="sr-only" required />
                  <span className="relative h-[3.3125rem] w-15 shrink-0 overflow-hidden rounded-[0.375rem] bg-silver">{d.thumb}</span>
                  <span className="flex-1 text-14 leading-[1.5] font-medium tracking-tight">{d.name}</span>
                  <Radio checked={decor === d.slug} />
                </label>
              ))}
              {decorStudio && (
                <label className={cx(card, "min-h-[5.3125rem] items-center gap-2.5!", decor === "other" ? "border-primary-600" : "border-neutral-200 hover:border-neutral-400")}>
                  <input type="radio" name="decor" value="other" checked={decor === "other"} onChange={() => setDecor("other")} className="sr-only" required />
                  <span className="flex flex-1 flex-col gap-1 text-14 leading-[1.5] tracking-tight">
                    <span className="font-medium">{labels.otherTitle}</span>
                    <span>{labels.otherText}</span>
                  </span>
                  <Radio checked={decor === "other"} />
                </label>
              )}
            </div>
            {decor === "other" && (
              <TextArea label={labels.otherRequest} name="request" placeholder={labels.otherRequestPlaceholder} maxLength={1000} className="mt-1" />
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-4" disabled={!current}>
            <legend className={cx(groupTitle, "mb-4")}>{labels.dateTimeTitle}</legend>
            <DatePicker
              studio={studio}
              value={date}
              disabled={!current}
              labels={labels}
              onChange={(d) => {
                setDate(d);
                setStart("");
                setEnd("");
                setSlots(null);
              }}
            />
            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
              <TimePicker
                name="start"
                label={labels.startLabel}
                value={start}
                options={open.map((o) => ({ time: o.time, disabled: !o.ends.length }))}
                labels={labels}
                onChange={(t) => {
                  setStart(t);
                  setEnd("");
                }}
              />
              <TimePicker name="end" label={labels.endLabel} value={end} options={ends.map((t) => ({ time: t, disabled: false }))} labels={labels} onChange={setEnd} />
            </div>
            {dayMessage && (
              <p role="status" className="text-14 leading-[1.5] text-neutral-700">
                {dayMessage}
              </p>
            )}
          </fieldset>
        </div>

        <div className="flex flex-col gap-6 desktop:gap-9">
          <h2 className={heading}>{labels.personalTitle}</h2>
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
              disabled={pending || !accuracy || !terms}
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
