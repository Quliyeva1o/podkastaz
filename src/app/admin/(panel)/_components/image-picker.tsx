"use client";

/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import { FolderOpen, MagnifyingGlass, MagnifyingGlassPlus, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { useState } from "react";
import { buttonClass, labelClass } from "./cms";
import { matchesQuery, useMediaLibrary, type LibraryItem } from "./media-library";

/** Preview box + "Browse ..." bar (old panel's file input), opening the media library. */
export function ImagePicker({
  value,
  onChange,
  label,
  kind = "image",
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  label: string;
  /** "any": image or video (e.g. a cover that may be a looping clip). */
  kind?: "image" | "video" | "any";
}) {
  const library = useMediaLibrary();
  const { byId, upload, remove, uploading, error } = library;
  const items = library.items.filter((i) => (kind === "any" ? /^(image|video)\//.test(i.mime) : i.mime.startsWith(`${kind}/`)));
  const noun = kind === "video" ? "Video" : kind === "any" ? "Şəkil / video" : "Şəkil";
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [query, setQuery] = useState("");
  const shown = items.filter((i) => matchesQuery(i, query));
  const current = byId(value);

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="rounded-t-2xl border border-cms-line p-3">
        <div className="relative flex h-44 items-center justify-center rounded-xl border border-dashed border-cms-faint bg-[repeating-conic-gradient(#f2f2f2_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
          {current ? (
            <Preview item={current} className="max-h-full max-w-full object-contain" controls />
          ) : (
            <span className="text-[13px] text-cms-faint">{value ? "…" : `${noun} seçilməyib`}</span>
          )}
          {current && (
            <span className="absolute right-2 bottom-2 flex gap-1">
              {current?.mime.startsWith("image/") && <button type="button" aria-label="Böyüt" onClick={() => setZoom(true)} className="rounded-full border border-cms-border bg-white p-1.5 text-cms-text hover:border-ink">
                <MagnifyingGlassPlus size={16} />
              </button>}
              <button type="button" aria-label={`${noun} sil`} onClick={() => onChange(null)} className="rounded-full border border-cms-border bg-white p-1.5 text-cms-danger hover:border-cms-danger">
                <Trash size={16} />
              </button>
            </span>
          )}
        </div>
      </div>
      <div className="flex">
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-bl-2xl border border-t-0 border-r-0 border-cms-line px-3 text-[13px] text-cms-muted">
          <UploadSimple size={14} className="shrink-0" />
          <span className="truncate">{current ? "1 fayl seçilib" : "Fayl yoxdur"}</span>
        </span>
        <button type="button" onClick={() => setOpen(true)} className={buttonClass("primary", "rounded-l-none rounded-tr-none")}>
          <FolderOpen size={16} /> Browse …
        </button>
      </div>

      {zoom && current && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setZoom(false)}>
          <img src={current.url} alt="" width={current.width ?? undefined} height={current.height ?? undefined} className="max-h-full max-w-full bg-white" />
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Media kitabxanası"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-cms-line px-5 py-4">
              <h2 className="text-[1.25rem] font-semibold">Media kitabxanası</h2>
              <div className="flex items-center gap-2">
                <label className={buttonClass("primary", "cursor-pointer")}>
                  <UploadSimple size={16} />
                  {uploading ? (kind === "image" ? "Yüklənir…" : "Yüklənir və sıxılır…") : `Yeni ${noun.toLowerCase()} yüklə`}
                  <input
                    type="file"
                    accept={kind === "video" ? "video/mp4,video/webm,video/quicktime" : kind === "any" ? "image/*,video/mp4,video/webm,video/quicktime" : "image/*"}
                    className="sr-only"
                    disabled={uploading}
                    onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      const [id] = await upload(e.target.files);
                      if (id) {
                        onChange(id);
                        setOpen(false);
                      }
                    }}
                  />
                </label>
                <button type="button" aria-label="Bağla" onClick={() => setOpen(false)} className="p-2 text-cms-text hover:text-cms-danger">
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* Search by file name, alt text, or where the file is used (page, section, member/partner name, post title). */}
            <div className="border-b border-cms-line px-5 py-3">
              <label className="flex items-center gap-2 rounded-full border border-cms-border bg-white px-4 py-2 focus-within:border-ink">
                <MagnifyingGlass size={16} className="shrink-0 text-cms-muted" />
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Axtar: səhifə, bölmə, ad, məqalə, fayl adı…"
                  aria-label={`${noun} axtar`}
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-cms-faint"
                />
                {query && (
                  <span className="shrink-0 text-[13px] text-cms-muted">
                    {shown.length} / {items.length}
                  </span>
                )}
              </label>
            </div>
            {error && <p className="px-5 pt-3 text-[13px] text-cms-danger">{error}</p>}
            {/* Scroll box around the grid: a grid that is itself the height-limited scroller squeezes its rows and the tiles overlap. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-5">
                {shown.map((item) => {
                  const where = item.usage[0] ?? item.name ?? "";
                  return (
                    <div key={item.id} className="group/tile relative min-w-0">
                      <button
                        type="button"
                        title={[item.name, ...item.usage].filter(Boolean).join("\n")}
                        onClick={() => {
                          onChange(item.id);
                          setOpen(false);
                        }}
                        className="flex w-full min-w-0 flex-col gap-1 text-left"
                      >
                        <span
                          className={`block aspect-square w-full overflow-hidden rounded-xl border-2 bg-cms-bg ${item.id === value ? "border-highlight" : "border-transparent group-hover/tile:border-ink"}`}
                        >
                          <Preview item={item} className="size-full object-contain" />
                        </span>
                        <span className="truncate px-0.5 text-[11px] text-cms-muted">{where || "İstifadə olunmur"}</span>
                      </button>
                      {/* Only unused files can be deleted (the server checks again). */}
                      {item.usage.length === 0 && item.id !== value && (
                        <button
                          type="button"
                          aria-label={`${item.name ?? noun} sil`}
                          onClick={async () => {
                            if (!window.confirm("Bu fayl silinsin? Bütün ölçüləri də silinəcək, geri qaytarmaq olmur.")) return;
                            const result = await remove(item.id);
                            if (!result.ok)
                              window.alert(result.usage?.length ? `İstifadə olunur:\n${result.usage.join("\n")}` : (result.error ?? "Silinmədi"));
                          }}
                          className="absolute top-2 right-2 rounded-full border border-cms-border bg-white p-1.5 text-cms-danger opacity-0 shadow-sm transition-opacity group-hover/tile:opacity-100 hover:border-cms-danger focus-visible:opacity-100"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && <p className="col-span-full text-[13px] text-cms-muted">Hələ {noun.toLowerCase()} yoxdur.</p>}
                {items.length > 0 && shown.length === 0 && (
                  <p className="col-span-full text-[13px] text-cms-muted">“{query}” üzrə heç nə tapılmadı.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Preview({ item, className, controls }: { item: LibraryItem; className: string; controls?: boolean }) {
  if (item.mime.startsWith("video/")) {
    // Plays on its own (muted loop), like on the site; the large preview also gets controls.
    return <video src={item.url} autoPlay muted loop playsInline preload="metadata" controls={controls} className={className} />;
  }
  return <img src={item.url} alt="" loading="lazy" width={item.width ?? undefined} height={item.height ?? undefined} className={className} />;
}
