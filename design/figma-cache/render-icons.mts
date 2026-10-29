// One-off: renders the Figma icons that are not in Phosphor (social, menu, close, play) as SVG.
import { mkdir, writeFile } from "node:fs/promises";
import { download, renderNodes } from "../../scripts/figma/api.mts";
const icons: Record<string, string> = {
  "214:850": "menu", "214:886": "close",
  "214:832": "social-16", "214:835": "social-15", "214:838": "social-17",
  "214:841": "social-18", "214:844": "social-19", "214:847": "social-14",
  "403:626": "contact-social-16", "285:681": "videos-1410104226", "285:684": "videos-1410104224",
  "285:692": "videos-play", "214:970": "sparkle", "221:1220": "caret-right",
};
const dir = "design/assets/svg";
await mkdir(dir, { recursive: true });
const urls = await renderNodes(Object.keys(icons), "svg");
for (const [id, url] of Object.entries(urls)) await writeFile(`${dir}/${icons[id]}.svg`, await download(url));
console.log(Object.keys(urls).length, "rendered");
