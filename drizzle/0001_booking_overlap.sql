-- One studio can never hold two live bookings at the same time (PLAN.md §5.2).
-- The database refuses the second of two overlapping requests even when they arrive at the
-- same moment; the app turns the error (23P01) into "Bu vaxt artıq tutulub".
-- The occupied range runs to blocked_until (end + the studio's cleaning buffer). Admin-blocked
-- time ("blocked") occupies the studio like a booking; rejected/cancelled/completed rows do not
-- (a completed booking is in the past anyway).
-- btree_gist is a trusted extension (PostgreSQL 13+): the database owner may create it.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("studio_id" WITH =, tstzrange("starts_at", "blocked_until", '[)') WITH &&)
  WHERE ("status" IN ('new', 'confirmed', 'blocked'));
