import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { hasAdmin, signIn } from "./helpers";

/**
 * Booking flow (PLAN.md §5): free times from the API, the form with the Figma "Qəbul olundu!"
 * modal, emails (Mailpit), the database refusing a double booking, admin status + blocked time.
 * Uses Studiya 2 on a day a few days ahead so the default notice time never interferes.
 */

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8026";
const bakuDay = (offset: number) => new Date(Date.now() + 4 * 3600e3 + offset * 86400e3).toISOString().slice(0, 10);
const day = bakuDay(5);

async function mails(to: string) {
  const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
  return ((await res.json()) as { messages: { Subject: string }[] }).messages ?? [];
}

/** Fills the whole form for Studiya 2 on `day`, `start`–`end`. */
async function fill(page: Page, email: string, start: string, end: string) {
  await page.goto("/rezervasiya?studiya=studiya-2&dekor=marketoloqlar-ucun-dekor");
  // The time trap starts when the form hydrates.
  await expect(page.locator("input[name=startedAt]")).not.toHaveValue("");
  const trapStart = Date.now();
  await expect(page.locator("input[name=decor][value=marketoloqlar-ucun-dekor]")).toBeChecked();
  await page.locator("input[name=date]").fill(day);
  const startSelect = page.locator("select[name=start]");
  await expect(startSelect.locator(`option[value="${start}"]`)).toBeEnabled();
  await startSelect.selectOption(start);
  await page.locator("select[name=end]").selectOption(end);
  await page.getByLabel("Ad", { exact: true }).fill("E2E");
  await page.getByLabel("Soyad").fill("Rezerv");
  await page.getByLabel("Telefon").fill("+994 50 000 00 00");
  await page.getByLabel("E-mail ünvanı").fill(email);
  const submit = page.getByRole("button", { name: "Müraciət et" });
  await expect(submit).toBeDisabled();
  await page.locator("input[name=accuracy]").check();
  await page.locator("input[name=terms]").check();
  await expect(submit).toBeEnabled();
  // The time trap wants 3 s between hydration and submit.
  await page.waitForTimeout(Math.max(0, 3300 - (Date.now() - trapStart)));
  return submit;
}

test.beforeAll(async () => {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
});

test("availability API: past and far days, closed studio, bad input", async ({ request }) => {
  expect((await (await request.get(`/api/availability?studio=studiya-2&date=${bakuDay(-1)}`)).json()).status).toBe("past");
  expect((await (await request.get(`/api/availability?studio=studiya-2&date=${bakuDay(400)}`)).json()).status).toBe("tooFar");
  const open = await (await request.get(`/api/availability?studio=studiya-2&date=${day}`)).json();
  expect(open.status).toBe("open");
  expect(open.starts[0]).toMatchObject({ time: "10:00" });
  expect(open.starts[0].ends[0]).toBe("11:00");
  expect((await request.get(`/api/availability?studio=yoxdur&date=${day}`)).status()).toBe(404);
  expect((await request.get(`/api/availability?studio=studiya-2&date=2026-02-30`)).status()).toBe(400);
});

test("booking: request, modal, emails, then the time is taken", async ({ page }) => {
  const email = "rezerv1@e2e.test";
  const submit = await fill(page, email, "10:00", "11:30");
  await submit.click();
  const modal = page.getByRole("dialog", { name: "Qəbul olundu!" });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("link", { name: "Ana səhifəyə qayıt" })).toHaveAttribute("href", "/");

  // Admin notification + "we received your request" to the customer.
  await expect.poll(async () => (await mails(email)).length).toBe(1);
  await expect.poll(async () => (await mails("info@podkast.az")).some((m) => m.Subject.startsWith("Yeni rezervasiya"))).toBe(true);

  // The booked range is no longer offered.
  const slots = await (await page.request.get(`/api/availability?studio=studiya-2&date=${day}`)).json();
  expect(slots.starts.find((s: { time: string }) => s.time === "10:00").ends).toEqual([]);
  expect(slots.starts.find((s: { time: string }) => s.time === "11:00").ends).toEqual([]);
  expect(slots.starts.find((s: { time: string }) => s.time === "11:30").ends.length).toBeGreaterThan(0);
});

