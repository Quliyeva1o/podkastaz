/**
 * Old-URL redirects (managed in admin → Ayarlar → Yönləndirmələr).
 *   from "/about"      → exact path
 *   from "/xeber/*"    → the path and everything below it
 * Paths are compared lower-cased without a trailing slash.
 */
export type RedirectRule = { from: string; to: string; permanent: boolean };

/** Cache tag of the rule list (refreshed by admin edits). */
export const redirectsTag = "redirects";

export const normalizePath = (p: string) => {
  const lower = decodeURIComponent(p).toLowerCase().replace(/\/+$/, "");
  return lower === "" ? "/" : lower;
};

export function matchRedirect(rules: RedirectRule[], pathname: string): RedirectRule | null {
  const path = normalizePath(pathname);
  const hit = findRule(rules, path);
  // Never redirect a path to itself (would loop).
  return hit && normalizePath(hit.to.split("#")[0]) !== path ? hit : null;
}

function findRule(rules: RedirectRule[], path: string): RedirectRule | null {
  let best: RedirectRule | null = null;
  for (const rule of rules) {
    if (rule.from.endsWith("/*")) {
      const base = rule.from.slice(0, -2);
      if ((path === base || path.startsWith(base + "/")) && (!best || base.length > best.from.length - 2)) best = rule;
    } else if (rule.from === path) {
      return rule; // exact match always wins
    }
  }
  return best;
}

/** Validates admin input: both sides must be site paths (or a full URL as the target). */
export function cleanRule(from: string, to: string): { from: string; to: string } | null {
  const f = normalizePath(from.trim().replace(/^https?:\/\/[^/]+/i, ""));
  const t = to.trim();
  if (!f.startsWith("/") || f === "/" || f.includes(" ")) return null;
  if (!(t.startsWith("/") || /^https?:\/\//i.test(t))) return null;
  return { from: f, to: t };
}
