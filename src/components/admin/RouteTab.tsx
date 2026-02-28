"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X, Route, GripVertical, Move } from "lucide-react";

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

interface Route {
    id: string;
    name: string;
    description?: string;
    groupId: string | null;
    group?: { id: string, name: string } | null;
    checkpoints: RouteCheckpoint[];
}

interface RouteCheckpoint {
    id: string;
    routeId: string;
    checkpointId: string;
    checkpoint: Checkpoint;
    order: number;
}

interface CurrentUserInfo {
    id: string;
    name: string;
    role: string;
}

export default function RouteTab() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form data
    const [routeForm, setRouteForm] = useState({
        name: "",
        description: "",
        groupId: ""
    });
    
    // Route checkpoints
    const [routeCheckpoints, setRouteCheckpoints] = useState<RouteCheckpoint[]>([]);
    const [availableCheckpoints, setAvailableCheckpoints] = useState<Checkpoint[]>([]);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const fetchRoutes = async () => {
        try {
            const res = await fetch("/api/admin/routes");
            const data = await res.json();
            setRoutes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch routes:", error);
            setRoutes([]);
        }
    };

    const fetchCheckpoints = async () => {
        try {
            const res = await fetch("/api/admin/checkpoints");
            const data = await res.json();
            setCheckpoints(data);
            setAvailableCheckpoints(data);
        } catch (error) {
            console.error("Failed to fetch checkpoints:", error);
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
        const userData = localStorage.getItem("user");
        if (userData) {
            const parsed = JSON.parse(userData);
            setCurrentUser(parsed);
        }
        
        const loadData = async () => {
            await fetchRoutes();
            await fetchCheckpoints();
            await fetchGroups();
            setLoading(false);
        };
        
        loadData();
    }, []);

    const handleAddRoute = async () => {
        if (!routeForm.name) return;
        
        try {
            const res = await fetch("/api/admin/routes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...routeForm,
                    checkpoints: routeCheckpoints.map(cp => ({
                        checkpointId: cp.checkpointId,
                        order: cp.order
                    }))
                }),
            });
            
            if (res.ok) {
                setIsAdding(false);
                resetForm();
                fetchRoutes();
            } else {
                const err = await res.json();
                alert(err.error || "添加失败");
            }
        } catch (error) {
            console.error("Add route error:", error);
        }
    };

    const handleEditRoute = async (id: string) => {
        if (!routeForm.name) return;
        
        try {
            const res = await fetch(`/api/admin/routes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...routeForm,
                    checkpoints: routeCheckpoints.map(cp => ({
                        checkpointId: cp.checkpointId,
                        order: cp.order
                    }))
                }),
            });
            
            if (res.ok) {
                setEditingId(null);
                resetForm();
                fetchRoutes();
            } else {
                const err = await res.json();
                alert(err.error || "修改失败");
            }
        } catch (error) {
            console.error("Edit route error:", error);
            alert("修改失败，请检查网络连接");
        }
    };

    const handleDeleteRoute = async (id: string) => {
        if (!confirm("确定要删除该路线吗？关联的计划将被取消。")) return;
        
        try {
            const res = await fetch(`/api/admin/routes/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchRoutes();
            }
        } catch (error) {
            console.error("Delete route error:", error);
        }
    };

    const startEdit = async (route: Route) => {
        setEditingId(route.id);
        setRouteForm({
            name: route.name,
            description: route.description || "",
            groupId: route.groupId || ""
        });
        
        // Load route checkpoints
        setRouteCheckpoints(route.checkpoints || []);
        
        // Update available checkpoints
        const usedCheckpointIds = (route.checkpoints || []).map(cp => cp.checkpointId);
        setAvailableCheckpoints(checkpoints.filter(cp => !usedCheckpointIds.includes(cp.id)));
    };

    const resetForm = () => {
        setRouteForm({ name: "", description: "", groupId: "" });
        setRouteCheckpoints([]);
        setAvailableCheckpoints(checkpoints);
    };

    const handleAddCheckpoint = (checkpoint: Checkpoint) => {
        const newCheckpoint: RouteCheckpoint = {
            id: `temp_${Date.now()}`,
            routeId: editingId || "",
            checkpointId: checkpoint.id,
            checkpoint,
            order: routeCheckpoints.length
        };
        
        setRouteCheckpoints([...routeCheckpoints, newCheckpoint]);
        setAvailableCheckpoints(availableCheckpoints.filter(cp => cp.id !== checkpoint.id));
    };

    const handleRemoveCheckpoint = (checkpointId: string) => {
        const removedCheckpoint = routeCheckpoints.find(cp => cp.checkpointId === checkpointId);
        if (removedCheckpoint) {
            setAvailableCheckpoints([...availableCheckpoints, removedCheckpoint.checkpoint]);
        }
        
        const updatedCheckpoints = routeCheckpoints
            .filter(cp => cp.checkpointId !== checkpointId)
            .map((cp, index) => ({ ...cp, order: index }));
        
        setRouteCheckpoints(updatedCheckpoints);
    };

    const handleReorderCheckpoint = (fromIndex: number, toIndex: number) => {
        const result = [...routeCheckpoints];
        const [movedItem] = result.splice(fromIndex, 1);
        result.splice(toIndex, 0, movedItem);
        
        // Update order numbers
        const updatedCheckpoints = result.map((cp, index) => ({ ...cp, order: index }));
        setRouteCheckpoints(updatedCheckpoints);
    };

    if (loading) return <div className="py-20 text-center">加载中...</div>;

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">路线配置</h2>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        resetForm();
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    新建路线
                </button>
            </div>

            {/* Route Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 italic">
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">序号</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">所属分组</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">路线名称</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4">点位统计</th>
                            <th className="pb-4 font-semibold text-sm text-gray-400 px-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {routes.map((route, index) => (
                            <tr key={route.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-4 text-gray-500">{index + 1}</td>
                                <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${route.group ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {route.group?.name || '系统全局'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-[#0f172a] font-semibold">{route.name}</td>
                                <td className="py-4 px-4 text-gray-500">{route.checkpoints.length} 个点位</td>
                                <td className="py-4 px-4 flex justify-end gap-1">
                                    <button
                                        onClick={() => startEdit(route)}
                                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                        title="编辑路线"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRoute(route.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                        title="删除路线"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {routes.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-400">
                                    暂无路线配置
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Route Modal */}
            {(isAdding || editingId) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-[#0f172a]">{editingId ? '编辑路线' : '新建路线'}</h3>
                                <button
                                    onClick={() => {
                                        setIsAdding(false);
                                        setEditingId(null);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Upper Section */}
                            <div className="mb-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">路线名称</label>
                                        <input
                                            type="text"
                                            value={routeForm.name}
                                            onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                                            placeholder="请输入路线名称"
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">所属分组</label>
                                        <select
                                            value={routeForm.groupId}
                                            onChange={(e) => setRouteForm({ ...routeForm, groupId: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- 系统全局 --</option>
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">路线描述</label>
                                    <input
                                        type="text"
                                        value={routeForm.description}
                                        onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                                        placeholder="请输入路线描述（选填）"
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Lower Section */}
                            <div className="border-t border-gray-200 pt-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-4">配置路线点位</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Available Checkpoints */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <h5 className="text-sm font-medium text-gray-700">可用巡检点</h5>
                                            <span className="text-xs text-gray-500">{availableCheckpoints.length} 个</span>
                                        </div>
                                        <div className="border border-gray-200 rounded-lg max-h-[500px] overflow-y-auto">
                                            {availableCheckpoints.map(checkpoint => (
                                                <div
                                                    key={checkpoint.id}
                                                    onClick={() => handleAddCheckpoint(checkpoint)}
                                                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Move className="w-4 h-4 text-gray-400" />
                                                        <div>
                                                            <div className="font-medium text-[#0f172a]">{checkpoint.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{checkpoint.nfcTagId}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {availableCheckpoints.length === 0 && (
                                                <div className="p-4 text-center text-gray-400 text-sm">
                                                    暂无可用巡检点
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Route Checkpoints */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <h5 className="text-sm font-medium text-gray-700">路线点位</h5>
                                            <span className="text-xs text-gray-500">{routeCheckpoints.length} 个</span>
                                        </div>
                                        <div className="border border-gray-200 rounded-lg max-h-[500px] overflow-y-auto">
                                            {routeCheckpoints.map((cp, index) => (
                                                <React.Fragment key={cp.id}>
                                                    {dragOverIndex === index && (
                                                        <div key={`insert-${index}`} className="h-1 bg-blue-500 border-l-4 border-blue-600 my-1"></div>
                                                    )}
                                                    <div
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('text/plain', index.toString());
                                                            setDragOverIndex(null);
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setDragOverIndex(index);
                                                        }}
                                                        onDragLeave={() => setDragOverIndex(null)}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                                            if (fromIndex !== index) {
                                                                handleReorderCheckpoint(fromIndex, index);
                                                            }
                                                            setDragOverIndex(null);
                                                        }}
                                                        className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-move"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
                                                                {index + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="font-medium text-[#0f172a]">{cp.checkpoint.name}</div>
                                                                <div className="text-xs text-gray-500 font-mono">{cp.checkpoint.nfcTagId}</div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveCheckpoint(cp.checkpointId)}
                                                                className="text-gray-400 hover:text-red-600"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                            {dragOverIndex === routeCheckpoints.length && routeCheckpoints.length > 0 && (
                                                <div className="h-1 bg-blue-500 border-l-4 border-blue-600 my-1"></div>
                                            )}
                                            {routeCheckpoints.length === 0 && (
                                                <div className="p-4 text-center text-gray-400 text-sm">
                                                    从左侧拖拽巡检点到此处
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setIsAdding(false);
                                        setEditingId(null);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => editingId ? handleEditRoute(editingId) : handleAddRoute()}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                                >
                                    {editingId ? '保存修改' : '创建路线'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
