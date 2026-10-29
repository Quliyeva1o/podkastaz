"use client";

import { useActionState } from "react";
import type { ActionResult } from "../pages/actions";
import { Button, inputClass, labelClass, StatusText } from "../_components/cms";
import { updatePackageRequestAction } from "./actions";
import { requestStatusLabels } from "./labels";

export function RequestStatusForm({ id, status, note }: { id: string; status: string; note: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updatePackageRequestAction, null);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className={labelClass}>Status</span>
        <select name="status" defaultValue={status} className={inputClass}>
          {Object.entries(requestStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelClass}>Admin qeydi</span>
        <textarea name="note" defaultValue={note} rows={4} maxLength={2000} className={inputClass} />
      </label>
      <div className="flex items-center justify-end gap-4">
        <StatusText state={state} />
        <Button type="submit" variant="success" disabled={pending}>
          {pending ? "Saxlanılır…" : "Yadda saxla"}
        </Button>
      </div>
    </form>
  );
}
