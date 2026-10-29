import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { hasAdmin, signIn } from "./helpers";

/** Paket müraciəti (PLAN.md §6): live total, server-side total + price snapshot, emails, admin status. */

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8026";

test("package request: pre-selected package, add-ons, total, modal, stored snapshot", async ({ page }) => {
  await page.goto("/paketler");
  await page.getByRole("link", { name: "Müraciət et: PRO" }).click();
  await expect(page).toHaveURL(/\/paketler\/muraciet\?paket=/);
  await expect(page.locator("input[name=package][value=pro]")).toBeChecked();
  await expect(page.locator("input[name=startedAt]")).not.toHaveValue("");
  const trapStart = Date.now();

  // Figma example: START + 1 saat + Subtitrlər = 169 AZN.
  await page.locator("label", { hasText: "START" }).click();
  await page.locator("label", { hasText: "Əlavə 1 saat studiya" }).click();
  await page.locator("label", { hasText: "Subtitrlər" }).click();
  await expect(page.getByText("169", { exact: true })).toBeVisible();
  await page.locator("label", { hasText: "Aylıq paket" }).click();
  await expect(page.getByText("169 + fərdi", { exact: true })).toBeVisible();

  await page.getByLabel("Ad", { exact: true }).fill("E2E");
  await page.getByLabel("Soyad").fill("Paket");
  await page.getByLabel("Telefon").fill("+994 50 111 11 11");
  await page.getByLabel("E-mail ünvanı").fill("paket@e2e.test");
  const submit = page.getByRole("button", { name: "Müraciət et" });
  await expect(submit).toBeDisabled();
  await page.locator("input[name=accuracy]").check();
  await page.locator("input[name=terms]").check();
  await page.waitForTimeout(Math.max(0, 3300 - (Date.now() - trapStart)));
  await submit.click();
  await expect(page.getByRole("dialog", { name: "Qəbul olundu!" })).toBeVisible();

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const [row] = await sql`select package_snapshot, addons_snapshot, total from package_requests where email = 'paket@e2e.test'`;
  await sql.end();
  expect(row.total).toBe(169);
  expect(row.package_snapshot).toMatchObject({ name: "START", price: 99 });
  expect(row.addons_snapshot.map((a: { name: string; price: number | null }) => [a.name, a.price])).toEqual(
    expect.arrayContaining([
      ["Əlavə 1 saat studiya", 40],
      ["Subtitrlər (AZ / EN / RU)", 30],
      ["Aylıq paket", null],
    ]),
  );

  // Admin + customer emails.
  await expect
    .poll(async () => {
      const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:paket@e2e.test")}`);
      return ((await res.json()) as { messages: unknown[] }).messages.length;
    })
    .toBe(1);
});

test("admin: package request list, detail and status", async ({ page }) => {
  test.skip(!hasAdmin, "ADMIN_EMAIL / ADMIN_PASSWORD not set");
  await signIn(page);
  await page.goto("/admin/package-requests");
  await page.getByRole("link", { name: "E2E Paket" }).click();
  await expect(page.getByText("169 AZN + fərdi qiymət")).toBeVisible();
  await page.getByRole("combobox").selectOption("contacted");
  await page.getByRole("textbox").fill("Zəng edildi");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yadda saxlanıldı")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Əlaqə saxlanıldı").first()).toBeVisible();
});
