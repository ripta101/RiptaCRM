-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "displayType" TEXT NOT NULL,
    "iframeUrl" TEXT,
    "remoteEntryUrl" TEXT,
    "remoteName" TEXT,
    "exposedModule" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
