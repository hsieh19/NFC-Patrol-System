"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Record {
    id: string;
    createdAt: string;
    checkpointName: string | null;
    checkpointLocation: string | null;
    checkpoint?: {
        name: string;
        location: string | null;
    } | null;
    user: {
        name: string;
    };
    status: string;
    offlineId: string | null;
}

export default function MonitorTab() {
    const [records, setRecords] = useState<Record[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecords = async () => {
        try {
            const res = await fetch("/api/admin/records");
            const data = await res.json();
            if (Array.isArray(data)) {
                setRecords(data);
            } else {
                console.error("API Error: ", data);
                setRecords([]);
            }
        } catch (error) {
            console.error("Failed to fetch records:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
        const timer = setInterval(fetchRecords, 10000); // 10秒刷新一次
        return () => clearInterval(timer);
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-[#0f172a] mb-6 tracking-tight">近日动态录入</h2>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[15%] px-4">感应时间</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[20%] px-4">巡检点名称</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[20%] px-4">物理位置</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[15%] px-4">操作员</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[15%] px-4">状态</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[15%] px-4">上传方式</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center text-gray-400">暂无打卡记录</td>
                            </tr>
                        ) : (
                            records.map((record) => (
                                <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-4 text-gray-600 font-medium">
                                        {format(new Date(record.createdAt), "MM-dd HH:mm:ss", { locale: zhCN })}
                                    </td>
                                    <td className="py-4 px-4 text-[#0f172a] font-semibold tracking-wide">
                                        {record.checkpoint?.name || record.checkpointName || "未知点位"}
                                    </td>
                                    <td className="py-4 px-4 text-gray-400">
                                        {record.checkpoint?.location || record.checkpointLocation || "-"}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            <span className="text-gray-700 font-medium">{record.user.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest border ${record.status === 'NORMAL'
                                            ? 'bg-green-50 text-green-600 border-green-200'
                                            : 'bg-red-50 text-red-600 border-red-200'
                                            }`}>
                                            {record.status === 'NORMAL' ? '正常' : '异常'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="border border-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs font-medium">
                                            {record.offlineId ? '离线同步' : '实时上传'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
