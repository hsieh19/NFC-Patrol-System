"use client";

import React, { useState, useEffect } from "react";
import { Plus, Archive, Trash2, Edit2, X, RotateCcw, AlertTriangle } from "lucide-react";

interface Plan {
    id: string;
    name: string;
    routeId: string;
    route: { id: string, name: string };
    startTime: string;
    endTime: string;
    assignedTo?: string;
    frequency: string;
    planType: string;
    groupId: string;
    group: { id: string, name: string };
    roleCode: string;
    role: { code: string, name: string };
    isArchived: boolean;
    archivedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface Route { id: string; name: string; groupId: string; roleCode: string; }
interface Group { id: string; name: string; }
interface Role { code: string; name: string; }
interface CurrentUserInfo { id: string; name: string; role: string; }

export default function PlanTab() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [archivedPlans, setArchivedPlans] = useState<Plan[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [groupFilter, setGroupFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [showArchiveManager, setShowArchiveManager] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteName, setConfirmDeleteName] = useState("");

    const [planForm, setPlanForm] = useState({
        name: "", routeId: "", startTime: "", endTime: "",
        planType: "ORDERED", groupId: "", roleCode: ""
    });

    const fetchPlans = async () => {
        try {
            const res = await fetch("/api/admin/schedules");
            const data = await res.json();
            setPlans(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch plans:", error);
            setPlans([]);
        }
    };

    const fetchArchivedPlans = async () => {
        try {
            const res = await fetch("/api/admin/schedules?archived=true");
            const data = await res.json();
            setArchivedPlans(Array.isArray(data) ? data.filter((p: Plan) => p.isArchived) : []);
        } catch (error) {
            console.error("Failed to fetch archived plans:", error);
        }
    };

    const fetchRoutes = async () => {
        try {
            const res = await fetch("/api/admin/routes");
            const data = await res.json();
            setRoutes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch routes:", error);
        }
    };

    const fetchGroups = async () => {
        try {
            const res = await fetch("/api/admin/groups");
            const data = await res.json();
            setGroups(data);
        } catch (error) {
            console.error("Failed to fetch groups:", error);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await fetch("/api/admin/roles");
            const data = await res.json();
            const filteredRoles = data.filter((role: Role) =>
                role.code === "OPERATOR" || role.code === "SECURITY"
            );
            setRoles(filteredRoles);
        } catch (error) {
            console.error("Failed to fetch roles:", error);
        }
    };

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const parsed = JSON.parse(userData);
            setCurrentUser(parsed);
        }
        const loadData = async () => {
            await Promise.all([fetchPlans(), fetchRoutes(), fetchGroups(), fetchRoles()]);
            setLoading(false);
        };
        loadData();
    }, []);

    const handleAddPlan = async () => {
        if (!planForm.name || !planForm.routeId || !planForm.startTime || !planForm.endTime || !planForm.groupId || !planForm.roleCode) return;
        try {
            const res = await fetch("/api/admin/schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(planForm),
            });
            if (res.ok) { setIsAdding(false); resetForm(); fetchPlans(); }
            else { const err = await res.json(); alert(err.error || "添加失败"); }
        } catch (error) { console.error("Add plan error:", error); }
    };

    const handleEditPlan = async (id: string) => {
        if (!planForm.name || !planForm.routeId || !planForm.startTime || !planForm.endTime || !planForm.groupId || !planForm.roleCode) return;
        try {
            const res = await fetch(`/api/admin/schedules/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(planForm),
            });
            if (res.ok) { setEditingId(null); resetForm(); fetchPlans(); }
            else { const err = await res.json(); alert(err.error || "修改失败"); }
        } catch (error) { console.error("Edit plan error:", error); }
    };

    // 软删除 → 归档
    const handleArchivePlan = async (id: string, name: string) => {
        if (!confirm(`确定要归档计划「${name}」吗？\n\n归档后该计划将停用，但历史考核数据会完整保留。`)) return;
        try {
            const res = await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
            if (res.ok) { fetchPlans(); }
        } catch (error) { console.error("Archive plan error:", error); }
    };

    // 还原归档
    const handleRestorePlan = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/schedules/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restore: true })
            });
            if (res.ok) { fetchPlans(); fetchArchivedPlans(); }
        } catch (error) { console.error("Restore plan error:", error); }
    };

    // 物理永久删除
    const handlePermanentDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/schedules/${id}?permanent=true`, { method: "DELETE" });
            if (res.ok) { fetchArchivedPlans(); setConfirmDeleteId(null); }
            else { alert("删除失败"); }
        } catch (error) { console.error("Permanent delete error:", error); }
    };

    const startEdit = (plan: Plan) => {
        setEditingId(plan.id);
        setPlanForm({
            name: plan.name, routeId: plan.routeId, startTime: plan.startTime,
            endTime: plan.endTime, planType: plan.planType, groupId: plan.groupId, roleCode: plan.roleCode
        });
    };

    const resetForm = () => {
        setPlanForm({ name: "", routeId: "", startTime: "", endTime: "", planType: "ORDERED", groupId: "", roleCode: "" });
    };

    const filteredPlans = plans.filter(plan => {
        const groupMatch = !groupFilter || (plan.group?.name && plan.group.name.toLowerCase().includes(groupFilter.toLowerCase()));
        const roleMatch = !roleFilter || (groupMatch && plan.role?.name && plan.role.name.toLowerCase().includes(roleFilter.toLowerCase()));
        return groupMatch && roleMatch;
    });

    if (loading) return <div className="py-20 text-center">加载中...</div>;

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">计划配置</h2>
                    <div className="relative">
                        <input type="text" placeholder="筛选分组..." value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                            className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="relative">
                        <input type="text" placeholder="筛选角色..." value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* 归档管理按钮 */}
                    <button
                        onClick={() => { setShowArchiveManager(true); fetchArchivedPlans(); }}
                        className="flex items-center gap-2 border border-gray-200 hover:border-amber-400 hover:text-amber-600 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        <Archive className="w-4 h-4" />
                        归档管理
                    </button>
                    {/* 新建计划按钮 */}
                    <button
                        onClick={() => { setIsAdding(true); resetForm(); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        新建计划
                    </button>
                </div>
            </div>

            {/* Plan Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 italic">
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">序号</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">计划名称</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">路线名称</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">所属分组</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">所属角色</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">计划类型</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">时间范围</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredPlans.map((plan, index) => (
                            <tr key={plan.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-4 text-gray-500">{index + 1}</td>
                                <td className="py-4 px-4 text-[#0f172a] font-semibold">{plan.name}</td>
                                <td className="py-4 px-4 text-gray-500">{plan.route?.name || '未知路线'}</td>
                                <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${plan.group ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {plan.group?.name || '系统全局'}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${plan.role ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {plan.role?.name || plan.roleCode}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${plan.planType === 'ORDERED' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {plan.planType === 'ORDERED' ? '有序计划' : '无序计划'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-gray-500">{plan.startTime} - {plan.endTime}</td>
                                <td className="py-4 px-4 flex justify-end gap-1">
                                    <button onClick={() => startEdit(plan)}
                                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="编辑计划">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleArchivePlan(plan.id, plan.name)}
                                        className="p-2 text-gray-400 hover:text-amber-600 transition-colors" title="归档计划">
                                        <Archive className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredPlans.length === 0 && (
                            <tr><td colSpan={8} className="py-12 text-center text-gray-400">暂无计划配置</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {(isAdding || editingId) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-[#0f172a]">{editingId ? '编辑计划' : '新建计划'}</h3>
                                <button onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="mb-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">计划名称</label>
                                        <input type="text" value={planForm.name}
                                            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                                            placeholder="请输入计划名称"
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">所属分组</label>
                                        <select value={planForm.groupId}
                                            onChange={(e) => setPlanForm({ ...planForm, groupId: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">-- 请选择分组 --</option>
                                            {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">计划类型</label>
                                        <select value={planForm.planType}
                                            onChange={(e) => setPlanForm({ ...planForm, planType: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="ORDERED">有序计划</option>
                                            <option value="UNORDERED">无序计划</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">所属角色</label>
                                        <select value={planForm.roleCode}
                                            onChange={(e) => setPlanForm({ ...planForm, roleCode: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">-- 请选择角色 --</option>
                                            {roles.map(r => (<option key={r.code} value={r.code}>{r.name}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                                        <input type="time" value={planForm.startTime}
                                            onChange={(e) => setPlanForm({ ...planForm, startTime: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                                        <input type="time" value={planForm.endTime}
                                            onChange={(e) => setPlanForm({ ...planForm, endTime: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">选择路线</label>
                                    <select value={planForm.routeId}
                                        onChange={(e) => setPlanForm({ ...planForm, routeId: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">-- 请选择路线 --</option>
                                        {routes.filter(r => (!planForm.groupId || r.groupId === planForm.groupId) && (!planForm.roleCode || r.roleCode === planForm.roleCode))
                                            .map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }}
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">取消</button>
                                <button onClick={() => editingId ? handleEditPlan(editingId) : handleAddPlan()}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                                    {editingId ? '保存修改' : '创建计划'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Manager Modal */}
            {showArchiveManager && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-[#0f172a]">归档管理</h3>
                                <p className="text-xs text-gray-400 mt-0.5">已归档的计划不影响打卡，但历史考核数据仍然完整保留</p>
                            </div>
                            <button onClick={() => setShowArchiveManager(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {archivedPlans.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>暂无归档计划</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {archivedPlans.map(plan => (
                                        <div key={plan.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                            <div className="min-w-0 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <Archive className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                                    <span className="font-semibold text-gray-800 truncate">{plan.name}</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                                    <span className="text-xs text-gray-500">{plan.route?.name}</span>
                                                    <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded">{plan.group?.name}</span>
                                                    <span className="text-xs text-gray-400">{plan.startTime} – {plan.endTime}</span>
                                                    {plan.archivedAt && (
                                                        <span className="text-xs text-gray-400">归档于 {new Date(plan.archivedAt).toLocaleDateString('zh-CN')}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleRestorePlan(plan.id)}
                                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors"
                                                    title="还原计划"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    还原
                                                </button>
                                                <button
                                                    onClick={() => { setConfirmDeleteId(plan.id); setConfirmDeleteName(plan.name); }}
                                                    className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                                                    title="永久删除"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    永久删除
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Confirm Dialog */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">确认永久删除？</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    即将永久删除计划「<span className="font-semibold text-gray-800">{confirmDeleteName}</span>」。
                                </p>
                                <p className="text-sm text-red-500 mt-2 font-medium">
                                    ⚠️ 此操作不可撤销，相关考核历史将被移除。
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium">
                                取消
                            </button>
                            <button onClick={() => handlePermanentDelete(confirmDeleteId)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                                确认永久删除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}