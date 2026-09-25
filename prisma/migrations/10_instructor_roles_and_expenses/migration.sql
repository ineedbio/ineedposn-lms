// AlterTable
ALTER TABLE "User" ADD COLUMN "instructorSubjectKey" TEXT;

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "slipImageUrl" TEXT,
    "subjectKey" TEXT,
    "courseId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_subjectKey_idx" ON "Expense"("subjectKey");
CREATE INDEX "Expense_date_idx" ON "Expense"("date");
CREATE INDEX "Expense_courseId_idx" ON "Expense"("courseId");
CREATE INDEX "Expense_recordedById_idx" ON "Expense"("recordedById");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
