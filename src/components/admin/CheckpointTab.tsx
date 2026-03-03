"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Check, X, Upload, Download, FileUp } from "lucide-react";

interface Checkpoint {
    id: string;
    nfcTagId: string;
    name: string;
    location: string | null;
    groupId: string;
    group?: { id: string, name: string };
    roleCode: string;
    role?: { code: string, name: string };
}

interface Group {
    id: string;
    name: string;
}

interface Role {
    code: string;
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
    const [newData, setNewData] = useState({ name: "", nfcTagId: "", location: "", groupId: "", roleCode: "" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState({ name: "", nfcTagId: "", location: "", groupId: "", roleCode: "" });
    const [groups, setGroups] = useState<Group[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
    const [groupFilter, setGroupFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");

    // 导入/导出弹框状态
    const [showIEModal, setShowIEModal] = useState(false);
    const [ieGroupId, setIeGroupId] = useState("");
    const [ieRoleCode, setIeRoleCode] = useState("");
    const [ieFile, setIeFile] = useState<File | null>(null);
    const [ieMode, setIeMode] = useState<'import' | 'export'>('export');
    const [ieLoading, setIeLoading] = useState(false);
    const [ieMsg, setIeMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
        fetchCheckpoints();
        fetchGroups();
        fetchRoles();
        const userData = localStorage.getItem("user");
        if (userData) {
            const parsed = JSON.parse(userData);
            setCurrentUser(parsed);
        }

        // 每30秒自动刷新一次数据，确保电脑端和手机端同步
        const timer = setInterval(fetchCheckpoints, 30000);
        return () => clearInterval(timer);
    }, []);

    const handleAdd = async () => {
        if (!newData.name || !newData.nfcTagId || !newData.groupId || !newData.roleCode) return;
        try {
            const res = await fetch("/api/admin/checkpoints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newData, creatorId: currentUser?.id }),
            });
            if (res.ok) {
                setNewData({ name: "", nfcTagId: "", location: "", groupId: "", roleCode: "" });
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
            groupId: cp.groupId,
            roleCode: cp.roleCode
        });
    };

    const handleEdit = async (id: string) => {
        if (!editData.name || !editData.nfcTagId || !editData.groupId || !editData.roleCode) return;
        try {
            const res = await fetch(`/api/admin/checkpoints/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...editData, creatorId: currentUser?.id }),
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

    // ——— 导出逻辑 ———
    const handleExport = async () => {
        if (!ieGroupId || !ieRoleCode) {
            setIeMsg({ type: 'error', text: '请先选择分组和角色' });
            return;
        }
        setIeLoading(true);
        setIeMsg(null);
        try {
            const res = await fetch(`/api/admin/checkpoints/export?groupId=${ieGroupId}&roleCode=${ieRoleCode}`);
            if (!res.ok) {
                const err = await res.json();
                setIeMsg({ type: 'error', text: err.error || '导出失败' });
                return;
            }
            const blob = await res.blob();
            const groupName = groups.find(g => g.id === ieGroupId)?.name || ieGroupId;
            const roleName = roles.find(r => r.code === ieRoleCode)?.name || ieRoleCode;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `巡检点_${groupName}_${roleName}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            setIeMsg({ type: 'success', text: '导出成功！' });
        } catch {
            setIeMsg({ type: 'error', text: '导出失败，请检查网络' });
        } finally {
            setIeLoading(false);
        }
    };

    // ——— 导入逻辑 ———
    const parseCSV = (text: string): { nfcTagId: string; name: string; location: string }[] => {
        const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
        // 跳过表头行
        const dataLines = lines[0]?.startsWith('NFC') ? lines.slice(1) : lines;
        return dataLines.map(line => {
            // 处理带引号的 CSV 字段
            const cols: string[] = [];
            let cur = '';
            let inQ = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
                    else inQ = !inQ;
                } else if (ch === ',' && !inQ) {
                    cols.push(cur); cur = '';
                } else {
                    cur += ch;
                }
            }
            cols.push(cur);
            return { nfcTagId: (cols[0] || '').trim(), name: (cols[1] || '').trim(), location: (cols[2] || '').trim() };
        }).filter(r => r.nfcTagId && r.name);
    };

    const handleImport = async () => {
        if (!ieGroupId || !ieRoleCode) {
            setIeMsg({ type: 'error', text: '请先选择分组和角色' });
            return;
        }
        if (!ieFile) {
            setIeMsg({ type: 'error', text: '请选择要导入的 CSV 文件' });
            return;
        }
        setIeLoading(true);
        setIeMsg(null);
        try {
            const text = await ieFile.text();
            const rows = parseCSV(text);
            if (rows.length === 0) {
                setIeMsg({ type: 'error', text: 'CSV 文件为空或格式不正确' });
                setIeLoading(false);
                return;
            }
            const res = await fetch('/api/admin/checkpoints/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: ieGroupId, roleCode: ieRoleCode, rows })
            });
            const result = await res.json();
            if (res.ok) {
                setIeMsg({ type: 'success', text: `导入成功！共导入 ${result.imported} 条数据` });
                fetchCheckpoints();
                setIeFile(null);
            } else {
                setIeMsg({ type: 'error', text: result.error || '导入失败' });
            }
        } catch {
            setIeMsg({ type: 'error', text: '文件读取失败，请检查文件格式' });
        } finally {
            setIeLoading(false);
        }
    };

