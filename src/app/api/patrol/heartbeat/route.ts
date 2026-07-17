import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * 巡更棒心跳与授时接口
 */
export async function POST(req: NextRequest) {
  try {
    const { wandUuid, ipAddress } = await req.json();

    if (!wandUuid) {
      return NextResponse.json({ error: 'Missing wandUuid' }, { status: 400 });
    }

    // 校验 UUID 授权
    const wand = await db.patrolWand.findUnique({
      where: { uuid: wandUuid.trim() },
    });

    if (!wand) {
      return NextResponse.json({ error: 'Unauthorized: Wand UUID not registered' }, { status: 401 });
    }

    // 更新设备最新 IP 和在线时间，若需要唤醒则同时重置该标志
    const dataToUpdate: {
      ipAddress: string | null;
      lastSeen: Date;
      shouldWakeServer?: boolean;
    } = {
      ipAddress: ipAddress || null,
      lastSeen: new Date(),
    };
    if (wand.shouldWakeServer) {
      dataToUpdate.shouldWakeServer = false;
    }

    await db.patrolWand.update({
      where: { id: wand.id },
      data: dataToUpdate,
    });

    // 返回成功对时信息、设备名称、读卡工作模式和唤醒指令
    return NextResponse.json({
      success: true,
      serverTime: Date.now(),
      wandName: wand.name,
      cardType: wand.cardType,
      shouldWakeServer: wand.shouldWakeServer,
    });
  } catch (error: unknown) {
    console.error('Heartbeat API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
