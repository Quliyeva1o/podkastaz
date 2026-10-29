# Podkast.az — status

Phases are in [PLAN.md §16](../PLAN.md). Update this file at the end of every phase.

## Phase 0 — Figma assets ✅ (2026-10-28)

- Whole Figma file saved once (`design/figma-cache/file.json`) + all 260 image fills
  (`design/assets/figma/`). No further Figma API calls are needed for layout work.
- Logos: Figma has them only as **raster PNG** (no vectors) → trimmed PNGs in `design/assets/logo/`.
  An SVG logo from the designer would be sharper — asked in the open questions.
- Service illustrations: all 8 cards use **one sprite image** cropped per card → cut into
  `design/assets/services/*.png` (Figma crop transforms). Page 2 has a second, dark variant
  of the same sprite (`f42cd196…`, not used in Page 1).
- Icons: Phosphor (in `@phosphor-icons/react`) + social and menu icons rendered to SVG
  (`design/assets/svg/`), inlined in `src/components/site/icons.tsx`.
- Client questions (PLAN.md §17) are still open — see the list below.

## Phase 1 — foundation ✅ (2026-10-28)

- marketinq.az code copied as the template (fresh git repo, nothing committed yet); its pages,
  sections, collections, redirects and tests removed.
- One language (AZ, no prefix); the `Localized` shape and route table stay i18n-ready.
- URLs (PLAN.md §3) in `src/i18n/routes.ts`; `/studiyalar/<slug>` is the studio's decors page,
  unknown slugs answer a real 404 from the proxy (studio slugs read straight from the DB).
- Tokens: Figma colours (`primary-*`, `neutral-*`), Inter (also where Figma uses Roboto),
  fluid rem: 320 frame below 768 px (max 20px rem), 16px rem 768–1023, 1440 frame from 1024.
- Header (fixed 72/100 px), full-screen menu overlay (desktop + mobile), breadcrumb (mobile:
  current page only), page title block, home hero (one screen), legal text — all measured
  against the Figma JSON at 320 and 1440.
- DB: marketinq.az tables + `studios`, `decors`, `booking_settings`, `bookings` (+ exclusion
  constraint `bookings_no_overlap`, tested: overlap incl. cleaning buffer refused, rejected rows
  ignored), `booking_events`, `package_requests`. Migrations restart at `0000_init`.
- Admin: same panel in the Podkast palette, new menu, auth unchanged.
- Checks: lint, typecheck, build, 17 E2E tests (routes, 404s, H1/breadcrumb/JSON-LD, no
  horizontal scroll at 320/768/1440, menu overlay, admin edit → site).

### Decisions taken

- **Packages, add-ons, services, works, partners = collections** (`collection_items`, generic
  admin editor). Package requests store a price snapshot, so no foreign keys are needed.
  **Studios and decors = own tables** (bookings reference them; DB constraint).
- **Roboto → Inter** for the few Roboto texts (©, hero subtitle, legal links in the menu):
  one font file less; visually almost identical at these sizes.
- Legal pages: Figma lorem ipsum is **not** seeded — a short draft note is, so lorem never
  goes live.

## Phase 2 — admin collections ✅ (2026-10-28)

- **Studiyalar və dekorlar** (`/admin/studios`): list with order, show/hide, thumbnail and
  decor count; studio editor (name, address, text, cover, decors-page SEO, slug) + opening hours
  per weekday + booking rules (step, min/max duration, buffer, days ahead, notice), validated on
  the server; decors per studio (name, short name for the booking card, text, cover, gallery).
  A studio with bookings is hidden instead of deleted; a deleted decor keeps its name on old
  bookings (snapshot). The proxy checks a studio slug on every `/studiyalar/<slug>` request, so
  hiding a studio answers 404 at once.
- Collections in the generic editor: Xidmətlər, Paketlər, Add-on-lar (price must be a whole
  AZN number; empty add-on price = "Fərdi qiymət"), İşlərimiz (photo / video card / collage),
  Tərəfdaşlar.
