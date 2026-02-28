"use client";

import React, { useState } from "react";
import { Scan, ShieldAlert, FileText, Settings, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { offlineDb } from "@/lib/offline-db";
import { useSync } from "@/hooks/use-sync";
import { toast } from "sonner";

export default function MobileHome() {
  const router = useRouter();
  const { isOnline, syncCount, isSyncing, syncData } = useSync();
  const [isScanning, setIsScanning] = useState(false);

  const simulateNFC = async () => {
    setIsScanning(true);

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {
      console.log("Audio not supported or blocked");
    }

    setTimeout(async () => {
      const mockTags = ["TAG_001", "TAG_002", "TAG_ADMIN_OFFICE"];
      const randomTag = mockTags[Math.floor(Math.random() * mockTags.length)];

      try {
        await offlineDb.patrolRecords.add({
          nfcTagId: randomTag,
          timestamp: Date.now(),
          status: "NORMAL",
          synced: 0,
        });

        if (navigator.onLine) {
          syncData();
        }

        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }

        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
          }
        } catch {}

        toast.success(`打卡成功，已记录点位：${randomTag}`);
      } catch (error) {
        console.error(error);
      } finally {
        setIsScanning(false);
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans">
      <header className="px-6 py-4 bg-white dark:bg-zinc-900 shadow-sm flex justify-between items-center transition-colors">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">巡更系统</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {isOnline ? (
              <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-wider">
                <Wifi className="w-3 h-3" /> 在线模式
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                <WifiOff className="w-3 h-3" /> 离线保护中
              </span>
            )}
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100">
          U
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-6 w-full max-w-md mx-auto mt-6">
        <div
          onClick={!isScanning ? simulateNFC : undefined}
          className={`relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-xl flex flex-col items-center justify-center gap-6 cursor-pointer transition-all border border-gray-100 dark:border-zinc-800 ${isScanning ? "scale-95 opacity-80" : "hover:shadow-2xl active:scale-95"
            }`}
        >
          {isScanning && (
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border-4 border-blue-500/20 animate-ping"></div>
            </div>
          )}

          <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${isScanning ? "bg-blue-600 shadow-xl shadow-blue-200" : "bg-blue-50 dark:bg-blue-900/20"
            }`}>
            <Scan className={`w-14 h-14 ${isScanning ? "text-white" : "text-blue-600 dark:text-blue-400"}`} />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {isScanning ? "正在感应 NFC..." : "NFC 极速打卡"}
            </h2>
            <p className="text-sm text-gray-500 mt-2">靠近或点击此处触发模拟感应</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => router.push("/mobile/repair")}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm flex flex-col items-center gap-3 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors border border-gray-100 dark:border-zinc-800 active:scale-95 group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
              <ShieldAlert className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">异常报修</span>
          </div>

          <div
            onClick={() => router.push("/mobile/history")}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm flex flex-col items-center gap-3 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors border border-gray-100 dark:border-zinc-800 active:scale-95 group"
          >
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:bg-green-500 transition-colors">
              <FileText className="w-6 h-6 text-green-500 group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">巡更记录</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm flex items-center justify-center gap-3 col-span-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-100 dark:border-zinc-800 active:scale-95">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">系统设置</span>
          </div>
        </div>

        {syncCount > 0 && (
          <div className="bg-blue-600 text-white p-3 rounded-xl flex items-center justify-between text-xs font-bold animate-bounce shadow-lg shadow-blue-200">
            <span>有 {syncCount} 条数据待同步...</span>
            <button
              onClick={syncData}
              disabled={isSyncing}
              className="bg-white text-blue-600 px-3 py-1 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSyncing ? "同步中..." : "现在同步"}
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-[10px] text-gray-400 uppercase tracking-[0.2em]">
          Powered by Xungeng Digital Command
        </div>
      </main>
    </div>
  );
}
