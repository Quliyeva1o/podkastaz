"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CalendarCheck, Envelope, X } from "@phosphor-icons/react/ssr";
import { cx } from "./ui";

type NavItem = { label: string; href: string; target: string };
type Card = { title: string; text: string; href: string };

/**
 * Menu button + full-screen black overlay (Figma "Menu" 1440 and "Mob/Menu" 320), the same
 * on every screen size: big links on the left, the orange "Rezervasiya et" and dark "Əlaqə"
 * cards (bottom right on desktop, under the links on mobile), legal links at the bottom.
 */
export function MenuOverlay({
  openLabel,
  closeLabel,
  buttonClassName,
  icon,
  current,
  nav,
  booking,
  contact,
  legal,
}: {
  openLabel: string;
  closeLabel: string;
  buttonClassName: string;
  icon: ReactNode;
  current: string;
  nav: NavItem[];
  booking: Card & { background?: ReactNode };
  contact: Card;
  legal: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const trigger = openButton.current;
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={openButton}
        type="button"
        aria-label={openLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cx("-m-px flex size-10 items-center justify-center transition-transform duration-200 hover:scale-110", buttonClassName)}
      >
        {icon}
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openLabel}
            className="menu-overlay fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black text-white"
          >
            <div className="container-page relative flex min-h-full flex-col px-4 pt-17.5 pb-5 desktop:grid desktop:grid-cols-[1fr_auto] desktop:grid-rows-[1fr_auto] desktop:px-15 desktop:pt-30 desktop:pb-15.25">
              <button
                ref={closeButton}
                type="button"
                aria-label={closeLabel}
                onClick={close}
                className="absolute top-4 right-4 flex size-10 items-center justify-center desktop:top-7.5 desktop:right-15"
              >
                <X aria-hidden className="size-[2.1875rem]" />
              </button>

              <nav aria-label={openLabel} className="desktop:col-start-1 desktop:row-start-1">
                <ul className="flex flex-col gap-[0.576rem] desktop:gap-5">
                  {nav.map((item, i) => (
                    <li key={item.target} className="menu-rise" style={{ "--i": i } as React.CSSProperties}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={item.target === current ? "page" : undefined}
                        className="block text-24 leading-[1.5] font-medium transition-[color,translate] duration-300 hover:translate-x-2 hover:text-primary-400 desktop:text-54 desktop:font-semibold desktop:hover:translate-x-4"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-[1.9375rem] flex flex-col gap-2.5 desktop:col-start-2 desktop:row-span-2 desktop:row-start-1 desktop:mt-0 desktop:flex-row desktop:gap-7.5 desktop:self-end">
                <MenuCard card={booking} icon={CalendarCheck} onNavigate={close} className="bg-primary-600" index={nav.length}>
                  {booking.background}
                </MenuCard>
                <MenuCard card={contact} icon={Envelope} onNavigate={close} className="bg-white/10" index={nav.length + 1} />
              </div>

              <p className="menu-rise mt-[1.8125rem] flex items-center gap-2.5 font-roboto text-14 leading-none desktop:col-start-1 desktop:row-start-2 desktop:mt-10 desktop:gap-4 desktop:text-18">
                {legal.map((l, i) => (
                  <span key={l.href} className="contents">
                    {i > 0 && (
                      <span aria-hidden className="text-18">
                        /
                      </span>
                    )}
                    <Link href={l.href} onClick={close} className="transition-colors hover:text-primary-400">
                      {l.label}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuCard({
  card,
  icon: Icon,
  onNavigate,
  className,
  index,
  children,
}: {
  card: Card;
  icon: typeof CalendarCheck;
  onNavigate: () => void;
  className: string;
  index: number;
  children?: ReactNode;
}) {
  return (
    <Link
      href={card.href}
      onClick={onNavigate}
      style={{ "--i": index } as React.CSSProperties}
      className={cx(
        // Mobile: Figma makes the cards 292 wide (4px past the 16px margin on the right).
        "menu-rise group/card relative flex w-[18.25rem] items-start tablet:w-auto gap-2.5 overflow-hidden rounded-[0.375rem] p-3 desktop:h-[19.5625rem] desktop:w-[19.21875rem] desktop:flex-col desktop:justify-between desktop:gap-7.5 desktop:px-5 desktop:py-7.5",
        className,
      )}
    >
      {children && (
        // Own box: the <source>s of a display:contents <picture> would otherwise count as flex items.
        <span aria-hidden className="absolute inset-0">
          {children}
        </span>
      )}
      <Icon aria-hidden weight="duotone" className="relative size-[1.875rem] shrink-0 desktop:size-16" />
      <span className="relative flex flex-1 flex-col gap-1 desktop:w-full desktop:flex-none desktop:gap-2.5">
        <span className="text-16 leading-[1.15] font-semibold tracking-tight desktop:text-24">{card.title}</span>
        <span className="text-14 leading-[1.5] tracking-tight desktop:text-16">{card.text}</span>
      </span>
      <span
        aria-hidden
        className="relative hidden size-9 shrink-0 items-center justify-center self-end rounded-full bg-white text-primary-600 transition-transform group-hover/card:translate-x-1 desktop:flex"
      >
        <ArrowRight className="size-[1.4rem]" />
      </span>
    </Link>
  );
}
