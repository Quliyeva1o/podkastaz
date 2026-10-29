import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/ssr";
import { cx } from "./ui";

export type Crumb = { name: string; path: string };

/**
 * Figma breadcrumb row under the header: grey links, orange carets, the current page dark.
 * Mobile shows only the caret and the current page.
 */
export function Breadcrumb({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className="container-page px-4 desktop:px-15">
      <ol className="flex items-center gap-2.5 text-16 leading-[1.5] tracking-tight">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path + i} className={cx("items-center gap-2.5", last ? "flex min-w-0" : "hidden desktop:flex")}>
              {i > 0 && <CaretRight aria-hidden weight="bold" className="size-6 shrink-0 text-primary-600" />}
              {last ? (
                <span aria-current="page" className="truncate text-neutral-950">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="text-neutral-600 transition-colors hover:text-neutral-950">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
