CREATE TYPE "public"."booking_status" AS ENUM('new', 'confirmed', 'rejected', 'cancelled', 'completed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."package_request_status" AS ENUM('new', 'contacted', 'agreed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"status" "booking_status" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"user_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_settings" (
	"studio_id" uuid PRIMARY KEY NOT NULL,
	"step_min" smallint DEFAULT 30 NOT NULL,
	"min_duration_min" smallint DEFAULT 60 NOT NULL,
	"max_duration_min" smallint DEFAULT 480 NOT NULL,
	"buffer_min" smallint DEFAULT 0 NOT NULL,
	"horizon_days" smallint DEFAULT 60 NOT NULL,
	"lead_time_min" integer DEFAULT 120 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"decor_id" uuid,
	"studio_snapshot" jsonb NOT NULL,
	"decor_snapshot" jsonb,
	"custom_request" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"status" "booking_status" DEFAULT 'new' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"ip_hash" text,
	"read" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_range_check" CHECK ("bookings"."ends_at" > "bookings"."starts_at" AND "bookings"."blocked_until" >= "bookings"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "cache_tags" (
	"tag" text PRIMARY KEY NOT NULL,
	"expired_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection" text NOT NULL,
	"slug_az" text NOT NULL,
	"data" jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"slug_az" text NOT NULL,
	"name" jsonb NOT NULL,
	"short_name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"cover" uuid,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer,
	"height" integer,
	"blur_data_url" text,
	"alt" jsonb NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text,
	"file_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_unique" UNIQUE("key"),
	CONSTRAINT "media_source_unique" UNIQUE("source")
);
--> statement-breakpoint
CREATE TABLE "package_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_snapshot" jsonb NOT NULL,
	"addons_snapshot" jsonb NOT NULL,
	"total" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"status" "package_request_status" DEFAULT 'new' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"ip_hash" text,
	"read" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"position" integer NOT NULL,
	"visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"seo" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"permanent" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_from_unique" UNIQUE("from")
);
--> statement-breakpoint
CREATE TABLE "section_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug_az" text NOT NULL,
	"name" jsonb NOT NULL,
	"address" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"cover" uuid,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hours" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studios_slug_az_unique" UNIQUE("slug_az")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form" text NOT NULL,
	"data" jsonb NOT NULL,
	"locale" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_decor_id_decors_id_fk" FOREIGN KEY ("decor_id") REFERENCES "public"."decors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decors" ADD CONSTRAINT "decors_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decors" ADD CONSTRAINT "decors_cover_media_id_fk" FOREIGN KEY ("cover") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_content_id_section_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."section_contents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_versions" ADD CONSTRAINT "section_versions_content_id_section_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."section_contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_versions" ADD CONSTRAINT "section_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studios" ADD CONSTRAINT "studios_cover_media_id_fk" FOREIGN KEY ("cover") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id","at");--> statement-breakpoint
CREATE INDEX "bookings_studio_starts_idx" ON "bookings" USING btree ("studio_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_ip_idx" ON "bookings" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "cache_tags_expired_idx" ON "cache_tags" USING btree ("expired_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_items_slug_az_idx" ON "collection_items" USING btree ("collection","slug_az");--> statement-breakpoint
CREATE INDEX "collection_items_list_idx" ON "collection_items" USING btree ("collection","published","position");--> statement-breakpoint
CREATE UNIQUE INDEX "decors_studio_slug_idx" ON "decors" USING btree ("studio_id","slug_az");--> statement-breakpoint
CREATE INDEX "decors_studio_idx" ON "decors" USING btree ("studio_id","position");--> statement-breakpoint
CREATE INDEX "package_requests_created_idx" ON "package_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "package_requests_ip_idx" ON "package_requests" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "page_sections_page_slot_idx" ON "page_sections" USING btree ("page_id","slot");--> statement-breakpoint
CREATE INDEX "page_sections_content_idx" ON "page_sections" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "section_versions_content_idx" ON "section_versions" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_created_idx" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submissions_ip_idx" ON "submissions" USING btree ("ip_hash","created_at");