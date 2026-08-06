import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SYSTEM_CONSTANTS } from '@/lib/constants';

interface UploadRecordPayload {
  cardId: string;
  timestamp: number;
}

/**
 * 巡更棒打卡记录批量上传接口 (支持离线补传与对时)
 */
export async function POST(req: NextRequest) {
  try {
    const { wandUuid, records } = await req.json();

    if (!wandUuid) {
      return NextResponse.json({ error: 'Missing wandUuid' }, { status: 400 });
    }

    // 1. 校验 UUID 授权
    const wand = await db.patrolWand.findUnique({
      where: { uuid: wandUuid.trim() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!wand) {
      return NextResponse.json({ error: 'Unauthorized: Wand UUID not registered' }, { status: 401 });
    }

    // 2. 必须分配了具体巡更人员才可以进行打卡上传
    if (!wand.userId || !wand.user) {
      return NextResponse.json({ error: 'Forbidden: Wand is not assigned to any user' }, { status: 403 });
    }

    // 3. 隐式更新心跳在线时间
    await db.patrolWand.update({
      where: { id: wand.id },
      data: {
        lastSeen: new Date(),
      },
    });

    const results = {
      successCount: 0,
      failedCount: 0,
    };

    // 4. 批量处理打卡数据
    if (Array.isArray(records) && records.length > 0) {
      for (const record of records as UploadRecordPayload[]) {
        if (!record.cardId || !record.timestamp) {
          results.failedCount++;
          continue;
        }

        try {
          const cardId = record.cardId.trim();
          const timestamp = new Date(record.timestamp);

          // 幂等性 ID 防止重复上传 (由 UUID 与打卡时间戳结合)
          const offlineId = `${wand.uuid}-${record.timestamp}`;

          // 查询点位
          const checkpoint = await db.checkpoint.findUnique({
            where: { nfcTagId: cardId },
          });

          if (checkpoint) {
            // 写入正常打卡记录
            await db.patrolRecord.upsert({
              where: { offlineId },
              update: {},
              create: {
                checkpointId: checkpoint.id,
                checkpointName: checkpoint.name,
                checkpointLocation: checkpoint.location,
                userId: wand.userId,
                status: SYSTEM_CONSTANTS.PATROL_STATUS_NORMAL,
                notes: '巡更棒打卡',
                offlineId,
                createdAt: timestamp,
              },
            });
          } else {
            // 写入异常记录 (刷了未注册的卡号，方便管理员排查卡号录入问题)
            await db.patrolRecord.upsert({
              where: { offlineId },
              update: {},
              create: {
                checkpointId: null,
                checkpointName: '未知点位',
                checkpointLocation: '未知位置',
                userId: wand.userId,
                status: SYSTEM_CONSTANTS.PATROL_STATUS_ABNORMAL,
                notes: `巡更棒刷了未注册的卡号: ${cardId}`,
                offlineId,
                createdAt: timestamp,
              },
            });
          }
          results.successCount++;
        } catch (err) {
          console.error(`Failed to process record: ${record.cardId}`, err);
          results.failedCount++;
        }
      }
    }

    // 返回成功，带上最新的服务器时间、设备名称和工作模式以便对时与配置同步
    return NextResponse.json({
      success: true,
      serverTime: Date.now(),
      wandName: wand.name,
      cardType: wand.cardType,
      processed: results,
    });
  } catch (error: unknown) {
    console.error('Hardware upload API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
