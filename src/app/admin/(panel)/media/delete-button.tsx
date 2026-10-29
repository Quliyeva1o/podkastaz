"use client";

import { Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Trash button in the corner of a media card. Deletes the file with every rendition.
 * A file used on the site is not deleted: the button is greyed and says where it is used,
 * so no page is left with an empty image box.
 */
export function MediaDeleteButton({ id, usage }: { id: string; usage: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [inUse, setInUse] = useState<string[]>(usage);

  const explain = (places: string[]) =>
    window.alert(`Bu fayl saytda istifadə olunur, ona görə silinmir:\n\n${places.join("\n")}\n\nƏvvəlcə həmin yerdə başqa şəkil seçin.`);

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={inUse.length ? "İstifadə olunur — silinmir" : "Sil"}
      title={inUse.length ? `İstifadə olunur:\n${inUse.join("\n")}` : "Sil"}
      onClick={async () => {
        if (inUse.length) return explain(inUse);
        if (!window.confirm("Bu fayl silinsin? Bütün ölçüləri də silinəcək, geri qaytarmaq olmur.")) return;
        setBusy(true);
        const res = await fetch(`/api/admin/media?id=${id}`, { method: "DELETE" });
        const json = await res.json().catch(() => ({}));
        setBusy(false);
        if (res.status === 409) {
          setInUse(json.usage ?? []);
          explain(json.usage ?? []);
        } else if (!res.ok) window.alert(json.error ?? "Silinmədi");
        else router.refresh();
      }}
      className={`absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border bg-white shadow-sm disabled:opacity-50 ${
        inUse.length ? "border-cms-border text-cms-faint hover:text-cms-muted" : "border-cms-border text-cms-danger hover:border-cms-danger hover:bg-cms-danger hover:text-white"
      }`}
    >
      <Trash size={16} weight={inUse.length ? "regular" : "fill"} />
    </button>
  );
}
