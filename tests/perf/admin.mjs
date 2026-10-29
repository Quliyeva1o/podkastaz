// Admin page timings (target < 300 ms): signs in with ADMIN_EMAIL / ADMIN_PASSWORD (.env.local),
// then opens each page by client navigation and by a full load and prints both times.
// Usage: node --env-file=.env.local tests/perf/admin.mjs   (server on E2E_BASE_URL or :3100)
import { chromium } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/admin/login`);
await page.getByLabel(/e-?mail/i).fill(process.env.ADMIN_EMAIL);
await page.getByLabel(/şifrə/i).fill(process.env.ADMIN_PASSWORD);
await page.getByRole("button", { name: /daxil/i }).click();
await page.getByRole("heading", { name: "Dashboard" }).waitFor();

const paths = ["/admin", "/admin/bookings", "/admin/bookings/calendar", "/admin/package-requests", "/admin/submissions", "/admin/pages", "/admin/pages/home/hero", "/admin/studios", "/admin/collections/works", "/admin/media"];
console.log("page                          full load   client nav");
for (const path of paths) {
  const t0 = Date.now();
  await page.goto(base + path, { waitUntil: "domcontentloaded" });
  const full = Date.now() - t0;
  // Client navigation, timed inside the page: click a link to the page (from another admin page)
  // until the new page's heading is on screen.
  await page.goto(`${base}${path === "/admin/media" ? "/admin/pages" : "/admin/media"}`, { waitUntil: "networkidle" });
  const nav = await page.evaluate(
    (p) =>
      new Promise((done) => {
        const before = document.querySelector("main h1")?.textContent;
        const t = performance.now();
        const check = () => {
          const h = document.querySelector("main h1")?.textContent;
          if (location.pathname === p && h && h !== before) done(Math.round(performance.now() - t));
          else requestAnimationFrame(check);
        };
        // The same call a <Link> click makes.
        window.next.router.push(p);
        requestAnimationFrame(check);
      }),
    path,
  );
  console.log(`${path.padEnd(30)} ${String(full).padStart(6)} ms ${String(nav).padStart(8)} ms`);
}
await browser.close();
