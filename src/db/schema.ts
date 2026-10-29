import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Localized } from "@/i18n/config";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------- Admin users & sessions ----------

export const userRole = pgEnum("user_role", ["admin", "editor"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("editor"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the cookie token — the raw token is never stored. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ---------- Media ----------

export type MediaVariant = { width: number; format: "avif" | "webp" | "mp4"; key: string };

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Object-storage key of the original upload. */
  key: text("key").notNull().unique(),
  mime: text("mime").notNull(),
  width: integer("width"),
  height: integer("height"),
  /** Tiny base64 placeholder shown while the image loads (no layout shift, no blank box). */
  blurDataUrl: text("blur_data_url"),
  alt: jsonb("alt").$type<Localized>().notNull(),
  variants: jsonb("variants").$type<MediaVariant[]>().notNull().default([]),
  /** Origin id for imported files (e.g. "figma:<imageRef>"), so re-imports are idempotent. */
  source: text("source").unique(),
  /** The uploaded file's own name (e.g. "azfibernet-logo.png"), for searching the library. */
  fileName: text("file_name"),
  ...timestamps,
});

// ---------- Pages & sections ----------

export type PageSeo = {
  title: Localized;
  description: Localized;
  ogImageId?: string;
  noindex?: boolean;
};

/** One row per Figma page (home, about, services, ...). */
export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Matches `RouteKey` in src/i18n/routes.ts. */
  key: text("key").notNull().unique(),
  seo: jsonb("seo").$type<PageSeo>().notNull(),
  ...timestamps,
});

/**
 * The actual content of a section. Several pages can point at the same row —
 * that is how a section is shared (e.g. Services on Home and on the Services page).
 */
export const sectionContents = pgTable("section_contents", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Section type from Figma: hero, about, team, process, services, pricing, ... */
  type: text("type").notNull(),
  /** Validated by the section's zod schema; every text inside is `Localized`. */
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  ...timestamps,
});

/** Placement of a section on a page. */
export const pageSections = pgTable(
  "page_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => sectionContents.id, { onDelete: "restrict" }),
    /** Stable slot name on the page, e.g. "services" or "about-stats". */
    slot: text("slot").notNull(),
    position: integer("position").notNull(),
    visible: boolean("visible").notNull().default(true),
  },
  (t) => [
    uniqueIndex("page_sections_page_slot_idx").on(t.pageId, t.slot),
    index("page_sections_content_idx").on(t.contentId),
  ],
);

/** Every save of a section keeps the previous data so an edit can be rolled back. */
export const sectionVersions = pgTable(
  "section_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => sectionContents.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("section_versions_content_idx").on(t.contentId)],
);

// ---------- Global settings, redirects, form submissions ----------

/** Key/value store for header, footer, contact info, default SEO, analytics IDs. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const redirects = pgTable("redirects", {
  id: uuid("id").primaryKey().defaultRandom(),
  from: text("from").notNull().unique(),
  to: text("to").notNull(),
  permanent: boolean("permanent").notNull().default(true),
  ...timestamps,
});

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    form: text("form").notNull(),
    data: jsonb("data").$type<Record<string, string>>().notNull(),
    locale: text("locale").notNull(),
    read: boolean("read").notNull().default(false),
    /** SHA-256 of the sender IP + server secret: enough for rate limiting, the IP itself is never stored. */
    ipHash: text("ip_hash"),
    /** When the notification email went out (null = not sent / SMTP not configured). */
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("submissions_created_idx").on(t.createdAt), index("submissions_ip_idx").on(t.ipHash, t.createdAt)],
);

// ---------- Collections (services, packages, add-ons, works, partners) ----------

/**
 * One table for every collection; the item body is `data` (validated by the
 * collection's field list). The slug is a column per language (unique, indexed);
 * add `slug_en` etc. together with a new locale.
 */
export const collectionItems = pgTable(
  "collection_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collection: text("collection").notNull(),
    slugAz: text("slug_az").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    published: boolean("published").notNull().default(false),
    position: integer("position").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("collection_items_slug_az_idx").on(t.collection, t.slugAz),
    index("collection_items_list_idx").on(t.collection, t.published, t.position),
  ],
);

// ---------- Cache invalidation shared between app processes ----------

/**
 * When each cache tag was last invalidated (ms since epoch). Next.js keeps tag state in the
 * memory of one process; on shared hosting the app may run as several processes or be
 * restarted when idle, so every invalidation is also written here and replayed by
 * src/lib/cache/tag-sync.ts in all processes.
 */
export const cacheTags = pgTable(
  "cache_tags",
  {
    tag: text("tag").primaryKey(),
    expiredAt: bigint("expired_at", { mode: "number" }).notNull(),
  },
  (t) => [index("cache_tags_expired_idx").on(t.expiredAt)],
);

// ---------- Studios, decors and bookings ----------
// Separate tables (not collection_items): bookings reference them by foreign key and the
// database itself must refuse overlapping bookings (exclusion constraint, see drizzle/0001).

/** Opening hours per weekday (0 = Monday … 6 = Sunday), Baku time, "HH:MM"; null = closed. */
export type WeekHours = ({ open: string; close: string } | null)[];

