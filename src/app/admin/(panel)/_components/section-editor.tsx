"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Field } from "@/sections/fields";
import { saveSectionAction, type ActionResult } from "../pages/actions";
import { Button, Card, EditGrid, StatusText } from "./cms";
import { LangTabs } from "./cms-client";
import { FieldsEditor, isSideField, missingLocales } from "./field-editor";
import { MediaLibraryProvider } from "./media-library";

type Shared = { placementId: string; pageLabel: string };

export function SectionEditor({
  placementId,
  fields,
  initialData,
  sharedWith,
  aside,
}: {
  placementId: string;
  fields: Field[];
  initialData: Record<string, unknown>;
  sharedWith: Shared[];
  /** Extra cards under the save card (version history). */
  aside?: ReactNode;
}) {
  const [data, setData] = useState(initialData);
  const [lang, setLang] = useState<Locale>("az");

  // When the server sends different data (after a save or a version restore), adopt it
  // without remounting, so the save status message stays visible.
  const initialJson = JSON.stringify(initialData);
  const [syncedJson, setSyncedJson] = useState(initialJson);
  if (initialJson !== syncedJson) {
    setSyncedJson(initialJson);
    setData(initialData);
  }
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveSectionAction, null);

  const main = fields.filter((f) => !isSideField(f));
  const side = fields.filter(isSideField);

  return (
    <MediaLibraryProvider>
      <form action={action}>
        <input type="hidden" name="placementId" value={placementId} />
        <input type="hidden" name="data" value={JSON.stringify(data)} />
        <EditGrid
          main={
            <Card>
              <LangTabs lang={lang} onChange={setLang} missing={missingLocales(fields, data)} />
              {main.length > 0 ? (
                <FieldsEditor fields={main} value={data} onChange={setData} lang={lang} />
              ) : (
                <p className="text-cms-muted">Bu sectionda mətn sahəsi yoxdur — sağdakı sahələri redaktə edin.</p>
              )}
            </Card>
          }
          side={
            <>
              <Card>
                <div className="flex flex-col gap-5">
                  {side.length > 0 && <FieldsEditor fields={side} value={data} onChange={setData} lang={lang} />}

                  {sharedWith.length > 0 && (
                    <fieldset className="flex flex-col gap-2 rounded-2xl border border-highlight bg-highlight/10 p-4">
                      <legend className="px-1 text-[14px] font-medium text-cms-label">Bu section digər səhifələrdə də var</legend>
                      {sharedWith.map((s) => (
                        <label key={s.placementId} className="flex items-center gap-2">
                          <input type="checkbox" name="applyTo" value={s.placementId} defaultChecked className="size-4 accent-ink" />
                          {s.pageLabel} səhifəsində də dəyiş
                        </label>
                      ))}
                      <p className="text-[12px] text-cms-muted">
                        İşarəni götürsəniz, həmin səhifə köhnə məzmunla qalır və bundan sonra bu sectiondan ayrılır.
                      </p>
                    </fieldset>
                  )}

                  <div className="flex items-center justify-end gap-4">
                    <StatusText state={state} />
                    <Button type="submit" variant="success" disabled={pending}>
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
