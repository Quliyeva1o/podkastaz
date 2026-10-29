// Lab Core Web Vitals per page, the way Lighthouse measures them, with the local Playwright
// Chromium (no download): mobile = Lighthouse's mobile profile (412×823, DPR 1.75, slow 4G
// 150 ms RTT / 1.6 Mbps, CPU ×4), desktop = 1350×940 without throttling. Cold cache per page.
// Prints FCP, LCP (and its element), CLS, TBT and the bytes per type.
// Usage: node tests/perf/measure.mjs [mobile|desktop] [path …]   (server on E2E_BASE_URL or :3100)
import { chromium } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const [mode = "mobile", ...paths] = process.argv.slice(2);
const list = paths.length
  ? paths
  : ["/", "/haqqimizda", "/xidmetler", "/studiyalar", "/studiyalar/studiya-1", "/paketler", "/paketler/muraciet", "/islerimiz", "/islerimiz/videolar", "/rezervasiya", "/elaqe"];

const profiles = {
  mobile: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, cpu: 4, net: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } },
  desktop: { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, cpu: 1, net: null },
};
const profile = profiles[mode];

const browser = await chromium.launch();
const kb = (n) => `${Math.round(n / 1024)}k`;
console.log(`${mode}: page                     FCP    LCP    CLS    TBT   JS    CSS   IMG   FONT  total  LCP element`);
for (const path of list) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, isMobile: profile.isMobile, hasTouch: profile.hasTouch });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (profile.net) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...profile.net });
  if (profile.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });

  const bytes = { script: 0, stylesheet: 0, image: 0, font: 0, total: 0 };
  const types = new Map();
  cdp.on("Network.responseReceived", (e) => types.set(e.requestId, e.type.toLowerCase()));
  cdp.on("Network.loadingFinished", (e) => {
    const t = types.get(e.requestId);
    bytes.total += e.encodedDataLength;
    if (t in bytes) bytes[t] += e.encodedDataLength;
  });

  await page.addInitScript(() => {
    window.__perf = { lcp: 0, lcpEl: "", cls: 0, longTasks: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__perf.lcp = e.startTime;
        const el = e.element;
        window.__perf.lcpEl = el ? `${el.tagName.toLowerCase()}${el.closest("[data-section]") ? `@${el.closest("[data-section]").dataset.section}` : ""}` : "";
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.longTasks.push([e.startTime, e.duration]);
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto(base + path, { waitUntil: "load" });
  // Let late work (hydration, lazy images in view) finish, as Lighthouse waits for quiet.
  await page.waitForTimeout(profile.cpu > 1 ? 5000 : 2000);
  const r = await page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
    const tbt = window.__perf.longTasks.filter(([s]) => s >= fcp).reduce((sum, [, d]) => sum + Math.max(0, d - 50), 0);
    return { fcp, lcp: window.__perf.lcp, lcpEl: window.__perf.lcpEl, cls: window.__perf.cls, tbt };
  });
  const ms = (n) => `${(n / 1000).toFixed(2)}s`.padStart(6);
  console.log(
    `${path.padEnd(28)} ${ms(r.fcp)} ${ms(r.lcp)} ${r.cls.toFixed(3).padStart(6)} ${String(Math.round(r.tbt)).padStart(4)}ms ${kb(bytes.script).padStart(5)} ${kb(bytes.stylesheet).padStart(5)} ${kb(bytes.image).padStart(5)} ${kb(bytes.font).padStart(5)} ${kb(bytes.total).padStart(6)}  ${r.lcpEl}`,
  );
  await context.close();
}
await browser.close();