export const studios = pgTable("studios", {
  id: uuid("id").primaryKey().defaultRandom(),
  slugAz: text("slug_az").notNull().unique(),
  name: jsonb("name").$type<Localized>().notNull(),
  /** Short address shown on the booking card ("Bakı", "Əhməd Rəcəbli"). */
  address: jsonb("address").$type<Localized>().notNull(),
  description: jsonb("description").$type<Localized>().notNull(),
  /** Large photo on the Studios page (image or video media id). */
  cover: uuid("cover").references(() => media.id, { onDelete: "set null" }),
  /** Page header and SEO of the studio's decors page. */
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  hours: jsonb("hours").$type<WeekHours>().notNull(),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const decors = pgTable(
  "decors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studioId: uuid("studio_id")
      .notNull()
      .references(() => studios.id, { onDelete: "cascade" }),
    slugAz: text("slug_az").notNull(),
    name: jsonb("name").$type<Localized>().notNull(),
    /** Short name on the booking card ("Həkimlər üçün"). */
    shortName: jsonb("short_name").$type<Localized>().notNull(),
    description: jsonb("description").$type<Localized>().notNull(),
    cover: uuid("cover").references(() => media.id, { onDelete: "set null" }),
    /** Gallery media ids in display order. */
    gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("decors_studio_slug_idx").on(t.studioId, t.slugAz), index("decors_studio_idx").on(t.studioId, t.position)],
);

/** Booking rules of one studio (admin → Rezervasiya ayarları). Minutes everywhere. */
export const bookingSettings = pgTable("booking_settings", {
  studioId: uuid("studio_id")
    .primaryKey()
    .references(() => studios.id, { onDelete: "cascade" }),
  stepMin: smallint("step_min").notNull().default(30),
  minDurationMin: smallint("min_duration_min").notNull().default(60),
  maxDurationMin: smallint("max_duration_min").notNull().default(480),
  /** Cleaning time kept free after every booking. */
  bufferMin: smallint("buffer_min").notNull().default(0),
  /** How many days ahead a booking may start. */
  horizonDays: smallint("horizon_days").notNull().default(60),
  /** Minimum notice before a booking starts. */
  leadTimeMin: integer("lead_time_min").notNull().default(120),
  updatedAt: timestamps.updatedAt,
});

/**
 * new → confirmed | rejected | cancelled → completed.
 * `blocked` rows are admin-closed time (holiday, maintenance) and occupy the studio like a booking.
 */
export const bookingStatus = pgEnum("booking_status", ["new", "confirmed", "rejected", "cancelled", "completed", "blocked"]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studioId: uuid("studio_id")
      .notNull()
      .references(() => studios.id, { onDelete: "restrict" }),
    /** Null = "Digər" (custom decor on request) or a blocked slot. */
    decorId: uuid("decor_id").references(() => decors.id, { onDelete: "set null" }),
    /** Names at booking time, so the booking still reads right after a rename or delete. */
    studioSnapshot: jsonb("studio_snapshot").$type<{ name: string; address: string }>().notNull(),
    decorSnapshot: jsonb("decor_snapshot").$type<{ name: string } | null>(),
    customRequest: text("custom_request"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** End of the occupied range = endsAt + the studio's buffer at booking time (used by the constraint). */
    blockedUntil: timestamp("blocked_until", { withTimezone: true }).notNull(),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    status: bookingStatus("status").notNull().default("new"),
    adminNote: text("admin_note").notNull().default(""),
    /** Where the visitor came from: "decor" page link or "direct". */
    source: text("source").notNull().default("direct"),
    ipHash: text("ip_hash"),
    read: boolean("read").notNull().default(false),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("bookings_studio_starts_idx").on(t.studioId, t.startsAt),
    index("bookings_status_idx").on(t.status, t.startsAt),
    index("bookings_ip_idx").on(t.ipHash, t.createdAt),
    check("bookings_range_check", sql`${t.endsAt} > ${t.startsAt} AND ${t.blockedUntil} >= ${t.endsAt}`),
  ],
);

/** Audit trail: every status change or note on a booking, who did it and when. */
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    status: bookingStatus("status").notNull(),
    note: text("note").notNull().default(""),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_events_booking_idx").on(t.bookingId, t.at)],
);

// ---------- Package requests ----------

export const packageRequestStatus = pgEnum("package_request_status", ["new", "contacted", "agreed", "declined"]);

export const packageRequests = pgTable(
  "package_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Package and add-ons with their prices at request time (the total is computed on the server). */
    packageSnapshot: jsonb("package_snapshot").$type<{ id: string; name: string; price: number }>().notNull(),
    addonsSnapshot: jsonb("addons_snapshot").$type<{ id: string; name: string; price: number | null }[]>().notNull(),
    /** AZN; add-ons with a custom price are not included. */
    total: integer("total").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    status: packageRequestStatus("status").notNull().default("new"),
    adminNote: text("admin_note").notNull().default(""),
    ipHash: text("ip_hash"),
    read: boolean("read").notNull().default(false),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("package_requests_created_idx").on(t.createdAt), index("package_requests_ip_idx").on(t.ipHash, t.createdAt)],
);
