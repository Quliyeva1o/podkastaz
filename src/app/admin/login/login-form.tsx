"use client";

import { useActionState } from "react";
import { login } from "../actions";

const input =
  "w-full rounded-xl border border-cms-border px-3.5 py-3 text-[14px] text-ink placeholder:text-cms-faint focus:border-ink focus:ring-2 focus:ring-highlight/60 focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-5 font-cms text-[14px] font-medium text-cms-label">
      <label className="flex flex-col gap-2">
        E-mail
        <input name="email" type="email" autoComplete="username" required placeholder="E-maili daxil edin" className={input} />
      </label>
      <label className="flex flex-col gap-2">
        Şifrə
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Şifrəni daxil edin"
          className={input}
        />
      </label>
      {state?.error && <p className="text-[13px] text-cms-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-white hover:bg-neutral-850 disabled:opacity-60"
      >
        <span aria-hidden className="size-2.5 rounded-full bg-highlight" />
        {pending ? "..." : "Daxil Ol"}
      </button>
    </form>
  );
}
