import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { hasAdmin, signIn } from "./helpers";

test.skip(!hasAdmin, "ADMIN_EMAIL / ADMIN_PASSWORD not set");

test("admin: add an editor, the editor signs in without the users page, then the user is deleted", async ({ page, browser }) => {
  const email = `editor-${Date.now()}@e2e.test`;
  const password = randomUUID();
  await signIn(page);
  await page.goto("/admin/users");
  const add = page.locator("form").filter({ has: page.getByRole("button", { name: "Əlavə et" }) });
  await add.getByLabel("Ad", { exact: true }).fill("E2E Redaktor");
  await add.getByLabel("Email", { exact: true }).fill(email);
  await add.getByLabel(/^Şifrə/).fill("qısa");
  await add.getByRole("button", { name: "Əlavə et" }).click();
  // The browser's minLength stops the short password; the typed values stay.
  await expect(add.getByLabel("Email", { exact: true })).toHaveValue(email);
  await add.getByLabel(/^Şifrə/).fill(password);
  await add.getByRole("button", { name: "Əlavə et" }).click();
  await expect(page.getByText("İstifadəçi əlavə olundu")).toBeVisible();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();

  // The editor works in the panel but does not manage users.
  const other = await browser.newContext();
  const editor = await other.newPage();
  await editor.goto("/admin/login");
  await editor.getByLabel(/e-?mail/i).fill(email);
  await editor.getByLabel(/şifrə/i).fill(password);
  await editor.getByRole("button", { name: /daxil/i }).click();
  await expect(editor.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(editor.getByRole("link", { name: "Admin istifadəçilər" })).toHaveCount(0);
  await editor.goto("/admin/users");
  await expect(editor.getByText("İstifadəçiləri yalnız admin rolu olanlar idarə edə bilər.")).toBeVisible();

  // Deleting the user ends their session.
  page.once("dialog", (d) => d.accept());
  await page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: email }) })
    .getByRole("button", { name: "İstifadəçini sil" })
    .click();
  await expect(page.getByRole("heading", { name: email })).toHaveCount(0);
  await editor.goto("/admin");
  await expect(editor).toHaveURL(/\/admin\/login/);
  await other.close();

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const left = await sql`select id from users where email = ${email}`;
  await sql.end();
  expect(left).toHaveLength(0);
});

test("admin: a file used on the site cannot be deleted from the media library", async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const [row] = await sql`select data->>'cover' as id from collection_items where collection = 'partners' and data->>'cover' is not null limit 1`;
  await sql.end();
  expect(row?.id).toBeTruthy();

  await signIn(page);
  const res = await page.request.delete(`/api/admin/media?id=${row.id}`);
  expect(res.status()).toBe(409);
  expect((await res.json()).usage.length).toBeGreaterThan(0);

  const check = postgres(process.env.DATABASE_URL!, { max: 1 });
  const still = await check`select id from media where id = ${row.id}`;
  await check.end();
  expect(still).toHaveLength(1);
});
