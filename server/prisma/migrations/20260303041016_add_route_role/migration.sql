/*
  Warnings:

  - Added the required column `roleCode` to the `Route` table without a default value. This is not possible if the table is not empty.
  - Made the column `groupId` on table `Route` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Route" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "groupId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    CONSTRAINT "Route_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Route_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Route" ("createdAt", "description", "groupId", "id", "name", "updatedAt") SELECT "createdAt", "description", "groupId", "id", "name", "updatedAt" FROM "Route";
DROP TABLE "Route";
ALTER TABLE "new_Route" RENAME TO "Route";
CREATE UNIQUE INDEX "Route_name_key" ON "Route"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
