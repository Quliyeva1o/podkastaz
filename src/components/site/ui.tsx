import Link from "next/link";
import type { ComponentProps } from "react";

const cx = (...parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join(" ");
export { cx };

type ButtonVariant = "primary" | "white" | "glass" | "outline";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  white: "bg-white text-neutral-950 hover:bg-neutral-100",
  glass: "bg-white/16 text-white backdrop-blur-[1rem] hover:bg-white/24",
  outline: "border border-neutral-300 text-primary-600 hover:border-primary-600",
};

/** Figma "Button": 6px radius, 8/20 padding, Inter 600 (14/21 on mobile, 16/24 on desktop). */
export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-[0.375rem] px-2 py-2 text-14 whitespace-nowrap desktop:px-5 leading-[1.5] font-semibold transition-colors desktop:text-16",
    buttonVariants[variant],
    className,
  );

export function ButtonLink({
  href,
  variant,
  className,
  ...rest
}: { href: string; variant?: ButtonVariant } & Omit<ComponentProps<typeof Link>, "href">) {
  const external = /^https?:\/\//.test(href);
  return (
    <Link
      href={href}
      className={buttonClass(variant, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    />
  );
}
