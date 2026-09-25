-- Backend for the INeedBio web app (public/ineedbio/app.js), which now talks to Neon
-- through /api/ib instead of Google Apps Script.

CREATE TABLE "IbSession" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceInfo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    CONSTRAINT "IbSession_pkey" PRIMARY KEY ("tokenHash")
);
CREATE INDEX "IbSession_userId_idx" ON "IbSession"("userId");
ALTER TABLE "IbSession" ADD CONSTRAINT "IbSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FileBlob" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileBlob_pkey" PRIMARY KEY ("id")
);

-- Images moved to the web app's folders (public/images/students, public/images/courses).
UPDATE "StudentResult" SET "photoUrl" = replace("photoUrl", '/results/', '/images/students/') WHERE "photoUrl" LIKE '/results/%';
UPDATE "Course" SET "coverImage" = '/images/courses/phys-alevel-cover.webp' WHERE "coverImage" = '/catalog/phys-alevel-cover.webp';
UPDATE "Course" SET "instructorPhoto" = '/images/courses/pmorsun.webp' WHERE "instructorPhoto" = '/catalog/phys-alevel-instructor.webp';

-- The INeedBio account is an admin (also applied on its next login/registration, see lib/ib/api.ts),
-- and receives the "new enrollment request" emails.
UPDATE "User" SET "role" = 'ADMIN' WHERE lower("email") = 'ineedbio1803@gmail.com';
INSERT INTO "Setting" ("key","value","updatedAt") VALUES ('admin_emails','ineedbio1803@gmail.com',NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = CASE
  WHEN "Setting"."value" = '' THEN EXCLUDED."value"
  WHEN position('ineedbio1803@gmail.com' in lower("Setting"."value")) > 0 THEN "Setting"."value"
  ELSE "Setting"."value" || ',' || EXCLUDED."value" END,
  "updatedAt" = NOW();
