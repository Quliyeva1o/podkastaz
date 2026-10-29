"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "../pages/actions";
import { Button, inputClass, labelClass, StatusText } from "../_components/cms";
import { keepFormSubmit } from "../_components/use-keep-form";
import { addUserAction, updateUserAction } from "./actions";

const roles = [
  { value: "editor", label: "Redaktor — məzmun, rezervasiyalar, müraciətlər" },
  { value: "admin", label: "Admin — üstəlik istifadəçilər" },
];

export function AddUserForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addUserAction, null);
  const form = useRef<HTMLFormElement>(null);
  // Typed values stay after an error; the form empties once the user is added.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} onSubmit={keepFormSubmit(action)} className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
      <label className="block">
        <span className={labelClass}>Ad</span>
        <input name="name" required maxLength={100} className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Email</span>
        <input name="email" type="email" required autoComplete="off" className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Rol</span>
        <select name="role" defaultValue="editor" className={inputClass}>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelClass}>Şifrə (ən azı 12 simvol)</span>
        <input name="password" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" data-save disabled={pending}>
          Əlavə et
        </Button>
        <StatusText state={state} />
      </div>
    </form>
  );
}

export function EditUserForm({ user, self }: { user: { id: string; name: string; role: "admin" | "editor" }; self: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateUserAction, null);
  const passwordField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state?.ok && passwordField.current) passwordField.current.value = "";
  }, [state]);
  return (
    <form action={action} onSubmit={keepFormSubmit(action)} className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_12rem_1fr_auto]">
      <input type="hidden" name="id" value={user.id} />
      <label className="block">
        <span className={labelClass}>Ad</span>
        <input name="name" required maxLength={100} defaultValue={user.name} className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Rol</span>
        <select name="role" defaultValue={user.role} disabled={self} className={inputClass}>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.value === "admin" ? "Admin" : "Redaktor"}
            </option>
          ))}
        </select>
        {/* A disabled select is not sent; your own role stays as it is. */}
        {self && <input type="hidden" name="role" value={user.role} />}
      </label>
      <label className="block">
        <span className={labelClass}>Yeni şifrə (boş = dəyişmir)</span>
        <input ref={passwordField} name="password" type="password" minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="light" data-save disabled={pending}>
          Yadda saxla
        </Button>
      </div>
      <div className="md:col-span-4">
        <StatusText state={state} />
      </div>
    </form>
  );
}
