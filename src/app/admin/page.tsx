"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, MapPin, Calendar, Users, Route, LogOut, KeyRound, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import MonitorTab from "@/components/admin/MonitorTab";
import CheckpointTab from "@/components/admin/CheckpointTab";
import RouteTab from "@/components/admin/RouteTab";
import PlanTab from "@/components/admin/PlanTab";
import UserTab from "@/components/admin/UserTab";
import AssessmentTab from "@/components/admin/AssessmentTab";
import pkg from "../../../package.json";

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("monitor");
    const [currentTime, setCurrentTime] = useState<string>("");
    const [currentUser, setCurrentUser] = useState<{ id: string, username?: string, name: string, roleCode: string } | null>(null);
    const [roles, setRoles] = useState<{ code: string, name: string }[]>([]);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
    const [passwordLoading, setPasswordLoading] = useState(false);

    const accountRef = useRef<HTMLDivElement>(null);

    // 点击外部隐藏菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
                setIsAccountMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            const timeString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            setCurrentTime(timeString);
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);

        // 从 localStorage 获取当前登录用户
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const parsed = JSON.parse(userStr);
                // 兼容旧的 role 字段
                setCurrentUser({
                    ...parsed,
                    roleCode: parsed.roleCode || parsed.role
                });
            } catch (e) {
                console.error("Failed to parse user info", e);
            }
        }

        // 动态获取角色列表
        fetch("/api/admin/roles")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setRoles(data);
            })
            .catch(err => console.error("Failed to fetch roles", err));

        return () => clearInterval(timer);
    }, []);

    // 辅助函数：根据 roleCode 动态获取显示名称
    const getRoleDisplayName = (code: string) => {
        if (!code) return '未知角色';
        const role = roles.find(r => r.code === code.toUpperCase());
        return role ? role.name : code;
    };

    const handleLogout = () => {
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        localStorage.removeItem("user");
        router.push("/login");
        toast.success("已成功退出登录");
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("两次输入的新密码不一致");
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            toast.error("新密码长度不能少于 6 位");
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: currentUser?.id,
                    oldPassword: passwordForm.oldPassword,
                    newPassword: passwordForm.newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("密码修改成功");
                setIsPasswordModalOpen(false);
                setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                toast.error(data.error || "修改失败");
            }
        } catch (error) {
            toast.error("请求失败，请检查网络");
        } finally {
            setPasswordLoading(false);
        }
    };

    const menuItems = [
        { id: "monitor", icon: <Clock className="w-5 h-5" />, label: "实时监控" },
        { id: "config", icon: <MapPin className="w-5 h-5" />, label: "巡检点配置" },
        { id: "route", icon: <Route className="w-5 h-5" />, label: "路线配置" },
        { id: "plan", icon: <Calendar className="w-5 h-5" />, label: "计划配置" },
        { id: "assessment", icon: <Calendar className="w-5 h-5" />, label: "计划考核" },
        { id: "users", icon: <Users className="w-5 h-5" />, label: "权限管理" },
    ];

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-gray-900 font-sans overflow-hidden">
            {/* 左侧侧边栏 */}
            <div className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between shadow-sm z-10 flex-shrink-0">
                <div>
                    {/* 软件标题 */}
                    <div className="p-6 mb-2">
                        <div className="flex flex-col gap-0.5">
                            <h1 className="text-xl font-black tracking-tighter text-[#0f172a]">运维南区巡更系统</h1>
                            <p className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                系统版本 v{pkg.version}
                            </p>
                        </div>
                    </div>

                    {/* 菜单部分 */}
                    <div className="px-3 space-y-1">
                        {menuItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all font-semibold text-sm ${activeTab === item.id
                                    ? "bg-blue-50 text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 底部时间与账号 */}
                <div className="p-5 border-t border-gray-50 bg-gray-50/50">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-mono bg-white px-3 py-2.5 rounded-lg border border-gray-100 shadow-sm mb-4">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {currentTime || "获取时间中..."}
                    </div>

                    <div className="relative" ref={accountRef}>
                        {/* 账户操作弹出菜单 */}
                        {isAccountMenuOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                                <div
                                    onClick={() => {
                                        setIsPasswordModalOpen(true);
                                        setIsAccountMenuOpen(false);
                                    }}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-700 transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                        <KeyRound className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-bold flex-1">修改密码</span>
                                    <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />
                                </div>
                                <div
                                    onClick={handleLogout}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-50 cursor-pointer text-red-600 transition-colors group"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-100">
                                        <LogOut className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-bold flex-1">退出登录</span>
                                    <ChevronRight className="w-3 h-3 text-red-200 group-hover:text-red-300" />
                                </div>
                            </div>
                        )}

                        <div
                            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                            className={`flex items-center gap-3 p-2 -m-2 rounded-xl cursor-pointer transition-all ${isAccountMenuOpen ? 'bg-white shadow-sm ring-1 ring-gray-100' : 'hover:bg-gray-100/50'}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm relative">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="text-sm font-bold text-gray-700">
                                    {currentUser?.username || currentUser?.name || 'admin'}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {currentUser ? getRoleDisplayName(currentUser.roleCode) : '超级管理员'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 修改密码 Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 w-[400px] shadow-2xl scale-in-center">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                                <KeyRound className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">安全验证</h3>
                            <p className="text-sm text-gray-500 mt-1">定期修改密码有助于账号安全</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">当前密码</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.oldPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50"
                                    placeholder="请输入旧密码"
                                />
                            </div>
                            <div className="h-px bg-gray-100 my-2"></div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">新密码</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50"
                                    placeholder="建议含字母+数字"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">确认新密码</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50/50"
                                    placeholder="请再次输入"
                                />
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="flex-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                                >
                                    {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认修改"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 右侧内容区 */}
            <div className="flex-1 overflow-y-auto w-full">
                <div className="p-8 max-w-[1400px] mx-auto min-h-full">
                    {activeTab === "monitor" && <MonitorTab />}
                    {activeTab === "config" && <CheckpointTab />}
                    {activeTab === "users" && <UserTab />}
                    {activeTab === "route" && <RouteTab />}
                    {activeTab === "plan" && <PlanTab />}

                    {activeTab === "assessment" && <AssessmentTab />}
                </div>
            </div>
        </div>
    );
}
