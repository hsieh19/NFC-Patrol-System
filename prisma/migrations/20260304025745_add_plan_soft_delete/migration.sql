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
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Plan_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Plan_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Plan" ("assignedTo", "createdAt", "endTime", "frequency", "groupId", "id", "name", "planType", "roleCode", "routeId", "startTime", "updatedAt") SELECT "assignedTo", "createdAt", "endTime", "frequency", "groupId", "id", "name", "planType", "roleCode", "routeId", "startTime", "updatedAt" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
