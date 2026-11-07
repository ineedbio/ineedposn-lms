-- Round 8c: INeedBio Birthday Giveaway (campaign "bday2569").
-- Additive only: two new tables and their indexes. No existing table, column or row is changed,
-- nothing is backfilled, dropped or renamed.

-- CreateTable: one application per account per campaign
CREATE TABLE IF NOT EXISTS "GiveawayApplication" (
    "id" TEXT NOT NULL,
    "campaign" TEXT NOT NULL DEFAULT 'bday2569',
    "userId" TEXT NOT NULL,
    "igUsername" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "storyFile" TEXT,
    "consentPdpa" BOOLEAN NOT NULL DEFAULT false,
    "consentPdpaAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNote" TEXT,
    "awardedCourseId" TEXT,
    "awardedAt" TIMESTAMP(3),
    "awardedBy" TEXT,
    "awardRef" TEXT,
    "storyPurgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiveawayApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GiveawayApplication_campaign_userId_key" ON "GiveawayApplication"("campaign", "userId");
CREATE INDEX IF NOT EXISTS "GiveawayApplication_campaign_status_idx" ON "GiveawayApplication"("campaign", "status");

-- CreateTable: history of every action on an application
CREATE TABLE IF NOT EXISTS "GiveawayEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiveawayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GiveawayEvent_applicationId_idx" ON "GiveawayEvent"("applicationId");
