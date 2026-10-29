// Screenshots a page at the three Figma widths: full page + every [data-section] element,
// plus the header and footer. Used to compare the site with Figma section by section.
// Usage: node tests/visual/capture.mjs <path> <outDir>   (set MSYS_NO_PATHCONV=1 in Git Bash)
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [path = "/", out = "test-results/visual"] = process.argv.slice(2);
const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const slug = path.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home";

const browser = await chromium.launch();
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["tablet", 744, 1133],
  ["mobile", 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: ".marquee-track{animation:none!important}" });
  // Load lazy images, then return to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");

  const dir = `${out}/${slug}/${name}`;
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/_full.png`, fullPage: true, animations: "disabled" });

  const parts = await page.$$("[data-section], footer");
  for (const [i, el] of parts.entries()) {
    const id = (await el.getAttribute("data-section")) ?? "footer";
    await el.screenshot({ path: `${dir}/${String(i).padStart(2, "0")}-${id}.png`, animations: "disabled" });
  }
  const box = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollHeight]);
  console.log(`${dir}: ${parts.length} sections, page ${box.join("x")}`);
  await page.close();
}
await browser.close();
