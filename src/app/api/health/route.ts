import { NextResponse } from 'next/server';
import { runAutoArchive } from '@/lib/cron-archive';

export async function GET() {
    // 异步执行静默清洗：不会阻塞健康检查本身的响应
    runAutoArchive().catch(console.error);

    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
