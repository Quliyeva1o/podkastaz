// Element-by-element comparison of a site page with its Figma frame (design/figma-cache/file.json).
// For every Figma TEXT the element with the same text on the page is found and compared:
// position, font size, weight, line height, letter spacing and colour. Images (image fills) and
// "Button" frames are matched by order/position and their box, radius and background compared.
// Boxes (frames/shapes with a visible fill or stroke: cards, fields, tabs, badges, frames) are
// matched to the nearest element with a background or border: outer box (outside strokes
// included), radius, stroke per side (border, or padding of a gradient frame) and colours.
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
    privacy: ["275:719", "/mexfilik-siyaseti"],
    menu: ["214:852", "/", "menu"],
    "package-request-empty": ["221:1237", "/paketler/muraciet"],
    "package-request-sent": ["346:1026", "/paketler/muraciet?paket=start", "sendPackage"],
    "booking-home": ["346:1338", "/rezervasiya"],
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
    privacy: ["503:1116", "/mexfilik-siyaseti"],
    menu: ["476:590", "/", "menu"],
    "package-request-sent": ["495:1318", "/paketler/muraciet?paket=start", "sendPackage"],
  },
};

/** Page states some frames show: the open menu, the "Qəbul olundu" modal after a request. */
const prepare = {
  menu: async (page) => {
    await page.locator("header button[aria-expanded]").first().click();
    await page.waitForTimeout(500);
  },
  sendPackage: async (page) => {
    await page.waitForTimeout(3200);
    await page.getByLabel("Ad", { exact: true }).fill("Figma");
    await page.getByLabel("Soyad").fill("Yoxlama");
    await page.getByLabel("Telefon").fill("+994500000000");
    await page.getByLabel("E-mail ünvanı").fill("figma-diff@e2e.test");
    await page.locator("input[name=accuracy]").check({ force: true });
    await page.locator("input[name=terms]").check({ force: true });
    await page.getByRole("button", { name: "Müraciət et" }).click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(500);
  },
};
const width = bp === "desktop" ? 1440 : 320;
const TOL = { pos: 3, size: 0.6, lh: 1.5, ls: 0.15, color: 12, box: 3 };

const find = (n, id) => (n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean));
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const norm = (s) => s.replace(/\s+/g, " ").trim();
/** Colour alpha as a suffix ("" when opaque). */
const alpha = (a) => (a > 0.97 ? "" : "@" + a.toFixed(2));
const lorem = /lorem|ipsum|sed ut perspiciatis|quis autem/i;

/** Visible Figma nodes inside the frame (not in a clipped-away area). */
function collect(frame) {
  const fb = frame.absoluteBoundingBox;
  const texts = [];
  const images = [];
  const buttons = [];
  const boxes = [];
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
    const paint = (p) => p.visible !== false && (p.opacity ?? 1) > 0.05 && (p.type === "SOLID" ? (p.color.a ?? 1) > 0.05 : p.type.startsWith("GRADIENT"));
    const fills = (n.fills ?? []).filter(paint);
    const strokes = (n.strokes ?? []).filter(paint);
    const shape = ["FRAME", "RECTANGLE", "INSTANCE", "COMPONENT", "ELLIPSE"].includes(n.type) && n !== frame && !img;
    const white = (p) => p.type === "SOLID" && hex(p.color) === "#ffffff";
    // A frame that only wraps a same-size Button is checked as that button.
    const wrapsButton = n.children?.some((c) => c.name === "Button" && Math.abs(c.absoluteBoundingBox.width - b.width) < 1 && Math.abs(c.absoluteBoundingBox.height - b.height) < 1);
    if (shape && !wrapsButton && box.w >= 16 && box.h >= 16 && n.name !== "Button" && (strokes.length || fills.some((p) => !white(p))) && box.w < fb.width - 1) {
      const sw = n.individualStrokeWeights ?? { top: n.strokeWeight, right: n.strokeWeight, bottom: n.strokeWeight, left: n.strokeWeight };
      const w = strokes.length ? sw : { top: 0, right: 0, bottom: 0, left: 0 };
      // Visual outer box: an outside stroke adds its full weight, a centre stroke half.
      const k = n.strokeAlign === "OUTSIDE" ? 1 : n.strokeAlign === "CENTER" ? 0.5 : 0;
      const p0 = (ps) => ps[0] && (ps[0].type === "SOLID" ? hex(ps[0].color) + alpha((ps[0].color.a ?? 1) * (ps[0].opacity ?? 1) * (n.opacity ?? 1)) : "gradient");
      boxes.push({
        name: n.name,
        x: box.x - w.left * k, y: box.y - w.top * k, w: box.w + (w.left + w.right) * k, h: box.h + (w.top + w.bottom) * k,
        r: (n.cornerRadius ?? 0) + (n.strokeAlign === "OUTSIDE" && strokes.length ? Math.min(w.left, w.right) : 0),
        stroke: strokes.length ? [w.top, w.right, w.bottom, w.left] : null,
        strokeColor: p0(strokes),
        fill: p0(fills),
      });
    }
    if (n.name === "Button" && n.type !== "TEXT") {
      const label = norm(findText(n));
      const fill = (n.fills ?? []).find((f) => f.type === "SOLID" && f.visible !== false);
      if (label) buttons.push({ label, ...box, r: n.cornerRadius ?? 0, bg: fill ? hex(fill.color) : null, bgA: fill ? (fill.color.a ?? 1) * (fill.opacity ?? 1) : 0 });
    }
    n.children?.forEach((c) => walk(c, nextClip));
  };
  walk(frame, { x: 0, y: 0, w: fb.width, h: fb.height });
  return { texts, images, buttons, boxes, height: fb.height };
}
const findText = (n) => (n.type === "TEXT" ? n.characters : (n.children ?? []).map(findText).find(Boolean) ?? "");

