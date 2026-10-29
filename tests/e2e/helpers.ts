import { expect, type Page } from "@playwright/test";

/** Signs in with the local seed account (ADMIN_EMAIL / ADMIN_PASSWORD from .env.local). */
export async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/e-?mail/i).fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel(/şifrə/i).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: /daxil/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export const hasAdmin = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
