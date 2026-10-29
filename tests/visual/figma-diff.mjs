// Element-by-element comparison of a site page with its Figma frame (design/figma-cache/file.json).
// For every Figma TEXT the element with the same text on the page is found and compared:
// position, font size, weight, line height, letter spacing and colour. Images (image fills) and
// "Button" frames are matched by order/position and their box, radius and background compared.
// Prints only the differences above the tolerances (Δ = site − Figma).
// Usage: node tests/visual/figma-diff.mjs [desktop|mobile] [page …]   (server on E2E_BASE_URL or :3100)
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const [bp = "desktop", ...only] = process.argv.slice(2);
const file = JSON.parse(readFileSync(new URL("../../design/figma-cache/file.json", import.meta.url), "utf8"));

/** Figma frame → site URL (desktop 1440, mobile 320). */
const frames = {
  desktop: {
    home: ["285:697", "/"],
    about: ["423:598", "/haqqimizda"],
    services: ["351:1889", "/xidmetler"],
    studios: ["307:409", "/studiyalar"],
    decors: ["311:581", "/studiyalar/studiya-1"],
    packages: ["221:1236", "/paketler"],
    "package-request": ["285:705", "/paketler/muraciet?paket=start"],
    works: ["282:320", "/islerimiz"],
    "works-videos": ["285:569", "/islerimiz/videolar"],
    booking: ["331:933", "/rezervasiya?studiya=studiya-1&dekor=hekimler-ucun-dekor"],
    contact: ["380:740", "/elaqe"],
    terms: ["275:540", "/istifadeci-qaydalari"],
  },
  mobile: {
    home: ["472:1183", "/"],
    about: ["530:1701", "/haqqimizda"],
    services: ["526:1021", "/xidmetler"],
    studios: ["512:903", "/studiyalar"],
    decors: ["518:806", "/studiyalar/studiya-1"],
    packages: ["484:690", "/paketler"],
    "package-request": ["493:820", "/paketler/muraciet?paket=start"],
    works: ["507:762", "/islerimiz"],
    "works-videos": ["509:830", "/islerimiz/videolar"],
    booking: ["519:981", "/rezervasiya?studiya=studiya-1&dekor=hekimler-ucun-dekor"],
    contact: ["530:1372", "/elaqe"],
    terms: ["500:756", "/istifadeci-qaydalari"],
  },
};
const width = bp === "desktop" ? 1440 : 320;
const TOL = { pos: 3, size: 0.6, lh: 1.5, ls: 0.15, color: 12, box: 3 };

const find = (n, id) => (n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean));
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const norm = (s) => s.replace(/\s+/g, " ").trim();
const lorem = /lorem|ipsum|sed ut perspiciatis|quis autem/i;

/** Visible Figma nodes inside the frame (not in a clipped-away area). */
function collect(frame) {
  const fb = frame.absoluteBoundingBox;
  const texts = [];
  const images = [];
  const buttons = [];
  const walk = (n, clip) => {
    if (n.visible === false) return;
    const b = n.absoluteBoundingBox;
    if (!b) return;
    const box = { x: b.x - fb.x, y: b.y - fb.y, w: b.width, h: b.height };
    const inside = !clip || (box.x + box.w > clip.x && box.x < clip.x + clip.w && box.y + box.h > clip.y && box.y < clip.y + clip.h);
    if (!inside) return;
    const nextClip = n.clipsContent && n !== frame ? box : clip;
    if (n.type === "TEXT") {
      const fill = (n.fills ?? []).find((f) => f.type === "SOLID" && f.visible !== false);
      const text = norm(n.characters);
      if (text && !lorem.test(text)) {
        texts.push({
          text,
          ...box,
          size: n.style.fontSize,
          weight: n.style.fontWeight,
          lh: n.style.lineHeightPx,
          ls: n.style.letterSpacing ?? 0,
          align: n.style.textAlignHorizontal,
          color: fill ? hex(fill.color) : null,
        });
      }
      return;
    }
    const img = (n.fills ?? []).find((f) => f.type === "IMAGE" && f.visible !== false);
    if (img && box.w > 20 && box.h > 20 && !/logotype/i.test(n.name)) images.push({ ...box, r: n.cornerRadius ?? 0, name: n.name, op: n.opacity ?? 1 });
    if (n.name === "Button" && n.type !== "TEXT") {
      const label = norm(findText(n));
      const fill = (n.fills ?? []).find((f) => f.type === "SOLID" && f.visible !== false);
      if (label) buttons.push({ label, ...box, r: n.cornerRadius ?? 0, bg: fill ? hex(fill.color) : null, bgA: fill ? (fill.color.a ?? 1) * (fill.opacity ?? 1) : 0 });
    }
    n.children?.forEach((c) => walk(c, nextClip));
  };
  walk(frame, { x: 0, y: 0, w: fb.width, h: fb.height });
  return { texts, images, buttons, height: fb.height };
}
const findText = (n) => (n.type === "TEXT" ? n.characters : (n.children ?? []).map(findText).find(Boolean) ?? "");

