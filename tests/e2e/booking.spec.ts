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

/** Opens the calendar and picks a day (next month when it is not on the current one). */
async function pickDate(page: Page, date: string) {
  await page.getByRole("button", { name: /^Tarix/ }).click();
  const calendar = page.getByRole("dialog", { name: "Tarix" });
  if (date.slice(0, 7) !== bakuDay(0).slice(0, 7)) await calendar.getByRole("button", { name: "Növbəti ay" }).click();
  await calendar.locator(`[data-date="${date}"][aria-disabled="false"]`).click();
  await expect(calendar).toBeHidden();
}

/** Opens a time picker, chooses the hour and minute, confirms. */
async function pickTime(page: Page, label: string, time: string) {
  const [h, m] = time.split(":");
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
  const panel = page.getByRole("dialog", { name: label });
  await panel.getByRole("listbox", { name: "Saat" }).getByRole("option", { name: h, exact: true }).click();
  await panel.getByRole("listbox", { name: "Dəqiqə" }).getByRole("option", { name: m, exact: true }).click();
  await panel.getByRole("button", { name: "Təsdiq et" }).click();
  await expect(panel).toBeHidden();
}

/** Fills the whole form for Studiya 2 on `day`, `start`–`end`. */
async function fill(page: Page, email: string, start: string, end: string) {
  await page.goto("/rezervasiya?studiya=studiya-2&dekor=marketoloqlar-ucun-dekor");
  // The time trap starts when the form hydrates.
  await expect(page.locator("input[name=startedAt]")).not.toHaveValue("");
  const trapStart = Date.now();
  await expect(page.locator("input[name=decor][value=marketoloqlar-ucun-dekor]")).toBeChecked();
  await pickDate(page, day);
  await pickTime(page, "Başlama vaxtı", start);
  await pickTime(page, "Bitmə vaxtı", end);
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
  expect([...results].sort()).toEqual(["ok", "taken"]);

  // The one who lost the race keeps what they typed and has to choose another time.
  const loser = results[0] === "taken" ? a : b;
  await expect(loser.getByLabel("Ad", { exact: true })).toHaveValue("E2E");
  await expect(loser.getByLabel("Telefon")).toHaveValue("+994 50 000 00 00");
  await expect(loser.locator("input[name=start]")).toHaveValue("");

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const rows = await sql`select count(*)::int as n from bookings where email in ('rezerv2@e2e.test', 'rezerv3@e2e.test')`;
  await sql.end();
  expect(rows[0].n).toBe(1);
  await Promise.all([a.close(), b.close()]);
});

