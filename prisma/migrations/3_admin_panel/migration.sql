-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "audience" TEXT,
ADD COLUMN     "faq" TEXT,
ADD COLUMN     "fullPrice" INTEGER,
ADD COLUMN     "highlights" TEXT,
ADD COLUMN     "instructorBio" TEXT,
ADD COLUMN     "instructorName" TEXT,
ADD COLUMN     "instructorPhoto" TEXT,
ADD COLUMN     "instructorTitle" TEXT,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "trailerYoutube" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "chapter" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "StudentResult" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "subjectId" TEXT,
    "school" TEXT,
    "center" TEXT,
    "review" TEXT,
    "photoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudentResult" ADD CONSTRAINT "StudentResult_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

