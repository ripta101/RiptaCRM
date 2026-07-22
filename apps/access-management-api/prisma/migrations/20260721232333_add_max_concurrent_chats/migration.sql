-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "dashboardType" TEXT NOT NULL,
    "canStartInteractions" BOOLEAN NOT NULL DEFAULT false,
    "maxConcurrentChats" INTEGER NOT NULL DEFAULT 3,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Profile" ("archivedAt", "canStartInteractions", "createdAt", "dashboardType", "id", "isProtected", "name", "updatedAt") SELECT "archivedAt", "canStartInteractions", "createdAt", "dashboardType", "id", "isProtected", "name", "updatedAt" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_name_key" ON "Profile"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
