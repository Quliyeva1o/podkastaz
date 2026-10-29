"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "./cms";

export function MediaUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <label className={buttonClass("primary", "cursor-pointer")}>
        {busy ? "Yüklənir…" : "Əlavə et"}
        <input
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={async (e) => {
            const files = e.target.files;
            if (!files?.length) return;
            setBusy(true);
            setError(null);
            const body = new FormData();
            for (const f of Array.from(files)) body.append("file", f);
            const res = await fetch("/api/admin/media", { method: "POST", body });
            if (!res.ok) setError((await res.json()).error ?? "Yükləmə alınmadı");
            setBusy(false);
            e.target.value = "";
            router.refresh();
          }}
        />
      </label>
      {error && <p className="text-[13px] text-cms-danger">{error}</p>}
    </div>
  );
}