- `npm run db:seed-collections`: Figma content with images — 8 services (illustrations +
  "Daxildir" lists from the designer's notes), 3 packages, 6 add-ons, 18 photos + 3 video cards
  + 3 collage photos, 6 partner logos, 3 studios × 4 decors (8-photo galleries in Figma order).
- Media library: studio and decor images count as "used" (delete protection, search paths).
- Fix: React 19 reset every typed input after a failed save (hours, slug, switches); the editors
  now submit without that reset. Covered by a test.
- Checks: lint, typecheck, build, 21 E2E tests.

Content notes: studio/decor descriptions are lorem in Figma → left empty. Figma repeats the
video card's text on "Montaj & Post-Production" and has none for "Canlı Yayım" / "Səyyar studio":
those three come from the designer's notes. Studio 3's address is not in Figma ("Bakı" for now).
Partner names were read from the logos (Mado, iSpace, Starbucks, Baku Electronics, Passage 1901,
Peynirci Baba).

## Phase 3 — pages ✅ (2026-10-28)

All pages built from the Figma JSON and measured in the browser against it at 1440 and 320
(positions within 1–2 px, scaled by the scrollbar on desktop); no horizontal scroll at 320/768/1440.

- Haqqımızda: intro (photo + orange heading + text), partner logos, 4 advantage cards
  (shared with Xidmətlər, which shows the heading above them).
- Xidmətlər: header with "Müraciət et", 8 service cards from the collection, advantages.
- Studiyalar: per studio name/text/"Dekorlara bax" + decor accordion (wide photo with the
  blurred name card, narrow strips; hover/tap opens another decor; stacked on mobile).
- Dekorlar (`/studiyalar/<slug>`): per decor name/text/"Rezervasiya et"
  (→ `/rezervasiya?studiya=…&dekor=…`) + 8-photo gallery (4 on mobile, as in Figma).
- Paketlər: 3 equal-height cards, PRO in the orange gradient frame with the "Ən çox seçilən"
  tab; add-ons row ("Fərdi qiymət" when the price is empty). "Müraciət et" → `/paketler/muraciet?paket=…`.
- İşlərimiz: Şəkillər | Videolar switch (two URLs); photo masonry (3 / 2 / 1 columns) with a
  lightbox; Videolar = carousel on desktop (big current video, neighbours faded at the sides,
  orange arrows), list on mobile; play opens YouTube (nocookie) or the mp4 in a viewer.
- Əlaqə: details from Ayarlar → Əlaqə + social buttons, and the form — already working
  (marketinq.az spam protection, stored in Mesajlar, email via `after()`).
- Page headers: alignment per screen is an admin setting (Figma differs per page: e.g.
  Dekorlar is left on desktop, centred on mobile).

### Decisions / deviations

- **Videolar tab**: in Figma the three big video "service" cards sit outside the visible frame
  (hidden), the visible design is the video carousel — that is what was built. The works
  collection is now just photos and videos (cover + YouTube link or mp4).
- **Play button** shows only on videos that have a YouTube link or mp4 — Figma has none yet, so
  the client adds links in the admin (İşlərimiz).
- **Photo masonry** uses each photo's real proportions (Figma crops them to fixed heights).
- **Partner logos** move as an endless strip (Figma lets the row run past both edges with fades);
  all logos share one height (admin setting) because uploaded logos vary in whitespace.
- About text: Figma has lorem ipsum → a short Azerbaijani draft was seeded; replace with the client's.
- The services header "Müraciət et" links to Əlaqə (Figma does not say where).

## Phase 4 — bookings ✅ (2026-10-29)

- **Rules** (`src/lib/booking/slots.ts`, pure): a booking lies within the studio's opening
  hours for that weekday; [start, end + cleaning buffer) must not touch another live booking
  or blocked time; starts and durations move in the studio's step; min/max duration, minimum
  notice and how many days ahead come from Studiyalar → Rezervasiya qaydaları. Baku time is a
  fixed UTC+4 (no daylight saving since 2016).
- `GET /api/availability?studio=&date=` → every start time of the day with its possible ends
  (empty = taken / too soon), or `closed` / `past` / `tooFar`. Never cached.
- **Form** (`/rezervasiya`): Figma layout; studio and decor as radio cards, the Figma date and
  time boxes open the phone's/browser's own pickers (taken times are disabled), "Müraciət et"
  stays grey until both consents are ticked, success → "Qəbul olundu!" modal (bottom sheet on
  mobile). From a decor page the choice is pre-filled and the breadcrumb is
  Ana səhifə > Studiyalar > Dekorlar > Rezervasiya et (Figma's second variant).
- **Server**: zod validation, honeypot + 3 s time trap + 5 requests / 10 min per IP + optional
  Turnstile, the time re-checked, then the database constraint — two simultaneous requests
  for one slot give one booking and one "Bu vaxt artıq tutulub" (tested).
- **Emails** (after the response): admin (recipients from Email bildirişləri) and the customer
  ("müraciətiniz qəbul olundu"); on status changes the customer gets the template of the new
  status. All texts in Ayarlar → Rezervasiya email-ləri, with {ad} {studiya} {dekor} {tarix} {saat}.
- **Admin**: Rezervasiyalar → Siyahı (filters by status, studio, dates, search; CSV export for
  Excel), Təqvim (week view coloured by studio, "Vaxtı bağla" for holidays/maintenance), detail
  page (status + note + "email the customer", full history: who changed what and when).
  Statuses: Yeni → Təsdiqləndi / Rədd edildi / Ləğv edildi → Tamamlandı. The menu badge and the
  dashboard count unseen new requests; the dashboard lists today's and tomorrow's bookings.
- Checks: lint, typecheck, build, 27 E2E tests (availability API, booking + modal + both emails
  in Mailpit, simultaneous requests, admin confirm + customer email, blocked time, CSV).

### Decisions / deviations

- "Digər" decor: Figma has no text field; a short "İstəyiniz" field appears when it is chosen
  (stored with the booking, shown to the admin).
- Date and time use the device's native pickers inside the Figma boxes (best on phones,
  accessible); the boxes look as in Figma, the opened picker is the system one.
- Figma's phone field is half width (a component state); it is full width like the others.
- No price on the form (not in Figma; question 4 below).

## Phase 5 — package requests and contact ✅ (2026-10-29)

- **Paketə qoşul** (`/paketler/muraciet`, Figma "Paketlər/Müraciət et"): package as radio
  cards (pre-selected from the Paketlər page: `?paket=pro`), add-ons as checkbox cards, live
  "Ümumi" (Figma example START + 1 saat + Subtitrlər = 169 AZN; "+ fərdi" when Aylıq paket is
  chosen), personal data, two consents (button grey until ticked), "Qəbul olundu!" modal.
- **Server**: the package and add-ons are looked up again and the total computed there (the
  browser's sum is only a preview); names and prices are stored as a snapshot. Honeypot, time
  trap, 5 requests / 10 min per IP, optional Turnstile.
- **Emails**: admin (Email bildirişləri) + "müraciətiniz qəbul olundu" to the customer; texts in
  Ayarlar → Paket müraciəti email-ləri ({ad}, {paket}, {məbləğ}).
- **Admin → Paket müraciətləri**: list (status filter, search), detail with the snapshot,
  status Yeni / Əlaqə saxlanıldı / Razılaşdı / İmtina + note; menu badge for unseen ones.
- **Əlaqə form** (done in phase 3): same spam protection, stored in Mesajlar, admin email.
- The booking and package forms share their controls (`src/components/site/form-controls.tsx`).
- Collection seed slugs are now clean (`start`, `pro`, `premium`).
- Checks: lint, typecheck, build, 29 E2E tests.

## Phase 6 — SEO ✅ (2026-10-29)

- Every page: admin-edited title (≤ 60) and description (≤ 160) with the search phrases
  (podcast studiyası Bakı, podcast çəkilişi, studiya icarəsi…), canonical (query strings such
  as `?studiya=` keep the clean URL), `lang="az"`, hreflang + x-default, Open Graph + Twitter card,
  one H1 with a hidden keyword continuation, robots.txt (no /admin, /api), sitemap with the
  studio pages, `SITE_NOINDEX=1` for the test domain.
- **Share image**: admin → page → SEO tab now has a "Paylaşım şəkli" picker; empty → the
  page's first image (hero photo, about photo, studio cover), else `og.png`.
- **JSON-LD** (`src/lib/page-graph.ts`), on top of LocalBusiness/ProfessionalService +
  WebSite + BreadcrumbList on every page: Service list (Xidmətlər), OfferCatalog with AZN
  offers (Paketlər, Paket müraciəti), Place per studio (Studiyalar, each decors page with photos),
  ImageGallery (Şəkillər), VideoObject list (Videolar — only videos with a YouTube link),
  AboutPage, ContactPage. Opening hours "Mo-Su 10:00-22:00" (Şirkət məlumatları, to confirm).
- Studio pages: description built from the studio and its decors when the admin text is empty.
- Checks: 43 + 13 E2E tests — per page title/description length, canonical, absolute og:image,
  JSON-LD types, every image with an alt, every link/button named, no stray noindex.
- **Lighthouse was not run**: downloading it (`npx lighthouse`) was refused by the session's
  permission check. The tests above cover its SEO audits; a real Lighthouse run (SEO +
  performance) is part of phase 7.

Still to do at launch (phase 8): `SITE_URL` = the real domain, the other domain + `www` → 301,
Search Console (sitemap), Google Business Profile, real social links (placeholders are left out
of `sameAs`).

## Phase 7 — performance and QA ✅ (2026-10-29)

- **Core Web Vitals** (`npm run perf:vitals mobile|desktop`, local Playwright Chromium with
  Lighthouse's mobile throttling: slow 4G, CPU ×4; Lighthouse itself could not be downloaded):
  every page LCP 0.8–1.4 s (mobile) / ≤ 0.2 s (desktop), CLS ≤ 0.007, TBT 100–220 ms (mobile) /
  0 ms (desktop). Per page ~330–510 KB: JS 156 KB (≈ 130 KB is the Next/React runtime),
  CSS 12 KB, Inter 131 KB (latin + latin-ext, preloaded via `Link` headers), images on demand.
  Fixed: the Videolar thumbnails load eagerly (LCP 1.98 → 0.96 s).
- **Admin speed** (`npm run perf:admin`): full loads 35–110 ms, in-app navigation 17–103 ms
  (target < 300 ms).
- **Cross-browser** (Docker, Chromium + Firefox + WebKit): 138/138 public-site tests pass.
- **Visual check against Figma** (`npm run visual:pages`, desktop renders in
  `design/reference/desktop/`): 2–5 % different pixels on most pages (anti-aliasing, real texts
  instead of lorem); Studiyalar / Dekorlar / İşlərimiz differ more only because content shifts
  (empty lorem descriptions, real photo proportions). Fixed after the look: the PRO tab height
  (+4 px gradient stroke), package card title line height, advantage card text wrapping.
  Mobile renders: Figma's API rate limit ("retry after 93 h") — mobile was checked by measuring
  against the Figma JSON instead (phases 1–5).
- **Accessibility** (axe-core, WCAG 2 A/AA): no structural problems; the only findings are
  colour contrast from the Figma palette — white on the brand orange `#fe5b00` (3.1 : 1) and
  the grey `#85807d` of breadcrumbs, tabs and placeholders (3.8 : 1); AA wants 4.5 : 1. Kept
  as designed (1:1 with Figma) — **a question for the designer**: a darker orange for buttons
  (e.g. `#cc4002`, 5.4 : 1) and `#6e6a67` for the greys would pass. Fixed: duplicate alt texts
  on the studio photos.
- Checks: lint, typecheck, build, 56 E2E (Chromium) + 138 cross-browser.

## Phase 8 — deploy (prepared 2026-10-29, not deployed)

Ready on this side; the deploy itself needs the client's cPanel account, the domain decision
and a GitHub repo with the code (nothing is committed yet).

- `deploy/cpanel/`: deploy.sh / rollback.sh / backup.sh / app.js for `~/podkast-src`,
  `~/podkast-app`, `~/podkast-public`; env.example for Podkast (SITE_URL, DB, SMTP mailbox,
  Turnstile, ffmpeg); htaccess.txt (https + no-www → podkast.az); step-by-step README in
  Azerbaijani (test address with noindex first, then the switch, Search Console, Business Profile).
- `scripts/deploy/export-content.sh`: database + web renditions from the local Docker Postgres
  (no pg_dump install needed on Windows); test bookings, requests, messages and admin users
  stay out. Tested: 36 KB SQL + 7.3 MB media; restored into an empty database as a
  **non-superuser** owner (like a cPanel user) — `btree_gist` and the booking constraint come
  along; `db:migrate` afterwards is a no-op.
- `app.js` + standalone build tested in the server layout (release dir, `current`,
  `shared/.env`): pages, 404, admin, sitemap and the booking API answer.
- `npm run check:launch`: ✗ blockers / ⚠ client checks. Today: ✗ SITE_URL (local), IP_HASH_SALT,
  Figma sample phone, placeholder social links, legal drafts; ⚠ sample address, business data
  (legal name, postcode, map coordinates), about draft, studio names "Studiya 1–3" and empty
  descriptions, default opening hours and booking rules, decor descriptions, no YouTube links.

## Figma pass (2026-10-29, deploy paused by the client)

- `node tests/visual/figma-diff.mjs desktop|mobile [page…]` (prod server on :3100): every text
  and image of the 12 desktop + 12 mobile frames against the page — position, size, font,
  line height, spacing, colour, radius, opacity. Reads `design/figma-cache/file.json`.
- Fixed: mobile button sizes, disabled button colours, partner logos (sizes, crop, 50% grey —
  the class was never generated —, static row on desktop), bordered-card paddings, PRO tab,
  add-on line wrap, service card height, contact status spacing, legal pages left-aligned,
  works masonry heights, carousel widths, mobile advantages heading, package-request gap,
  booking "Studiya" label hidden on mobile. Partners: admin has height/width per logo.
- The admin E2E test now puts the contact subtitle back after editing it.
- Left on purpose: Figma lorem / sample names and emails, seeded draft texts, 3 studios
  (Figma 2), H1 line height 80 vs 84 (same box), under 5 px rounding.

## PLAN.md audit (2026-10-29)

Checked every section of PLAN.md against the code; added what was missing:

- **Admin istifadəçilər** (`/admin/users`, Ayarlar menu, admins only): add a user (name, email,
  role, password ≥ 12), rename, role, new password (signs that user out everywhere), delete
  (not yourself, never the last admin). Editors use the panel without this page.
- **Calendar day view** (`?view=day&date=`): one column per studio with decor and phone; the
  week view's day headers open it; Gün / Həftə switch.
- **Lightbox on demand**: the photo/video viewer is a separate chunk loaded on the first click.
- **Figma**: the diff tool now also checks boxes (frames, borders per side, radius, fill and
  stroke colours with alpha) and the menu, privacy, empty package request, "Qəbul olundu" modal
  and booking-from-home frames. Fixed: Roboto for the 4 Figma Roboto texts (home subtitle, ©,
  menu legal links, contact email) instead of Inter; unchecked checkbox border `#e5e4e3`; the
  booking "Studiya" heading margin on desktop; "Digər" card gap; add-on/package cards 85 px;
  contact social gap 12 px and mobile textarea 143 px; mobile menu cards 292 px; decor cards
  shown (disabled) before a studio is chosen, as in Figma's home-page variant.
- **Tests** (60): admin users (editor cannot manage users, delete ends the session), media in
  use cannot be deleted, contact honeypot / time trap not stored, per-IP rate limit, calendar
  day view.

### Motion and hover (2026-10-29)

- Home hero: the blurred panel slides in from the left (desktop), the logo, title, text and
  buttons follow from the left one by one, the photo settles from a slight zoom, © and social
  buttons fade in. Inner pages: the title block rises in. Cards and blocks rise in while they
  scroll into view (CSS scroll timelines, no JS; static where unsupported). All in
  `globals.css` with `from`-only keyframes, so reduced motion / tests show the final layout.
  Animated texts start at 1% opacity so the LCP is not delayed (Paketlər 1.94 → 1.05 s).
- Hover: cards lift with a soft shadow (services, advantages, packages), photos zoom slightly
  (about, decor galleries, works), partner logos brighten, social buttons and menu links move,
  buttons press in (`active:scale`).
- Studiyalar: decor and studio descriptions get Azerbaijani drafts the length of Figma's lorem
  (`scripts/draft-texts.mts`), so the caption looks as designed; `check:launch` warns while a
  draft is live and fails on lorem ipsum in studio/decor texts (Studiya 1 has lorem typed in
  the admin).
- Admin calendar (week): a booking takes the whole day column; only overlapping ones share it.
  The studio name is shown on each box.

Still open: Lighthouse itself (downloading it is blocked by the session's permission check —
run `npx lighthouse` by hand), the optional `.ics` / WhatsApp / SMS (PLAN §5.4, client's call),
the client questions below, and deploy (paused).

## Open questions for the client (PLAN.md §17)

1. Domain: podkast.az (logo) or podcast.az (©)?
2. Languages: AZ only, or EN/RU too?
3. Hosting: same cPanel account as marketinq.az?
4. Studio hourly price on the booking form?
5. Booking rules: hours per studio/day, min/max duration, step, buffer, how far ahead, deposit?
6. Studios page image interaction (hover expand?) and a text field for the "Digər" decor?
7. Contact form "Mövzu": free text or a list?
8. Service cards: open a detail with the "Daxildir" list?
9. Tablet layout: from the designer, or ours?
10. An SVG version of the logo (Figma only has PNG).
