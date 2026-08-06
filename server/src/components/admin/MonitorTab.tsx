"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Record {
    id: string;
    createdAt: string;
    checkpointName: string | null;
    checkpointLocation: string | null;
    notes: string | null;
    checkpoint?: {
        name: string;
        location: string | null;
        nfcTagId: string;
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

    // 分页状态
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(20); // 每页显示数据行数（支持自定义）

    // 临时清屏状态（仅在第 1 页生效）
    const [clearTimestamp, setClearTimestamp] = useState(0);
    const [isCleared, setIsCleared] = useState(false);

    // 拉取巡检记录数据
    const fetchRecords = async (targetPage = page, showLoader = false, targetLimit = limit) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch(`/api/admin/records?page=${targetPage}&limit=${targetLimit}`);
            const data = await res.json();
            if (data && Array.isArray(data.records)) {
                setRecords(data.records);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages || 1);
                }
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

    // 监听页码和每页显示条数的变化，加载数据
    useEffect(() => {
        fetchRecords(page, true, limit);
    }, [page, limit]);

    // 自动刷新逻辑：仅在处于“第 1 页”时，每 10 秒拉取一次最新数据
    useEffect(() => {
        if (page !== 1) return;

        const timer = setInterval(() => {
            fetchRecords(1, false, limit);
        }, 10000);

        return () => clearInterval(timer);
    }, [page, limit]);

    // 过滤渲染出来的记录 (清屏模式下，只显示清屏时刻之后新上报的记录)
    const displayRecords = records.filter((record) => {
        if (clearTimestamp === 0 || page !== 1) return true;
        // 预留 2 秒缓冲时间以防服务器与客户端存在极微的时钟偏差
        return new Date(record.createdAt).getTime() > clearTimestamp - 2000;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
            
            {/* 顶栏控制区域 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">近日动态录入</h2>
                    {page === 1 && !isCleared && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            实时监控中
                        </div>
                    )}
                    {page === 1 && isCleared && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-100">
                            已清屏・监听新数据
                        </div>
                    )}
                </div>

                {/* 清屏与恢复按钮 (仅在第一页可用) */}
                {page === 1 && (
                    <div>
                        {!isCleared ? (
                            <button
                                onClick={() => {
                                    setClearTimestamp(Date.now());
                                    setIsCleared(true);
                                }}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-lg transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                                title="临时清除屏幕显示的所有历史记录，新打卡数据上传时仍会实时展出"
                            >
                                🧹 清除屏幕
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setClearTimestamp(0);
                                    setIsCleared(false);
                                }}
                                className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-100 hover:border-blue-200 rounded-lg transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                            >
                                🔄 恢复显示
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[15%] px-4">感应时间</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[15%] px-4">标签卡号</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[18%] px-4">巡检点名称</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[18%] px-4">物理位置</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[12%] px-4">操作员</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[10%] px-4">状态</th>
                            <th className="pb-4 font-semibold text-sm text-gray-500 w-[12%] px-4">上传方式</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {displayRecords.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                                    {isCleared ? "🧹 屏幕已清空，正在等待实时打卡上传..." : "暂无打卡记录"}
                                </td>
                            </tr>
                        ) : (
                            displayRecords.map((record) => (
                                <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-4 text-gray-600 font-medium">
                                        {format(new Date(record.createdAt), "MM-dd HH:mm:ss", { locale: zhCN })}
                                    </td>
                                    <td className="py-4 px-4 text-blue-600 font-mono font-semibold select-all cursor-pointer hover:text-blue-700 transition-colors" title="点击即可全选复制卡号">
                                        {record.checkpoint?.nfcTagId || (record.notes?.includes("未注册的卡号: ") ? record.notes.split("未注册的卡号: ")[1] : "-")}
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

            {/* 分页与自定义行数控制器 */}
            {records.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 pt-6 mt-6 gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-semibold tracking-wide">
                        <span>当前第 {page} 页 / 共 {totalPages} 页</span>
                        <div className="flex items-center gap-1.5">
                            <span>每页显示</span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setLimit(val);
                                    setPage(1); // 更改每页条数时重置到第一页
                                    setClearTimestamp(0); // 更改每页条数时重置清屏状态
                                    setIsCleared(false);
                                }}
                                className="bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded px-2 py-1 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                            >
                                <option value={10}>10 行</option>
                                <option value={20}>20 行</option>
                                <option value={50}>50 行</option>
                                <option value={100}>100 行</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => {
                                setPage((p) => Math.max(p - 1, 1));
                                setClearTimestamp(0);
                                setIsCleared(false);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            上一页
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => {
                                setPage((p) => Math.min(p + 1, totalPages));
                                setClearTimestamp(0);
                                setIsCleared(false);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
