"use client";

import React, { useEffect, useState } from "react";
import { UserPlus, User as UserIcon } from "lucide-react";
import { ALL_PERMISSIONS } from "@/lib/permissions";

interface User {
    id: string;
    username: string;
    name: string;
    roleCode: string;
    role?: { code: string, name: string } | null;
    department: string | null;
    groupId?: string | null;
    group?: { id: string, name: string } | null;
}

interface Group {
    id: string;
    name: string;
    description: string | null;
    _count?: {
        users: number;
    };
}

interface Role {
    code: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    _count?: {
        users: number;
    };
}

interface CurrentUserInfo {
    id: string;
    name: string;
    role: string;
}

export default function UserTab() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState("groups");

    const [groups, setGroups] = useState<Group[]>([]);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupForm, setGroupForm] = useState({ name: "", description: "" });

    const [roles, setRoles] = useState<Role[]>([]);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [roleForm, setRoleForm] = useState({ code: "", name: "", description: "" });

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userForm, setUserForm] = useState({ username: "", name: "", roleCode: "OPERATOR", groupId: "", password: "" });
    const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) setCurrentUser(JSON.parse(userData));
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
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
            setRoles(data);
        } catch (error) {
            console.error("Failed to fetch roles:", error);
        }
    };

    const handleSaveUser = async () => {
        if (!userForm.name) return;
        try {
            const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
            const method = editingUser ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...userForm, creatorId: currentUser?.id }),
            });
            if (res.ok) {
                setIsUserModalOpen(false);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || "保存失败");
            }
        } catch (error) {
            console.error("Save user error:", error);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("确定要删除此人吗？")) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
            if (res.ok) fetchUsers();
        } catch (error) {
            console.error("Delete user error:", error);
        }
    };

    const [rolePermissions, setRolePermissions] = useState<string[]>([]);

    const handleSaveRole = async () => {
        if (!roleForm.name || !roleForm.code) return;
        try {
            const url = editingRole ? `/api/admin/roles/${editingRole.code}` : "/api/admin/roles";
            const method = editingRole ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...roleForm, permissions: rolePermissions }),
            });
            if (res.ok) {
                setIsRoleModalOpen(false);
                fetchRoles();
            } else {
                const data = await res.json();
                alert(data.error || "保存失败");
            }
        } catch (error) {
            console.error("Save role error:", error);
        }
    };

    const handleDeleteRole = async (code: string) => {
        if (!confirm("确定要删除此角色吗？")) return;
        try {
            const res = await fetch(`/api/admin/roles/${code}`, { method: "DELETE" });
            if (res.ok) {
                fetchRoles();
            } else {
                const data = await res.json();
                alert(data.error || "删除失败");
            }
        } catch (error) {
            console.error("Delete role error:", error);
        }
    };

    const handleEditRole = async (role: Role) => {
        setEditingRole(role);
        setRoleForm({ code: role.code, name: role.name, description: role.description || "" });
        // Fetch full permissions for this role
        try {
            const res = await fetch(`/api/admin/roles/${role.code}`);
            const data = await res.json();
            setRolePermissions(Array.isArray(data.permissions) ? data.permissions : []);
        } catch {
            setRolePermissions([]);
        }
        setIsRoleModalOpen(true);
    };

    const handleSaveGroup = async () => {
        if (!groupForm.name) return;
        try {
            const url = editingGroup ? `/api/admin/groups/${editingGroup.id}` : "/api/admin/groups";
            const method = editingGroup ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(groupForm),
            });
            if (res.ok) {
                setIsGroupModalOpen(false);
                fetchGroups();
            } else {
                const data = await res.json();
                alert(data.error || "保存失败");
            }
        } catch (error) {
            console.error("Save error:", error);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("确定要删除此分组吗？")) return;
        try {
            const res = await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
            if (res.ok) fetchGroups();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchGroups();
        fetchRoles();
    }, []);

    if (loading) return <div className="py-20 text-center">加载中...</div>;

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-8">
                    <h2
                        onClick={() => setSubTab("groups")}
                        className={`text-lg font-bold tracking-tight cursor-pointer transition-colors relative ${subTab === "groups" ? "text-[#0f172a]" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        分组管理
                        {subTab === "groups" && <span className="absolute -bottom-[18px] left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
                    </h2>
                    <h2
                        onClick={() => setSubTab("roles")}
                        className={`text-lg font-bold tracking-tight cursor-pointer transition-colors relative ${subTab === "roles" ? "text-[#0f172a]" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        角色管理
                        {subTab === "roles" && <span className="absolute -bottom-[18px] left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
                    </h2>
                    <h2
                        onClick={() => setSubTab("users")}
                        className={`text-lg font-bold tracking-tight cursor-pointer transition-colors relative ${subTab === "users" ? "text-[#0f172a]" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        人员管理
                        {subTab === "users" && <span className="absolute -bottom-[18px] left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
                    </h2>
                </div>
                {subTab === "users" && (
                    <button
                        onClick={() => {
                            setEditingUser(null);
                            // Pre-fill group if current user is ADMIN
                            const userData = localStorage.getItem("user");
                            let initialGroupId = "";
                            if (userData) {
                                const parsed = JSON.parse(userData);
                                if (parsed.role === 'ADMIN') {
                                    // Try to find current user's group from the user list
                                    const me = users.find(u => u.id === parsed.id);
                                    if (me) initialGroupId = me.groupId || "";
                                }
                            }
                            setUserForm({ username: "", name: "", roleCode: "OPERATOR", groupId: initialGroupId, password: "" });
                            setIsUserModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        新建人员
                    </button>
                )}
                {subTab === "groups" && (
                    <button
                        onClick={() => {
                            setEditingGroup(null);
                            setGroupForm({ name: "", description: "" });
                            setIsGroupModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        新建分组
                    </button>
                )}
                {subTab === "roles" && (
                    <button
                        onClick={() => {
                            setEditingRole(null);
                            setRoleForm({ code: "", name: "", description: "" });
                            setIsRoleModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        新建角色
                    </button>
                )}
            </div>

            {subTab === "users" && (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500">用户名</th>
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500">角色</th>
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500">分组</th>
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <UserIcon className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-[#0f172a]">{user.username} <span className="text-xs text-gray-400 ml-1">({user.name})</span></span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider 
                                            ${user.roleCode === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700' :
                                                user.roleCode === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-gray-100 text-gray-600'}`}>
                                            {user.role?.name || user.roleCode || '未知角色'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-600">
                                        {user.group?.name || user.department || "未分类"}
                                    </td>
                                    <td className="py-4 px-6 text-right space-x-3">
                                        <button
                                            onClick={() => {
                                                setEditingUser(user);
                                                setUserForm({
                                                    username: user.username,
                                                    name: user.name,
                                                    roleCode: user.roleCode,
                                                    groupId: user.groupId || "",
                                                    password: ""
                                                });
                                                setIsUserModalOpen(true);
                                            }}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            删除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-400 font-medium">
                                        暂无人员记录
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {subTab === "roles" && (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500">角色编码</th>
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500">角色名称</th>
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500">描述</th>
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500">人数</th>
                                <th className="py-4 px-6 font-semibold text-sm text-gray-500 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((role) => (
                                <tr key={role.code} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{role.code}</span>
                                    </td>
                                    <td className="py-4 px-6 font-medium text-[#0f172a]">
                                        <div className="flex items-center gap-2">
                                            {role.name}
                                            {role.isSystem && (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">系统</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-500 truncate max-w-[200px]">
                                        {role.description || "暂无描述"}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {role._count?.users || 0} 人
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right space-x-3">
                                        <button
                                            onClick={() => handleEditRole(role)}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            编辑
                                        </button>
                                        {!role.isSystem && (
                                            <button
                                                onClick={() => handleDeleteRole(role.code)}
                                                className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                                            >
                                                删除
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {roles.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
                                        暂无角色数据
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {subTab === "groups" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <div key={group.id} className="border border-gray-100 rounded-xl p-5 hover:border-blue-200 transition-all hover:shadow-md bg-zinc-50/50 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-[#0f172a] text-lg">{group.name}</h3>
                                <p className="text-sm text-gray-500 mt-2">{group.description || "暂无描述"}</p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {group._count?.users || 0} 名成员
                                </span>
                                <div className="flex gap-3 text-sm">
                                    <button
                                        onClick={() => {
                                            setEditingGroup(group);
                                            setGroupForm({ name: group.name, description: group.description || "" });
                                            setIsGroupModalOpen(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        编辑
                                    </button>
                                    <button
                                        onClick={() => handleDeleteGroup(group.id)}
                                        className="text-red-500 hover:text-red-700 font-medium"
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
                            <p className="text-gray-400 font-medium">暂无分组数据，点击右上角新建</p>
                        </div>
                    )}
                </div>
            )}

            {/* 编辑/新建分组 Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl scale-in-center">
                        <h3 className="text-xl font-bold mb-4">{editingGroup ? '编辑分组' : '新建分组'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">分组名称</label>
                                <input
                                    type="text"
                                    value={groupForm.name}
                                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                                    placeholder="如：安保一部"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">分组描述</label>
                                <textarea
                                    value={groupForm.description}
                                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors h-24"
                                    placeholder="选填"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsGroupModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveGroup}
                                disabled={!groupForm.name}
                                className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 编辑/新建人员 Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl scale-in-center">
                        <h3 className="text-xl font-bold mb-4">{editingUser ? '编辑人员' : '新建人员'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">登录账号</label>
                                <input
                                    type="text"
                                    value={userForm.username}
                                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                                    placeholder="选填自动生成"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">真实姓名</label>
                                <input
                                    type="text"
                                    value={userForm.name}
                                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                                    placeholder="必填"
                                />
                            </div>
                            {editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">重置密码 (留空不改)</label>
                                    <input
                                        type="password"
                                        value={userForm.password}
                                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                                        placeholder="新密码（默认：123456）"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                                <select
                                    value={userForm.roleCode}
                                    onChange={(e) => setUserForm({ ...userForm, roleCode: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors bg-white"
                                >
                                    {roles
                                        .filter(r => {
                                            if (currentUser?.role === 'ADMIN') {
                                                return ['ADMIN', 'OPERATOR', 'SECURITY'].includes(r.code);
                                            }
                                            return true; // Super admins see all
                                        })
                                        .map(r => (
                                            <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                                        ))
                                    }
                                    {roles.length === 0 && (
                                        <>
                                            <option value="OPERATOR">操作员 (APP打卡)</option>
                                            <option value="ADMIN">管理员 (电脑后台)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">所属分组</label>
                                <select
                                    value={userForm.groupId}
                                    onChange={(e) => setUserForm({ ...userForm, groupId: e.target.value })}
                                    disabled={currentUser?.role === 'ADMIN'}
                                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors bg-white ${currentUser?.role === 'ADMIN' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    <option value="">-- 未分类 (无分组) --</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                {currentUser?.role === 'ADMIN' && (
                                    <p className="text-[10px] text-gray-400 mt-1">* 管理员无法跨分组建立人员，其所属分组锁定为您的当前分组。</p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveUser}
                                disabled={!userForm.name}
                                className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 编辑/新建角色 Modal */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-[480px] shadow-2xl scale-in-center max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">{editingRole ? '编辑角色' : '新建角色'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">角色编码</label>
                                <input
                                    type="text"
                                    value={roleForm.code}
                                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors font-mono"
                                    placeholder="如：INSPECTOR（大写英文）"
                                    disabled={!!editingRole}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
                                <input
                                    type="text"
                                    value={roleForm.name}
                                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                                    placeholder="如：巡检主管"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                                <textarea
                                    value={roleForm.description}
                                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors h-20"
                                    placeholder="选填"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">权限配置</label>
                                <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50 max-h-[250px] overflow-y-auto">
                                    {ALL_PERMISSIONS.map((perm) => (
                                        <label
                                            key={perm.key}
                                            className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={rolePermissions.includes(perm.key)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setRolePermissions([...rolePermissions, perm.key]);
                                                    } else {
                                                        setRolePermissions(rolePermissions.filter(p => p !== perm.key));
                                                    }
                                                }}
                                                className="w-4 h-4 accent-blue-600 rounded"
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{perm.key}</span>
                                                <span className="text-sm text-gray-700">{perm.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsRoleModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveRole}
                                disabled={!roleForm.name || !roleForm.code}
                                className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
