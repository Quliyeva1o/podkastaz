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
  await expect(page).toHaveTitle("Studiya 1 — Dekorlar | Podkast.az");
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
