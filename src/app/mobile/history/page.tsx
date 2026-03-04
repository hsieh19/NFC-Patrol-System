"use client";

import React, { useEffect, useState } from "react";
import { format, isWithinInterval, parse } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, WifiOff, CheckCircle2, Circle, Clock, MapPin, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { offlineDb } from "@/lib/offline-db";
import { toast } from "sonner";

interface Plan {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    groupId: string;
    roleCode: string;
    route: {
        id: string;
        name: string;
        checkpoints: Array<{
            order: number;
            checkpoint: {
                id: string;
                name: string;
                nfcTagId: string;
                location: string | null;
            }
        }>
    };
}

interface PatrolRecord {
    checkpointId: string;
    status: string;
    createdAt: string;
    offlineId?: string | null;
}

export default function HistoryPage() {
    const router = useRouter();
    const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
    const [patrolRecords, setPatrolRecords] = useState<PatrolRecord[]>([]);
    const [checkpointsMap, setCheckpointsMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchData();
    }, [currentTime]);

    const fetchData = async () => {
        try {
            // 0. 获取当前登录用户信息
            const userStr = localStorage.getItem("user");
            if (!userStr) {
                toast.error("未找到用户信息，请重新登录");
                return;
            }
            const user = JSON.parse(userStr);
            const userRoleCode = user.roleCode || user.role;
            const userGroupId = user.groupId;

            // 1. 获取所有计划和点位基础数据
            const [planRes, cpRes] = await Promise.all([
                fetch("/api/admin/schedules"),
                fetch("/api/admin/checkpoints")
            ]);

            if (!planRes.ok || !cpRes.ok) {
                const planErr = !planRes.ok ? await planRes.text().catch(() => "Unknown") : "OK";
                const cpErr = !cpRes.ok ? await cpRes.text().catch(() => "Unknown") : "OK";
                console.error("Data fetch failed:", {
                    schedules: { ok: planRes.ok, status: planRes.status, body: planErr },
                    checkpoints: { ok: cpRes.ok, status: cpRes.status, body: cpErr }
                });
                throw new Error(`基础数据加载失败: Schedules(${planRes.status}), Checkpoints(${cpRes.status}). Msg: ${planErr}/${cpErr}`);
            }

            const allPlans: Plan[] = await planRes.json();
            const allCheckpoints: any[] = await cpRes.json();

            // 建立 Tag 到 ID 的映射
            const tagMap: Record<string, string> = {};
            allCheckpoints.forEach(cp => tagMap[cp.nfcTagId] = cp.id);
            setCheckpointsMap(tagMap);

            // 2. 找到当前时间所属且符合用户分组/角色的计划
            const nowStr = format(currentTime, "HH:mm");
            const activePlan = allPlans.find(plan => {
                // 权限过滤：必须匹配当前用户的分组和角色
                const pRole = (plan.roleCode || "").trim().toUpperCase();
                const uRole = (userRoleCode || "").trim().toUpperCase();
                const pGroup = (plan.groupId || "").trim();
                const uGroup = (userGroupId || "").trim();

                const matchesRole = pRole === uRole;
                const matchesGroup = !pGroup || pGroup === uGroup;

                if (!matchesRole || !matchesGroup) return false;

                const start = plan.startTime;
                const end = plan.endTime;

                // 处理隔天情况 (如 22:00 - 06:00)
                if (start <= end) {
                    return nowStr >= start && nowStr <= end;
                } else {
                    return nowStr >= start || nowStr <= end;
                }
            });

            if (activePlan) {
                // 如果找到计划，拉取该计划完整的路线详情
                const routeRes = await fetch(`/api/admin/routes/${activePlan.route.id}`);
                if (!routeRes.ok) throw new Error("获取路线详情失败");
                const routeDetail = await routeRes.json();
                activePlan.route = routeDetail;
                setCurrentPlan(activePlan);

                // 3. 获取打卡记录 (包括在线和本地离线)
                const recordRes = await fetch("/api/admin/records");
                if (!recordRes.ok) throw new Error("获取巡检记录失败");
                const serverRecords: any[] = await recordRes.json();

                const localRecords = await offlineDb.patrolRecords.toArray();

                // 过滤出当前计划时间范围内的打卡记录
                const filterByTime = (date: Date) => {
                    const time = format(date, "HH:mm");
                    if (activePlan.startTime <= activePlan.endTime) {
                        return time >= activePlan.startTime && time <= activePlan.endTime;
                    } else {
                        return time >= activePlan.startTime || time <= activePlan.endTime;
                    }
                };

                const combinedRecords = [
                    ...serverRecords.filter(r => filterByTime(new Date(r.createdAt))).map(r => ({
                        checkpointId: r.checkpointId,
                        status: r.status,
                        createdAt: r.createdAt,
                        offlineId: r.offlineId
                    })),
                    ...localRecords.filter(r => !r.synced && filterByTime(new Date(r.timestamp))).map(r => ({
                        checkpointId: r.nfcTagId ? (tagMap[r.nfcTagId] || "") : "",
                        status: r.status,
                        createdAt: new Date(r.timestamp).toISOString(),
                        offlineId: "LOCAL_PENDING" // 标识为本地待上传
                    }))
                ];

                // 建立一个打卡状态映射，方便列表显示
                setPatrolRecords(combinedRecords);
            } else {
                setCurrentPlan(null);
            }
        } catch (error) {
            console.error("Failed to fetch history data:", error);
            toast.error("加载数据失败");
        } finally {
            setLoading(false);
        }
    };

    // 辅助：获取点位完成状态
    const getCheckpointStatus = (checkpointId: string) => {
        return patrolRecords.find(r => r.checkpointId === checkpointId);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans transition-colors dark:bg-zinc-950">
            <header className="px-4 py-4 bg-white dark:bg-zinc-900 shadow-sm flex items-center gap-4 sticky top-0 z-20 transition-colors">
                <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">巡更任务/记录</h1>
            </header>

            <main className="flex-1 p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-400">正在检查巡检计划...</span>
                    </div>
                ) : !currentPlan ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 italic">当前不在巡检时段</h3>
                        <p className="text-sm text-gray-400 mt-2 px-10">
                            当前时间 ({format(currentTime, "HH:mm")}) 没有匹配的巡检计划
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* 计划详情卡片 */}
                        <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 dark:shadow-none">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/50 px-2 py-0.5 rounded-full">当前任务</span>
                                    <h2 className="text-xl font-bold mt-1">{currentPlan.name}</h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs opacity-80">时间范围</p>
                                    <p className="font-mono font-bold leading-tight mt-1 truncate">{currentPlan.startTime} ~ {currentPlan.endTime}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm bg-blue-700/30 p-3 rounded-xl border border-blue-400/20">
                                <Route className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">路线：{currentPlan.route.name}</span>
                            </div>
                        </div>

                        {/* 点位任务列表 */}
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" />
                                任务清单
                            </h3>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {patrolRecords.length} / {currentPlan.route.checkpoints?.length || 0} 已完成
                            </span>
                        </div>

                        <div className="flex flex-col gap-3 relative before:absolute before:left-[1.65rem] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100 dark:before:bg-zinc-800 before:z-0">
                            {currentPlan.route.checkpoints?.map((item, idx) => {
                                const status = getCheckpointStatus(item.checkpoint.id);
                                return (
                                    <div key={item.checkpoint.id} className="relative z-10 flex items-start gap-4">
                                        <div className={`mt-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${status
                                            ? "bg-green-500 border-green-500 shadow-md shadow-green-100"
                                            : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                                            }`}>
                                            {status ? (
                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                            ) : (
                                                <Circle className="w-3 h-3 text-gray-200" />
                                            )}
                                        </div>

                                        <div className={`flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between transition-all ${!status && "opacity-70"}`}>
                                            <div className="min-w-0 pr-2">
                                                <h4 className="font-bold text-[#0f172a] dark:text-gray-100 text-sm truncate">{item.checkpoint.name}</h4>
                                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="truncate">{item.checkpoint.location || "待感应位点"}</span>
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-shrink-0 flex-col items-end gap-1.5">
                                                {status ? (
                                                    <>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status.status === "NORMAL" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                                                            已打卡
                                                        </span>
                                                        {status.offlineId ? (
                                                            <span className="flex items-center gap-1 text-[9px] text-gray-400">
                                                                <WifiOff className="w-2.5 h-2.5" /> 离线上传
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-[9px] text-green-500 font-medium">
                                                                实时同步
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-300 italic">待感应</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// 简单的图标支持
function Route(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="6" cy="19" r="3" />
            <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
            <circle cx="18" cy="5" r="3" />
        </svg>
    )
}
