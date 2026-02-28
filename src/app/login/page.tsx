"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!username || !password) {
            setError("请输入用户名和密码！");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/local/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // 写入简单 Cookie 用于中间件拦截验证
                document.cookie = `token=auth_${data.user.id}; path=/; max-age=86400`;

                // 存储用户信息供前端调用
                localStorage.setItem("user", JSON.stringify({
                    id: data.user.id,
                    name: data.user.name,
                    role: data.user.role
                }));

                router.push("/");
            } else {
                setError(data.error || "用户名或密码错误，请重试！");
            }
        } catch (err) {
            setError("登录请求异常，请检查网络模块！");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#111520] font-sans">
            <div className="w-full max-w-md p-8 md:p-12 bg-[#1a202c] border border-gray-800 rounded-2xl shadow-2xl flex flex-col gap-8 mx-4">

                {/* 标题 */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                        巡更系统
                    </h1>
                </div>

                {/* 登录表单 */}
                <form className="flex flex-col gap-6" onSubmit={handleLogin}>
                    {/* 用户名 */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-cyan-400 text-sm tracking-widest pl-1 font-semibold">
                            用户名
                        </Label>
                        <Input
                            type="text"
                            placeholder="如：admin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="h-12 bg-[#121826] border-gray-700 text-gray-200 placeholder:text-gray-500 focus-visible:border-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-500 transition-all rounded-lg"
                        />
                    </div>

                    {/* 密码 */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-cyan-400 text-sm tracking-widest pl-1 font-semibold">
                            密码
                        </Label>
                        <Input
                            type="password"
                            placeholder="请输入账号密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 bg-[#121826] border-gray-700 text-gray-200 placeholder:text-gray-500 focus-visible:border-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-500 transition-all rounded-lg"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded">
                            {error}
                        </div>
                    )}

                    {/* 登录按钮 */}
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-lg rounded-lg shadow-lg shadow-blue-900/50 transition-all tracking-widest border-none disabled:opacity-50"
                    >
                        {loading ? "登 录 中 ..." : "登 录"}
                    </Button>
                </form>



            </div>
        </div>
    );
}
