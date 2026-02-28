import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "内网巡更系统 - 移动端",
  description: "纯本地内网巡更打卡与异常提报系统",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <main className="max-w-md mx-auto min-h-screen flex flex-col">
        {children}
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
