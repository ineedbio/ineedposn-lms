-- 1. "อัปเดตล่าสุด" badge: a month an admin sets by hand (YYYY-MM), shown on course cards. Empty = no badge.
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "updatedMonth" TEXT;

-- 2. Summary sheets (ชีทสรุป) — back office only for now. The whole feature is off for students
--    (lib/ib/sheets.ts SHEETS_ON_SALE = false; no public action reads these tables).
--    PDFs live in FileBlob like other uploads, split in parts (a request can't carry more than ~4 MB).
CREATE TABLE IF NOT EXISTS "Sheet" (
  "id"           TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "coverTitle"   TEXT,
  "subject"      TEXT NOT NULL,
  "price"        INTEGER NOT NULL DEFAULT 0,
  "fullPrice"    INTEGER,
  "pages"        INTEGER,
  "samplePages"  INTEGER,
  "description"  TEXT,
  "updatedMonth" TEXT,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "fileParts"    TEXT NOT NULL DEFAULT '',
  "fileSize"     INTEGER NOT NULL DEFAULT 0,
  "fileName"     TEXT NOT NULL DEFAULT '',
  "sampleParts"  TEXT NOT NULL DEFAULT '',
  "sampleSize"   INTEGER NOT NULL DEFAULT 0,
  "sampleName"   TEXT NOT NULL DEFAULT '',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sheet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "SheetBundle" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "price"       INTEGER NOT NULL DEFAULT 0,
  "sheetIds"    TEXT NOT NULL DEFAULT '',
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SheetBundle_pkey" PRIMARY KEY ("id")
);
