/** Runs once when a server process starts. */
export async function register() {
  // Only the long-running production server needs it (several processes, idle restarts) —
  // not `next build`'s prerender workers, and not `next dev` (one process; touching Next's
  // tag state there makes the dev overlay refresh the page over and over).
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startTagSync } = await import("./lib/cache/tag-sync");
    startTagSync();
  }
}
