"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    Search,
    ArrowUpRight,
    BarChart3,
    Loader2,
    Download,
    X as XIcon
} from "lucide-react";
import { format } from "date-fns";

interface AssessmentPlan {
    id: string;
    planId: string;
    planName: string;
    date: string;
    routeName: string;
    groupName: string;
    roleName: string;
    startTime: string;
    endTime: string;
    planType: string;
    stats: {
        total: number;
        visited: number;
        progress: number;
    };
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PENDING';
    checkpoints: Array<{
        checkpointId: string;
        name: string;
        order: number;
        isvisited: boolean;
        visitCount: number;
        visitedAt: string | null;
        status: string;
    }>;
}

export default function AssessmentTab() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [activePreset, setActivePreset] = useState<'today' | 'week' | 'month' | null>('today');
    const [plans, setPlans] = useState<AssessmentPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPlan, setSelectedPlan] = useState<AssessmentPlan | null>(null);

    const fetchAssessment = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/assessment?startDate=${startDate}&endDate=${endDate}`);
            const data = await res.json();
            setPlans(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch assessment:", error);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchAssessment();
    }, [fetchAssessment]);

    const setPreset = (preset: 'today' | 'week' | 'month') => {
        const now = new Date();
        const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
        if (preset === 'today') {
            setStartDate(fmt(now));
            setEndDate(fmt(now));
        } else if (preset === 'week') {
            const day = now.getDay();
            const mon = new Date(now);
            mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
            setStartDate(fmt(mon));
            setEndDate(fmt(now));
        } else {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            setStartDate(fmt(first));
            setEndDate(fmt(now));
        }
        setActivePreset(preset);
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return { label: '已完成', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-4 h-4" /> };
            case 'IN_PROGRESS':
                return { label: '进行中', color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', icon: <Clock className="w-4 h-4" /> };
            case 'FAILED':
                return { label: '未达标', color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', icon: <AlertCircle className="w-4 h-4" /> };
            case 'PENDING':
                return { label: '待开始', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: <Clock className="w-4 h-4" /> };
            default:
                return { label: '未开始', color: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600', icon: <Clock className="w-4 h-4" /> };
        }
    };

    const filteredPlans = plans.filter(p =>
        p.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.routeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 是否是单日模式
    const isSingleDay = startDate === endDate;

    // ——— 导出弹框状态 ———
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportGroupId, setExportGroupId] = useState('');
    const [exportRoleCode, setExportRoleCode] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [exportMsg, setExportMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [exportGroups, setExportGroups] = useState<{ id: string; name: string }[]>([]);
    const [exportRoles, setExportRoles] = useState<{ code: string; name: string }[]>([]);

    useEffect(() => {
        if (!showExportModal) return;
        fetch('/api/admin/groups').then(r => r.json()).then(d => setExportGroups(Array.isArray(d) ? d : []));
        fetch('/api/admin/roles').then(r => r.json()).then(d =>
            setExportRoles(Array.isArray(d) ? d.filter((r: { code: string }) => r.code === 'OPERATOR' || r.code === 'SECURITY') : [])
        );
    }, [showExportModal]);

    const handleExportAssessment = async () => {
        if (!exportGroupId || !exportRoleCode) {
            setExportMsg({ type: 'error', text: '请先选择分组和角色' });
            return;
        }
        setExportLoading(true);
        setExportMsg(null);
        try {
            const url = `/api/admin/assessment/export?startDate=${startDate}&endDate=${endDate}&groupId=${exportGroupId}&roleCode=${exportRoleCode}`;
            const res = await fetch(url);
            if (!res.ok) {
                const err = await res.json();
                setExportMsg({ type: 'error', text: err.error || '导出失败' });
                return;
            }
            const blob = await res.blob();
            const groupName = exportGroups.find(g => g.id === exportGroupId)?.name || exportGroupId;
            const roleName = exportRoles.find(r => r.code === exportRoleCode)?.name || exportRoleCode;
            const filename = `考核结果_${groupName}_${roleName}_${startDate}${startDate !== endDate ? '至' + endDate : ''}.csv`;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            setExportMsg({ type: 'success', text: '导出成功！' });
        } catch {
            setExportMsg({ type: 'error', text: '导出失败，请检查网络连接' });
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">计划考核中心</h2>
                    <p className="text-slate-500 text-sm mt-1">实时监控巡检计划执行进度与质量分析</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* 快捷选择 */}
                    {(['today', 'week', 'month'] as const).map((p, i) => (
                        <button
                            key={p}
                            onClick={() => setPreset(p)}
                            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${activePreset === p
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                                }`}
                        >
                            {['今日', '本周', '本月'][i]}
                        </button>
                    ))}
                    {/* 日期范围 */}
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setActivePreset(null); }}
                            className="text-sm font-bold text-slate-700 outline-none w-32"
                        />
                        <span className="text-slate-300 font-bold">—</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => { setEndDate(e.target.value); setActivePreset(null); }}
                            className="text-sm font-bold text-slate-700 outline-none w-32"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: '总记录数', value: plans.length, sub: '', icon: <BarChart3 className="text-blue-600" />, bg: 'bg-blue-50' },
                    { label: '完成率', value: `${plans.length ? Math.round((plans.filter(p => p.status === 'COMPLETED').length / plans.length) * 100) : 0}%`, sub: '全量达标', icon: <CheckCircle2 className="text-emerald-600" />, bg: 'bg-emerald-50' },
                    { label: '正在执行', value: plans.filter(p => p.status === 'IN_PROGRESS').length, sub: '任务窗口内', icon: <Clock className="text-orange-600" />, bg: 'bg-orange-50' },
                    { label: '异常告警', value: plans.filter(p => p.status === 'FAILED').length, sub: '超时未打卡', icon: <AlertCircle className="text-rose-600" />, bg: 'bg-rose-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-slate-900">{stat.value}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{stat.sub}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索任务或路线名称..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchAssessment}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} 刷新数据
                    </button>
                    <button
                        onClick={() => { setShowExportModal(true); setExportMsg(null); }}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all"
                    >
                        <Download className="w-4 h-4" /> 考核结果导出
                    </button>
                </div>
            </div>

            {/* Assessment List */}
            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
                    ))
                ) : filteredPlans.length > 0 ? (
                    filteredPlans.map(plan => {
                        const config = getStatusConfig(plan.status);
                        return (
                            <div
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan)}
                                className="group bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                            >
                                {/* Background Accent */}
                                <div className={`absolute top-0 right-0 w-32 h-32 ${config.bg} opacity-50 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:scale-150`} />

                                <div className="flex justify-between items-start relative z-10">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600">{plan.groupName}</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{plan.roleName}</span>
                                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                                                {plan.planType === 'ORDERED' ? '有序计划' : '无序计划'}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium"><Search className="w-3 h-3" /> {plan.routeName}</span>
                                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium"><Clock className="w-3 h-3" /> {plan.startTime}-{plan.endTime}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">{plan.planName}</h3>
                                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500 font-mono">{plan.date}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-4">
                                        <div className="text-2xl font-black text-slate-900">{plan.stats.progress}%</div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">完成进度</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-6">
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${config.color} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                                            style={{ width: `${plan.stats.progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-2 text-[10px] font-bold">
                                        <span className="text-slate-400 uppercase tracking-wider">
                                            打卡情况: {plan.stats.visited} / {plan.stats.total}
                                        </span>
                                        <span className={config.text}>
                                            {plan.status === 'COMPLETED' && '任务圆满完成'}
                                            {plan.status === 'FAILED' && '计划执行失败/逾期'}
                                            {plan.status === 'PENDING' && '等待打卡开始'}
                                            {plan.status === 'IN_PROGRESS' && '任务执行中...'}
                                            {plan.status === 'NOT_STARTED' && '计划尚未开始'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="lg:col-span-2 py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                            <Calendar className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">暂无考核数据</h4>
                        <p className="text-slate-500 text-sm mt-1">所选日期没有已安排的巡检计划</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedPlan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300 p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-8 bg-slate-50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getStatusConfig(selectedPlan.status).bg} ${getStatusConfig(selectedPlan.status).text}`}>
                                        {getStatusConfig(selectedPlan.status).label}
                                    </span>
                                    <h2 className="text-2xl font-black text-slate-900">{selectedPlan.planName}</h2>
                                </div>
                                <p className="text-slate-500 text-sm font-medium">路线：{selectedPlan.routeName} | 任务执行明细表</p>
                            </div>
                            <button
                                onClick={() => setSelectedPlan(null)}
                                className="w-10 h-10 bg-white hover:bg-rose-50 hover:text-rose-500 rounded-full flex items-center justify-center shadow-sm transition-all outline-none"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="space-y-3">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">巡检点到达情况</p>
                                <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                                    {selectedPlan.checkpoints.map((cp, idx) => (
                                        <div key={idx} className="flex items-center gap-4 relative z-10">
                                            <div className={`w-9 h-9 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0 ${cp.isvisited ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                {cp.isvisited ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{cp.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">次序: {idx + 1}</p>
                                                </div>
                                                <div className="text-right">
                                                    {cp.isvisited ? (
                                                        <>
                                                            <p className="text-[10px] font-black text-emerald-600 uppercase">打卡成功</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{cp.visitedAt ? format(new Date(cp.visitedAt), 'HH:mm:ss') : '--:--'}</p>
                                                        </>
                                                    ) : (
                                                        <p className="text-[10px] font-black text-rose-500 uppercase">缺漏中</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 flex gap-4">
                            <button
                                onClick={() => setSelectedPlan(null)}
                                className="flex-1 bg-white hover:bg-slate-100 text-slate-900 py-3 rounded-2xl font-bold transition-all shadow-sm"
                            >
                                确认关闭
                            </button>
                            <button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100"
                            >
                                导出报告
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 考核结果导出弹框 */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">考核结果导出</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        导出范围：{startDate}{startDate !== endDate ? ` 至 ${endDate}` : ''}
                                    </p>
                                </div>
                                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">所属分组</label>
                                    <select
                                        value={exportGroupId}
                                        onChange={(e) => { setExportGroupId(e.target.value); setExportRoleCode(''); }}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- 请选择分组 --</option>
                                        {exportGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">所属角色</label>
                                    <select
                                        value={exportRoleCode}
                                        onChange={(e) => setExportRoleCode(e.target.value)}
                                        disabled={!exportGroupId}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">-- 请先选择分组 --</option>
                                        {exportRoles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
                                    📋 将导出所选分组+角色在当前日期范围内的所有巡检计划执行记录，每个巡检点一行，并标注考核结果（准时 / 未到）。
                                </div>
                            </div>

                            {exportMsg && (
                                <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${exportMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {exportMsg.text}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                                >
                                    关闭
                                </button>
                                <button
                                    onClick={handleExportAssessment}
                                    disabled={exportLoading || !exportGroupId || !exportRoleCode}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {exportLoading
                                        ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                        : <Download className="w-4 h-4" />}
                                    开始导出
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
