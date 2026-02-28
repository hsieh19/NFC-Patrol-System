"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, WifiOff, FileText, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { offlineDb } from "@/lib/offline-db";

interface LocalPatrolRecord {
    id?: number;
    nfcTagId?: string;
    timestamp: number;
    status: "NORMAL" | "ABNORMAL";
    synced: number;
}

export default function HistoryPage() {
    const router = useRouter();
    const [records, setRecords] = useState<LocalPatrolRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLocalData = async () => {
            try {
                const data = await offlineDb.patrolRecords.orderBy("timestamp").reverse().toArray();
                setRecords(data);
            } catch (error) {
                console.error("Failed to fetch local records:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLocalData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="px-4 py-4 bg-white shadow-sm flex items-center gap-4">
                <button onClick={() => router.back()} className="p-1">
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">巡更记录</h1>
            </header>

            <main className="flex-1 p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <FileText className="w-16 h-16 mb-4 opacity-50" />
                        <p>暂无本地打卡记录</p>
                    </div>
                ) : (
                    records.map((record, index) => (
                        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900">{record.nfcTagId}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {format(new Date(record.timestamp), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${record.status === "NORMAL" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                    }`}>
                                    {record.status === "NORMAL" ? "正常" : "异常"}
                                </span>

                                {record.synced ? (
                                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" /> 已同步
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-orange-400 font-medium">
                                        <WifiOff className="w-3 h-3" /> 等待上传
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
