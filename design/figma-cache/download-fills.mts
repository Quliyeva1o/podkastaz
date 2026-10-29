// One-off: downloads every image fill of the Podcast.az Figma file into design/assets/figma/<ref>.<ext>.
import { mkdir, writeFile } from "node:fs/promises";
import { download, imageFillUrls, sniffImage } from "../../scripts/figma/api.mts";
const dir = "design/assets/figma";
await mkdir(dir, { recursive: true });
const urls = await imageFillUrls();
let n = 0;
for (const [ref, url] of Object.entries(urls)) {
  if (!url) continue;
  const buf = await download(url);
  const ext = sniffImage(buf).split("/")[1].replace("jpeg", "jpg");
  await writeFile(`${dir}/${ref}.${ext}`, buf);
  n++;
}
console.log("saved", n, "of", Object.keys(urls).length);