test("pickers: taken days and hours are disabled, the chosen ones marked, empty date stops the form", async ({ page }) => {
  // Studiya 3: one day fully booked, another with 12:00-14:00 taken.
  const full = bakuDay(8);
  const partial = bakuDay(9);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const book = (date: string, from: string, to: string) => sql`
    insert into bookings (studio_id, studio_snapshot, starts_at, ends_at, blocked_until, first_name, last_name, phone, email, status)
    select id, '{}'::jsonb, ${`${date} ${from}+04`}::timestamptz, ${`${date} ${to}+04`}::timestamptz, ${`${date} ${to}+04`}::timestamptz, 'E2E', 'Picker', '+994500000000', 'picker@e2e.test', 'confirmed'
    from studios where slug_az = 'studiya-3'`;
  await book(full, "10:00", "16:00");
  await book(full, "16:00", "22:00");
  await book(partial, "12:00", "14:00");
  await sql.end();

  await page.goto("/rezervasiya?studiya=studiya-3");
  await expect(page.locator("input[name=startedAt]")).not.toHaveValue("");

  // No date yet: the browser refuses to send and the calendar opens by itself.
  const date = page.locator("input[name=date]");
  expect(await date.evaluate((e: HTMLInputElement) => e.validity.valueMissing)).toBe(true);
  await page.locator("input[name=decor][value=other]").check({ force: true });
  await page.getByLabel("Ad", { exact: true }).fill("E2E");
  await page.getByLabel("Soyad").fill("Picker");
  await page.getByLabel("Telefon").fill("+994 50 000 00 00");
  await page.getByLabel("E-mail ünvanı").fill("picker@e2e.test");
  await page.locator("input[name=accuracy]").check();
  await page.locator("input[name=terms]").check();
  await page.getByRole("button", { name: "Müraciət et" }).click();
  const calendar = page.getByRole("dialog", { name: "Tarix" });
  await expect(calendar).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);

  // The fully booked day is grey and cannot be picked; the keyboard can still walk over it.
  if (full.slice(0, 7) !== bakuDay(0).slice(0, 7)) await calendar.getByRole("button", { name: "Növbəti ay" }).click();
  const fullCell = calendar.locator(`[data-date="${full}"]`);
  await expect(fullCell).toHaveAttribute("aria-disabled", "true");
  await expect(fullCell).toHaveAttribute("aria-label", /Tutulub/);
  await fullCell.click({ force: true });
  await expect(calendar).toBeVisible();
  await page.keyboard.press("Escape");

  await pickDate(page, partial);
  await expect(page.getByRole("button", { name: /^Tarix/ })).toContainText(partial.split("-").reverse().join("/"));

  // Start: 12:00-13:30 taken; 11:30 too (no hour left before the booking); 12 and 13 grey.
  await page.getByRole("button", { name: /^Başlama vaxtı/ }).click();
  const start = page.getByRole("dialog", { name: "Başlama vaxtı" });
  const hours = start.getByRole("listbox", { name: "Saat" });
  await expect(hours.getByRole("option", { name: "12", exact: true })).toHaveAttribute("aria-disabled", "true");
  await expect(hours.getByRole("option", { name: "13", exact: true })).toHaveAttribute("aria-disabled", "true");
  await hours.getByRole("option", { name: "12", exact: true }).click({ force: true });
  await expect(hours.getByRole("option", { name: "12", exact: true })).toHaveAttribute("aria-selected", "false");
  await hours.getByRole("option", { name: "11", exact: true }).click();
  await expect(start.getByRole("listbox", { name: "Dəqiqə" }).getByRole("option", { name: "30", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");

  // End after 10:00: free up to the booking, every later hour shown but disabled.
  await pickTime(page, "Başlama vaxtı", "10:00");
  await page.getByRole("button", { name: /^Bitmə vaxtı/ }).click();
  const end = page.getByRole("dialog", { name: "Bitmə vaxtı" });
  const endHours = end.getByRole("listbox", { name: "Saat" });
  await expect(endHours.getByRole("option", { name: "12", exact: true })).toHaveAttribute("aria-disabled", "false");
  await expect(endHours.getByRole("option", { name: "15", exact: true })).toHaveAttribute("aria-disabled", "true");
  await endHours.getByRole("option", { name: "12", exact: true }).click();
  await expect(end.getByRole("listbox", { name: "Dəqiqə" }).getByRole("option", { name: "30", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
});

test("calendar keyboard: arrows move over taken days, Enter picks a free one, Escape returns", async ({ page }) => {
  await page.goto("/rezervasiya?studiya=studiya-2&dekor=marketoloqlar-ucun-dekor");
  await expect(page.locator("input[name=startedAt]")).not.toHaveValue("");
  const trigger = page.getByRole("button", { name: /^Tarix/ });
  await trigger.click();
  const calendar = page.getByRole("dialog", { name: "Tarix" });
  await expect(calendar.locator("[role=grid]")).toHaveAttribute("aria-busy", "false");
  await expect(calendar.locator("[data-date]:focus")).toHaveAttribute("data-date", bakuDay(0));
  await page.keyboard.press("ArrowDown");
  await expect(calendar.locator("[data-date]:focus")).toHaveAttribute("data-date", bakuDay(7));
  await page.keyboard.press("Enter");
  await expect(calendar).toBeHidden();
  await expect(page.locator("input[name=date]")).toHaveValue(bakuDay(7));
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(calendar).toBeHidden();
  await expect(trigger).toBeFocused();
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
