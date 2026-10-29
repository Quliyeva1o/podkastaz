"use client";

import { CheckCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { buttonClass, cx } from "./ui";

/** Shared pieces of the booking and package request forms (Figma "Components" page). */

export const formHeading = "text-18 leading-[1.15] font-semibold tracking-tight desktop:text-24";
export const groupTitle = "text-18 leading-[1.15] font-semibold tracking-tight";
// 15px padding + 1px border = Figma's 16px padding with the stroke inside.
export const choiceCard = "relative flex cursor-pointer gap-4 rounded-[0.375rem] border p-[0.9375rem] transition-colors";
export const choiceBorder = (on: boolean) => (on ? "border-primary-600" : "border-neutral-200 hover:border-neutral-400");

/** Figma "Controls" radio: 16px ring, orange 10px dot when selected. */
export function Radio({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={cx("flex size-4 shrink-0 items-center justify-center rounded-full border", checked ? "border-neutral-950" : "border-neutral-200")}>
      {checked && <span className="size-2.5 rounded-full bg-primary-600" />}
    </span>
  );
}

/** Figma "Controls" checkbox look: 16px, r3, orange tick. */
export function TickBox({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span aria-hidden className={cx("flex size-4 shrink-0 items-center justify-center rounded-[0.19rem] border", checked ? "border-neutral-950" : "border-neutral-200", className)}>
      {checked && (
        <svg viewBox="0 0 9 6.5" className="w-[0.5625rem] fill-primary-600">
          <path d="M8.78.22a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06L3.25 4.69 7.72.22a.75.75 0 0 1 1.06 0Z" />
        </svg>
      )}
    </span>
  );
}

/** A consent checkbox with its text. */
export function Check({ name, label, checked, onChange }: { name: string; label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-14 leading-[1.5]">
      <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
        <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer absolute inset-0 cursor-pointer opacity-0" />
        <TickBox checked={checked} className="peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300" />
      </span>
      <span>{label}</span>
    </label>
  );
}

/** "Saytın {məxfilik siyasəti} və {istifadə qaydaları} …" → the two braces become links. */
export function withLinks(text: string, links: string[]) {
  let i = 0;
  return text.split(/(\{[^}]+\})/).map((part, k) =>
    part.startsWith("{") ? (
      <Link key={k} href={links[i++] ?? "#"} target="_blank" className="underline underline-offset-2 hover:text-primary-600">
        {part.slice(1, -1)}
      </Link>
    ) : (
      part
    ),
  );
}

/** "Qəbul olundu!" (Figma "Frame 2095585201"): centred card on desktop, bottom sheet on mobile. */
export function SuccessModal({ title, text, button, home, onClose }: { title: string; text: string; button: string; home: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="menu-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/32 desktop:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-done"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col items-center gap-8 rounded-t-2xl bg-white px-4 py-6 text-center desktop:w-[26.9375rem] desktop:rounded-[0.625rem] desktop:p-7.5"
      >
        <div className="flex flex-col items-center gap-4 desktop:gap-5">
          <CheckCircle aria-hidden weight="fill" className="size-16 text-primary-600" />
          <h2 id="form-done" className="text-24 leading-[1.15] font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-16 leading-[1.5] tracking-tight text-neutral-850">{text}</p>
        </div>
        <Link href={home} autoFocus className={buttonClass("primary", "h-12 w-full")}>
          {button}
        </Link>
      </div>
    </div>,
    document.body,
  );
}
