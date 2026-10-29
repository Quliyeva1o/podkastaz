// Usage: node dump.mjs <nodeId> [depth] — prints layout/typography of a Figma subtree from file.json.
import { readFileSync } from "node:fs";
const f = JSON.parse(readFileSync(new URL("./file.json", import.meta.url), "utf8"));
const [id, depthArg] = process.argv.slice(2);
const find = (n) => (n.id === id ? n : (n.children ?? []).map(find).find(Boolean));
const root = find(f.document);
const hex = (c, o = 1) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") + ((c.a ?? 1) * o < 1 ? `/${+((c.a ?? 1) * o).toFixed(2)}` : "");
const paint = (p) => p.visible === false ? "" : p.type === "SOLID" ? hex(p.color, p.opacity ?? 1) : p.type === "IMAGE" ? `img:${p.imageRef.slice(0, 6)}` : p.type.startsWith("GRADIENT") ? `${p.type}(${p.gradientStops.map((s) => hex(s.color)).join(",")})` : p.type;
const ox = root.absoluteBoundingBox.x, oy = root.absoluteBoundingBox.y;
function line(n, d) {
  if (n.visible === false) return;
  const b = n.absoluteBoundingBox ?? {};
  const parts = [`${"  ".repeat(d)}${n.type} "${n.name}" [${n.id}] ${Math.round(b.x - ox)},${Math.round(b.y - oy)} ${+b.width?.toFixed(1)}x${+b.height?.toFixed(1)}`];
  if (n.layoutMode && n.layoutMode !== "NONE") parts.push(`${n.layoutMode} gap=${n.itemSpacing ?? 0} pad=${n.paddingTop ?? 0},${n.paddingRight ?? 0},${n.paddingBottom ?? 0},${n.paddingLeft ?? 0} align=${n.primaryAxisAlignItems ?? ""}/${n.counterAxisAlignItems ?? ""}`);
  const fills = (n.fills ?? []).map(paint).filter(Boolean); if (fills.length) parts.push(`fill=${fills.join("+")}`);
  const strokes = (n.strokes ?? []).map(paint).filter(Boolean); if (strokes.length) parts.push(`stroke=${strokes.join("+")}/${n.strokeWeight}`);
  if (n.cornerRadius) parts.push(`r=${n.cornerRadius}`); if (n.rectangleCornerRadii) parts.push(`r=${n.rectangleCornerRadii}`);
  if (n.opacity != null && n.opacity < 1) parts.push(`op=${+n.opacity.toFixed(2)}`);
  for (const e of n.effects ?? []) if (e.visible !== false) parts.push(`${e.type}${e.radius ? ":" + e.radius : ""}${e.color ? ":" + hex(e.color) : ""}`);
  if (n.type === "TEXT") { const s = n.style; parts.push(`font=${s.fontFamily} ${s.fontWeight} ${s.fontSize}/${+(s.lineHeightPx ?? 0).toFixed(1)} ls=${+(s.letterSpacing ?? 0).toFixed(2)} ${s.textAlignHorizontal} ${s.textCase ?? ""} "${n.characters.slice(0, 60).replace(/\n/g, "⏎")}"`); }
  console.log(parts.join(" | "));
  if (d < Number(depthArg ?? 6)) n.children?.forEach((c) => line(c, d + 1));
}
line(root, 0);
