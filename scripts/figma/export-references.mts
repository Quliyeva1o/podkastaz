// Renders every Figma screen (PLAN.md §2.2) at scale 1 as PNG:
//   design/reference/<desktop|mobile>/<page>.png
// These are the ground truth the visual tests compare the site against. Existing files are
// skipped, so a run interrupted by the Figma rate limit can simply be repeated.
// Usage: npm run figma:references
import { access, mkdir, writeFile } from "node:fs/promises";
import { download, renderNodes } from "./api.mjs";

const frames: Record<"desktop" | "mobile", Record<string, string>> = {
  desktop: {
    home: "285:697",
    menu: "214:852",
    packages: "221:1236",
    "package-request": "221:1237",
    "package-request-filled": "285:705",
    "package-request-done": "346:1026",
    works: "282:320",
    "works-videos": "285:569",
    studios: "307:409",
    decors: "311:581",
    services: "351:1889",
    about: "423:598",
    contact: "380:740",
    booking: "331:933",
    "booking-from-home": "346:1338",
    "booking-done": "346:1581",
    terms: "275:540",
    privacy: "275:719",
  },
  mobile: {
    home: "472:1183",
    menu: "476:590",
    packages: "484:690",
    "package-request": "493:820",
    "package-request-done": "495:1318",
    works: "507:762",
    "works-videos": "509:830",
    studios: "512:903",
    decors: "518:806",
    services: "526:1021",
    about: "530:1701",
    contact: "530:1372",
    booking: "519:981",
    "booking-done": "524:839",
    terms: "500:756",
    privacy: "503:1116",
  },
};

const exists = (f: string) => access(f).then(() => true, () => false);

for (const [breakpoint, list] of Object.entries(frames)) {
  const dir = `design/reference/${breakpoint}`;
  await mkdir(dir, { recursive: true });
  const todo: [string, string][] = [];
  for (const [name, id] of Object.entries(list)) if (!(await exists(`${dir}/${name}.png`))) todo.push([name, id]);
  if (!todo.length) continue;
  const urls = await renderNodes(todo.map(([, id]) => id), "png", 1);
  for (const [name, id] of todo) {
    if (!urls[id]) {
      console.warn(`skip ${breakpoint}/${name}: no render`);
      continue;
    }
    await writeFile(`${dir}/${name}.png`, await download(urls[id]));
    console.log(`${breakpoint}/${name}.png`);
  }
}
