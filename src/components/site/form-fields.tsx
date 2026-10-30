import type { ComponentProps } from "react";
import { cx } from "./ui";

/**
 * Figma "Text Input" (Components page): label 14/20 above a 48px field — white, 1px
 * #e5e4e3 border, r8, 14px padding, 14/20 text, #85807d placeholder. Hover: #f8f8f8 with a
 * #d2d0cf border; typing: #85807d border; red with a hint on error.
 */
export const fieldClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-[0.8125rem] text-14 leading-[1.43] text-neutral-950 placeholder:text-neutral-600 outline-none transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus:border-neutral-600 focus:bg-white aria-invalid:border-[#e5484d]";

type Base = { label: string; error?: string; className?: string };

export function TextField({ label, error, className, ...input }: Base & ComponentProps<"input">) {
  return (
    <label className={cx("flex flex-col gap-2 text-14 leading-[1.43]", className)}>
      {label}
      <input className={fieldClass} aria-invalid={error ? true : undefined} {...input} />
      {error && <span className="text-12 text-[#e5484d]">{error}</span>}
    </label>
  );
}

export function TextArea({ label, error, className, ...input }: Base & ComponentProps<"textarea">) {
  return (
    <label className={cx("flex flex-col gap-2 text-14 leading-[1.43]", className)}>
      {label}
      <textarea className={cx(fieldClass, "h-[8.9375rem] resize-y desktop:h-[8.625rem]")} aria-invalid={error ? true : undefined} {...input} />
      {error && <span className="text-12 text-[#e5484d]">{error}</span>}
    </label>
  );
}
