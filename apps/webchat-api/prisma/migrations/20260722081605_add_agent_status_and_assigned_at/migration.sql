-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "assignedAt" DATETIME;

-- CreateTable
CREATE TABLE "AgentStatusOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "isAvailableForChats" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "optionId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentStatus_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AgentStatusOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentStatusOption_label_key" ON "AgentStatusOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "AgentStatus_userId_key" ON "AgentStatus"("userId");
