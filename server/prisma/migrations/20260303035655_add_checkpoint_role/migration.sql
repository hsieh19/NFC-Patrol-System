/*
  Warnings:

  - Added the required column `roleCode` to the `Checkpoint` table without a default value. This is not possible if the table is not empty.
  - Made the column `groupId` on table `Checkpoint` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Checkpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nfcTagId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "groupId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    CONSTRAINT "Checkpoint_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Checkpoint_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Checkpoint" ("createdAt", "groupId", "id", "location", "name", "nfcTagId", "updatedAt") SELECT "createdAt", "groupId", "id", "location", "name", "nfcTagId", "updatedAt" FROM "Checkpoint";
DROP TABLE "Checkpoint";
ALTER TABLE "new_Checkpoint" RENAME TO "Checkpoint";
CREATE UNIQUE INDEX "Checkpoint_nfcTagId_key" ON "Checkpoint"("nfcTagId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
