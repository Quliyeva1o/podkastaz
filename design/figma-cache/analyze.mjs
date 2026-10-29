import { readFileSync } from "node:fs";
const f = JSON.parse(readFileSync(process.argv[2], "utf8"));
const pages = f.document.children;
console.log("pages:", pages.map(p => `${p.name} (${p.id}) children=${p.children.length}`));
const refs = new Map(); // ref -> [{frame, name, w, h}]
function walk(n, frame, depth) {
  if (n.visible === false) return;
  for (const fl of n.fills ?? []) if (fl.type === "IMAGE" && fl.visible !== false) {
    const b = n.absoluteBoundingBox ?? {};
    if (!refs.has(fl.imageRef)) refs.set(fl.imageRef, []);
    refs.get(fl.imageRef).push(`${frame} :: ${n.name} [${n.id}] ${Math.round(b.width)}x${Math.round(b.height)} ${fl.scaleMode}`);
  }
  n.children?.forEach(c => walk(c, frame, depth + 1));
}
for (const p of pages) for (const fr of p.children) walk(fr, `${p.name}/${fr.name}`, 0);
console.log("unique image refs:", refs.size);
for (const [r, l] of refs) console.log(r, "\n   ", [...new Set(l)].slice(0, 6).join("\n    "), l.length > 6 ? `\n    …+${l.length - 6}` : "");
