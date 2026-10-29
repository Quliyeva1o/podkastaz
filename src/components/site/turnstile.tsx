"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile in "interaction-only" mode: invisible for normal visitors,
 * shows a checkbox only when Cloudflare is unsure. The script loads only once the
 * form scrolls near the viewport, so it never costs anything on page load.
 * The token lands in the hidden `cf-turnstile-response` input of the form.
 */
export function Turnstile({ siteKey, lang }: { siteKey: string; lang: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let widgetId: string | undefined;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        try {
          await loadScript();
          widgetId = window.turnstile?.render(el, {
            sitekey: siteKey,
            appearance: "interaction-only",
            language: lang,
            theme: "light",
          });
        } catch {
          // Blocked by an extension or offline: the server then rejects the submission quietly.
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, lang]);

  return <div ref={ref} className="empty:hidden" />;
}
