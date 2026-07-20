-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QueueMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueueMember_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CaseInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseTypeId" TEXT NOT NULL,
    "caseTypeVersionId" TEXT NOT NULL,
    "currentStageId" TEXT NOT NULL,
    "customerAccountId" TEXT,
    "assignedToUserId" TEXT,
    "assignedQueueId" TEXT,
    "contactEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "CaseInstance_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseInstance_caseTypeVersionId_fkey" FOREIGN KEY ("caseTypeVersionId") REFERENCES "CaseTypeVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseInstance_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "StageDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseInstance_assignedQueueId_fkey" FOREIGN KEY ("assignedQueueId") REFERENCES "Queue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CaseInstance" ("assignedToUserId", "caseTypeId", "caseTypeVersionId", "closedAt", "contactEmail", "createdAt", "currentStageId", "customerAccountId", "id", "status", "updatedAt") SELECT "assignedToUserId", "caseTypeId", "caseTypeVersionId", "closedAt", "contactEmail", "createdAt", "currentStageId", "customerAccountId", "id", "status", "updatedAt" FROM "CaseInstance";
DROP TABLE "CaseInstance";
ALTER TABLE "new_CaseInstance" RENAME TO "CaseInstance";
CREATE TABLE "new_StageDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseTypeVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slaMinutes" INTEGER NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL,
    "positionX" INTEGER NOT NULL DEFAULT 0,
    "positionY" INTEGER NOT NULL DEFAULT 0,
    "queueId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StageDefinition_caseTypeVersionId_fkey" FOREIGN KEY ("caseTypeVersionId") REFERENCES "CaseTypeVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StageDefinition_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StageDefinition" ("caseTypeVersionId", "createdAt", "displayOrder", "id", "isTerminal", "key", "name", "positionX", "positionY", "slaMinutes", "updatedAt") SELECT "caseTypeVersionId", "createdAt", "displayOrder", "id", "isTerminal", "key", "name", "positionX", "positionY", "slaMinutes", "updatedAt" FROM "StageDefinition";
DROP TABLE "StageDefinition";
ALTER TABLE "new_StageDefinition" RENAME TO "StageDefinition";
CREATE UNIQUE INDEX "StageDefinition_caseTypeVersionId_key_key" ON "StageDefinition"("caseTypeVersionId", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Queue_name_key" ON "Queue"("name");

-- CreateIndex
CREATE UNIQUE INDEX "QueueMember_queueId_userId_key" ON "QueueMember"("queueId", "userId");
