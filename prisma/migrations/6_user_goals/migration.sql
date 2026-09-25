-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentFaculty" TEXT,
ADD COLUMN     "currentUniversity" TEXT,
ADD COLUMN     "dreamFaculty" TEXT,
ADD COLUMN     "dreamUniversity" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;
