"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function InitPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if already initialised
    axios.get("/api/auth/init/status").then(res => {
      if (res.data.isInitialised) {
        toast.error("系统已初始化，请直接登录");
        router.push("/login");
      }
      setChecking(false);
    });
  }, [router]);

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("密码长度至少需 6 位");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post("/api/auth/init", { username, password });
      toast.success("系统初始化成功！正在进入后台...");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "初始化失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-md w-full border-0 shadow-2xl rounded-3xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-white flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl font-black">系统部署初始化</CardTitle>
          <p className="text-blue-100 mt-2 text-sm">检测到系统首次启动，请设置初始管理员账户</p>
        </div>

        <form onSubmit={handleInit}>
          <CardContent className="p-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">超管用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="建议使用 admin"
                className="h-12 border-slate-200 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">设置管理密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="******"
                className="h-12 border-slate-200 rounded-xl"
                required
              />
              <p className="text-[10px] text-slate-400">请牢记此密码，用于 PC 端后台管理登录。</p>
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-0">
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 rounded-2xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? "正在初始化..." : "开启系统"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
