import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  try {
    const { id, nfcTagId, timestamp, userId, status, notes } = await req.json();

    if (!nfcTagId || !userId) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // 1. Find the checkpoint associated with this NFC Tag
    let checkpoint = await db.checkpoint.findUnique({
      where: { nfcTagId },
    });

    if (!checkpoint) {
      // 调试阶段：如果点位未登记，自动创建一个临时点位，防止同步阻塞
      checkpoint = await db.checkpoint.create({
        data: {
          nfcTagId,
          name: `新标签 (${nfcTagId.substring(0, 6)})`,
          location: "待配置地址",
        }
      });
      console.log(`[Testing] Auto-created checkpoint for: ${nfcTagId}`);
    }

    // 2. Ensure User exists (handle mock/unknown users during testing)
    let actualUserId = userId;
    const userExists = await db.user.findUnique({ where: { id: userId } });

    if (!userExists) {
      // Find the first admin or any user as fallback
      let adminUser = await db.user.findFirst({
        where: { roleCode: 'ADMIN' }
      });

      if (!adminUser) {
        adminUser = await db.user.create({
          data: {
            username: 'admin',
            name: 'admin',
            // Fallback default admin role Code
            roleCode: 'ADMIN',
          }
        });
      }
      actualUserId = adminUser.id;
    }

    // 3. Create the record with snapshots for history separation
    const record = await db.patrolRecord.upsert({
      where: { offlineId: id },
      update: {},
      create: {
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name, // 记录发生时的名称
        checkpointLocation: checkpoint.location, // 记录发生时的物理位置
        userId: actualUserId,
        status: status || 'NORMAL',
        notes: notes || '',
        offlineId: id,
        createdAt: new Date(timestamp),
      },
    });

    return NextResponse.json({ success: true, recordId: record.id });
  } catch (error: unknown) {
    console.error('Upload API Error:', error);
    return createErrorResponse(error, 'Internal Server Error');
  }
}
