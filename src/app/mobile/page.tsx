"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Scan, ShieldAlert, FileText, Settings, Wifi, WifiOff, Search, RotateCw, MapPin, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { offlineDb } from "@/lib/offline-db";
import { useSync } from "@/hooks/use-sync";
import { toast } from "sonner";

export default function MobileHome() {
  const router = useRouter();
  const { isOnline, syncCount, isSyncing, syncData } = useSync();
  const [isScanning, setIsScanning] = useState(false);
  const [roles, setRoles] = useState<{ code: string, name: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string, username?: string, name: string, roleCode: string } | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [targetVoice, setTargetVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  // 加载语音包列表，并尝试恢复用户上次选择
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      setAllVoices(voices);

      // 先检查用户是否有保存的首选 (格式: "name|||lang")
      const savedKey = localStorage.getItem("preferredVoice");
      if (savedKey) {
        const [savedName, savedLang] = savedKey.split("|||");
        const saved = voices.find(v => v.name === savedName && (!savedLang || v.lang === savedLang));
        if (saved) {
          setTargetVoice(saved);
          return; // 找到了就不继续自动筛选
        }
      }

      // 没有保存记录时，自动尝试猜测女声 (会被用户选择覆盖)
      const zhTW = voices.find(v => v.lang.toLowerCase().includes("zh-tw"));
      if (zhTW) setTargetVoice(zhTW);
    };

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);

  useEffect(() => {
    // 从 localStorage 获取当前登录用户
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setCurrentUser({
          ...parsed,
          roleCode: parsed.roleCode || parsed.role
        });
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }

    // 获取角色列表以便显示名称
    fetch("/api/admin/roles")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRoles(data);
          // 如果已经有用户信息，获取当前角色的具体权限
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const parsed = JSON.parse(userStr);
            const roleCode = parsed.roleCode || parsed.role;
            if (roleCode) {
              fetch(`/api/admin/roles/${roleCode.toUpperCase()}`)
                .then(r => r.json())
                .then(roleData => {
                  if (roleData && roleData.permissions) {
                    setPermissions(Array.isArray(roleData.permissions) ? roleData.permissions : []);
                  }
                })
                .catch(err => console.error("Failed to fetch role permissions", err));
            }
          }
        }
      })
      .catch(err => console.error("Failed to fetch roles", err));

    // 自动启动 NFC 扫描
    let abortController: AbortController | null = new AbortController();
    let isMounted = true;

    const autoStartNFC = async () => {
      if (!("NDEFReader" in window)) return;

      try {
        const ndef = new (window as any).NDEFReader();
        // 只有当 controller 还存在且未被 abort 时才执行
        if (abortController) {
          await ndef.scan({ signal: abortController.signal });
          if (isMounted) setIsScanning(true);

          ndef.addEventListener("reading", async ({ serialNumber }: any) => {
            if (isMounted) handleNFCReading(serialNumber);
          });

          ndef.addEventListener("readingerror", () => {
            if (isMounted) toast.error("读取 NFC 失败，请重试");
          });
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("NFC Auto-scan failed:", error);
      }
    };

    autoStartNFC();

    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
    };
  }, []);

  const getRoleDisplayName = (code: string) => {
    if (!code) return '未知角色';
    const role = roles.find(r => r.code === code.toUpperCase());
    return role ? role.name : code;
  };

  const hasPermission = (perm: string) => {
    return permissions.includes("ALL") || permissions.includes(perm);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    // 清除名为 token 的 cookie
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.replace("/login");
    toast.success("已成功退出登录");
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // 移动端安全：先停止之前的播放，但保留微小延迟避免阻塞
    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 1.0;
      utterance.pitch = 1.15; // 提高音调，增加成熟女性特征
      utterance.volume = 1.0;

      // 如果当前没有 targetVoice，实时尝试再找一次
      let voice: SpeechSynthesisVoice | null = targetVoice;
      if (!voice) {
        const voices = window.speechSynthesis.getVoices();
        const isFemale = (v: SpeechSynthesisVoice) => {
          const name = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          if (name.includes("xiaoxiao") || name.includes("yating")) return true;
          if (name.includes("female") || name.includes("女")) return true;
          if (name.includes("cmn-tw") || lang.includes("zh-tw")) return true;
          if (name.includes("cmn-cn-x-cce") || name.includes("cmn-cn-x-cca")) return true;
          return false;
        };
        voice = voices.find(isFemale) ||
          voices.find(v => v.lang.includes("zh") && !v.name.toLowerCase().includes("male") && !v.name.toLowerCase().includes("ccd")) ||
          null;
      }

      if (voice) {
        utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const handleNFCReading = async (tagId: string) => {
    try {
      // 0. 获取用户信息
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const userRoleCode = (user.roleCode || user.role || "").toUpperCase();
      const userGroupId = user.groupId;

      // 1. 获取所有计划并查找当前匹配的计划
      const planRes = await fetch("/api/admin/schedules");
      if (!planRes.ok) throw new Error("获取计划失败");
      const allPlans = await planRes.json();

      const now = new Date();
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      let latestReason = "";
      const activePlan = allPlans.find((plan: any) => {
        const pRole = (plan.roleCode || "").trim().toUpperCase();
        const uRole = (userRoleCode || "").trim().toUpperCase();
        const pGroup = (plan.groupId || "").trim();
        const uGroup = (userGroupId || "").trim();

        const matchesRole = pRole === uRole;
        const matchesGroup = !pGroup || pGroup === uGroup;

        if (!matchesRole) {
          latestReason = `角色不匹配 (计划要求: ${pRole}, 您是: ${uRole})`;
          return false;
        }
        if (!matchesGroup) {
          latestReason = `分组不匹配 (计划分组: ${pGroup}, 您是: ${uGroup})`;
          return false;
        }

        const start = plan.startTime;
        const end = plan.endTime;
        const isTimeMatch = start <= end
          ? (nowStr >= start && nowStr <= end)
          : (nowStr >= start || nowStr <= end);

        if (!isTimeMatch) {
          latestReason = `不在时间段 (要求: ${start}-${end}, 当前: ${nowStr})`;
          return false;
        }

        return true;
      });

      if (!activePlan) {
        const reasonText = latestReason || `未匹配到巡检计划`;
        speak(`无效打卡，${reasonText}`);
        toast.error("未找到有效巡检计划", {
          description: reasonText,
          duration: 5000
        });
        return;
      }

      // 2. 获取路线并校验点位
      const routeRes = await fetch(`/api/admin/routes/${activePlan.routeId}`);
      if (!routeRes.ok) throw new Error("获取路线失败");
      const routeDetail = await routeRes.json();
      const validCheckpoint = routeDetail.checkpoints?.find((rc: any) => rc.checkpoint.nfcTagId === tagId);

      if (!validCheckpoint) {
        speak("无效打卡，标签不属于当前巡检任务");
        toast.error("非法操作：标签不属于当前巡检任务", {
          description: `标签 ID: ${tagId}`
        });
        if ("vibrate" in navigator) navigator.vibrate([100, 50, 100, 50, 300]);
        return;
      }

      // 2.5 检查是否在当前计划时段内已打卡 (防止重复录入)
      const todayStr = format(now, "yyyy-MM-dd");
      // 计算当前计划在今天的起始时间毫秒数 (处理跨天逻辑暂简：仅检查今天起始)
      const planStartTime = new Date(`${todayStr}T${activePlan.startTime}`).getTime();

      const alreadyChecked = await offlineDb.patrolRecords
        .where("checkpointId")
        .equals(validCheckpoint.checkpoint.id)
        .filter(r => r.timestamp >= planStartTime)
        .first();

      if (alreadyChecked) {
        speak("重复打卡");
        toast.warning("请勿重复打卡", {
          description: `${validCheckpoint.checkpoint.name} 已在当前时段完成巡检`,
        });
        if ("vibrate" in navigator) navigator.vibrate([400]);
        return;
      }

      // 3. 执行打卡 (优先尝试实时上传，失败则转离线)
      const timestamp = Date.now();
      let synced = 0;

      if (navigator.onLine) {
        try {
          // 实时上传尝试 (3秒超时)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const uploadRes = await fetch("/api/patrol/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nfcTagId: tagId,
              timestamp,
              userId: user.id || user.username,
              status: "NORMAL"
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          if (uploadRes.ok) {
            synced = 1;
          }
        } catch (err) {
          console.warn("实时上传失败，切换至离线模式", err);
        }
      }

      // 无论是否成功上传，都保存到本地数据库 (synced 状态不同)
      await offlineDb.patrolRecords.add({
        checkpointId: validCheckpoint.checkpoint.id,
        nfcTagId: tagId,
        timestamp,
        status: "NORMAL",
        synced,
      });

      // 如果是离线保存，触发一次后台同步尝试
      if (synced === 0 && navigator.onLine) {
        syncData();
      }

      // 成功反馈
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);

      speak("打卡成功");
      toast.success(`打卡成功：${validCheckpoint.checkpoint.name}`, {
        description: `位置：${validCheckpoint.checkpoint.location || '已记录'}`
      });

    } catch (error) {
      console.error(error);
      toast.error("处理感应信息失败");
    }
  };

  const startNFCScan = async () => {
    if (!("NDEFReader" in window)) {
      toast.error("您的浏览器或设备不支持 NFC 功能", {
        description: "请使用支持 NFC 的安卓设备并确保在 HTTPS 环境下访问"
      });
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      setIsScanning(true);
      toast.success("NFC 自动感应已开启", { description: "靠近标签即可自动打卡" });
      ndef.onreading = (event: any) => handleNFCReading(event.serialNumber);
      ndef.onreadingerror = () => toast.error("读取 NFC 失败，请重试");
    } catch (error) {
      console.error("NFC Scan Error:", error);
      toast.error("启动 NFC 失败", { description: "请确保已授予权限并重试" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans">
      <header className="bg-white dark:bg-zinc-900 shadow-sm flex flex-col transition-colors">
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">巡更系统</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {isOnline ? (
                <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-wider">
                  <Wifi className="w-3 h-3" /> 在线模式
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                  <WifiOff className="w-3 h-3" /> 离线保护中
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
              {currentUser?.name || currentUser?.username || '用户'}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
              {currentUser ? getRoleDisplayName(currentUser.roleCode) : '超级管理员'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-6 w-full max-w-md mx-auto mt-6">
        <div
          onClick={!isScanning ? startNFCScan : undefined}
          className={`relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-xl flex flex-col items-center justify-center gap-6 cursor-pointer transition-all border border-gray-100 dark:border-zinc-800 ${isScanning ? "scale-95 opacity-80" : "hover:shadow-2xl active:scale-95"
            }`}
        >
          {isScanning && (
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border-4 border-blue-500/20 animate-ping"></div>
            </div>
          )}

          <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${isScanning ? "bg-blue-600 shadow-xl shadow-blue-200" : "bg-blue-50 dark:bg-blue-900/20"
            }`}>
            <Scan className={`w-14 h-14 ${isScanning ? "text-white" : "text-blue-600 dark:text-blue-400"}`} />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {isScanning ? "正在感应 NFC..." : "NFC 极速打卡"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => router.push("/mobile/repair")}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm flex flex-col items-center gap-3 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors border border-gray-100 dark:border-zinc-800 active:scale-95 group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
              <ShieldAlert className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">异常报修</span>
          </div>

          <div
            onClick={() => router.push("/mobile/history")}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm flex flex-col items-center gap-3 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors border border-gray-100 dark:border-zinc-800 active:scale-95 group"
          >
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:bg-green-500 transition-colors">
              <FileText className="w-6 h-6 text-green-500 group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">巡更任务</span>
          </div>

          <div
            onClick={handleLogout}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm flex items-center justify-center gap-3 col-span-2 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors border border-gray-100 dark:border-zinc-800 active:scale-95 group"
          >
            <LogOut className="w-5 h-5 text-rose-500" />
            <span className="text-sm font-medium text-rose-500">退出当前账号</span>
          </div>

          {hasPermission("ADMIN_CHECKPOINT") && (
            <div
              onClick={() => router.push("/mobile/config")}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm flex items-center justify-center gap-3 col-span-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-100 dark:border-zinc-800 active:scale-95"
            >
              <MapPin className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">巡检点配置</span>
            </div>
          )}
        </div>

        {syncCount > 0 && (
          <div className="bg-blue-600 text-white p-3 rounded-xl flex items-center justify-between text-xs font-bold animate-bounce shadow-lg shadow-blue-200">
            <span>有 {syncCount} 条数据待同步...</span>
            <button
              onClick={syncData}
              disabled={isSyncing}
              className="bg-white text-blue-600 px-3 py-1 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSyncing ? "同步中..." : "现在同步"}
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-[10px] text-gray-400 uppercase tracking-[0.2em]">
          Powered by NFC-Patrol-System Digital Command
        </div>

        {/* 语音选择器 */}
        <div className="mt-2">
          <button
            onClick={() => setShowVoicePicker(p => !p)}
            className="w-full flex items-center justify-center gap-2 text-[11px] text-gray-400 py-1.5 hover:text-gray-600 transition-colors"
          >
            <span className="text-base">🔊</span>
            <span>语音播报设置 {targetVoice ? `· 当前: ${targetVoice.name}` : '· 未设置'}</span>
          </button>

          {showVoicePicker && (
            <div className="mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 shadow-lg">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">选择语音包</h3>
              <p className="text-[10px] text-gray-400 mb-3">点击即试听，选中后自动保存</p>
              <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                {allVoices.filter(v => v.lang.toLowerCase().includes('zh') || v.lang.toLowerCase().includes('cn')).map((v) => {
                  const isSelected = targetVoice?.name === v.name && targetVoice?.lang === v.lang;
                  return (
                    <button
                      key={`${v.name}-${v.lang}`}
                      onClick={() => {
                        setTargetVoice(v);
                        localStorage.setItem('preferredVoice', `${v.name}|||${v.lang}`);
                        // 立即试听
                        window.speechSynthesis.cancel();
                        const u = new SpeechSynthesisUtterance('正常打卡，欢迎使用巡更系统');
                        u.voice = v;
                        u.lang = 'zh-CN';
                        u.pitch = 1.15;
                        u.rate = 1.0;
                        window.speechSynthesis.speak(u);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-zinc-700'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{v.name}</span>
                        <span className={`text-[10px] font-normal ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                          {v.lang} {isSelected && '✔'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowVoicePicker(false)}
                className="mt-3 w-full text-xs text-gray-400 py-1"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
