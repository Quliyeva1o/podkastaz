"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Field } from "@/sections/fields";
import type { ActionResult } from "../pages/actions";
import { Button, Card, EditGrid, inputClass, labelClass, StatusText } from "./cms";
import { LangTabs, Switch } from "./cms-client";
import { FieldsEditor, isSideField, missingLocales } from "./field-editor";
import { MediaLibraryProvider } from "./media-library";
import { keepFormSubmit } from "./use-keep-form";

/**
 * Editor for a row of an own table (studio, decor): the section field editor for the content,
 * slug + active switch + `side` (extra inputs, e.g. opening hours) in the right column.
 */
export function RecordEditor({
  action,
  hidden,
  fields,
  initialData,
  slug,
  active,
  side,
  aside,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  hidden: Record<string, string>;
  fields: Field[];
  initialData: Record<string, unknown>;
  slug: string;
  active: boolean;
  side?: ReactNode;
  aside?: ReactNode;
}) {
  const [data, setData] = useState(initialData);
  const [lang, setLang] = useState<Locale>("az");
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);

  const title = fields.filter((f) => f.name === "title");
  const meta = fields.filter((f) => f.name.startsWith("seo"));
  const content = fields.filter((f) => !isSideField(f) && f.name !== "title" && !f.name.startsWith("seo"));
  const media = fields.filter(isSideField);

  return (
    <MediaLibraryProvider>
      <form action={formAction} onSubmit={keepFormSubmit(formAction)}>
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name="data" value={JSON.stringify(data)} />
        <EditGrid
          main={
            <Card>
              <LangTabs lang={lang} onChange={setLang} missing={missingLocales(fields, data)} />
              <div className="flex flex-col gap-5">
                <FieldsEditor fields={title} value={data} onChange={setData} lang={lang} />
                <label className="block">
                  <span className={labelClass}>Slug (URL)</span>
                  <input
                    name="slug"
                    defaultValue={slug.startsWith("new-") ? "" : slug}
                    placeholder="boş qalsa addan yaranır"
                    className={`${inputClass} bg-cms-bg`}
                  />
                </label>
                <FieldsEditor fields={content} value={data} onChange={setData} lang={lang} />
                {meta.length > 0 && (
                  <>
                    <h3 className="mt-4 text-[1.25rem] font-semibold text-cms-text">Meta</h3>
                    <FieldsEditor fields={meta} value={data} onChange={setData} lang={lang} />
                  </>
                )}
              </div>
            </Card>
          }
          side={
            <>
              <Card>
                <div className="flex flex-col gap-5">
                  <FieldsEditor fields={media} value={data} onChange={setData} lang={lang} />
                  <div className="flex justify-end">
                    <Switch name="active" defaultChecked={active} label="Saytda göstərilsin" />
                  </div>
                  <div className="flex items-center justify-end gap-4">
                    <StatusText state={state} />
                    <Button type="submit" variant="success" disabled={pending} data-save>
                      {pending ? "Saxlanılır…" : "Yadda saxla"}
                    </Button>
                  </div>
                </div>
              </Card>
              {side}
              {aside}
            </>
          }
        />
      </form>
    </MediaLibraryProvider>
  );
}
