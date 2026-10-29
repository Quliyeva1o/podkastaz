import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

/** Contact form: stored for the admin; the honeypot gets a fake success and is not stored. */
test("contact form stores a message", async ({ page }) => {
  await page.goto("/elaqe");
  // The time trap needs a few seconds between page load and submit.
  await page.waitForTimeout(3200);
  await page.getByLabel("Ad", { exact: true }).fill("E2E");
  await page.getByLabel("Soyad").fill("Test");
  await page.getByLabel("E-mail ünvanı").fill("form@e2e.test");
  await page.getByLabel("Mövzu").fill("Video podcast");
  await page.getByLabel("Mesajınız").fill("Salam, test mesajıdır.");
  await page.getByRole("button", { name: "Mesajını göndər" }).click();
  await expect(page.getByText("Mesajınız göndərildi.", { exact: false })).toBeVisible();

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const rows = await sql`select data from submissions where data->>'email' = 'form@e2e.test'`;
  await sql.end();
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.at(-1)!.data).toMatchObject({ name: "E2E Test", subject: "Video podcast" });
});

/** Bots: a filled honeypot and a form sent at once both get the success text but are not stored. */
test("contact form: honeypot and too-fast sends are not stored", async ({ page }) => {
  const send = async (email: string, honeypot: boolean) => {
    await page.goto("/elaqe");
    if (honeypot) {
      await page.waitForTimeout(3200);
      await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "http://spam.example"));
    }
    await page.getByLabel("Ad", { exact: true }).fill("Bot");
    await page.getByLabel("E-mail ünvanı").fill(email);
    await page.getByLabel("Mesajınız").fill("Spam mesajı.");
    await page.getByRole("button", { name: "Mesajını göndər" }).click();
    await expect(page.getByText("Mesajınız göndərildi.", { exact: false })).toBeVisible();
  };
  await send("honeypot@e2e.test", true);
  await send("fast@e2e.test", false);

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const rows = await sql`select id from submissions where data->>'email' in ('honeypot@e2e.test', 'fast@e2e.test')`;
  await sql.end();
  expect(rows).toHaveLength(0);
});

/** 20 messages from one address in 10 minutes: the next one is refused with the "too often" text. */
test("contact form: per-IP rate limit", async ({ browser }) => {
  const ip = "203.0.113.77";
  const salt = process.env.IP_HASH_SALT ?? process.env.DATABASE_URL ?? "podkast";
  const ipHash = createHash("sha256").update(`${salt}:${ip}`).digest("hex");
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  await sql`insert into submissions (form, data, locale, ip_hash) select 'contact', '{"email":"limit@e2e.test"}'::jsonb, 'az', ${ipHash} from generate_series(1, 20)`;
  try {
    const context = await browser.newContext({ extraHTTPHeaders: { "cf-connecting-ip": ip } });
    const page = await context.newPage();
    await page.goto("/elaqe");
    await page.waitForTimeout(3200);
    await page.getByLabel("Ad", { exact: true }).fill("Limit");
    await page.getByLabel("E-mail ünvanı").fill("limit@e2e.test");
    await page.getByLabel("Mesajınız").fill("Limit yoxlaması.");
    await page.getByRole("button", { name: "Mesajını göndər" }).click();
    await expect(page.getByText("Çox tez-tez göndərirsiniz", { exact: false })).toBeVisible();
    await context.close();
  } finally {
    await sql`delete from submissions where ip_hash = ${ipHash}`;
    await sql.end();
  }
});
