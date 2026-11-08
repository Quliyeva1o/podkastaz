import { expect, test, type Page } from "@playwright/test";

/** Phase 1 smoke tests: routing, header + menu overlay, breadcrumb, no horizontal scroll. */

const pages = [
  { path: "/", h1: "Səsini Brendə Çevir" },
  { path: "/haqqimizda", h1: "Haqqımızda", crumbs: ["Ana səhifə", "Haqqımızda"] },
  { path: "/xidmetler", h1: "Xidmətlər", crumbs: ["Ana səhifə", "Xidmətlər"] },
  { path: "/studiyalar", h1: "Studiyalar", crumbs: ["Ana səhifə", "Studiyalar"] },
  { path: "/paketler", h1: "Paketlər", crumbs: ["Ana səhifə", "Paketlər"] },
  { path: "/paketler/muraciet", h1: "Paketə qoşul", crumbs: ["Ana səhifə", "Paketlər", "Müraciət et"] },
  { path: "/islerimiz", h1: "İşlərimiz", crumbs: ["Ana səhifə", "İşlərimiz"] },
  { path: "/islerimiz/videolar", h1: "İşlərimiz", crumbs: ["Ana səhifə", "İşlərimiz"] },
  { path: "/rezervasiya", h1: "Rezervasiya et", crumbs: ["Ana səhifə", "Rezervasiya et"] },
  { path: "/elaqe", h1: "Əlaqə", crumbs: ["Ana səhifə", "Əlaqə"] },
  { path: "/istifadeci-qaydalari", h1: "İstifadəçi qaydaları", crumbs: ["Ana səhifə", "İstifadəçi qaydaları"] },
  { path: "/mexfilik-siyaseti", h1: "Məxfilik siyasəti", crumbs: ["Ana səhifə", "Məxfilik siyasəti"] },
];

const widths = [320, 768, 1440];

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const p of pages) {
  test(`@site ${p.path}: one H1, breadcrumb, JSON-LD`, async ({ page }) => {
    const res = await page.goto(p.path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText(p.h1);
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(ld).toContain("LocalBusiness");
    if (p.crumbs) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(page.getByRole("navigation", { name: "Naviqasiya" }).locator("li")).toHaveText(p.crumbs);
      expect(ld).toContain("BreadcrumbList");
    }
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await noHorizontalScroll(page);
    }
  });
}

