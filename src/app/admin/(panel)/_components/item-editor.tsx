"use client";

import { useActionState, useState, type ReactNode } from "react";
import { locales, type Locale, type Localized } from "@/i18n/config";
import type { Field } from "@/sections/fields";
import { saveItemAction } from "../collections/actions";
import type { ActionResult } from "../pages/actions";
import { Button, Card, EditGrid, inputClass, labelClass, StatusText } from "./cms";
import { LangTabs, Switch } from "./cms-client";
import { FieldsEditor, isSideField, missingLocales } from "./field-editor";
import { MediaLibraryProvider } from "./media-library";
import { keepFormSubmit } from "./use-keep-form";

/** Editor for one collection item, laid out like the previous panel's edit pages. */
export function ItemEditor({
  collection,
  id,
  fields,
  initialData,
  slugs,
  published,
  publishedAt,
  aside,
}: {
  collection: string;
  id: string;
  fields: Field[];
  initialData: Record<string, unknown>;
  slugs: Localized;
  published: boolean;
  publishedAt: string;
  aside?: ReactNode;
}) {
  const [data, setData] = useState(initialData);
  const [lang, setLang] = useState<Locale>("az");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveItemAction, null);

  const title = fields.filter((f) => f.name === "title");
  const meta = fields.filter((f) => f.name.startsWith("seo"));
  const content = fields.filter((f) => !isSideField(f) && f.name !== "title" && !f.name.startsWith("seo"));
  const side = fields.filter(isSideField);

  return (
    <MediaLibraryProvider>
      <form action={action} onSubmit={keepFormSubmit(action)}>
        <input type="hidden" name="collection" value={collection} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="data" value={JSON.stringify(data)} />
        <EditGrid
          main={
            <Card>
              <LangTabs lang={lang} onChange={setLang} missing={missingLocales(fields, data)} />
              <div className="flex flex-col gap-5">
                <FieldsEditor fields={title} value={data} onChange={setData} lang={lang} />
                {/* All three slug inputs stay in the form (inactive ones hidden), so every language is saved. */}
                {locales.map((l) => (
                  <label key={l} className={l === lang ? "block" : "hidden"}>
                    <span className={labelClass}>Slug ({l.toUpperCase()})</span>
                    <input
                      name={`slug.${l}`}
                      defaultValue={slugs[l].startsWith("new-") ? "" : slugs[l]}
                      placeholder="boş qalsa başlıqdan yaranır"
                      className={`${inputClass} bg-cms-bg`}
                    />
                  </label>
                ))}
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
                  <FieldsEditor fields={side} value={data} onChange={setData} lang={lang} />
                  <label className="block">
                    <span className={labelClass}>Tarix</span>
                    <input type="date" name="publishedAt" defaultValue={publishedAt} className={inputClass} />
                  </label>
                  <div className="flex justify-end">
                    <Switch name="published" defaultChecked={published} label="Status" />
                  </div>
                  <div className="flex items-center justify-end gap-4">
                    <StatusText state={state} />
                    <Button type="submit" variant="success" disabled={pending} data-save>
                      {pending ? "Saxlanılır…" : "Yadda saxla"}
                    </Button>
                  </div>
                </div>
              </Card>
              {aside}
            </>
          }
        />
      </form>
    </MediaLibraryProvider>
  );
}
