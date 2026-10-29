import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Admin building blocks: the previous marketinq.az/cms layout (cards, tables, two-column forms)
 * in the new brand style — ink, orange accent, Inter, rounded cards and pill buttons.
 */

export function Card({
  children,
  className = "",
  accent = true,
  title,
}: {
  children: ReactNode;
  className?: string;
  /** Thin highlight bar on top (edit forms). */
  accent?: boolean;
  title?: ReactNode;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-white ${className}`}
    >
      {accent && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-highlight" />}
      <div className="p-6">
        {title && <h2 className="mb-5 text-[1.25rem] font-semibold tracking-[-0.01em] text-cms-text">{title}</h2>}
        {children}
      </div>
    </section>
  );
}

type Variant = "primary" | "info" | "danger" | "success" | "light";
const variants: Record<Variant, string> = {
  primary: "bg-ink border-ink text-white hover:bg-neutral-850",
  info: "bg-cms-bg border-cms-bg text-ink hover:border-ink",
  danger: "bg-[#fdecec] border-[#fdecec] text-cms-danger hover:bg-cms-danger hover:text-white",
  success: "bg-highlight border-highlight text-white font-medium hover:brightness-95",
  light: "bg-white border-cms-border text-ink hover:border-ink",
};
export const buttonClass = (variant: Variant = "primary", extra = "") =>
  `inline-flex items-center justify-center gap-2 rounded-full border px-4.5 py-2.5 text-[14px] leading-[1.25] whitespace-nowrap transition disabled:opacity-60 ${variants[variant]} ${extra}`;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export const inputClass =
  "w-full rounded-xl border border-cms-border bg-white px-3.5 py-2.5 text-[14px] leading-[1.25] text-cms-input placeholder:text-cms-faint focus:border-ink focus:ring-2 focus:ring-highlight/60 focus:outline-none";

export const labelClass = "mb-2 block text-[14px] font-medium text-cms-label";

/** Page title + breadcrumb row above the cards. */
export function PageHeader({
  title,
  crumbs = [],
  actions,
}: {
  title: string;
  crumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-cms-text">{title}</h1>
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mt-1 flex flex-wrap gap-1.5 text-[13px] text-cms-muted">
            {crumbs.map((c, i) => (
              <span key={i} className="flex gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {c.href ? (
                  <Link href={c.href} className="text-cms-text underline-offset-2 hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  c.label
                )}
              </span>
            ))}
          </nav>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/** Table frame: action button left, "Ümumi N, göstərilən a-b" right. */
export function TableCard({
  toolbar,
  total,
  from = 1,
  to,
  children,
  footer,
}: {
  toolbar?: ReactNode;
  total: number;
  from?: number;
  to?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card accent={false}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">{toolbar}</div>
        <p className="text-[14px]">
          Ümumi <b>{total}</b>
          {total > 0 && (
            <>
              , göstərilən{" "}
              <b>
                {from}-{to ?? total}
              </b>
            </>
          )}
        </p>
      </div>
      <div className="-mx-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">{children}</table>
      </div>
      {footer}
    </Card>
  );
}

export const th = "border-b border-cms-line px-6 py-3 text-[12px] font-medium tracking-[0.04em] text-cms-muted uppercase whitespace-nowrap";
export const td = "border-t border-cms-line px-6 py-4 align-middle";

/** Up/down arrows that submit a server action (row reordering, as in the old panel). */
export function MoveButtons({ action, hidden }: { action: (fd: FormData) => Promise<void>; hidden: Record<string, string> }) {
  return (
    <form action={action} className="flex gap-1 text-cms-link">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button name="direction" value="up" aria-label="Yuxarı" className="flex size-7 items-center justify-center rounded-full text-[15px] hover:bg-highlight hover:text-white">
        ↑
      </button>
      <button name="direction" value="down" aria-label="Aşağı" className="flex size-7 items-center justify-center rounded-full text-[15px] hover:bg-highlight hover:text-white">
        ↓
      </button>
    </form>
  );
}

/** Two-column edit layout: content (8/12) + side panel (4/12). */
export function EditGrid({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-7">{main}</div>
      <div className="flex min-w-0 flex-col gap-7 xl:sticky xl:top-20">{side}</div>
    </div>
  );
}

export function StatusText({ state }: { state: { ok: boolean; message?: string; error?: string } | null }) {
  if (!state) return null;
  return (
    <p role="status" className={`flex items-center gap-1.5 text-[13px] ${state.ok ? "text-cms-text" : "text-cms-danger"}`}>
      {state.ok && <span aria-hidden className="size-2 rounded-full bg-highlight" />}
      {state.ok ? state.message : state.error}
    </p>
  );
}
