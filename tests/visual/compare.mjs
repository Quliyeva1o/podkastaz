// Compares site section screenshots with Figma section exports and writes a report.
//   Site:   test-results/visual/<page>/<breakpoint>/<nn>-<section>.png   (from capture.mjs)
//   Figma:  design/reference/<breakpoint>/<page>/<nn>-<section>.png      (exported from Figma)
// Matching is by section name (the part after "nn-"). For each pair: size difference and the share of pixels that
// differ noticeably, plus a red-highlighted diff image in test-results/visual/diff/.
// Usage: node tests/visual/compare.mjs <sitePage> <figmaPage>   e.g. en home-page
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const [sitePage = "en", figmaPage = "home-page"] = process.argv.slice(2);
const exists = (f) => access(f).then(() => true, () => false);
const THRESHOLD = 40; // per-channel difference that counts as "different" (0–255)

const rows = [];
for (const bp of ["desktop", "tablet", "mobile"]) {
  const siteDir = `test-results/visual/${sitePage}/${bp}`;
  const refDir = `design/reference/${bp}/${figmaPage}`;
  if (!(await exists(siteDir))) continue;
  const site = (await readdir(siteDir)).filter((f) => /^\d\d-/.test(f)).sort();
  const refs = (await exists(refDir)) ? (await readdir(refDir)).filter((f) => f.endsWith(".png")).sort() : [];

  const name = (f) => f.replace(/^\d\d-/, "").replace(/\.png$/, "");
  for (const file of site) {
    const ref = refs.find((r) => name(r) === name(file));
    if (!ref) {
      rows.push({ bp, section: file, result: "no Figma reference" });
      continue;
    }
    const refImg = sharp(`${refDir}/${ref}`);
    const { width, height } = await refImg.metadata();
    const a = await refImg.removeAlpha().raw().toBuffer();
    const siteMeta = await sharp(`${siteDir}/${file}`).metadata();
    const b = await sharp(`${siteDir}/${file}`)
      .resize(width, height, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer();

    let diff = 0;
    const out = Buffer.alloc(width * height * 3);
    for (let p = 0; p < width * height; p++) {
      const o = p * 3;
      const d = Math.max(Math.abs(a[o] - b[o]), Math.abs(a[o + 1] - b[o + 1]), Math.abs(a[o + 2] - b[o + 2]));
      const gray = (a[o] + a[o + 1] + a[o + 2]) / 3;
      if (d > THRESHOLD) {
        diff++;
        out[o] = 255;
        out[o + 1] = out[o + 2] = 0;
      } else {
        out[o] = out[o + 1] = out[o + 2] = 255 - (255 - gray) * 0.25;
      }
    }
    await mkdir("test-results/visual/diff", { recursive: true });
    const diffFile = `test-results/visual/diff/${sitePage}-${bp}-${file}`;
    await sharp(out, { raw: { width, height, channels: 3 } }).png().toFile(diffFile);
    rows.push({
      bp,
      section: file,
      figma: `${width}x${height}`,
      site: `${siteMeta.width}x${siteMeta.height}`,
      heightDelta: siteMeta.height - height,
      diffPercent: +((diff / (width * height)) * 100).toFixed(2),
    });
  }
}

console.table(rows);
await writeFile(`test-results/visual/report-${sitePage}.json`, JSON.stringify(rows, null, 2));
