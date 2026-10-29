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

/** Hover for cards: a small lift with a soft shadow. */
export const cardHover =
  "transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_1.25rem_2.5rem_-1.5rem_rgb(41_39_38/0.3)]";
/** Photo that zooms a little while its `group/zoom` box is hovered (the box clips it). */
export const zoomImage = "transition-transform duration-700 ease-out group-hover/zoom:scale-[1.04]";

/** Figma "Button": 6px radius, 8/20 padding, Inter 600 16/24 (the home buttons are 14/21 on mobile). */
export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-[0.375rem] px-2 py-2 text-16 leading-[1.5] font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97] desktop:px-5",
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
