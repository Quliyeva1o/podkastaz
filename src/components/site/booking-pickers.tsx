"use client";

import { Alarm, CalendarDots, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { addDays, bakuDate, weekday } from "@/lib/booking/time";
import { choiceCard } from "./form-controls";
import { buttonClass, cx } from "./ui";

/**
 * Date and time pickers of the booking form (Figma "Rezervasiya et (Kalendar)" / "(Saat)").
 * Each is a Figma field box that opens a panel above it, aligned
 * to its right edge: a month calendar where taken days are grey and the chosen one orange, and
 * an hour/minute picker where taken times are disabled. A visually hidden required input carries
 * the value into the form, so the browser still asks for it before sending.
 */

export type DayState = "open" | "full" | "closed" | "past" | "tooFar";
export type TimeOption = { time: string; disabled: boolean };
export type PickerLabels = Record<
  | "dateLabel" | "datePlaceholder" | "timePlaceholder"
  | "calendarToday" | "calendarTaken" | "calendarSelected" | "months" | "weekdays" | "prevMonth" | "nextMonth"
  | "hourLabel" | "minuteLabel" | "confirmTime" | "errorServer",
  string
>;

const list = (text: string, fallback: string[]) => {
  const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length === fallback.length ? parts : fallback;
};
const monthNames = (labels: PickerLabels) =>
  list(labels.months, ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"]);
const dayNames = (labels: PickerLabels) => list(labels.weekdays, ["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."]);

/** "2026-11-20" → "20/11/2026" (Figma's field value). */
export const displayDate = (date: string) => (date ? date.split("-").reverse().join("/") : "");
/** "18:30" → "18 : 30"; a booking that runs to midnight ends at "24:00", shown as 00 : 00. */
export const displayTime = (time: string) => (time ? (time === "24:00" ? "00:00" : time).replace(":", " : ") : "");

const PANEL_MARGIN = 8;

function keepOnScreen(el: HTMLElement) {
  const { top, bottom } = el.getBoundingClientRect();
  if (top < PANEL_MARGIN) window.scrollBy(0, top - PANEL_MARGIN);
  else if (bottom > window.innerHeight - PANEL_MARGIN) window.scrollBy(0, bottom - window.innerHeight + PANEL_MARGIN);
}

/**
 * Open/close with outside click and Escape. The panel always opens above the field, as in Figma:
 * the page ends right under these fields, so below it would hang over empty space.
 */
function usePopover(trigger: RefObject<HTMLButtonElement | null>, panel: RefObject<HTMLDivElement | null>) {
  const [open, setOpen] = useState(false);
  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  }, [trigger]);
  const show = useCallback(() => setOpen(true), []);
  const toggle = useCallback(() => (open ? close(false) : show()), [open, close, show]);

  // rem follows the screen width, so on a wide but low screen the panel can be taller than the
  // screen: it shrinks to fit (also when the next month has a week more)…
  useLayoutEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    const fit = () => {
      const zoom = Number(el.style.getPropertyValue("zoom")) || 1;
      const natural = el.getBoundingClientRect().height / zoom;
      const next = Math.min(1, Math.floor(((window.innerHeight - PANEL_MARGIN * 2) / natural) * 1000) / 1000);
      if (Math.abs(next - zoom) > 0.002) el.style.setProperty("zoom", String(next));
    };
    fit();
    const watcher = new ResizeObserver(() => {
      fit();
      keepOnScreen(el);
    });
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [open, panel]);

  // …and the page moves so all of it shows (after the calendar has focused its day).
  useEffect(() => {
    if (open && panel.current) keepOnScreen(panel.current);
  }, [open, panel]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) close(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // Tabbing out of the panel closes it too.
    const onFocus = (e: FocusEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, panel, trigger]);

  return { open, show, toggle, close };
}