const browser = await chromium.launch();
let total = 0;
for (const [name, [id, path]] of Object.entries(frames[bp])) {
  if (only.length && !only.includes(name)) continue;
  const frame = find(file.document, id);
  const fig = collect(frame);
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.waitForTimeout(300);

  const site = await page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, " ").trim();
    const rgb = (c) => {
      const m = c.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0, 1];
      return { hex: "#" + m.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""), a: m[3] ?? 1 };
    };
    const visibleText = (el) => {
      if (!el.querySelector(".sr-only")) return el.textContent ?? "";
      const c = el.cloneNode(true);
      c.querySelectorAll(".sr-only").forEach((x) => x.remove());
      return c.textContent ?? "";
    };
    // Rects of the element's own visible text nodes (no icons, no screen-reader-only text).
    const glyphs = (el) => {
      const rects = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || n.parentElement.closest(".sr-only")) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        rects.push(...[...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0));
      }
      if (!rects.length) return el.getBoundingClientRect();
      const x = Math.min(...rects.map((r) => r.left));
      const y = Math.min(...rects.map((r) => r.top));
      return { x, y, width: Math.max(...rects.map((r) => r.right)) - x, height: Math.max(...rects.map((r) => r.bottom)) - y };
    };
    const texts = [];
    for (const el of document.querySelectorAll("body *")) {
      if (["SCRIPT", "STYLE", "svg", "path", "NOSCRIPT"].includes(el.tagName) || el.closest(".sr-only, [aria-hidden=true]")) continue;
      const text = norm(visibleText(el));
      if (!text || text.length > 400) continue;
      // Deepest element carrying exactly this text.
      if ([...el.children].some((c) => norm(visibleText(c)) === text)) continue;
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      // Glyph box horizontally; the element's line box vertically (Figma's text box = line boxes).
      const g = glyphs(el);
      const s0 = getComputedStyle(el);
      const lh = s0.lineHeight === "normal" ? null : parseFloat(s0.lineHeight);
      const lines = lh ? Math.max(1, Math.round(g.height / lh)) : 1;
      const r = { x: g.x, y: lh ? g.y + g.height / 2 - (lines * lh) / 2 : box.y, width: g.width, height: lh ? lines * lh : box.height };
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.opacity === "0") continue;
      texts.push({
        text,
        x: r.x + scrollX,
        y: r.y + scrollY,
        w: r.width,
        h: r.height,
        size: parseFloat(s.fontSize),
        weight: Number(s.fontWeight),
        lh: s.lineHeight === "normal" ? null : parseFloat(s.lineHeight),
        ls: s.letterSpacing === "normal" ? 0 : parseFloat(s.letterSpacing),
        color: rgb(s.color).hex,
      });
    }
    const images = [...document.querySelectorAll("img")]
      .map((img) => {
        // The visible box: the image or its clipping parent (cards crop with overflow-hidden).
        let el = img;
        for (let p = img.parentElement; p && p !== document.body; p = p.parentElement) {
          const s = getComputedStyle(p);
          const pr = p.getBoundingClientRect();
          const ir = img.getBoundingClientRect();
          if (pr.width > ir.width + 4 || pr.height > ir.height + 4) break;
          if (s.overflow !== "visible" || s.borderRadius !== "0px") {
            el = p;
            break;
          }
        }
        const r = el.getBoundingClientRect();
        let op = 1;
        for (let a = img; a && a !== document.body; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
        return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, alt: img.alt, op };
      })
      .filter((i) => i.w > 20 && i.h > 20 && !i.alt.includes("Podkast.az"));
    const buttons = [...document.querySelectorAll("a, button")].map((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const bg = rgb(s.backgroundColor);
      return { label: norm(el.textContent ?? ""), x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, r: parseFloat(s.borderTopLeftRadius) || 0, bg: bg.a ? bg.hex : null, bgA: bg.a };
    });
    const placeholders = [...document.querySelectorAll("input[placeholder], textarea[placeholder]")].map((i) => norm(i.placeholder));
    return { texts, images, buttons, placeholders, height: document.documentElement.scrollHeight };
  });
  await page.close();

  const rows = [];
  const used = new Set();
  // Texts: same text, nearest by position among unused candidates.
  for (const t of fig.texts) {
    const cands = site.texts.filter((s, i) => s.text === t.text && !used.has(i));
    if (!cands.length) {
      if (site.placeholders.includes(t.text)) continue;
      rows.push(`  ? "${t.text.slice(0, 50)}" (${t.size}/${t.weight}) — not on the page`);
      continue;
    }
    const cx = (o, a) => (a === "CENTER" ? o.x + o.w / 2 : a === "RIGHT" ? o.x + o.w : o.x);
    const best = cands.sort((a, b) => Math.hypot(cx(a, t.align) - cx(t, t.align), a.y - t.y) - Math.hypot(cx(b, t.align) - cx(t, t.align), b.y - t.y))[0];
    used.add(site.texts.indexOf(best));
    const d = [];
    const dx = cx(best, t.align) - cx(t, t.align);
    const dy = best.y - t.y;
    if (Math.abs(dx) > TOL.pos) d.push(`x ${dx > 0 ? "+" : ""}${dx.toFixed(0)}`);
    if (Math.abs(dy) > TOL.pos) d.push(`y ${dy > 0 ? "+" : ""}${dy.toFixed(0)}`);
    if (Math.abs(best.size - t.size) > TOL.size) d.push(`size ${best.size}≠${t.size}`);
    if (best.weight !== t.weight) d.push(`weight ${best.weight}≠${t.weight}`);
    if (best.lh && t.lh && Math.abs(best.lh - t.lh) > TOL.lh) d.push(`lh ${best.lh.toFixed(1)}≠${t.lh.toFixed(1)}`);
    if (Math.abs(best.ls - t.ls) > TOL.ls) d.push(`ls ${best.ls.toFixed(2)}≠${t.ls.toFixed(2)}`);
    if (t.color && best.color !== t.color) {
      const dist = Math.max(...[1, 3, 5].map((i) => Math.abs(parseInt(best.color.slice(i, i + 2), 16) - parseInt(t.color.slice(i, i + 2), 16))));
      if (dist > TOL.color) d.push(`color ${best.color}≠${t.color}`);
    }
    if (d.length) rows.push(`  T "${t.text.slice(0, 40)}" @${t.x.toFixed(0)},${t.y.toFixed(0)}: ${d.join(", ")}`);
  }
  // Buttons: same label, nearest.
  const usedB = new Set();
  for (const b of fig.buttons) {
    const cands = site.buttons.filter((s, i) => s.label === b.label && !usedB.has(i));
    if (!cands.length) {
      rows.push(`  ? button "${b.label}" — not on the page`);
      continue;
    }
    const best = cands.sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
    usedB.add(site.buttons.indexOf(best));
    const d = [];
    if (Math.abs(best.w - b.w) > TOL.box) d.push(`w ${best.w.toFixed(0)}≠${b.w.toFixed(0)}`);
    if (Math.abs(best.h - b.h) > TOL.box) d.push(`h ${best.h.toFixed(0)}≠${b.h.toFixed(0)}`);
    if (Math.abs(Math.min(best.r, best.h / 2) - Math.min(b.r, b.h / 2)) > 1) d.push(`radius ${best.r}≠${b.r}`);
    if (b.bg && b.bgA > 0.9 && best.bg !== b.bg) d.push(`bg ${best.bg}≠${b.bg}`);
    if (d.length) rows.push(`  B "${b.label}" @${b.x.toFixed(0)},${b.y.toFixed(0)}: ${d.join(", ")}`);
  }
  // Images: nearest unused by top-left within 200 px.
  const usedI = new Set();
  for (const im of fig.images) {
    const cands = site.images.map((s, i) => ({ s, i })).filter(({ i }) => !usedI.has(i));
    const near = cands.sort((p, q) => Math.hypot(p.s.x - im.x, p.s.y - im.y) - Math.hypot(q.s.x - im.x, q.s.y - im.y))[0];
    if (!near || Math.hypot(near.s.x - im.x, near.s.y - im.y) > 200) continue;
    usedI.add(near.i);
    const d = [];
    if (Math.abs(near.s.w - im.w) > TOL.box) d.push(`w ${near.s.w.toFixed(0)}≠${im.w.toFixed(0)}`);
    if (Math.abs(near.s.h - im.h) > TOL.box) d.push(`h ${near.s.h.toFixed(0)}≠${im.h.toFixed(0)}`);
    if (Math.abs(near.s.r - im.r) > 1) d.push(`radius ${near.s.r}≠${im.r}`);
    if (Math.abs(near.s.op - im.op) > 0.05) d.push(`opacity ${near.s.op.toFixed(2)}≠${im.op}`);
    if (d.length) rows.push(`  I ${im.name} @${im.x.toFixed(0)},${im.y.toFixed(0)} ${im.w.toFixed(0)}x${im.h.toFixed(0)}: ${d.join(", ")}`);
  }
  total += rows.length;
  console.log(`\n■ ${bp} ${name} (${path}) — Figma ${fig.height} px / site ${site.height} px — ${rows.length} differences`);
  for (const r of rows) console.log(r);
}
await browser.close();
console.log(`\n${total} differences`);
