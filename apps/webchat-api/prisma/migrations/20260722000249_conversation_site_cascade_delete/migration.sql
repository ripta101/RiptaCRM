-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "customerAccountId" TEXT,
    "pageUrlPath" TEXT NOT NULL,
    "pageUrlFull" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "assignedQueueId" TEXT,
    "matchedRuleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "Conversation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_assignedQueueId_fkey" FOREIGN KEY ("assignedQueueId") REFERENCES "WebChatQueue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("assignedQueueId", "assignedToUserId", "closedAt", "createdAt", "customerAccountId", "id", "matchedRuleId", "pageUrlFull", "pageUrlPath", "siteId", "status", "updatedAt") SELECT "assignedQueueId", "assignedToUserId", "closedAt", "createdAt", "customerAccountId", "id", "matchedRuleId", "pageUrlFull", "pageUrlPath", "siteId", "status", "updatedAt" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
