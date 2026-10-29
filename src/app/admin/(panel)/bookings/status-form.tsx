"use client";

import { useActionState } from "react";
import type { ActionResult } from "../pages/actions";
import { Button, inputClass, labelClass, StatusText } from "../_components/cms";
import { updateBookingAction } from "./actions";

/** Status + admin note + "email the customer" for one booking. */
export function StatusForm({
  id,
  status,
  note,
  options,
  canMail,
}: {
  id: string;
  status: string;
  note: string;
  options: { value: string; label: string }[];
  canMail: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateBookingAction, null);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className={labelClass}>Status</span>
        <select name="status" defaultValue={status} className={inputClass}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelClass}>Admin qeydi (müştəri görmür)</span>
        <textarea name="note" defaultValue={note} rows={4} maxLength={2000} className={inputClass} />
      </label>
      {canMail && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="notify" defaultChecked className="size-4 accent-ink" />
          Status dəyişəndə müştəriyə email göndər
        </label>
      )}
      <div className="flex items-center justify-end gap-4">
        <StatusText state={state} />
        <Button type="submit" variant="success" disabled={pending}>
          {pending ? "Saxlanılır…" : "Yadda saxla"}
        </Button>
      </div>
    </form>
  );
}
