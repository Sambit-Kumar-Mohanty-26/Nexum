-- AlterTable
ALTER TABLE "WorkspaceMeeting" ADD COLUMN IF NOT EXISTS "postponedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "postponeReason" TEXT,
ADD COLUMN IF NOT EXISTS "postponeCategory" TEXT,
ADD COLUMN IF NOT EXISTS "rescheduledSlots" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MilestonePostponement" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByRole" "Role" NOT NULL DEFAULT 'FREELANCER',
    "currentDueDate" TIMESTAMP(3),
    "proposedDueDate" TIMESTAMP(3) NOT NULL,
    "reasonCategory" TEXT NOT NULL,
    "reasonDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "declineReason" TEXT,
    "sha256Seal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestonePostponement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MilestonePostponement_milestoneId_status_idx" ON "MilestonePostponement"("milestoneId", "status");
CREATE INDEX IF NOT EXISTS "MilestonePostponement_projectId_status_idx" ON "MilestonePostponement"("projectId", "status");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MilestonePostponement_milestoneId_fkey') THEN
        ALTER TABLE "MilestonePostponement" ADD CONSTRAINT "MilestonePostponement_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MilestonePostponement_projectId_fkey') THEN
        ALTER TABLE "MilestonePostponement" ADD CONSTRAINT "MilestonePostponement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

