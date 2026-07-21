/*
  Warnings:

  - You are about to drop the `MessageBroadcastTargetRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MessageBroadcastTargetRole";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "MessageBroadcastTargetProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "broadcastId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageBroadcastTargetProfile_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "MessageBroadcast" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageBroadcastTargetProfile_broadcastId_profileId_key" ON "MessageBroadcastTargetProfile"("broadcastId", "profileId");
