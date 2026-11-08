ALTER TABLE "bookings" ADD COLUMN "lang" text DEFAULT 'az' NOT NULL;--> statement-breakpoint
ALTER TABLE "package_requests" ADD COLUMN "lang" text DEFAULT 'az' NOT NULL;