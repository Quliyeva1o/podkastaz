# podkast.az

Next.js 16 site + admin panel for the Podkast.az podcast studios, built 1:1 from the Figma file
"Podcast.az" (key `YCsdeoCq9yoNPOKXYnBmWr`). Started from the marketinq.az codebase (same admin
core, media library, SEO and cPanel deploy). Full plan: [PLAN.md](PLAN.md); progress and
decisions: [docs/STATUS.md](docs/STATUS.md).

## Local development

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres localhost:5441, Mailpit SMTP 1026 / inbox http://localhost:8026
cp .env.example .env.local                       # then fill ADMIN_EMAIL / ADMIN_PASSWORD / FIGMA_TOKEN
npm install
npm run db:migrate                               # includes the booking overlap constraint (btree_gist)
npm run db:seed-content                          # pages + sections with the Figma texts
npm run db:seed-admin
npm run figma:assets                             # logos, hero photo, menu card background
npm run db:seed-collections                      # services, packages, works, partners, studios + decors
npm run dev -- -p 3002                           # http://localhost:3002, admin at /admin
```

The ports differ from marketinq.az (5440 / 1025 / 8025 / 3000), so both projects can run at once.

Images and videos are content: they live in the database + `uploads/` (media library), not in
git. Videos uploaded in the admin are re-encoded with **ffmpeg** when it is installed
(Windows `winget install ffmpeg`).

### Figma

The Figma API (Starter plan) is heavily rate limited, so everything was downloaded once:

- `design/figma-notes/` — all texts, section structure, the designer's notes
- `design/figma-cache/file.json` — the whole file (git-ignored, 6.7 MB); `dump.mjs <nodeId>` prints
  a frame's layout and typography from it, `analyze.mjs` lists every image fill
- `design/assets/figma/` — every image fill by image ref (git-ignored, 39 MB; `download-fills.mts`)
- `design/assets/{logo,services,svg}/` — trimmed logos, the 8 service illustrations cut out of
  the designer's sprite, icons rendered as SVG

## Tests

```bash
npm run build && npx next start -p 3100
npm run test:e2e                                 # resets local content before running
```

Cross-browser (Firefox / WebKit are blocked by Windows Smart App Control, so they run in Docker):

```bash
MSYS_NO_PATHCONV=1 docker run --rm --ipc=host -v "$(pwd -W):/app" -w /app mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test -c playwright.cross.config.ts
```

## Lockfile note (Windows)

`npm install` on Windows drops some Linux-only optional packages from `package-lock.json`,
which breaks `npm ci` in Docker. After changing dependencies, resync the lockfile in Linux:

```bash
docker run --rm -v "$(pwd -W):/app" -w /app node:24-alpine npm install --package-lock-only --ignore-scripts
```

## Deploy

Client's A2 Hosting cPanel account (as marketinq.az), step by step in Azerbaijani:
[deploy/cpanel/README.md](deploy/cpanel/README.md) — test address first (`SITE_NOINDEX=1`), then the domain.

- `bash scripts/deploy/export-content.sh` — this computer's content for the first deploy (`deploy-bundle/`)
- `npm run check:launch` — what is still a placeholder (Figma samples, drafts, settings)
- on the server: `bash ~/podkast-src/deploy/cpanel/deploy.sh` (build + atomic switch), `rollback.sh`, `backup.sh` (cron)

Admin edits reach every app process: invalidated cache tags are stored in `cache_tags`
and replayed by `src/lib/cache/tag-sync.ts`, so use `invalidateTags()` from
`src/lib/cache/tags.ts` instead of calling `updateTag` / `revalidateTag` directly.
