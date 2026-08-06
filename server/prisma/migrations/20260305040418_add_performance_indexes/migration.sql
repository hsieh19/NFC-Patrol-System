-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "isInitialised" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemConfig" ("id", "isInitialised", "updatedAt") SELECT "id", "isInitialised", "updatedAt" FROM "SystemConfig";
DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Checkpoint_groupId_idx" ON "Checkpoint"("groupId");

-- CreateIndex
CREATE INDEX "Checkpoint_roleCode_idx" ON "Checkpoint"("roleCode");

-- CreateIndex
CREATE INDEX "PatrolRecord_createdAt_idx" ON "PatrolRecord"("createdAt");

-- CreateIndex
CREATE INDEX "PatrolRecord_userId_createdAt_idx" ON "PatrolRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PatrolRecord_checkpointId_createdAt_idx" ON "PatrolRecord"("checkpointId", "createdAt");

-- CreateIndex
CREATE INDEX "PatrolRecord_status_createdAt_idx" ON "PatrolRecord"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Plan_groupId_idx" ON "Plan"("groupId");

-- CreateIndex
CREATE INDEX "Plan_routeId_idx" ON "Plan"("routeId");

-- CreateIndex
CREATE INDEX "RepairReport_createdAt_idx" ON "RepairReport"("createdAt");

-- CreateIndex
CREATE INDEX "RepairReport_userId_createdAt_idx" ON "RepairReport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RepairReport_status_createdAt_idx" ON "RepairReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Route_groupId_idx" ON "Route"("groupId");

-- CreateIndex
CREATE INDEX "Route_roleCode_idx" ON "Route"("roleCode");
