import { expect, test, type Page } from "@playwright/test";

/**
 * English version (/en): every page answers in English with hreflang to its Azerbaijani twin,
 * the switcher keeps the page, and a booking made in English gets the customer email in English
 * (the admin's stays Azerbaijani). Content comes from `npm run i18n:fill-en` (global setup).
 */

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8026";
const bakuDay = (offset: number) => new Date(Date.now() + 4 * 3600e3 + offset * 86400e3).toISOString().slice(0, 10);

const pages = [
  { en: "/en", az: "/", h1: "Turn Your Voice into a Brand" },
  { en: "/en/about", az: "/haqqimizda", h1: "About us" },
  { en: "/en/services", az: "/xidmetler", h1: "Services" },
  { en: "/en/studios", az: "/studiyalar", h1: "Studios" },
  { en: "/en/studios/studiya-1", az: "/studiyalar/studiya-1", h1: "Sets" },
  { en: "/en/packages", az: "/paketler", h1: "Packages" },
  { en: "/en/packages/request", az: "/paketler/muraciet", h1: "Join a package" },
  { en: "/en/works", az: "/islerimiz", h1: "Our work" },
  { en: "/en/works/videos", az: "/islerimiz/videolar", h1: "Our work" },
  { en: "/en/booking", az: "/rezervasiya", h1: "Book now" },
  { en: "/en/contact", az: "/elaqe", h1: "Contact" },
  { en: "/en/terms", az: "/istifadeci-qaydalari", h1: "Terms of use" },
  { en: "/en/privacy-policy", az: "/mexfilik-siyaseti", h1: "Privacy policy" },
];

for (const p of pages) {
  test(`@en ${p.en}: English page, hreflang pair, switcher`, async ({ page }) => {
    expect((await page.goto(p.en))?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toContainText(p.h1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${p.en}$`));
    const az = await page.locator('link[hreflang="az"]').getAttribute("href");
    expect(new URL(az!).pathname).toBe(p.az);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", new RegExp(`${p.en}$`));
    // The page answers with English text, not the Azerbaijani fallback.
    expect(await page.title()).not.toMatch(/[əğıöüşç]/i);

    const switcher = page.getByRole("navigation", { name: "Language" });
    await expect(switcher.getByText("EN")).toHaveAttribute("aria-current", "true");
    await expect(switcher.getByRole("link", { name: "AZ" })).toHaveAttribute("href", p.az);
  });
}

test("@en Azerbaijani pages link to their English twin", async ({ page }) => {
  await page.goto("/studiyalar/studiya-2");
  await page.getByRole("navigation", { name: "Language" }).getByRole("link", { name: "EN" }).click();
  await expect(page).toHaveURL(/\/en\/studios\/studiya-2$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sets" })).toBeVisible();
});

test("@en Azerbaijani paths under /en and unknown pages answer 404 in English", async ({ page }) => {
  for (const path of ["/en/haqqimizda", "/en/nope"]) {
    expect((await page.goto(path))?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page not found");
  }
});

test("@en sitemap lists both languages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of pages) expect(xml).toContain(`${p.en}</loc>`);
});

async function mails(to: string) {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
  return ((await res.json()) as { messages: { Subject: string }[] }).messages ?? [];
}

async function pickTime(page: Page, label: string, time: string) {
  const [h, m] = time.split(":");
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
  const panel = page.getByRole("dialog", { name: label });
  await panel.getByRole("listbox", { name: "Hour" }).getByRole("option", { name: h, exact: true }).click();
  await panel.getByRole("listbox", { name: "Minute" }).getByRole("option", { name: m, exact: true }).click();
  await panel.getByRole("button", { name: "Confirm" }).click();
  await expect(panel).toBeHidden();
}

test.describe("@en booking in English", () => {
  // Its own client address, so the other booking tests' requests never hit the rate limit here.
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.23" } });

  test("customer email in English, admin email in Azerbaijani", async ({ page }) => {
    const email = "english@e2e.test";
    await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, { method: "DELETE" });
    const day = bakuDay(6);

    await page.goto("/en/booking?studiya=studiya-1&dekor=hekimler-ucun-dekor");
    await expect(page.locator("input[name=startedAt]")).not.toHaveValue("");
    const trapStart = Date.now();
    await page.getByRole("button", { name: /^Date/ }).click();
    const calendar = page.getByRole("dialog", { name: "Date" });
    if (day.slice(0, 7) !== bakuDay(0).slice(0, 7)) await calendar.getByRole("button", { name: "Next month" }).click();
    await calendar.locator(`[data-date="${day}"][aria-disabled="false"]`).click();
    await pickTime(page, "Start time", "10:00");
    await pickTime(page, "End time", "11:00");
    await page.getByLabel("First name").fill("E2E");
    await page.getByLabel("Last name").fill("English");
    await page.getByLabel("Phone").fill("+994 50 000 00 00");
    await page.getByLabel("Email address").fill(email);
    await page.locator("input[name=accuracy]").check();
    await page.locator("input[name=terms]").check();
    await page.waitForTimeout(Math.max(0, 3300 - (Date.now() - trapStart)));
    await page.getByRole("button", { name: "Send a request" }).click();

    const modal = page.getByRole("dialog", { name: "Received!" });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("link", { name: "Back to the home page" })).toHaveAttribute("href", "/en");

    await expect.poll(async () => (await mails(email)).map((m) => m.Subject)).toEqual(["We received your booking request — Podkast.az"]);
    await expect
      .poll(async () => (await mails("info@podkast.az")).some((m) => m.Subject.startsWith("Yeni rezervasiya") && m.Subject.includes("Studiya 1")))
      .toBe(true);
  });
});
