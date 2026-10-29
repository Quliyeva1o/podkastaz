"use client";

import { useActionState } from "react";
import type { ActionResult } from "../../pages/actions";
import { Button, inputClass, labelClass, StatusText } from "../../_components/cms";
import { blockTimeAction } from "../actions";

/** Closes a studio for a while (holiday, maintenance): nobody can book that time. */
export function BlockForm({ studios, date }: { studios: { id: string; name: string }[]; date: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(blockTimeAction, null);
  return (
    <form action={action} className="grid grid-cols-2 gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_2fr_auto] lg:items-end">
      <label className="col-span-2 block lg:col-span-1">
        <span className={labelClass}>Studiya</span>
        <select name="studioId" required className={inputClass}>
          {studios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 block lg:col-span-1">
        <span className={labelClass}>Tarix</span>
        <input type="date" name="date" defaultValue={date} required className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Başlama</span>
        <input type="time" name="start" defaultValue="10:00" step={300} required className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Bitmə</span>
        <input type="time" name="end" defaultValue="22:00" step={300} required className={inputClass} />
      </label>
      <label className="col-span-2 block lg:col-span-1">
        <span className={labelClass}>Səbəb (istəyə bağlı)</span>
        <input name="note" maxLength={500} placeholder="Texniki iş, bayram…" className={inputClass} />
      </label>
      <div className="col-span-2 flex items-center gap-3 lg:col-span-1">
        <Button type="submit" disabled={pending}>
          Vaxtı bağla
        </Button>
      </div>
      <div className="col-span-2 lg:col-span-6">
        <StatusText state={state} />
      </div>
    </form>
  );
}