    if (loading) return <div className="py-20 text-center">加载中...</div>;

    // 根据所选分组筛选导入导出的角色（与主表相同逻辑）
    const filteredCheckpoints = checkpoints.filter(cp => {
        const groupMatch = !groupFilter ||
            (cp.group?.name && cp.group.name.toLowerCase().includes(groupFilter.toLowerCase()));
        const roleMatch = !roleFilter ||
            (groupMatch &&
                (cp.role?.name && cp.role.name.toLowerCase().includes(roleFilter.toLowerCase())));
        return groupMatch && roleMatch;
    });

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">巡检点配置</h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="筛选分组..."
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                            className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="筛选角色..."
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* 导入/导出按钮 */}
                    <button
                        onClick={() => { setShowIEModal(true); setIeMsg(null); setIeFile(null); }}
                        className="flex items-center gap-2 border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        <FileUp className="w-4 h-4" />
                        导入 / 导出
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        新增点位
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 italic">
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">NFC 标签 ID</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">点位名称</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">物理位置</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">所属分组</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">所属角色</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isAdding && (
                            <tr className="bg-blue-50/30">
                                <td className="py-3 px-4">
                                    <input type="text" placeholder="标签 ID (如: NFC_001)" className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={newData.nfcTagId} onChange={(e) => setNewData({ ...newData, nfcTagId: e.target.value })} />
                                </td>
                                <td className="py-3 px-4">
                                    <input type="text" placeholder="点位名称" className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={newData.name} onChange={(e) => setNewData({ ...newData, name: e.target.value })} />
                                </td>
                                <td className="py-3 px-4">
                                    <input type="text" placeholder="位置描述" className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={newData.location} onChange={(e) => setNewData({ ...newData, location: e.target.value })} />
                                </td>
                                <td className="py-3 px-4">
                                    <select className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={newData.groupId} onChange={(e) => setNewData({ ...newData, groupId: e.target.value })}>
                                        <option value="">-- 请选择分组 --</option>
                                        {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                                    </select>
                                </td>
                                <td className="py-3 px-4">
                                    <select className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={newData.roleCode} onChange={(e) => setNewData({ ...newData, roleCode: e.target.value })}>
                                        <option value="">-- 请选择角色 --</option>
                                        {roles.map(r => (<option key={r.code} value={r.code}>{r.name}</option>))}
                                    </select>
                                </td>
                                <td className="py-3 px-4 text-right flex justify-end gap-2">
                                    <button onClick={handleAdd} className="p-1.5 text-green-600 hover:bg-green-100 rounded text-xs"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setIsAdding(false)} className="p-1.5 text-red-600 hover:bg-red-100 rounded text-xs"><X className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        )}
                        {filteredCheckpoints.map((cp) => (
                            editingId === cp.id ? (
                                <tr key={cp.id} className="bg-blue-50/20 transition-colors">
                                    <td className="py-3 px-4"><input type="text" className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={editData.nfcTagId} onChange={(e) => setEditData({ ...editData, nfcTagId: e.target.value })} /></td>
                                    <td className="py-3 px-4"><input type="text" className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></td>
                                    <td className="py-3 px-4"><input type="text" className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} /></td>
                                    <td className="py-3 px-4">
                                        <select className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={editData.groupId} onChange={(e) => setEditData({ ...editData, groupId: e.target.value })}>
                                            <option value="">-- 请选择分组 --</option>
                                            {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                                        </select>
                                    </td>
                                    <td className="py-3 px-4">
                                        <select className="w-full bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" value={editData.roleCode} onChange={(e) => setEditData({ ...editData, roleCode: e.target.value })}>
                                            <option value="">-- 请选择角色 --</option>
                                            {roles.map(r => (<option key={r.code} value={r.code}>{r.name}</option>))}
                                        </select>
                                    </td>
                                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(cp.id)} className="p-1.5 text-green-600 hover:bg-green-100 rounded text-xs" title="保存"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded text-xs" title="取消"><X className="w-4 h-4" /></button>
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
                                    <td className="py-4 px-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cp.role ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {cp.role?.name || cp.roleCode}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 flex justify-end gap-1">
                                        <button onClick={() => startEdit(cp)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="编辑点位"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(cp.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="删除点位"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 导入/导出弹框 */}
            {showIEModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            {/* 弹框标题 */}
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-[#0f172a]">巡检点导入 / 导出</h3>
                                <button onClick={() => setShowIEModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>

                            {/* 模式切换 */}
                            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                                <button
                                    onClick={() => { setIeMode('export'); setIeMsg(null); }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${ieMode === 'export' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                >
                                    <Download className="w-4 h-4" /> 导出
                                </button>
                                <button
                                    onClick={() => { setIeMode('import'); setIeMsg(null); }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${ieMode === 'import' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                >
                                    <Upload className="w-4 h-4" /> 导入
                                </button>
                            </div>

                            {/* 分组选择 */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">所属分组</label>
                                    <select
                                        value={ieGroupId}
                                        onChange={(e) => { setIeGroupId(e.target.value); setIeRoleCode(''); }}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="">-- 请选择分组 --</option>
                                        {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">所属角色</label>
                                    <select
                                        value={ieRoleCode}
                                        onChange={(e) => setIeRoleCode(e.target.value)}
                                        disabled={!ieGroupId}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">-- 请先选择分组 --</option>
                                        {roles.map(r => (<option key={r.code} value={r.code}>{r.name}</option>))}
                                    </select>
                                </div>

                                {/* 导入文件选择 */}
                                {ieMode === 'import' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">选择 CSV 文件</label>
                                        <div
                                            className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                                            onClick={() => document.getElementById('ie-file-input')?.click()}
                                        >
                                            <input
                                                id="ie-file-input"
                                                type="file"
                                                accept=".csv"
                                                className="hidden"
                                                onChange={(e) => setIeFile(e.target.files?.[0] || null)}
                                            />
                                            {ieFile ? (
                                                <p className="text-sm text-blue-600 font-medium">{ieFile.name}</p>
                                            ) : (
                                                <>
                                                    <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                                                    <p className="text-sm text-gray-400">点击选择 CSV 文件</p>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xs text-amber-600 mt-2 font-medium">
                                            ⚠️ 导入为清空导入，将删除所选分组+角色的全部现有点位后重新写入。
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            CSV 格式：NFC标签ID, 点位名称, 物理位置（第三列可空）
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* 消息提示 */}
                            {ieMsg && (
                                <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${ieMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {ieMsg.text}
                                </div>
                            )}

                            {/* 操作按钮 */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowIEModal(false)}
                                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
                                >
                                    关闭
                                </button>
                                <button
                                    onClick={ieMode === 'export' ? handleExport : handleImport}
                                    disabled={ieLoading || !ieGroupId || !ieRoleCode}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {ieLoading ? (
                                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : ieMode === 'export' ? (
                                        <><Download className="w-4 h-4" /> 开始导出</>
                                    ) : (
                                        <><Upload className="w-4 h-4" /> 开始导入</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
