import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { hasAdmin, signIn } from "./helpers";

test.skip(!hasAdmin, "ADMIN_EMAIL / ADMIN_PASSWORD not set");

test("admin: edit a section and see it on the site", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/pages/contact/header");
  const subtitle = page.getByRole("textbox").nth(1);
  const original = await subtitle.inputValue();
  await subtitle.fill("E2E alt mətn");
  await page.getByRole("button", { name: /yadda saxla/i }).first().click();
  await expect(page.getByText(/yadda saxlanıldı/i)).toBeVisible();

  await page.goto("/elaqe");
  await expect(page.getByText("E2E alt mətn")).toBeVisible();

  // Put the seeded text back so the site keeps matching the design.
  await page.goto("/admin/pages/contact/header");
  await page.getByRole("textbox").nth(1).fill(original);
  await page.getByRole("button", { name: /yadda saxla/i }).first().click();
  await expect(page.getByText(/yadda saxlanıldı/i)).toBeVisible();
});

test("admin: seeded collections are listed and a package price must be a number", async ({ page }) => {
  await signIn(page);
  for (const [name, title] of [
    ["services", "Studio icarəsi"],
    ["packages", "PRO"],
    ["addons", "Aylıq paket"],
    ["works", "Video podcast 1"],
    ["partners", "Starbucks"],
  ]) {
    await page.goto(`/admin/collections/${name}`);
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
  }

  await page.goto("/admin/collections/packages");
  await page.getByRole("link", { name: "START", exact: true }).click();
  const price = page.getByLabel("Qiymət (AZN)");
  await price.fill("doxsan");
  await page.getByRole("button", { name: /yadda saxla/i }).click();
  await expect(page.getByText("Qiymət tam ədəd olmalıdır (AZN, məs. 99)")).toBeVisible();
  await price.fill("99");
  await page.getByRole("button", { name: /yadda saxla/i }).click();
  await expect(page.getByText(/yadda saxlanıldı/i)).toBeVisible();
});

test("admin: studio with hours, rules and a decor; site page appears and disappears", async ({ page, request }) => {
  await signIn(page);
  await page.goto("/admin/studios");
  await expect(page.getByRole("link", { name: "Studiya 1", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /studiya əlavə et/i }).click();
  await expect(page).toHaveURL(/\/admin\/studios\/[0-9a-f-]{36}$/);
  const studioUrl = page.url();
  await page.getByRole("textbox").first().fill("E2E Studiya");
  await page.getByLabel("Bazar ertəsi: bağlanış").fill("09:00");
  await page.getByLabel("Bazar ertəsi: açılış").fill("10:00");
  await page.getByRole("button", { name: /yadda saxla/i }).click();
  await expect(page.getByText(/Bazar ertəsi: iş saatı yanlışdır/)).toBeVisible();
  // A validation error must not wipe what was typed.
  await expect(page.getByLabel("Bazar ertəsi: bağlanış")).toHaveValue("09:00");
  await expect(page.getByRole("textbox").first()).toHaveValue("E2E Studiya");

  await page.getByLabel("Bazar ertəsi: bağlanış").fill("20:00");
  await page.getByLabel("Minimum müddət (dəq)").fill("45");
  await page.getByRole("button", { name: /yadda saxla/i }).click();
  await expect(page.getByText("Müddətlər vaxt addımına bölünməlidir")).toBeVisible();

  await page.getByLabel("Minimum müddət (dəq)").fill("60");
  await page.getByRole("checkbox", { name: "Saytda göstərilsin", exact: true }).check({ force: true }); // sr-only input behind the switch
  await page.getByRole("button", { name: /yadda saxla/i }).click();
  await expect(page.getByText(/yadda saxlanıldı/i)).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Bazar ertəsi: bağlanış")).toHaveValue("20:00");
  await expect(page.getByLabel("Minimum müddət (dəq)")).toHaveValue("60");

  await page.getByRole("button", { name: /dekor əlavə et/i }).click();
  await expect(page).toHaveURL(/\/decors\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Yeni dekor" })).toBeVisible();
  await page.getByRole("textbox").first().fill("E2E dekor");
  await page.getByRole("checkbox", { name: "Saytda göstərilsin", exact: true }).check({ force: true }); // sr-only input behind the switch
  await page.getByRole("button", { name: /yadda saxla/i }).click();
  await expect(page.getByText(/yadda saxlanıldı/i)).toBeVisible();

  const site = await request.get("/studiyalar/e2e-studiya");
  expect(site.status()).toBe(200);
  expect(await site.text()).toContain("E2E Studiya");

  // A studio with bookings is hidden instead of deleted.
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const id = studioUrl.split("/").at(-1)!;
  await sql`insert into bookings (studio_id, studio_snapshot, starts_at, ends_at, blocked_until, status)
            values (${id}, ${sql.json({ name: "E2E Studiya", address: "" })}, now() + interval '1 day', now() + interval '25 hours', now() + interval '25 hours', 'cancelled')`;
  await page.goto(studioUrl);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Studiyanı sil" }).click();
  await expect(page.getByText(/rezervasiyaları var/)).toBeVisible();
  expect((await request.get("/studiyalar/e2e-studiya")).status()).toBe(404);

  await sql`delete from bookings where studio_id = ${id}`;
  await page.goto(studioUrl);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Studiyanı sil" }).click();
  await expect(page).toHaveURL(/\/admin\/studios$/);
  await expect(page.getByRole("link", { name: "E2E Studiya" })).toHaveCount(0);
  await sql.end();
});
