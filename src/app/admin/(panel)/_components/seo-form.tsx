"use client";

import { useActionState, useState } from "react";
import type { PageSeo } from "@/db/schema";
import { locales, type Locale } from "@/i18n/config";
import { savePageSeoAction, type ActionResult } from "../pages/actions";
import { Button, Card, inputClass, labelClass, StatusText } from "./cms";
import { LangTabs, Switch } from "./cms-client";
import { ImagePicker } from "./image-picker";
import { MediaLibraryProvider } from "./media-library";

const LIMITS = { title: 60, description: 160 };

export function SeoForm({ pageKey, seo }: { pageKey: string; seo: PageSeo }) {
  const [state, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(savePageSeoAction, null);
  const [values, setValues] = useState(seo);
  const [lang, setLang] = useState<Locale>("az");
  const [ogImage, setOgImage] = useState<string | null>(seo.ogImageId ?? null);
  const missing = locales.filter(
    (l) => !values.title[l] || !values.description[l],
  );

  return (
    <MediaLibraryProvider>
      <Card title="Meta (SEO)">
        <form action={action} className="flex flex-col gap-5">
          <input type="hidden" name="pageKey" value={pageKey} />
          <input type="hidden" name="ogImageId" value={ogImage ?? ""} />
          <LangTabs lang={lang} onChange={setLang} missing={missing} />
          {(["title", "description"] as const).map((name) =>
            locales.map((l) => {
              const value = values[name][l];
              const set = (v: string) =>
                setValues({ ...values, [name]: { ...values[name], [l]: v } });
              return (
                <label
                  key={`${name}.${l}`}
                  className={l === lang ? "block" : "hidden"}
                >
                  <span className={`${labelClass} flex justify-between`}>
                    {name === "title" ? "Başlıq" : "Təsvir"}
                    <span
                      className={`font-normal ${value.length > LIMITS[name] ? "text-cms-danger" : "text-cms-faint"}`}
                    >
                      {value.length}/{LIMITS[name]}
                    </span>
                  </span>
                  {name === "title" ? (
                    <input
                      name={`${name}.${l}`}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <textarea
                      name={`${name}.${l}`}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className={`${inputClass} min-h-24`}
                    />
                  )}
                </label>
              );
            }),
          )}
          <ImagePicker
            value={ogImage}
            onChange={setOgImage}
            label="Paylaşım şəkli (Facebook, WhatsApp, LinkedIn) — boşdursa səhifənin ilk şəkli, o da yoxdursa loqo"
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Switch
              name="noindex"
              defaultChecked={seo.noindex}
              label="Google-da göstərmə (noindex)"
            />
            <div className="flex items-center gap-4">
              <StatusText state={state} />
              <Button variant="success" disabled={pending}>
                {pending ? "Saxlanılır…" : "Yadda saxla"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </MediaLibraryProvider>
  );
}
