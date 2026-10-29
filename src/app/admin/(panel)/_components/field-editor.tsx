"use client";

import { ArrowDown, ArrowUp, Plus, Trash } from "@phosphor-icons/react";
import { locales, type Locale, type Localized } from "@/i18n/config";
import { emptyObject, linkTargets, type Field, type LinkValue } from "@/sections/fields";
import { buttonClass, inputClass, labelClass } from "./cms";
import { Switch } from "./cms-client";
import { ImagePicker } from "./image-picker";
import { useMediaLibrary } from "./media-library";

type Value = Record<string, unknown>;

/** Fields shown in the right-hand column of an edit page (like Şəkil / Link / Status in the old panel). */
export const isSideField = (f: Field) =>
  f.kind === "image" || f.kind === "video" || f.kind === "media" || f.kind === "plain" || f.kind === "select" || f.kind === "toggle";

/** Languages with at least one empty localized text among the given fields. */
export function missingLocales(fields: Field[], value: Value): Locale[] {
  const out = new Set<Locale>();
  const walk = (fs: Field[], v: Value) => {
    for (const f of fs) {
      const x = v?.[f.name];
      if (f.kind === "text") {
        const t = (x ?? {}) as Localized;
        // Only flag partially translated texts; fully empty optional fields are fine.
        if (locales.some((l) => t[l]?.trim())) for (const l of locales) if (!t[l]?.trim()) out.add(l);
      }
      if (f.kind === "list" && Array.isArray(x)) for (const item of x) walk(f.fields, item as Value);
    }
  };
  walk(fields, value);
  return [...out];
}

