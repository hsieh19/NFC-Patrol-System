"use client";

import React, { useState } from "react";
import { Camera, ChevronLeft, Send, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { offlineDb } from "@/lib/offline-db";

export default function RepairPage() {
    const router = useRouter();
    const [description, setDescription] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!description) return;
        setSubmitting(true);

        try {
            // 先保存到本地离线库
            await offlineDb.repairReports.add({
                description,
                imageUrls: images,
                timestamp: Date.now(),
                synced: 0
            });

            // 尝试同步到服务器（如果可以的话）
            try {
                const storedUser = localStorage.getItem("user");
                const userId = storedUser ? JSON.parse(storedUser).id : "guest_user";

                const res = await fetch("/api/repair/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        description,
                        photo: images[0] || "",
                        userId: userId
                    }),
                });
                if (res.ok) {
                    // 如果成功，标记为已同步 (这里简化逻辑，实际可以用 background sync)
                }
            } catch (e) {
                console.log("Offline mode: saved to local db");
            }

            setSuccess(true);
            setTimeout(() => router.push("/mobile"), 2000);
        } catch (error) {
            console.error("Submit error:", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">提交成功</h2>
                <p className="text-gray-500 mt-2">异常情况已记录，系统将自动进行飞书推送。</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="px-4 py-4 bg-white shadow-sm flex items-center gap-4">
                <button onClick={() => router.back()} className="p-1">
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">异常报修</h1>
            </header>

            <main className="flex-1 p-4 flex flex-col gap-6 max-w-md mx-auto w-full">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">异常描述</label>
                    <textarea
                        className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-colors text-sm"
                        placeholder="请描述发现的问题，如：设备破损、漏水、门窗未锁等..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">现场拍照</label>
                    <div className="grid grid-cols-3 gap-3">
                        {images.map((img, i) => (
                            <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-100 relative">
                                <img src={img} alt="preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                                >
                                    <ChevronLeft className="w-3 h-3 rotate-45" />
                                </button>
                            </div>
                        ))}
                        <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                            <Camera className="w-6 h-6 text-gray-400" />
                            <span className="text-[10px] text-gray-400 mt-1">添加图片</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!description || submitting}
                    className={`mt-4 w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-lg ${!description || submitting ? "bg-gray-300 shadow-none" : "bg-orange-500 hover:bg-orange-600 active:scale-95 shadow-orange-200"
                        }`}
                >
                    <Send className="w-5 h-5" />
                    {submitting ? "提交中..." : "一键提报"}
                </button>
            </main>
        </div>
    );
}
