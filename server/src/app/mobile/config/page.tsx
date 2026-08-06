"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    Plus,
    MapPin,
    Scan,
    Save,
    Trash2,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Edit2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Checkpoint {
    id: string;
    nfcTagId: string;
    name: string;
    location: string | null;
    groupId: string;
    roleCode: string;
    group?: { id: string, name: string };
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

export default function MobileConfigPage() {
    const router = useRouter();
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("");
    const [selectedRole, setSelectedRole] = useState("");

    // 表单状态
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        nfcTagId: "",
        location: "",
        groupId: "",
        roleCode: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cpRes, gRes, rRes] = await Promise.all([
                fetch("/api/admin/checkpoints"),
                fetch("/api/admin/groups"),
                fetch("/api/admin/roles")
            ]);

            const [cpData, gData, rData] = await Promise.all([
                cpRes.json(),
                gRes.json(),
                rRes.json()
            ]);

            setCheckpoints(cpData);
            setGroups(gData);
            // 过滤出适合移动端配置的角色
            setRoles(rData.filter((r: Role) => ["OPERATOR", "SECURITY"].includes(r.code)));
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("数据加载失败");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (cp?: Checkpoint) => {
        if (cp) {
            setEditingId(cp.id);
            setFormData({
                name: cp.name,
                nfcTagId: cp.nfcTagId,
                location: cp.location || "",
                groupId: cp.groupId,
                roleCode: cp.roleCode
            });
        } else {
            setEditingId(null);
            setFormData({
                name: "",
                nfcTagId: "",
                location: "",
                groupId: "",
                roleCode: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.nfcTagId || !formData.groupId || !formData.roleCode) {
            toast.error("请填写完整信息");
            return;
        }

        try {
            const url = editingId ? `/api/admin/checkpoints/${editingId}` : "/api/admin/checkpoints";
            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingId ? "修改成功" : "添加成功");
                setIsModalOpen(false);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "保存失败");
            }
        } catch (error) {
            toast.error("网络请求错误");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除此巡检点吗？")) return;

        try {
            const res = await fetch(`/api/admin/checkpoints/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("已删除");
                fetchData();
            }
        } catch (error) {
            toast.error("删除失败");
        }
    };

    // 真实读取 NFC 标签
    const handleNfcScan = async () => {
        if (!("NDEFReader" in window)) {
            toast.error("浏览器不支持 NFC");
            return;
        }

        setIsScanning(true);
        try {
            const ndef = new (window as any).NDEFReader();
            await ndef.scan();

            toast.info("等待贴卡...", { description: "请将巡检标签靠近手机" });

            ndef.onreading = (event: any) => {
                const tagId = event.serialNumber;
                setFormData(prev => ({ ...prev, nfcTagId: tagId }));
                setIsScanning(false);
                toast.success("标签绑定成功");

                if ("vibrate" in navigator) {
                    navigator.vibrate(200);
                }
            };

            ndef.onreadingerror = () => {
                toast.error("读取失败，请重试");
                setIsScanning(false);
            };

        } catch (error) {
            console.error("NFC Scan Error:", error);
            setIsScanning(false);
            toast.error("无法启动扫描");
        }
    };

    const filteredCheckpoints = checkpoints.filter(cp => {
        const matchesSearch = cp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cp.nfcTagId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGroup = !selectedGroup || cp.groupId === selectedGroup;
        const matchesRole = !selectedRole || cp.roleCode === selectedRole;
        return matchesSearch && matchesGroup && matchesRole;
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans mb-20 transition-colors dark:bg-zinc-950">
            <header className="px-4 py-4 bg-white dark:bg-zinc-900 shadow-sm flex items-center gap-4 sticky top-0 z-20 transition-colors">
                <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">巡检点配置</h1>
            </header>

            <main className="flex-1 p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
                {/* 筛选框 */}
                <div className="grid grid-cols-2 gap-3">
                    <select
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none"
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                    >
                        <option value="">所有分组</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                    >
                        <option value="">所有角色</option>
                        {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                </div>

                {/* 搜索栏 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="搜索点位名称或标签ID..."
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-400">加载点位数据...</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredCheckpoints.map(cp => (
                            <div
                                key={cp.id}
                                onClick={() => handleOpenModal(cp)}
                                className="bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <div className="flex flex-col flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{cp.name}</h3>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <span className="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">
                                                {cp.group?.name || 'CD'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                                            <Scan className="w-2.5 h-2.5" />
                                            <span className="truncate max-w-[80px]">{cp.nfcTagId}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-orange-500/80 font-bold">
                                            <span>{cp.role?.name || cp.roleCode}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-1 flex-shrink-0 border-l border-gray-50 dark:border-zinc-800 pl-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(cp); }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(cp.id); }}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-full"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredCheckpoints.length === 0 && (
                            <div className="text-center py-20 text-gray-400 text-sm italic">
                                未找到相关点位
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* 悬浮添加按钮 */}
            {!isModalOpen && (
                <button
                    onClick={() => handleOpenModal()}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all z-30"
                >
                    <Plus className="w-8 h-8" />
                </button>
            )}

            {/* 全屏表单弹框 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-[100] flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
                    <header className="flex justify-between items-center mb-6">
                        <button onClick={() => setIsModalOpen(false)} className="p-2">
                            <ChevronLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <h2 className="text-lg font-bold">{editingId ? '编辑点位' : '新增点位'}</h2>
                        <div className="w-10"></div>
                    </header>

                    <div className="flex-1 overflow-y-auto space-y-6">
                        {/* NFC 扫描区域 */}
                        <div
                            onClick={!isScanning ? handleNfcScan : undefined}
                            className={`relative h-32 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isScanning
                                ? "border-blue-500 bg-blue-50 animate-pulse"
                                : formData.nfcTagId
                                    ? "border-green-500 bg-green-50"
                                    : "border-gray-200"
                                }`}
                        >
                            {isScanning ? (
                                <>
                                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm font-bold text-blue-600">正在寻找标签...</span>
                                </>
                            ) : formData.nfcTagId ? (
                                <>
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                    <div className="text-center">
                                        <p className="text-xs text-green-600 font-bold">读取成功</p>
                                        <p className="text-sm font-mono text-gray-700">{formData.nfcTagId}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Scan className="w-10 h-10 text-gray-300" />
                                    <span className="text-sm font-medium text-gray-400 italic">点击读取 NFC 标签</span>
                                </>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">点位名称</label>
                                <input
                                    type="text"
                                    placeholder="例如：行政楼1层东侧"
                                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium border border-transparent focus:bg-white"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">物理位置</label>
                                <input
                                    type="text"
                                    placeholder="具体位置描述（可选）"
                                    className="w-full p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium border border-transparent focus:bg-white"
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">所属分组</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium border border-transparent focus:bg-white appearance-none"
                                        value={formData.groupId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
                                    >
                                        <option value="">选择分组</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">执行角色</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium border border-transparent focus:bg-white appearance-none"
                                        value={formData.roleCode}
                                        onChange={(e) => setFormData(prev => ({ ...prev, roleCode: e.target.value }))}
                                    >
                                        <option value="">选择角色</option>
                                        {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="mt-4 w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 transition-all text-base flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {editingId ? "确认修改" : "确认保存"}
                    </button>
                </div>
            )}
        </div>
    );
}
