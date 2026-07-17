-- CreateTable
CREATE TABLE "MessageBroadcast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "canceledAt" DATETIME,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MessageBroadcastTargetRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "broadcastId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageBroadcastTargetRole_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "MessageBroadcast" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageBroadcastTargetRole_broadcastId_role_key" ON "MessageBroadcastTargetRole"("broadcastId", "role");
