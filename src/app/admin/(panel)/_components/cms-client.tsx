"use client";

import { useRef } from "react";
import { locales, type Locale } from "@/i18n/config";

/** Switchery-style toggle. Uncontrolled (`defaultChecked`) or controlled (`checked` + `onChange`). */
export function Switch({
  name,
  checked,
  defaultChecked,
  onChange,
  label,
  disabled,
  ariaLabel,
}: {
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  /** Accessible name when there is no visible label (table rows). */
  ariaLabel?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-[14px] font-medium text-cms-label select-none">
      {label}
      <input
        type="checkbox"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6.5 w-11.5 shrink-0 rounded-full bg-cms-border transition-colors peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-highlight peer-disabled:opacity-50 after:absolute after:top-0.75 after:left-0.75 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-highlight"
      />
    </label>
  );
}

/** A switch that immediately submits its own form (list rows: status / visibility). */
export function AutoSwitch({
  action,
  hidden,
  name,
  checked,
  label,
}: {
  action: (fd: FormData) => Promise<void>;
  hidden: Record<string, string>;
  name: string;
  checked: boolean;
  label: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Switch name={name} defaultChecked={checked} ariaLabel={label} onChange={() => form.current?.requestSubmit()} />
    </form>
  );
}

/** Bootstrap "nav-tabs" language switcher: AZ | EN | RU. */
export function LangTabs({ lang, onChange, missing = [] }: { lang: Locale; onChange: (l: Locale) => void; missing?: Locale[] }) {
  return (
    <div role="tablist" aria-label="Dil" className="mb-6 inline-flex gap-1 rounded-full bg-cms-bg p-1">
      {locales.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(l)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium ${
              active ? "bg-ink text-white" : "text-cms-muted hover:text-ink"
            }`}
          >
            {l.toUpperCase()}
            {missing.includes(l) && <span className="ml-1 inline-block size-1.5 rounded-full bg-cms-danger align-middle" title="Boş sahələr var" />}
          </button>
        );
      })}
    </div>
  );
}

/** Delete button that asks for confirmation first. */
export function ConfirmButton({
  message,
  className,
  children,
  formAction,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
  formAction?: (fd: FormData) => Promise<void>;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
