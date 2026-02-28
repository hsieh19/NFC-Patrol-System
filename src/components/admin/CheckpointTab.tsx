"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface Checkpoint {
    id: string;
    nfcTagId: string;
    name: string;
    location: string | null;
    groupId: string | null;
    group?: { id: string, name: string } | null;
}

interface Group {
    id: string;
    name: string;
}

interface CurrentUserInfo {
    id: string;
    name: string;
    role: string;
}

export default function CheckpointTab() {
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newData, setNewData] = useState({ name: "", nfcTagId: "", location: "", groupId: "" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState({ name: "", nfcTagId: "", location: "", groupId: "" });
    const [groups, setGroups] = useState<Group[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);


    const fetchCheckpoints = async () => {
        try {
            const res = await fetch("/api/admin/checkpoints");
            const data = await res.json();
            setCheckpoints(data);
        } catch (error) {
            console.error("Failed to fetch checkpoints:", error);
        } finally {
            setLoading(false);
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

    useEffect(() => {
        fetchCheckpoints();
        fetchGroups();
        const userData = localStorage.getItem("user");
        if (userData) {
            const parsed = JSON.parse(userData);
            setCurrentUser(parsed);
        }
    }, []);

    const handleAdd = async () => {
        if (!newData.name || !newData.nfcTagId) return;
        try {
            const res = await fetch("/api/admin/checkpoints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newData, creatorId: currentUser?.id }),
            });
            if (res.ok) {
                setNewData({ name: "", nfcTagId: "", location: "", groupId: "" });
                setIsAdding(false);
                fetchCheckpoints();
            } else {
                const err = await res.json();
                alert(err.error || "添加失败");
            }
        } catch (error) {
            console.error("Add error:", error);
        }
    };

    const startEdit = (cp: Checkpoint) => {
        setEditingId(cp.id);
        setEditData({
            name: cp.name,
            nfcTagId: cp.nfcTagId,
            location: cp.location || "",
            groupId: cp.groupId || ""
        });
    };

    const handleEdit = async (id: string) => {
        if (!editData.name || !editData.nfcTagId) return;
        try {
            const res = await fetch(`/api/admin/checkpoints/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData),
            });
            if (res.ok) {
                setEditingId(null);
                fetchCheckpoints();
            } else {
                const err = await res.json();
                alert(err.error || "修改失败");
            }
        } catch (error) {
            console.error("Edit error:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除该巡检点吗？关联记录将保留但点位引用将被设为空。")) return;
        try {
            const res = await fetch(`/api/admin/checkpoints/${id}`, { method: "DELETE" });
            if (res.ok) fetchCheckpoints();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    if (loading) return <div className="py-20 text-center">加载中...</div>;

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">巡检点配置</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    新增点位
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 italic">
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">NFC 标签 ID</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">点位名称</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">物理位置</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">所属分组</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isAdding && (
                            <tr className="bg-blue-50/30">
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        placeholder="标签 ID (如: NFC_001)"
                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                        value={newData.nfcTagId}
                                        onChange={(e) => setNewData({ ...newData, nfcTagId: e.target.value })}
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        placeholder="点位名称"
                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                        value={newData.name}
                                        onChange={(e) => setNewData({ ...newData, name: e.target.value })}
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        placeholder="位置描述"
                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                        value={newData.location}
                                        onChange={(e) => setNewData({ ...newData, location: e.target.value })}
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500 disabled:opacity-50"
                                        value={newData.groupId}
                                        onChange={(e) => setNewData({ ...newData, groupId: e.target.value })}
                                        disabled={currentUser?.role === 'ADMIN'}
                                    >
                                        <option value="">-- 系统全局 --</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="py-3 px-4 text-right flex justify-end gap-2">
                                    <button onClick={handleAdd} className="p-1.5 text-green-600 hover:bg-green-100 rounded text-xs">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setIsAdding(false)} className="p-1.5 text-red-600 hover:bg-red-100 rounded text-xs">
                                        <X className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        )}
                        {checkpoints.map((cp) => (
                            editingId === cp.id ? (
                                <tr key={cp.id} className="bg-blue-50/20 transition-colors">
                                    <td className="py-3 px-4">
                                        <input
                                            type="text"
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                            value={editData.nfcTagId}
                                            onChange={(e) => setEditData({ ...editData, nfcTagId: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input
                                            type="text"
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                            value={editData.name}
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input
                                            type="text"
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                            value={editData.location}
                                            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <select
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500 disabled:opacity-50"
                                            value={editData.groupId}
                                            onChange={(e) => setEditData({ ...editData, groupId: e.target.value })}
                                            disabled={currentUser?.role === 'ADMIN'}
                                        >
                                            <option value="">-- 系统全局 --</option>
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(cp.id)} className="p-1.5 text-green-600 hover:bg-green-100 rounded text-xs" title="保存">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded text-xs" title="取消">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={cp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-4 font-mono text-gray-500">{cp.nfcTagId}</td>
                                    <td className="py-4 px-4 text-[#0f172a] font-semibold">{cp.name}</td>
                                    <td className="py-4 px-4 text-gray-500">{cp.location || "-"}</td>
                                    <td className="py-4 px-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cp.group ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {cp.group?.name || '系统全局'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 flex justify-end gap-1">
                                        <button
                                            onClick={() => startEdit(cp)}
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="编辑点位"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cp.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="删除点位"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
