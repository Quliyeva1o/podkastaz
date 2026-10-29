"use client";

import { useActionState } from "react";
import type { ActionResult } from "../pages/actions";
import { Button, inputClass, labelClass, StatusText } from "../_components/cms";
import { addRedirectAction } from "./actions";

export function RedirectForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addRedirectAction, null);
  return (
    <form action={action} className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1fr_auto_auto]">
      <label className="block">
        <span className={labelClass}>Köhnə ünvan</span>
        <input name="from" required placeholder="/xeber/brendinq-nedir" className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Yeni ünvan</span>
        <input name="to" required placeholder="/bloq" className={inputClass} />
      </label>
      <label className="flex items-center gap-2 pb-3 text-[14px]">
        <input type="checkbox" name="temporary" className="size-4" /> Müvəqqəti (302)
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Əlavə et
        </Button>
        <StatusText state={state} />
      </div>
    </form>
  );
}