/** Renders inputs for a list of fields. Localized texts show only the active language. */
export function FieldsEditor({
  fields,
  value,
  onChange,
  lang,
}: {
  fields: Field[];
  value: Value;
  onChange: (next: Value) => void;
  lang: Locale;
}) {
  return (
    <div className="flex flex-col gap-5">
      {fields.map((field) => (
        <FieldEditor
          key={field.name}
          field={field}
          value={value[field.name]}
          lang={lang}
          onChange={(v) => onChange({ ...value, [field.name]: v })}
        />
      ))}
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
  lang,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  lang: Locale;
}) {
  switch (field.kind) {
    case "text":
      return <LocalizedInput label={field.label} multiline={field.multiline} value={value as Localized} lang={lang} onChange={onChange} />;
    case "plain":
      return (
        <label className="block">
          <span className={labelClass}>{field.label}</span>
          <input className={inputClass} value={(value as string) ?? ""} placeholder={field.hint} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "image":
      return <ImagePicker label={field.label} value={(value as string | null) ?? null} onChange={onChange} />;
    case "video":
      return <ImagePicker kind="video" label={field.label} value={(value as string | null) ?? null} onChange={onChange} />;
    case "media":
      return <ImagePicker kind="any" label={field.label} value={(value as string | null) ?? null} onChange={onChange} />;
    case "link":
      return <LinkInput label={field.label} value={value as LinkValue} lang={lang} onChange={onChange} />;
    case "list":
      return <ListEditor field={field} value={(value as Value[]) ?? []} lang={lang} onChange={onChange} />;
    case "select":
      return (
        <label className="block">
          <span className={labelClass}>{field.label}</span>
          <select className={inputClass} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case "toggle":
      return (
        <div className="flex justify-end">
          <Switch label={field.label} checked={Boolean(value)} onChange={onChange} />
        </div>
      );
  }
}

function LocalizedInput({
  label,
  multiline,
  value,
  lang,
  onChange,
}: {
  label: string;
  multiline?: boolean;
  value: Localized | undefined;
  lang: Locale;
  onChange: (v: Localized) => void;
}) {
  const v = value ?? ({ az: "", en: "", ru: "" } as Localized);
  const missing = locales.filter((l) => !v[l]?.trim());
  const set = (text: string) => onChange({ ...v, [lang]: text });
  const empty = missing.includes(lang) && missing.length < locales.length;

  return (
    <label className="block">
      <span className={`${labelClass} flex items-center gap-2`}>
        {label}
        {missing.length > 0 && missing.length < locales.length && (
          <span className="rounded-[3px] bg-cms-danger/10 px-1.5 text-[12px] font-normal text-cms-danger">
            boş: {missing.map((l) => l.toUpperCase()).join(", ")}
          </span>
        )}
      </span>
      {multiline ? (
        <textarea
          className={`${inputClass} min-h-28 ${empty ? "border-cms-danger" : ""}`}
          value={v[lang] ?? ""}
          lang={lang}
          onChange={(e) => set(e.target.value)}
        />
      ) : (
        <input className={`${inputClass} ${empty ? "border-cms-danger" : ""}`} value={v[lang] ?? ""} lang={lang} onChange={(e) => set(e.target.value)} />
      )}
    </label>
  );
}

function LinkInput({
  label,
  value,
  lang,
  onChange,
}: {
  label: string;
  value: LinkValue | undefined;
  lang: Locale;
  onChange: (v: LinkValue) => void;
}) {
  const v = value ?? { label: { az: "", en: "", ru: "" }, target: "" };
  const listId = `targets-${label.replace(/\W+/g, "-")}`;
  return (
    <fieldset className="grid grid-cols-1 gap-4 rounded-2xl border border-cms-line p-4 sm:grid-cols-2">
      <legend className="px-1 text-[14px] font-medium text-cms-label">{label}</legend>
      <LocalizedInput label="Düymə mətni" value={v.label} lang={lang} onChange={(l) => onChange({ ...v, label: l })} />
      <label className="block">
        <span className={labelClass}>Link</span>
        <input
          className={inputClass}
          list={listId}
          placeholder="about, #contact və ya https://…"
          value={v.target}
          onChange={(e) => onChange({ ...v, target: e.target.value.trim() })}
        />
        <datalist id={listId}>
          {linkTargets.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
    </fieldset>
  );
}

function ListEditor({
  field,
  value,
  lang,
  onChange,
}: {
  field: Extract<Field, { kind: "list" }>;
  value: Value[];
  lang: Locale;
  onChange: (v: Value[]) => void;
}) {
  const update = (i: number, item: Value) => onChange(value.map((x, j) => (j === i ? item : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  // Text fields span the card; images / short values sit in a narrow column beside them.
  const main = field.fields.filter((f) => !isSideField(f));
  const side = field.fields.filter(isSideField);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[1.125rem] font-semibold text-cms-text">
        {field.label} <span className="text-[14px] text-cms-faint">({value.length})</span>
      </legend>
      {value.map((item, i) => (
        // The move/delete buttons sit over the header but outside <summary> (interactive content
        // inside <summary> is invalid and unreachable by keyboard/screen readers).
        <div key={i} className="relative">
          <details className="group overflow-hidden rounded-2xl border border-cms-line bg-[#fafafa]" open={value.length <= 3}>
            <summary className="flex min-h-15 cursor-pointer list-none items-center gap-3 py-3 pr-28 pl-4 select-none">
              <span className="text-cms-link group-open:rotate-90">›</span>
              <ItemThumb fields={field.fields} item={item} />
              <span className="flex-1 font-medium text-cms-label">
                {field.itemLabel} {i + 1}
                <span className="ml-2 font-normal text-cms-muted">{preview(field.fields, item, lang)}</span>
              </span>
            </summary>
            <div className={`grid gap-5 border-t border-cms-line bg-white p-4 ${main.length && side.length ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}`}>
              {main.length > 0 && <FieldsEditor fields={main} value={item} lang={lang} onChange={(next) => update(i, next)} />}
              {side.length > 0 && <FieldsEditor fields={side} value={item} lang={lang} onChange={(next) => update(i, next)} />}
            </div>
          </details>
          <span className="absolute top-0 right-4 flex h-15 items-center gap-1 text-cms-link">
            <button type="button" onClick={() => move(i, -1)} aria-label="Yuxarı" className="rounded-full p-1 hover:bg-highlight hover:text-white">
              <ArrowUp size={16} />
            </button>
            <button type="button" onClick={() => move(i, 1)} aria-label="Aşağı" className="rounded-full p-1 hover:bg-highlight hover:text-white">
              <ArrowDown size={16} />
            </button>
            <button
              type="button"
              aria-label="Sil"
              onClick={() => window.confirm(`${field.itemLabel} ${i + 1} silinsin?`) && onChange(value.filter((_, j) => j !== i))}
              className="ml-1 p-1 text-cms-danger hover:brightness-90"
            >
              <Trash size={16} />
            </button>
          </span>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, emptyObject(field.fields)])}
        className={buttonClass("primary", "self-start")}
      >
        <Plus size={14} weight="bold" /> {field.itemLabel} əlavə et
      </button>
    </fieldset>
  );
}

/** Short label for a collapsed list item: its first non-empty text. */
function preview(fields: Field[], item: Value, lang: Locale) {
  for (const f of fields) {
    const v = item[f.name];
    if (f.kind === "text") {
      const t = (v as Localized)?.[lang] || (v as Localized)?.az;
      if (t) return `— ${t.slice(0, 50)}`;
    }
    if (f.kind === "plain" && typeof v === "string" && v) return `— ${v.slice(0, 50)}`;
  }
  return "";
}

/** First image of a list item as a small thumbnail (team photo, partner logo …). */
function ItemThumb({ fields, item }: { fields: Field[]; item: Value }) {
  const { byId } = useMediaLibrary();
  const f = fields.find((x) => x.kind === "image" && item[x.name]);
  const img = f ? byId(item[f.name] as string) : undefined;
  if (!fields.some((x) => x.kind === "image")) return null;
  return (
    <span className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cms-bg">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
      {img && <img src={img.url} alt="" width={img.width ?? 48} height={img.height ?? 36} className="size-full object-contain" />}
    </span>
  );
}
