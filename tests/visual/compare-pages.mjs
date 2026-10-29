// Full-page comparison with the Figma renders (design/reference/<breakpoint>/<name>.png, from
// `npm run figma:references`): screenshot at the Figma width, share of noticeably different pixels
// over the common height, and a side-by-side image (Figma | site | diff) for a human look.
// Content differs on purpose where Figma has lorem ipsum or placeholder photos, so the number is
// a guide, the images are the check.
// Usage: node tests/visual/compare-pages.mjs [desktop|mobile]   (server on E2E_BASE_URL or :3100)
import { access, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const [bp = "desktop"] = process.argv.slice(2);
const width = bp === "desktop" ? 1440 : 320;
const pages = {
  home: "/",
  about: "/haqqimizda",
  services: "/xidmetler",
  studios: "/studiyalar",
  decors: "/studiyalar/studiya-1",
  packages: "/paketler",
  "package-request": "/paketler/muraciet?paket=start",
  works: "/islerimiz",
  "works-videos": "/islerimiz/videolar",
  booking: "/rezervasiya?studiya=studiya-1&dekor=hekimler-ucun-dekor",
  "booking-from-home": "/rezervasiya",
  contact: "/elaqe",
  terms: "/istifadeci-qaydalari",
  privacy: "/mexfilik-siyaseti",
};
const THRESHOLD = 40;
const out = `test-results/visual/pages/${bp}`;
await mkdir(out, { recursive: true });
const exists = (f) => access(f).then(() => true, () => false);

const browser = await chromium.launch();
for (const [name, path] of Object.entries(pages)) {
  const ref = `design/reference/${bp}/${name}.png`;
  if (!(await exists(ref))) {
    console.log(`${name.padEnd(20)} no Figma reference`);
    continue;
  }
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  const shot = await page.screenshot({ fullPage: true });
  await page.close();

  const a = sharp(ref).removeAlpha();
  const b = sharp(shot).removeAlpha();
  const [ma, mb] = await Promise.all([a.metadata(), b.metadata()]);
  const h = Math.min(ma.height, mb.height);
  const [ra, rb] = await Promise.all([
    a.clone().resize(width, null).extract({ left: 0, top: 0, width, height: h }).raw().toBuffer(),
    b.clone().extract({ left: 0, top: 0, width, height: h }).raw().toBuffer(),
  ]);
  const diff = Buffer.alloc(width * h * 3, 255);
  let differ = 0;
  for (let i = 0; i < width * h; i++) {
    const d = Math.max(Math.abs(ra[i * 3] - rb[i * 3]), Math.abs(ra[i * 3 + 1] - rb[i * 3 + 1]), Math.abs(ra[i * 3 + 2] - rb[i * 3 + 2]));
    if (d > THRESHOLD) {
      differ++;
      diff[i * 3] = 255;
      diff[i * 3 + 1] = 40;
      diff[i * 3 + 2] = 40;
    } else {
      const g = 200 + Math.round(((ra[i * 3] + ra[i * 3 + 1] + ra[i * 3 + 2]) / 3) * 0.2);
      diff.fill(g, i * 3, i * 3 + 3);
    }
  }
  const raw = { raw: { width, height: h, channels: 3 } };
  await sharp({ create: { width: width * 3 + 40, height: h, channels: 3, background: "#ffffff" } })
    .composite([
      { input: ra, ...raw, left: 0, top: 0 },
      { input: rb, ...raw, left: width + 20, top: 0 },
      { input: diff, ...raw, left: width * 2 + 40, top: 0 },
    ])
    .jpeg({ quality: 70 })
    .toFile(`${out}/${name}.jpg`);
  console.log(
    `${name.padEnd(20)} differ ${((differ / (width * h)) * 100).toFixed(1).padStart(5)}%  height figma ${ma.height} / site ${mb.height}`,
  );
}
await browser.close();
