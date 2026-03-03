/*
  Warnings:

  - Added the required column `groupId` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleCode` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `Plan` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "assignedTo" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "planType" TEXT NOT NULL DEFAULT 'ORDERED',
    "groupId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Plan_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Plan_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Plan" ("assignedTo", "createdAt", "endTime", "frequency", "id", "name", "routeId", "startTime", "updatedAt") SELECT "assignedTo", "createdAt", "endTime", "frequency", "id", "name", "routeId", "startTime", "updatedAt" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
