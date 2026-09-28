-- Round 5: several roles at once (admin + teacher) and the teacher invite email status.
-- Additive only: three new columns with defaults on "User". Existing rows keep "role" as it is and
-- "roles" = '' means "use role", so nothing has to be converted.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roles" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invitedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteError" TEXT NOT NULL DEFAULT '';
