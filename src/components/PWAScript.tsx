"use client";

import { useEffect } from "react";

export default function PWAScript() {
    useEffect(() => {
        // --- 临时修复 Next.js 16 Turbopack 性能监测 Bug ---
        if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
            const originalMeasure = window.performance.measure.bind(window.performance);
            (window.performance as any).measure = function (name: string, startMark: any, endMark: any) {
                try {
                    return originalMeasure(name, startMark, endMark);
                } catch (e) {
                    return undefined;
                }
            };
        }

        // --- PWA Service Worker 注册 ---
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("✅ PWA Service Worker Active:", registration.scope);
                })
                .catch((error) => {
                    console.error("❌ PWA Service Worker Registration Failed:", error);
                });
        }
    }, []);

    return null;
}
