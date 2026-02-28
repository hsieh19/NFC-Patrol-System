"use client";

import React, { useState } from "react";
import { Clock, MapPin, Calendar, Users, RefreshCw, Route } from "lucide-react";
import MonitorTab from "@/components/admin/MonitorTab";
import CheckpointTab from "@/components/admin/CheckpointTab";
import UserTab from "@/components/admin/UserTab";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("monitor");

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans pb-10">
            <div className="max-w-[1400px] mx-auto pt-8 px-6">

                {/* 顶部标题区 */}
                <div className="bg-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 mb-6">
                    <div className="mb-4 md:mb-0">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0f172a]">数字化巡更指挥中心</h1>
                        <p className="text-sm text-gray-500 mt-2 font-medium">实时监控、异常处置与全量审计</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-medium border border-blue-100">
                            <RefreshCw className="w-4 h-4 animate-spin-slow" />
                            <span>实时监控中</span>
                        </div>
                        <div className="text-sm text-gray-500 font-medium font-mono">
                            2026-02-27 17:17:45
                        </div>
                    </div>
                </div>

                {/* 导航标签区 */}
                <div className="flex bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.02)] border border-gray-100 mb-8 p-1.5 w-fit overflow-x-auto">
                    <div
                        onClick={() => setActiveTab("monitor")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg cursor-pointer transition-colors font-semibold text-sm whitespace-nowrap ${activeTab === "monitor" ? "bg-gray-50 text-[#0f172a]" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <Clock className="w-4 h-4" />
                        实时监控
                    </div>
                    <div
                        onClick={() => setActiveTab("config")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg cursor-pointer transition-colors font-semibold text-sm whitespace-nowrap ${activeTab === "config" ? "bg-gray-50 text-[#0f172a]" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <MapPin className="w-4 h-4" />
                        巡检点配置
                    </div>
                    <div
                        onClick={() => setActiveTab("route")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg cursor-pointer transition-colors font-semibold text-sm whitespace-nowrap ${activeTab === "route" ? "bg-gray-50 text-[#0f172a]" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <Route className="w-4 h-4" />
                        路线配置
                    </div>
                    <div
                        onClick={() => setActiveTab("plan")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg cursor-pointer transition-colors font-semibold text-sm whitespace-nowrap ${activeTab === "plan" ? "bg-gray-50 text-[#0f172a]" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <Calendar className="w-4 h-4" />
                        计划配置
                    </div>
                    <div
                        onClick={() => setActiveTab("users")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg cursor-pointer transition-colors font-semibold text-sm whitespace-nowrap ${activeTab === "users" ? "bg-gray-50 text-[#0f172a]" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <Users className="w-4 h-4" />
                        权限管理
                    </div>
                </div>

                {/* 内容区 */}
                {activeTab === "monitor" && <MonitorTab />}
                {activeTab === "config" && <CheckpointTab />}
                {activeTab === "users" && <UserTab />}

                {activeTab === "route" && (
                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">路线配置</h2>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                <Route className="w-4 h-4" /> 新建路线
                            </button>
                        </div>
                        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                            <Route className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-400 font-medium">巡检路线功能开发中...</p>
                        </div>
                    </div>
                )}

                {activeTab === "plan" && (
                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-[#0f172a] tracking-tight">计划配置</h2>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> 新建计划
                            </button>
                        </div>
                        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                            <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-400 font-medium">巡检计划功能开发中...</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
