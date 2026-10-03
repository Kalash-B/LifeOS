-- V1 core hardening
-- * Converts free-text status/category columns to enums (spec §12–§18), casting existing rows
-- * Money columns become DECIMAL(14,2)
-- * Routine/habit times become local "HH:mm" strings; log dates become DATE
-- * Adds Session (refresh-token rotation), UserSettings, Notification.dedupeKey, Project.autoProgress

-- ─── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKLY');
CREATE TYPE "LearningStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "ProjectCategory" AS ENUM ('PERSONAL', 'STARTUP', 'COLLEGE', 'FREELANCE', 'OTHER');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'MISSED');
CREATE TYPE "FinanceAccountType" AS ENUM ('CASH', 'BANK', 'WALLET', 'OTHER');
CREATE TYPE "SavingsGoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'CANCELLED');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED', 'CANCELLED');
CREATE TYPE "NotificationPriority" AS ENUM ('CRITICAL', 'IMPORTANT', 'USEFUL', 'OPTIONAL');

-- ─── Habits ─────────────────────────────────────────────────────────────────
ALTER TABLE "Habit" ALTER COLUMN "frequencyType" TYPE "HabitFrequency" USING (
  CASE upper("frequencyType") WHEN 'WEEKDAYS' THEN 'WEEKDAYS' WHEN 'WEEKLY' THEN 'WEEKLY' ELSE 'DAILY' END
)::"HabitFrequency";
ALTER TABLE "Habit" ALTER COLUMN "frequencyType" SET DEFAULT 'DAILY';
ALTER TABLE "Habit" ALTER COLUMN "reminderTime" TYPE VARCHAR(5) USING to_char("reminderTime", 'HH24:MI');
ALTER TABLE "HabitLog" ALTER COLUMN "date" TYPE DATE USING "date"::date;

-- ─── Routine ────────────────────────────────────────────────────────────────
ALTER TABLE "RoutineItem" ALTER COLUMN "startTime" TYPE VARCHAR(5) USING to_char("startTime", 'HH24:MI');
ALTER TABLE "RoutineItem" ALTER COLUMN "endTime" TYPE VARCHAR(5) USING to_char("endTime", 'HH24:MI');
ALTER TABLE "RoutineLog" ALTER COLUMN "date" TYPE DATE USING "date"::date;

-- ─── Fitness ────────────────────────────────────────────────────────────────
-- Exercise names become unique: merge duplicates onto the oldest row first.
WITH ranked AS (
  SELECT id, first_value(id) OVER (PARTITION BY lower(name) ORDER BY "createdAt", id) AS keep_id
  FROM "Exercise"
)
UPDATE "WorkoutExercise" we SET "exerciseId" = r.keep_id
FROM ranked r WHERE we."exerciseId" = r.id AND r.id <> r.keep_id;
DELETE FROM "Exercise" e USING (
  SELECT id, first_value(id) OVER (PARTITION BY lower(name) ORDER BY "createdAt", id) AS keep_id FROM "Exercise"
) r WHERE e.id = r.id AND r.id <> r.keep_id;
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");

-- ─── Learning ───────────────────────────────────────────────────────────────
ALTER TABLE "LearningGoal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LearningGoal" ALTER COLUMN "status" TYPE "LearningStatus" USING (
  CASE WHEN upper("status") IN ('ACTIVE','PAUSED','COMPLETED','ARCHIVED') THEN upper("status") ELSE 'ACTIVE' END
)::"LearningStatus";
ALTER TABLE "LearningGoal" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "LearningTopic" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LearningTopic" ALTER COLUMN "status" TYPE "LearningStatus" USING (
  CASE WHEN upper("status") IN ('ACTIVE','PAUSED','COMPLETED','ARCHIVED') THEN upper("status") ELSE 'ACTIVE' END
)::"LearningStatus";
ALTER TABLE "LearningTopic" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- ─── Projects ───────────────────────────────────────────────────────────────
ALTER TABLE "Project" ADD COLUMN "autoProgress" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Project" ALTER COLUMN "category" TYPE "ProjectCategory" USING (
  CASE WHEN upper("category") IN ('PERSONAL','STARTUP','COLLEGE','FREELANCE','OTHER') THEN upper("category") ELSE 'OTHER' END
)::"ProjectCategory";
ALTER TABLE "Project" ALTER COLUMN "category" SET DEFAULT 'PERSONAL';
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus" USING (
  CASE WHEN upper("status") IN ('PLANNING','ACTIVE','BLOCKED','ON_HOLD','COMPLETED','ARCHIVED') THEN upper("status") ELSE 'PLANNING' END
)::"ProjectStatus";
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING';
ALTER TABLE "Project" ALTER COLUMN "priority" TYPE "Priority" USING (
  CASE WHEN upper("priority") IN ('LOW','MEDIUM','HIGH','URGENT') THEN upper("priority") ELSE NULL END
)::"Priority";

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus" USING (
  CASE WHEN upper("status") IN ('BACKLOG','TODO','IN_PROGRESS','BLOCKED','COMPLETED') THEN upper("status") ELSE 'TODO' END
)::"TaskStatus";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'TODO';
ALTER TABLE "Task" ALTER COLUMN "priority" TYPE "Priority" USING (
  CASE WHEN upper("priority") IN ('LOW','MEDIUM','HIGH','URGENT') THEN upper("priority") ELSE NULL END
)::"Priority";
DROP INDEX "Task_userId_idx";
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate");