/** Figma field box: label, value (or grey placeholder), icon; orange border while its panel is open. */
function FieldBox({
  label,
  value,
  placeholder,
  icon,
  open,
  disabled,
  onClick,
  buttonRef,
  panelId,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: ReactNode;
  open: boolean;
  disabled?: boolean;
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  panelId: string;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      className={cx(
        choiceCard,
        "w-full items-start bg-white text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed",
        open ? "border-primary-500" : "border-neutral-200 hover:border-neutral-400 disabled:hover:border-neutral-200",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-14 leading-[1.5] tracking-tight">{label}</span>
        <span className={cx("text-20 leading-[1.15] tracking-tight", !value && "text-neutral-600")}>{value || placeholder}</span>
      </span>
      {icon}
    </button>
  );
}

/**
 * The value travels in a visually hidden text input: `required` stops the form while it is empty
 * and the browser focuses it, which opens the picker. Not `readOnly`: read-only inputs skip
 * validation.
 */
function FormValue({ name, value, onFocus }: { name: string; value: string; onFocus: () => void }) {
  return (
    <input
      name={name}
      value={value}
      required
      tabIndex={-1}
      aria-hidden
      onChange={() => {}}
      onFocus={onFocus}
      className="pointer-events-none absolute bottom-0 left-1/2 size-px opacity-0"
    />
  );
}

const panelBase = "absolute right-0 z-20 scroll-my-28 bg-white";
// Figma: the calendar sits 16px above its field, the time picker 14px.

// ---------------------------------------------------------------- Date

export function DatePicker({
  studio,
  value,
  onChange,
  labels,
  disabled,
}: {
  studio: string;
  value: string;
  onChange: (date: string) => void;
  labels: PickerLabels;
  disabled?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { open, show, toggle, close } = usePopover(trigger, panel);

  return (
    <div className="relative">
      <FieldBox
        label={labels.dateLabel}
        value={displayDate(value)}
        placeholder={labels.datePlaceholder}
        icon={<CalendarDots aria-hidden className="size-6 shrink-0 text-primary-600" />}
        open={open}
        disabled={disabled}
        onClick={toggle}
        buttonRef={trigger}
        panelId={panelId}
      />
      <FormValue name="date" value={value} onFocus={show} />
      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={labels.dateLabel}
          className={cx(
            panelBase,
            "bottom-[calc(100%+1rem)]",
            "w-full rounded-3xl border border-neutral-200 p-4 shadow-[0_0.625rem_1rem_rgb(93_114_132/0.2)] desktop:w-[31.375rem] desktop:p-[1.8125rem] desktop:shadow-none",
          )}
        >
          <Calendar
            studio={studio}
            value={value}
            labels={labels}
            onPick={(d) => {
              onChange(d);
              close();
            }}
          />
        </div>
      )}
    </div>
  );
}

const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 10);
};

