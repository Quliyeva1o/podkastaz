import { execFileSync } from "node:child_process";

/**
 * Starts every run from the seeded content (local database only — the reset script
 * refuses anything else) and re-links the imported Figma images to it,
 * then fills the English texts.
 */
export default function globalSetup() {
  execFileSync("npm", ["run", "db:reset-content"], { stdio: "inherit", shell: true });
  execFileSync("npm", ["run", "figma:assets"], { stdio: "inherit", shell: true });
  execFileSync("npm", ["run", "i18n:fill-en"], { stdio: "inherit", shell: true });
}