ALTER TABLE "Milestone" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Milestone" ALTER COLUMN "status" TYPE "MilestoneStatus" USING (
  CASE WHEN upper("status") IN ('PLANNED','IN_PROGRESS','COMPLETED','MISSED') THEN upper("status") ELSE 'PLANNED' END
)::"MilestoneStatus";
ALTER TABLE "Milestone" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- ─── Finance ────────────────────────────────────────────────────────────────
ALTER TABLE "FinanceAccount" ALTER COLUMN "type" TYPE "FinanceAccountType" USING (
  CASE WHEN upper("type") IN ('CASH','BANK','WALLET','OTHER') THEN upper("type")
       WHEN upper("type") IN ('CHECKING','SAVINGS') THEN 'BANK'
       ELSE 'OTHER' END
)::"FinanceAccountType";
ALTER TABLE "FinanceAccount" ALTER COLUMN "type" SET DEFAULT 'BANK';
ALTER TABLE "FinanceAccount" ALTER COLUMN "currency" TYPE VARCHAR(3);
ALTER TABLE "FinanceAccount" ALTER COLUMN "currentBalance" TYPE DECIMAL(14,2);

ALTER TABLE "Income" ALTER COLUMN "amount" TYPE DECIMAL(14,2);
ALTER TABLE "Income" ALTER COLUMN "currency" TYPE VARCHAR(3);
CREATE INDEX "Income_accountId_idx" ON "Income"("accountId");

ALTER TABLE "Expense" ALTER COLUMN "amount" TYPE DECIMAL(14,2);
ALTER TABLE "Expense" ALTER COLUMN "currency" TYPE VARCHAR(3);
CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

ALTER TABLE "SavingsGoal" ALTER COLUMN "targetAmount" TYPE DECIMAL(14,2);
ALTER TABLE "SavingsGoal" ALTER COLUMN "currentAmount" TYPE DECIMAL(14,2);
ALTER TABLE "SavingsGoal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SavingsGoal" ALTER COLUMN "status" TYPE "SavingsGoalStatus" USING (
  CASE WHEN upper("status") IN ('ACTIVE','ACHIEVED','CANCELLED') THEN upper("status") ELSE 'ACTIVE' END
)::"SavingsGoalStatus";
ALTER TABLE "SavingsGoal" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "Investment" ALTER COLUMN "amountInvested" TYPE DECIMAL(14,2);
ALTER TABLE "Investment" ALTER COLUMN "currentValue" TYPE DECIMAL(14,2);

-- Spec §35: amounts must be positive
ALTER TABLE "Income" ADD CONSTRAINT "Income_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_target_positive" CHECK ("targetAmount" > 0);
ALTER TABLE "Project" ADD CONSTRAINT "Project_progress_range" CHECK ("progress" BETWEEN 0 AND 100);

-- ─── Notifications ──────────────────────────────────────────────────────────
ALTER TABLE "NotificationPreference" ALTER COLUMN "channel" TYPE "NotificationChannel" USING (
  CASE WHEN upper("channel") IN ('IN_APP','PUSH','EMAIL') THEN upper("channel") ELSE 'IN_APP' END
)::"NotificationChannel";

ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;
ALTER TABLE "Notification" ALTER COLUMN "priority" TYPE "NotificationPriority" USING (
  CASE upper(coalesce("priority", ''))
    WHEN 'CRITICAL' THEN 'CRITICAL' WHEN 'URGENT' THEN 'CRITICAL'
    WHEN 'IMPORTANT' THEN 'IMPORTANT' WHEN 'HIGH' THEN 'IMPORTANT'
    WHEN 'OPTIONAL' THEN 'OPTIONAL' WHEN 'LOW' THEN 'OPTIONAL'
    ELSE 'USEFUL' END
)::"NotificationPriority";
ALTER TABLE "Notification" ALTER COLUMN "priority" SET DEFAULT 'USEFUL';
ALTER TABLE "Notification" ALTER COLUMN "priority" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Notification" ALTER COLUMN "status" TYPE "NotificationStatus" USING (
  CASE WHEN upper("status") IN ('PENDING','SENT','READ','FAILED','CANCELLED') THEN upper("status") ELSE 'PENDING' END
)::"NotificationStatus";
ALTER TABLE "Notification" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP INDEX "Notification_scheduledAt_idx";
CREATE INDEX "Notification_status_scheduledAt_idx" ON "Notification"("status", "scheduledAt");
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- ─── New tables ─────────────────────────────────────────────────────────────
CREATE TABLE "UserSettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scoreEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scoreWeights" JSONB,
    "quietHoursStart" VARCHAR(5),
    "quietHoursEnd" VARCHAR(5),
    "dailySummary" BOOLEAN NOT NULL DEFAULT true,
    "weeklySummary" BOOLEAN NOT NULL DEFAULT true,
    "dailyStudyGoalMin" INTEGER NOT NULL DEFAULT 60,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
