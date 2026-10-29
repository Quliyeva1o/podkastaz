"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContact, type ContactState } from "@/lib/forms/contact";
import { TextArea, TextField } from "./form-fields";
import { Turnstile } from "./turnstile";
import { buttonClass } from "./ui";

export type ContactFormLabels = Record<
  | "firstName" | "firstNamePlaceholder" | "lastName" | "lastNamePlaceholder" | "phone" | "phonePlaceholder"
  | "email" | "emailPlaceholder" | "subject" | "subjectPlaceholder" | "message" | "messagePlaceholder"
  | "submit" | "success" | "error" | "rateLimit",
  string
>;

/**
 * Əlaqə form (Figma "Frame 99"): Ad + Soyad, Telefon + E-mail in pairs, Mövzu, Mesaj, orange
 * button. Spam protection as on marketinq.az: hidden honeypot, minimum fill time, per-IP
 * limit, optional Turnstile (server side, src/lib/forms).
 */
export function ContactForm({ labels, lang, turnstileKey }: { labels: ContactFormLabels; lang: string; turnstileKey?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, null);
  const startedAt = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // Set after hydration: the time trap measures how long a person took to fill the form.
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="flex flex-col gap-10 desktop:gap-8">
      <input type="hidden" name="locale" value={lang} />
      <input ref={startedAt} type="hidden" name="startedAt" defaultValue="" />
      <div aria-hidden className="absolute -left-[9999px]">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2">
          <TextField label={labels.firstName} name="firstName" placeholder={labels.firstNamePlaceholder} autoComplete="given-name" required maxLength={100} />
          <TextField label={labels.lastName} name="lastName" placeholder={labels.lastNamePlaceholder} autoComplete="family-name" maxLength={100} />
        </div>
        <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2">
          <TextField label={labels.phone} name="phone" type="tel" placeholder={labels.phonePlaceholder} autoComplete="tel" maxLength={50} />
          <TextField label={labels.email} name="email" type="email" placeholder={labels.emailPlaceholder} autoComplete="email" required maxLength={200} />
        </div>
        <TextField label={labels.subject} name="subject" placeholder={labels.subjectPlaceholder} maxLength={200} />
        <TextArea label={labels.message} name="message" placeholder={labels.messagePlaceholder} required maxLength={5000} />
        {turnstileKey && <Turnstile siteKey={turnstileKey} lang={lang} />}
      </div>
      <div className="flex flex-col gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary", "h-12.5 w-full disabled:opacity-60")}>
          {labels.submit}
        </button>
        <p role="status" aria-live="polite" className={state?.ok ? "text-14 text-[#2e9e5b]" : "text-14 text-[#e5484d]"}>
          {state?.ok ? labels.success : state?.error === "rate" ? labels.rateLimit : state ? labels.error : ""}
        </p>
      </div>
    </form>
  );
}
