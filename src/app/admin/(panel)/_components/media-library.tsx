"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";

export type LibraryItem = {
  id: string;
  mime: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: { az: string; en: string; ru: string };
  /** File name (uploads) or import source name. */
  name: string | null;
  /** Where it is used: "Ana səhifə › Komanda › Jordan Smith", … */
  usage: string[];
  /** English/Russian names of the same places, searched but not shown. */
  keywords: string[];
};

/** Lower-case and fold Azerbaijani letters, so "rena" finds "Rəna" and "aysen" finds "Ayşən". */
export function fold(text: string) {
  return text
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/[əä]/g, "e")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Every word of the query appears in the item's name, alt texts or usage paths. */
export function matchesQuery(item: LibraryItem, query: string) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold([item.name ?? "", item.alt.az, item.alt.en, item.alt.ru, ...item.usage, ...item.keywords].join(" "));
  return words.every((w) => haystack.includes(w));
}

type Ctx = {
  items: LibraryItem[];
  byId: (id: string | null) => LibraryItem | undefined;
  upload: (files: FileList | File[]) => Promise<string[]>;
  /** Deletes an unused file; for a file in use it returns where it is used and deletes nothing. */
  remove: (id: string) => Promise<{ ok: boolean; usage?: string[]; error?: string }>;
  uploading: boolean;
  error: string | null;
};

const LibraryContext = createContext<Ctx | null>(null);

export function MediaLibraryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/media", { cache: "no-store" });
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    // Initial load of the media list from the admin API.
    void (async () => {
      const res = await fetch("/api/admin/media", { cache: "no-store" });
      if (res.ok) setItems(await res.json());
    })();
  }, []);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setError(null);
      try {
        const body = new FormData();
        for (const f of Array.from(files)) body.append("file", f);
        const res = await fetch("/api/admin/media", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Yükləmə alınmadı");
          return [];
        }
        await reload();
        return (json as { id: string }[]).map((r) => r.id);
      } finally {
        setUploading(false);
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/media?id=${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) await reload();
      return { ok: res.ok, usage: json.usage as string[] | undefined, error: json.error as string | undefined };
    },
    [reload],
  );

  const byId = useCallback((id: string | null) => items.find((i) => i.id === id), [items]);

  return <LibraryContext value={{ items, byId, upload, remove, uploading, error }}>{children}</LibraryContext>;
}

export function useMediaLibrary() {
  const ctx = use(LibraryContext);
  if (!ctx) throw new Error("useMediaLibrary must be used inside MediaLibraryProvider");
  return ctx;
}
