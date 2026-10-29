import { readFileSync } from "node:fs";
const f = JSON.parse(readFileSync("design/figma-cache/file.json", "utf8"));
const p1 = f.document.children[0], p2 = f.document.children[1];
const seen = new Map();
const vecTypes = new Set(["VECTOR","BOOLEAN_OPERATION","STAR","ELLIPSE","LINE","REGULAR_POLYGON"]);
function hasVector(n){ return vecTypes.has(n.type) || n.children?.some(hasVector); }
function hasImage(n){ return n.fills?.some(f=>f.type==="IMAGE") || n.children?.some(hasImage); }
function hasText(n){ return n.type==="TEXT" || n.children?.some(hasText); }
function walk(n, frame){
  if (n.visible===false) return;
  const b=n.absoluteBoundingBox;
  if (["INSTANCE","COMPONENT","FRAME","GROUP"].includes(n.type) && b && b.width<=64 && b.height<=64 && hasVector(n) && !hasText(n) && !hasImage(n)) {
    const key=n.name+" "+Math.round(b.width)+"x"+Math.round(b.height);
    if(!seen.has(key)) seen.set(key, `${n.id} ${n.type} comp=${n.componentId??""} @ ${frame}`);
    return;
  }
  n.children?.forEach(c=>walk(c, frame));
}
for (const fr of p1.children) walk(fr, fr.name);
for (const [k,v] of seen) console.log(k.padEnd(40), v);
console.log("--- page2 top-level:");
for (const fr of p2.children) { const b=fr.absoluteBoundingBox; console.log(fr.id, fr.type, fr.name, Math.round(b.width)+"x"+Math.round(b.height)); }
