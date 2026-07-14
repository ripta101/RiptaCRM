-- CreateTable
CREATE TABLE "CaseType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CaseTypeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseTypeId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    CONSTRAINT "CaseTypeVersion_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseTypeVersionId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "optionsJson" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FieldDefinition_caseTypeVersionId_fkey" FOREIGN KEY ("caseTypeVersionId") REFERENCES "CaseTypeVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StageDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseTypeVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slaMinutes" INTEGER NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StageDefinition_caseTypeVersionId_fkey" FOREIGN KEY ("caseTypeVersionId") REFERENCES "CaseTypeVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stageId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL DEFAULT 0,
    "actionType" TEXT NOT NULL DEFAULT 'EMAIL',
    "configJson" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionDefinition_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "StageDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseTypeId" TEXT NOT NULL,
    "caseTypeVersionId" TEXT NOT NULL,
    "currentStageId" TEXT NOT NULL,
    "customerAccountId" TEXT,
    "assignedToUserId" TEXT,
    "contactEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "CaseInstance_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseInstance_caseTypeVersionId_fkey" FOREIGN KEY ("caseTypeVersionId") REFERENCES "CaseTypeVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseInstance_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "StageDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseFieldValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseInstanceId" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "valueText" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseFieldValue_caseInstanceId_fkey" FOREIGN KEY ("caseInstanceId") REFERENCES "CaseInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseFieldValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "FieldDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseStageHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseInstanceId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDueAt" DATETIME NOT NULL,
    "exitedAt" DATETIME,
    "breached" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CaseStageHistory_caseInstanceId_fkey" FOREIGN KEY ("caseInstanceId") REFERENCES "CaseInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseStageHistory_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "StageDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseInstanceId" TEXT NOT NULL,
    "stageHistoryId" TEXT NOT NULL,
    "actionDefinitionId" TEXT,
    "trigger" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "firedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionLogEntry_stageHistoryId_fkey" FOREIGN KEY ("stageHistoryId") REFERENCES "CaseStageHistory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActionLogEntry_actionDefinitionId_fkey" FOREIGN KEY ("actionDefinitionId") REFERENCES "ActionDefinition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseType_key_key" ON "CaseType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CaseTypeVersion_caseTypeId_versionNumber_key" ON "CaseTypeVersion"("caseTypeId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FieldDefinition_caseTypeVersionId_fieldKey_key" ON "FieldDefinition"("caseTypeVersionId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "StageDefinition_caseTypeVersionId_key_key" ON "StageDefinition"("caseTypeVersionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CaseFieldValue_caseInstanceId_fieldDefinitionId_key" ON "CaseFieldValue"("caseInstanceId", "fieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionLogEntry_stageHistoryId_actionDefinitionId_key" ON "ActionLogEntry"("stageHistoryId", "actionDefinitionId");