const browser = await chromium.launch();
let total = 0;
for (const [name, [id, path, state]] of Object.entries(frames[bp])) {
  if (only.length && !only.includes(name)) continue;
  const frame = find(file.document, id);
  const fig = collect(frame);
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.waitForTimeout(300);
  if (state) await prepare[state](page);

  const site = await page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, " ").trim();
    // Any CSS colour (Tailwind v4 writes lab()/oklch()) → sRGB through a 1×1 canvas.
    const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
    const rgb = (c) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      const m = [d[0], d[1], d[2], d[3] / 255];
      return { hex: "#" + m.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""), a: m[3] ?? 1 };
    };
    // Screen-reader-only by its computed box (a class test would also hit "desktop:not-sr-only").
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if (s.position === "absolute" && el.offsetWidth <= 1 && el.offsetHeight <= 1 && s.overflow === "hidden") el.setAttribute("data-sr", "");
    }
    const visibleText = (el) => {
      if (!el.querySelector("[data-sr]")) return el.textContent ?? "";
      const c = el.cloneNode(true);
      c.querySelectorAll("[data-sr]").forEach((x) => x.remove());
      return c.textContent ?? "";
    };
    // Rects of the element's own visible text nodes (no icons, no screen-reader-only text).
    const glyphs = (el) => {
      const rects = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || n.parentElement.closest("[data-sr]")) continue;
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
      if (["SCRIPT", "STYLE", "svg", "path", "NOSCRIPT"].includes(el.tagName) || el.closest("[data-sr], [aria-hidden=true]")) continue;
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
    // Elements that paint something: a background colour or gradient, or a visible border.
    const boxes = [];
    for (const el of document.querySelectorAll("body *")) {
      if (["svg", "path", "IMG", "SCRIPT", "STYLE"].includes(el.tagName) || el.closest("[data-sr], svg")) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 16 || r.height < 16) continue;
      const bg = rgb(s.backgroundColor);
      const op = Number(s.opacity);
      const grad = s.backgroundImage.includes("gradient");
      const bw = ["Top", "Right", "Bottom", "Left"].map((k) => (rgb(s["border" + k + "Color"]).a > 0.05 && s["border" + k + "Style"] !== "none" ? parseFloat(s["border" + k + "Width"]) : 0));
      if (!(bg.a > 0.05) && !grad && !bw.some(Boolean)) continue;
      // A gradient frame: the stroke is the gap to the painted card inside it (tab included).
      let inner = null;
      if (grad && !bw.some(Boolean))
        for (const c of el.querySelectorAll("*")) {
          const cr = c.getBoundingClientRect();
          if (rgb(getComputedStyle(c).backgroundColor).a > 0.9 && cr.width * cr.height > r.width * r.height * 0.5) {
            inner = { stroke: [cr.top - r.top, r.right - cr.right, r.bottom - cr.bottom, cr.left - r.left], fill: rgb(getComputedStyle(c).backgroundColor).hex };
            break;
          }
        }
      boxes.push({
        tag: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""),
        x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height,
        r: parseFloat(s.borderTopLeftRadius) || 0,
        // Stroke: the border, or for a gradient frame (a padded gradient wrapper) its padding.
        stroke: bw.some(Boolean) ? bw : inner ? inner.stroke : null,
        strokeColor: bw.some(Boolean) ? rgb(s.borderTopColor).hex : inner ? "gradient" : null,
        fill: inner ? inner.fill : grad ? "gradient" : bg.a > 0.05 ? bg.hex + (bg.a * op > 0.97 ? "" : "@" + (bg.a * op).toFixed(2)) : null,
      });
    }
    const placeholders = [...document.querySelectorAll("input[placeholder], textarea[placeholder]")].map((i) => norm(i.placeholder));
    return { texts, images, buttons, boxes, placeholders, height: document.documentElement.scrollHeight };
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
  // Boxes: nearest unused painted element by position and size.
  const usedX = new Set();
  const far = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h);
  const cdist = (a, b) => {
    if (!a || !b || a === "gradient" || b === "gradient") return a === b ? 0 : 99;
    const al = (c) => (c.includes("@") ? Number(c.split("@")[1]) : 1);
    return Math.max(Math.abs(al(a) - al(b)) * 255, ...[1, 3, 5].map((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16))));
  };
  for (const b of fig.boxes) {
    const near = site.boxes.map((s, i) => ({ s, i })).filter(({ i }) => !usedX.has(i)).sort((p, q) => far(p.s, b) - far(q.s, b))[0];
    const tag = `  X ${b.name.slice(0, 24)} @${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)}`;
    const same = (p) => Math.abs(p.w - b.w) + Math.abs(p.h - b.h) < 8;
    const ok = (p) => far(p, b) <= Math.max(60, (b.w + b.h) * 0.15) || (same(p) && Math.abs(p.x - b.x) + Math.abs(p.y - b.y) < 600);
    if (near && !ok(near.s)) {
      const alt = site.boxes.map((s2, i) => ({ s: s2, i })).filter(({ s: s2, i }) => !usedX.has(i) && same(s2) && ok(s2)).sort((p, q) => far(p.s, b) - far(q.s, b))[0];
      if (alt) Object.assign(near, alt);
    }
    if (!near || !ok(near.s)) {
      rows.push(`${tag}: not on the page (${b.stroke ? "stroke " + b.stroke.join("/") + " " + b.strokeColor : "fill " + b.fill})`);
      continue;
    }
    usedX.add(near.i);
    const x = near.s;
    const d = [];
    for (const k of ["x", "y", "w", "h"]) if (Math.abs(x[k] - b[k]) > TOL.box) d.push(`${k} ${x[k] - b[k] > 0 ? "+" : ""}${(x[k] - b[k]).toFixed(0)}`);
    if (Math.abs(Math.min(x.r, x.h / 2, x.w / 2) - Math.min(b.r, b.h / 2, b.w / 2)) > 1) d.push(`radius ${x.r}≠${b.r}`);
    const st = (v) => (v ?? [0, 0, 0, 0]).map((n) => +n.toFixed(1)).join("/");
    if (b.stroke || x.stroke) {
      if ((b.stroke ?? [0, 0, 0, 0]).some((v, i) => Math.abs(v - (x.stroke ?? [0, 0, 0, 0])[i]) > 0.6)) d.push(`stroke ${st(x.stroke)}≠${st(b.stroke)}`);
      if (b.stroke && x.stroke && cdist(x.strokeColor, b.strokeColor) > TOL.color) d.push(`stroke colour ${x.strokeColor}≠${b.strokeColor}`);
    }
    if (b.fill && cdist(x.fill ?? "#ffffff", b.fill) > TOL.color) d.push(`fill ${x.fill}≠${b.fill}`);
    if (d.length) rows.push(`${tag} (${x.tag.slice(0, 30)}): ${d.join(", ")}`);
  }
  total += rows.length;
  console.log(`\n■ ${bp} ${name} (${path}) — Figma ${fig.height} px / site ${site.height} px — ${rows.length} differences`);
  for (const r of rows) console.log(r);
}
await browser.close();
console.log(`\n${total} differences`);
