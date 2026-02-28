"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { offlineDb } from "@/lib/offline-db";

export function useSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncCount, setSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncData = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      const storedUser = localStorage.getItem("user");
      const userId = storedUser ? JSON.parse(storedUser).id : "guest_user";

      const unsyncedPatrols = await offlineDb.patrolRecords.where("synced").equals(0).toArray();
      for (const p of unsyncedPatrols) {
        try {
          const res = await fetch("/api/patrol/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: p.id?.toString(),
              nfcTagId: p.nfcTagId,
              timestamp: p.timestamp,
              userId,
              status: p.status,
              notes: p.notes,
            }),
          });
          if (res.ok && p.id != null) {
            await offlineDb.patrolRecords.update(p.id, { synced: 1 });
          }
        } catch {
          break;
        }
      }

      const unsyncedRepairs = await offlineDb.repairReports.where("synced").equals(0).toArray();
      for (const r of unsyncedRepairs) {
        try {
          const storedUser = localStorage.getItem("user");
          const userId = storedUser ? JSON.parse(storedUser).id : "guest_user";

          const res = await fetch("/api/repair/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: r.description,
              photo: r.imageUrls?.[0] || "",
              userId,
            }),
          });
          if (res.ok && r.id != null) {
            await offlineDb.repairReports.update(r.id, { synced: 1 });
          }
        } catch {
          break;
        }
      }

      const patrolCount = await offlineDb.patrolRecords.where("synced").equals(0).count();
      const repairCount = await offlineDb.repairReports.where("synced").equals(0).count();
      setSyncCount(patrolCount + repairCount);

      if (patrolCount + repairCount === 0) {
        toast.success("离线数据同步完成");
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      toast.info("网络已恢复，正在同步数据...");
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const checkSync = async () => {
      const patrolCount = await offlineDb.patrolRecords.where("synced").equals(0).count();
      const repairCount = await offlineDb.repairReports.where("synced").equals(0).count();
      setSyncCount(patrolCount + repairCount);

      if (navigator.onLine && (patrolCount > 0 || repairCount > 0)) {
        syncData();
      }
    };

    checkSync();
    const interval = setInterval(checkSync, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [syncData]);

  return { isOnline, syncCount, isSyncing, syncData };
}