test("@site unknown URLs answer 404", async ({ request }) => {
  for (const path of ["/yoxdur", "/paketler/yoxdur", "/studiyalar/yoxdur", "/about", "/studiyalar/a/b"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("@site /az prefix redirects to the unprefixed URL", async ({ request }) => {
  const res = await request.get("/az/paketler", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toMatch(/\/paketler$/);
});

for (const width of [320, 1440]) {
  test(`@site menu overlay opens, links work and Escape closes it (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 574 : 900 });
    await page.goto("/haqqimizda");
    await page.getByRole("button", { name: "Menyu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Studiyalar" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Rezervasiya et/ })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "İstifadəçi qaydaları" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menyunu bağla" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Menyu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Paketlər" }).click();
    await expect(page).toHaveURL(/\/paketler$/);
    await expect(page.getByRole("dialog")).toBeHidden();
  });
}

test("@site a studio's decors page: breadcrumb Ana səhifə > Studiya 1 > Dekorlar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  expect((await page.goto("/studiyalar/studiya-1"))?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("Dekorlar");
  await expect(page.getByRole("navigation", { name: "Naviqasiya" }).locator("li")).toHaveText(["Ana səhifə", "Studiya 1", "Dekorlar"]);
  await expect(page).toHaveTitle("Studiya 1 — podkast studiyası və dekorlar | Podkast.az");
});

test("@site sitemap lists the studios' decors pages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const slug of ["studiya-1", "studiya-2", "studiya-3"]) expect(xml).toContain(`/studiyalar/${slug}</loc>`);
});

test("@site Phase 3 pages render their Figma content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/haqqimizda");
  await expect(page.getByRole("heading", { name: "Səsiniz burada öz auditoriyasını tapır." })).toBeVisible();
  await expect(page.locator("[data-section=partners] img").first()).toBeVisible();
  await expect(page.locator("[data-section=advantages] li")).toHaveCount(4);

  await page.goto("/xidmetler");
  await expect(page.locator("[data-section=serviceList] li")).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Səsiniz burada öz auditoriyasını tapır." })).toBeVisible();

  await page.goto("/studiyalar");
  const first = page.locator("[data-section=studioList] article").first();
  await expect(first.getByRole("heading", { name: "Studiya 1" })).toBeVisible();
  await expect(first.getByRole("link", { name: /Dekorlara bax/ })).toHaveAttribute("href", "/studiyalar/studiya-1");
  // The accordion opens another decor on click.
  await first.getByRole("button", { name: "Marketoloqlar üçün dekor" }).click();
  await expect(first.getByText("Marketoloqlar üçün dekor", { exact: true }).last()).toBeVisible();

  await page.goto("/studiyalar/studiya-1");
  await expect(page.getByRole("link", { name: /Rezervasiya et: Həkimlər üçün dekor/ })).toHaveAttribute(
    "href",
    "/rezervasiya?studiya=studiya-1&dekor=hekimler-ucun-dekor",
  );
  await expect(page.locator("[data-section=decorList] article").first().locator("li")).toHaveCount(8);

  await page.goto("/paketler");
  await expect(page.getByText("Ən çox seçilən")).toBeVisible();
  await expect(page.getByRole("link", { name: "Müraciət et: PRO" })).toHaveAttribute("href", /\/paketler\/muraciet\?paket=/);
  await expect(page.getByText("Fərdi qiymət")).toBeVisible();

  await page.goto("/islerimiz");
  await expect(page.getByRole("link", { name: "Şəkillər" })).toHaveAttribute("aria-current", "page");
  await page.locator("[data-section=worksGallery] li button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("link", { name: "Videolar" }).click();
  await expect(page).toHaveURL(/\/islerimiz\/videolar$/);
  await expect(page.locator(".works-carousel .works-current")).toBeVisible();

  await page.goto("/elaqe");
  await expect(page.getByText("Bakı şəhəri, Ə.Rəcəbli 1/10")).toBeVisible();
  await expect(page.getByLabel("Mesajınız")).toBeVisible();
});

const seoPages: { path: string; types: string[] }[] = [
  { path: "/", types: ["LocalBusiness", "WebSite"] },
  { path: "/haqqimizda", types: ["AboutPage"] },
  { path: "/xidmetler", types: ["Service"] },
  { path: "/studiyalar", types: ["Place"] },
  { path: "/studiyalar/studiya-1", types: ["Place"] },
  { path: "/paketler", types: ["OfferCatalog", "Offer"] },
  { path: "/paketler/muraciet", types: ["OfferCatalog"] },
  { path: "/islerimiz", types: ["ImageGallery", "ImageObject"] },
  { path: "/islerimiz/videolar", types: [] },
  { path: "/rezervasiya", types: [] },
  { path: "/elaqe", types: ["ContactPage"] },
  { path: "/istifadeci-qaydalari", types: [] },
  { path: "/mexfilik-siyaseti", types: [] },
];

for (const p of seoPages) {
  test(`@site SEO ${p.path}: title, description, canonical, share image, JSON-LD`, async ({ page }) => {
    await page.goto(p.path);
    const title = await page.title();
    expect(title.length, title).toBeGreaterThan(10);
    expect(title.length, title).toBeLessThanOrEqual(60);
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(description.length, description).toBeGreaterThan(50);
    expect(description.length, description).toBeLessThanOrEqual(160);
    expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).pathname).toBe(p.path);
    expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toMatch(/^https?:\/\//);
    expect(await page.locator("html").getAttribute("lang")).toBe("az");
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    const json = JSON.parse(ld!);
    expect(json["@context"]).toBe("https://schema.org");
    for (const type of p.types) expect(ld).toContain(`"${type}"`);
  });
}

test("@site the decor page's booking link keeps one canonical URL", async ({ page }) => {
  await page.goto("/rezervasiya?studiya=studiya-1&dekor=hekimler-ucun-dekor");
  expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).pathname).toBe("/rezervasiya");
});

// The Lighthouse SEO / accessibility basics: images have an alt (empty = decorative), links and
// buttons have a name, no page is accidentally noindex, the document has a meta viewport.
for (const p of seoPages) {
  test(`@site crawlability ${p.path}`, async ({ page }) => {
    await page.goto(p.path);
    const problems = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll("img").forEach((img) => !img.hasAttribute("alt") && out.push(`img without alt: ${img.src}`));
      document.querySelectorAll("a[href], button").forEach((el) => {
        const name = (el.getAttribute("aria-label") || el.textContent || "").trim() || el.querySelector("img[alt]:not([alt=''])");
        if (!name && !el.closest("[aria-hidden=true]")) out.push(`unnamed ${el.tagName}: ${el.outerHTML.slice(0, 80)}`);
      });
      const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
      if (/noindex/.test(robots)) out.push(`robots: ${robots}`);
      if (!document.querySelector('meta[name="viewport"]')) out.push("no viewport");
      return out;
    });
    expect(problems).toEqual([]);
  });
}

for (const width of [1440, 2560]) {
  test(`@site home header lines up with the hero at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important}" });
    const left = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
    const logo = await left("header a");
    const title = await left("h1");
    const menu = await left("header button[aria-expanded]");
    const socials = await left('[data-section="hero"] ul');
    expect(Math.abs(logo.x - title.x)).toBeLessThan(1);
    expect(Math.abs(menu.x + menu.width - (socials.x + socials.width))).toBeLessThan(2);
  });
}

for (const [width, height] of [[1440, 900], [1440, 700], [1366, 650], [1536, 730], [1920, 950], [2560, 1300], [1024, 600], [768, 700], [390, 844], [320, 568]]) {
  test(`@site menu fits the screen without scrolling at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
    const open = page.locator("header button[aria-expanded]");
    const before = (await open.boundingBox())!;
    await open.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0);
    await expect.poll(() => dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    // The close button stays at the menu button's right edge.
    const close = (await dialog.getByRole("button").first().boundingBox())!;
    expect(Math.abs(close.x + close.width - (before.x + before.width))).toBeLessThan(4);
    expect(Math.abs(close.width - 40)).toBeLessThan(16);
    // Desktop: the close button keeps Figma's place; 1440×900 is Figma; a lower screen has equal top and bottom padding.
    if (width >= 1024) {
      const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      expect(Math.abs(close.y - 1.875 * rem)).toBeLessThan(1);
      const link = dialog.getByRole("link").first();
      const top = (await link.boundingBox())!.y;
      if (width === 1440 && height === 900) {
        expect(top).toBe(120);
        expect(await link.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(54);
      } else if (height / rem < 51.5) {
        expect(Math.abs(top - 3.8125 * rem)).toBeLessThan(1);
      } else {
        expect(Math.abs(top - 7.5 * rem)).toBeLessThan(1);
      }
    }
  });
}

test("@site the logo is fully white on the home page, in colour on the others", async ({ page }) => {
  await page.goto("/");
  const logo = page.locator("header a img");
  await expect(logo).toHaveCSS("filter", "brightness(0) invert(1)");
  await page.goto("/paketler");
  await expect(logo).toHaveCSS("filter", "none");
});

test("@site partner logos move endlessly, in black and white, in colour on hover", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/haqqimizda");
  const section = page.locator("[data-section=partners]");
  await section.scrollIntoViewIfNeeded();
  const track = section.locator(".partners-track").first();
  await expect(track).toHaveCSS("animation-name", "partners");
  // Two copies, each at least as wide as the strip, so no gap ever shows.
  await expect(section.locator(".partners-track")).toHaveCount(2);
  const [own, strip] = await Promise.all([track.evaluate((el) => (el as HTMLElement).offsetWidth), section.evaluate((el) => el.clientWidth)]);
  expect(own).toBeGreaterThanOrEqual(strip - 120);
  const logo = track.locator("li").first();
  await expect(logo).toHaveCSS("filter", "grayscale(1)");
  await expect(logo).toHaveCSS("opacity", "0.5");
  await section.hover();
  await logo.hover({ force: true });
  await expect(logo).toHaveCSS("filter", "grayscale(0)");
  await expect(logo).toHaveCSS("opacity", "1");
});

for (const [width, height] of [[1440, 900], [1366, 650], [1440, 600], [1920, 950], [1920, 700], [390, 844], [390, 600], [320, 568]]) {
  test(`@site booking pickers always open above their field at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/rezervasiya?studiya=studiya-1&dekor=hekimler-ucun-dekor");
    await expect(page.locator("input[name=startedAt]")).not.toHaveValue("");
    const field = page.locator("form button[aria-haspopup=dialog]").first();
    // Scrolled so the field is at the very top of the screen: the hardest case.
    await field.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await field.click();
    const panel = page.locator("form [role=dialog]");
    await expect(panel).toBeVisible();
    // Above the field, and all of it on screen.
    await expect.poll(async () => (await panel.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    const [a, b] = [(await panel.boundingBox())!, (await field.boundingBox())!];
    expect(a.y + a.height).toBeLessThanOrEqual(b.y);
    expect(a.y + a.height).toBeLessThanOrEqual(height);
  });
}

test("@site the play button reacts under the pointer, the video itself does not", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/islerimiz/videolar");
  const tile = page.locator(".video-tile:visible").first();
  const badge = tile.locator(".play-badge");
  await expect(badge).toBeVisible();
  await tile.hover({ position: { x: 20, y: 20 } });
  await expect(badge).toHaveCSS("scale", "none");
  await expect(tile).toHaveCSS("cursor", "default");
  await badge.hover();
  await expect(badge).toHaveCSS("scale", "1.25");
  await expect(badge).toHaveCSS("cursor", "pointer");
});

test("@site cards keep their colours while they scroll in (no fade)", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 640 });
  await page.goto("/paketler");
  const card = page.locator("[data-section=packageList] li").first();
  // The card has only partly entered the screen at the top of the page.
  await expect(card).toHaveCSS("opacity", "1");
  await expect(card.getByRole("link").first()).toHaveCSS("background-color", "rgb(254, 91, 0)");
});

test("@site the PRO frame and its tab are one colour, primary 600", async ({ page }) => {
  await page.goto("/paketler");
  const frame = page.locator("[data-section=packageList] li").filter({ hasText: "PRO" }).locator("> div").first();
  await expect(frame).toHaveCSS("background-color", "rgb(254, 91, 0)");
  await expect(frame).toHaveCSS("background-image", "none");
});

/**
 * iOS before 16.4 (e.g. an iPhone 11 not updated) cannot parse class static blocks or regex
 * lookbehind: one such script stops all of React, so menus, radios and checkboxes do nothing.
 * package.json's browserslist (safari 15.4) makes the build write them the old way.
 */
test("@site the page scripts run on Safari 15.4 (no syntax it cannot parse)", async ({ page, request }) => {
  await page.goto("/rezervasiya");
  const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
  expect(scripts.length).toBeGreaterThan(0);
  for (const src of scripts) {
    const code = await (await request.get(src)).text();
    expect(code, src).not.toMatch(/[{;}]static\s*\{/);
    expect(code, src).not.toMatch(/\(\?<[=!]/);
  }
});
