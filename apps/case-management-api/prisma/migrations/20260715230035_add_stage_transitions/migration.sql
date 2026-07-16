-- CreateTable
CREATE TABLE "StageTransition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromStageId" TEXT NOT NULL,
    "toStageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageTransition_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "StageDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StageTransition_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "StageDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StageDefinition_caseTypeVersionId_fkey" FOREIGN KEY ("caseTypeVersionId") REFERENCES "CaseTypeVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StageDefinition" ("caseTypeVersionId", "createdAt", "displayOrder", "id", "isTerminal", "key", "name", "slaMinutes", "updatedAt") SELECT "caseTypeVersionId", "createdAt", "displayOrder", "id", "isTerminal", "key", "name", "slaMinutes", "updatedAt" FROM "StageDefinition";
DROP TABLE "StageDefinition";
ALTER TABLE "new_StageDefinition" RENAME TO "StageDefinition";
CREATE UNIQUE INDEX "StageDefinition_caseTypeVersionId_key_key" ON "StageDefinition"("caseTypeVersionId", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StageTransition_fromStageId_toStageId_key" ON "StageTransition"("fromStageId", "toStageId");