test("two people submitting the same time at once: one booking, one 'taken'", async ({ browser }) => {
  const [a, b] = await Promise.all([browser.newPage(), browser.newPage()]);
  const [submitA, submitB] = await Promise.all([fill(a, "rezerv2@e2e.test", "14:00", "15:00"), fill(b, "rezerv3@e2e.test", "14:00", "15:00")]);
  await Promise.all([submitA.click(), submitB.click()]);
  const results = await Promise.all(
    [a, b].map((p) =>
      Promise.race([
        p.getByRole("dialog", { name: "Qəbul olundu!" }).waitFor().then(() => "ok"),
        p.getByText("Bu vaxt artıq tutulub").waitFor().then(() => "taken"),
      ]),
    ),
  );
  expect(results.sort()).toEqual(["ok", "taken"]);

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const rows = await sql`select count(*)::int as n from bookings where email in ('rezerv2@e2e.test', 'rezerv3@e2e.test')`;
  await sql.end();
  expect(rows[0].n).toBe(1);
  await Promise.all([a.close(), b.close()]);
});

test("admin: confirm a booking (customer email), block time, calendar", async ({ page, request }) => {
  test.skip(!hasAdmin, "ADMIN_EMAIL / ADMIN_PASSWORD not set");
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const [row] = await sql`select id from bookings where email = 'rezerv1@e2e.test'`;
  await sql.end();
  expect(row).toBeTruthy();

  await signIn(page);
  await page.goto("/admin/bookings");
  await expect(page.getByRole("link", { name: "E2E Rezerv" }).first()).toBeVisible();
  await page.goto(`/admin/bookings/${row.id}`);
  await page.getByRole("combobox").selectOption("confirmed");
  await page.getByRole("textbox").fill("E2E qeyd");
  await page.getByRole("button", { name: "Yadda saxla" }).click();
  await expect(page.getByText("Yadda saxlanıldı, müştəriyə email göndərildi")).toBeVisible();
  await expect.poll(async () => (await mails("rezerv1@e2e.test")).some((m) => m.Subject.includes("təsdiqləndi"))).toBe(true);
  await page.reload();
  await expect(page.getByText("Təsdiqləndi").first()).toBeVisible();
  await expect(page.getByText("E2E qeyd").last()).toBeVisible();

  // Blocked time closes the slots for visitors.
  await page.goto(`/admin/bookings/calendar?week=${day}`);
  await page.getByLabel("Studiya").selectOption({ label: "Studiya 2" });
  await page.getByLabel("Tarix").fill(day);
  await page.getByLabel("Başlama").fill("16:00");
  await page.getByLabel("Bitmə").fill("18:00");
  await page.getByLabel("Səbəb (istəyə bağlı)").fill("E2E texniki iş");
  await page.getByRole("button", { name: "Vaxtı bağla" }).click();
  await expect(page.getByText("Vaxt bağlandı")).toBeVisible();
  const slots = await (await request.get(`/api/availability?studio=studiya-2&date=${day}`)).json();
  expect(slots.starts.find((s: { time: string }) => s.time === "16:00").ends).toEqual([]);
  await page.reload();
  await expect(page.getByRole("link", { name: /E2E texniki iş/ })).toBeVisible();

  // Day view: a column per studio for that day.
  await page.goto(`/admin/bookings/calendar?view=day&date=${day}`);
  await expect(page.getByText("Studiya 2", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E texniki iş/ })).toBeVisible();

  // CSV export of the list.
  const csv = await page.request.get(`/admin/bookings/export?from=${day}&to=${day}`);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("rezerv1@e2e.test");
});
