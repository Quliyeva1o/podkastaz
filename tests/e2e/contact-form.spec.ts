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