/** Figma "Calendar": month + arrows, 7 columns of 64px cells, legend (today, taken, chosen). */
function Calendar({ studio, value, labels, onPick }: { studio: string; value: string; labels: PickerLabels; onPick: (d: string) => void }) {
  const today = bakuDate();
  const [month, setMonth] = useState(() => monthStart(value || today));
  const [focus, setFocus] = useState(value || today);
  const [states, setStates] = useState<{ key: string; days: Record<string, DayState> } | null>(null);
  const [failed, setFailed] = useState(false);
  // Focus follows the arrow keys (and enters the grid on opening), never the month buttons.
  const moveFocus = useRef(true);
  const grid = useRef<HTMLDivElement>(null);

  const first = month;
  const gridStart = addDays(first, -weekday(first));
  const daysInMonth = new Date(Date.UTC(Number(first.slice(0, 4)), Number(first.slice(5, 7)), 0)).getUTCDate();
  const weeks = Math.ceil((weekday(first) + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  const key = `${studio}|${gridStart}|${weeks}`;

  // Day states of the visible weeks (never cached: bookings change every minute).
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/availability?studio=${studio}&from=${gridStart}&days=${weeks * 7}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((j: { days: Record<string, DayState> }) => {
        setStates({ key, days: j.days });
        setFailed(false);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setFailed(true);
      });
    return () => ctrl.abort();
  }, [studio, gridStart, weeks, key]);

  const days = states?.key === key ? states.days : null;
  const inMonth = (d: string) => d.slice(0, 7) === month.slice(0, 7);
  const pickable = (d: string) => inMonth(d) && days?.[d] === "open";
  const canPrev = month > monthStart(today);
  const lastDay = addDays(first, daysInMonth - 1);
  const canNext = !days || (days[lastDay] !== "tooFar" && days[lastDay] !== undefined);

  // Arrow keys move the focused day (and the month with it); Enter / Space pick it.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus({ preventScroll: true });
  }, [focus, month]);
  const move = (by: number) => {
    const next = addDays(focus, by);
    if (next < today || (next > lastDay && !canNext)) return;
    moveFocus.current = true;
    setFocus(next);
    if (!inMonth(next)) setMonth(monthStart(next));
  };
  // After the month buttons the focused day may lie outside the month: its first day takes the tab stop.
  const tabStop = inMonth(focus) ? focus : first;
  const onKey = (e: React.KeyboardEvent) => {
    const by = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (by) {
      e.preventDefault();
      move(by);
    }
  };

  const names = monthNames(labels);
  const title = `${names[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
  const arrow = "flex size-[2.875rem] items-center justify-center rounded-full text-neutral-950 transition-colors hover:bg-neutral-50 disabled:text-neutral-200 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <div className="flex h-[2.875rem] items-center justify-between">
          <p aria-live="polite" className="text-20 leading-[1.32] font-semibold tracking-tight">
            {title}
          </p>
          <div className="flex gap-2">
            <button type="button" className={arrow} disabled={!canPrev} aria-label={labels.prevMonth} onClick={() => setMonth(shiftMonth(month, -1))}>
              <CaretLeft aria-hidden weight="bold" className="size-3.5" />
            </button>
            <button type="button" className={arrow} disabled={!canNext} aria-label={labels.nextMonth} onClick={() => setMonth(shiftMonth(month, 1))}>
              <CaretRight aria-hidden weight="bold" className="size-3.5" />
            </button>
          </div>
        </div>
        <div role="grid" aria-label={title} aria-busy={!days} onKeyDown={onKey} ref={grid}>
          {/* Figma: 64px cells whose 1px borders overlap (-1 spacing), so every line is 1px. */}
          <div role="row" className="flex">
            {dayNames(labels).map((n) => (
              <span key={n} role="columnheader" className="-ml-px flex aspect-square flex-1 items-center justify-center text-14 leading-[1.5] first:ml-0 desktop:size-16 desktop:flex-none">
                {n}
              </span>
            ))}
          </div>
          {Array.from({ length: weeks }, (_, w) => (
            <div key={w} role="row" className="-mt-px flex">
              {cells.slice(w * 7, w * 7 + 7).map((d) => {
                const state = days?.[d];
                const outside = !inMonth(d);
                const chosen = d === value && !outside;
                const isToday = d === today && !outside;
                const taken = !outside && (state === "full" || state === "closed");
                const ok = pickable(d);
                return (
                  <div key={d} role="gridcell" aria-selected={chosen} className="-ml-px flex-1 first:ml-0 desktop:flex-none">
                    <button
                      type="button"
                      data-date={d}
                      tabIndex={d === tabStop ? 0 : -1}
                      aria-disabled={!ok}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${Number(d.slice(8))} ${names[Number(d.slice(5, 7)) - 1]}${taken ? `, ${labels.calendarTaken}` : ""}`}
                      onClick={() => ok && onPick(d)}
                      onFocus={() => setFocus(d)}
                      className={cx(
                        "flex aspect-square w-full items-center justify-center border border-neutral-200 text-14 leading-[1.5] outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary-300 desktop:size-16",
                        chosen
                          ? "bg-primary-500 text-white"
                          : isToday
                            ? "bg-neutral-950 text-white"
                            : taken
                              ? "bg-neutral-100 text-neutral-500"
                              : outside || !ok
                                ? "bg-white text-neutral-200"
                                : "bg-white text-neutral-950 hover:bg-primary-50 hover:text-primary-600",
                        ok ? "cursor-pointer" : "cursor-not-allowed",
                      )}
                    >
                      {Number(d.slice(8))}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {failed && (
        <p role="alert" className="text-14 leading-[1.5] text-[#e5484d]">
          {labels.errorServer}
        </p>
      )}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-14 leading-[1.5] tracking-tight desktop:text-16">
        {[
          [labels.calendarToday, "bg-neutral-950"],
          [labels.calendarTaken, "bg-neutral-100"],
          [labels.calendarSelected, "bg-primary-500"],
        ].map(([text, dot]) => (
          <li key={text} className="flex items-center gap-2">
            <span aria-hidden className={cx("size-[1.125rem] rounded-full", dot)} />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- Time

export function TimePicker({
  name,
  label,
  value,
  options,
  onChange,
  labels,
  onOpen,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  options: TimeOption[];
  onChange: (time: string) => void;
  labels: PickerLabels;
  /** Called when the panel opens: the form reloads the free times. */
  onOpen: () => void;
  disabled?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { open, show, toggle, close } = usePopover(trigger, panel);
  const opening = () => {
    if (!open) onOpen();
    toggle();
  };

  return (
    <div className="relative">
      <FieldBox
        label={label}
        value={displayTime(value)}
        placeholder={labels.timePlaceholder}
        icon={<Alarm aria-hidden className="size-6 shrink-0 text-primary-600" />}
        open={open}
        disabled={disabled || !options.some((o) => !o.disabled)}
        onClick={opening}
        buttonRef={trigger}
        panelId={panelId}
      />
      <FormValue name={name} value={value} onFocus={show} />
      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cx(panelBase, "bottom-[calc(100%+0.875rem)] w-[14.25rem] rounded-[0.875rem] border border-neutral-200 p-4 shadow-[0_0.625rem_1rem_rgb(93_114_132/0.2)]")}
        >
          <TimeWheel
            label={label}
            value={value}
            options={options}
            labels={labels}
            onConfirm={(t) => {
              onChange(t);
              close();
            }}
          />
        </div>
      )}
    </div>
  );
}

const split = (t: string) => {
  const [h, m] = (t === "24:00" ? "24:00" : t).split(":");
  return { h, m };
};

/** Figma "Frame 2095585346": label + chosen time, Saat : Dəqiqə columns (taken times grey), Təsdiq et. */
function TimeWheel({ label, value, options, labels, onConfirm }: { label: string; value: string; options: TimeOption[]; labels: PickerLabels; onConfirm: (t: string) => void }) {
  const firstFree = options.find((o) => !o.disabled)?.time ?? "";
  const [picked, setPicked] = useState(value);
  // Free times reload while the panel is open: a time just taken falls back to the first free one.
  const draft = options.some((o) => o.time === picked && !o.disabled) ? picked : firstFree;
  const { h, m } = split(draft);

  const hours = [...new Set(options.map((o) => split(o.time).h))];
  const hourFree = (hh: string) => options.some((o) => split(o.time).h === hh && !o.disabled);
  const minutes = options.filter((o) => split(o.time).h === h);

  const pickHour = (hh: string) => {
    const same = options.find((o) => o.time === `${hh}:${m}` && !o.disabled);
    setPicked(same?.time ?? options.find((o) => split(o.time).h === hh && !o.disabled)?.time ?? draft);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-14 leading-[1.5] font-medium">{label}</p>
        <p aria-live="polite" className="text-24 leading-[1.15] font-semibold tracking-tight">
          {draft === "24:00" ? "00:00" : draft || "–"}
        </p>
      </div>
      <div className="flex items-center gap-5">
        <Wheel
          title={labels.hourLabel}
          items={hours.map((hh) => ({ key: hh, text: hh === "24" ? "00" : hh, selected: hh === h, disabled: !hourFree(hh) }))}
          onPick={pickHour}
        />
        <span aria-hidden className="text-18 leading-[1.32] font-medium tracking-tight">
          :
        </span>
        <Wheel
          title={labels.minuteLabel}
          items={minutes.map((o) => ({ key: o.time, text: split(o.time).m, selected: o.time === draft, disabled: o.disabled }))}
          onPick={setPicked}
        />
      </div>
      <button type="button" disabled={!draft} onClick={() => onConfirm(draft)} className={buttonClass("primary", "h-10 w-full disabled:bg-neutral-100 disabled:text-neutral-300")}>
        {labels.confirmTime}
      </button>
    </div>
  );
}

/** One scrolling column: 5 rows of 36px visible, faded at the top and bottom, the chosen row centred. */
function Wheel({ title, items, onPick }: { title: string; items: { key: string; text: string; selected: boolean; disabled: boolean }[]; onPick: (key: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = items.find((i) => i.selected)?.key;
  useLayoutEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (el && box.current) box.current.scrollTop = el.offsetTop - box.current.clientHeight / 2 + el.offsetHeight / 2;
  }, [selected]);

  const onKey = (e: React.KeyboardEvent) => {
    const by = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    const at = items.findIndex((i) => i.selected);
    for (let i = at + by; i >= 0 && i < items.length; i += by) {
      if (!items[i].disabled) return onPick(items[i].key);
    }
  };

  return (
    <div className="flex w-[4.625rem] flex-col items-center gap-1">
      <p className="text-14 leading-[1.5] font-medium">{title}</p>
      <div className="relative w-full">
        <div
          ref={box}
          role="listbox"
          aria-label={title}
          tabIndex={0}
          aria-activedescendant={selected ? `${id}-${selected}` : undefined}
          onKeyDown={onKey}
          className="h-[12.5rem] overflow-y-auto overscroll-contain rounded-md p-2.5 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-primary-300 [&::-webkit-scrollbar]:hidden"
        >
          {/* Space above and below so the first and last rows can sit in the middle. */}
          <div className="h-[4.5rem]" />
          {items.map((i) => (
            <div
              key={i.key}
              id={`${id}-${i.key}`}
              role="option"
              aria-selected={i.selected}
              aria-disabled={i.disabled}
              onClick={() => !i.disabled && onPick(i.key)}
              className={cx(
                "flex h-9 items-center justify-center rounded-sm text-16 leading-[1.5] tracking-tight transition-colors",
                i.selected ? "bg-primary-100 text-primary-500" : i.disabled ? "cursor-not-allowed text-neutral-300" : "cursor-pointer text-neutral-950 hover:bg-neutral-50",
              )}
            >
              {i.text}
            </div>
          ))}
          <div className="h-[4.5rem]" />
        </div>
        {/* Figma's top fade starts 13px down; solid white above it hides rows scrolled past the edge. */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[4.8125rem] bg-linear-to-b from-white from-[17%] to-transparent" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-white to-transparent" />
      </div>
    </div>
  );
}
