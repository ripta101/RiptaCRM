-- CreateTable
CREATE TABLE "ProfileSupervisedQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileSupervisedQueue_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProfileSupervisedProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "supervisedProfileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileSupervisedProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProfileSupervisedProfile_supervisedProfileId_fkey" FOREIGN KEY ("supervisedProfileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSupervisedQueue_profileId_queueId_key" ON "ProfileSupervisedQueue"("profileId", "queueId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSupervisedProfile_profileId_supervisedProfileId_key" ON "ProfileSupervisedProfile"("profileId", "supervisedProfileId");
