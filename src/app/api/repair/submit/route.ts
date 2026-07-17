import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { SYSTEM_CONSTANTS } from '@/lib/constants';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { description, photo, userId: bodyUserId } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // 1. 优先从 token 中获取已认证用户（在线模式）；
    //    若无 token（离线同步场景），则使用请求体中的 userId 并校验其存在性。
    const authUser = await getAuthUser(req);
    let userId: string;

    if (authUser) {
      userId = authUser.id;
    } else if (bodyUserId) {
      // 离线同步：校验 userId 确实存在于数据库中
      const exists = await db.user.findUnique({ where: { id: bodyUserId } });
      if (!exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userId = bodyUserId;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Find the last checkpoint scanned by this user in the last X minutes to auto-locate
    const lastRecord = await db.patrolRecord.findFirst({
      where: {
        userId,
        createdAt: {
          gt: new Date(Date.now() - SYSTEM_CONSTANTS.REPAIR_AUTO_LOCATE_TIME_WINDOW_MS),
        },
      },
      include: { checkpoint: true },
      orderBy: { createdAt: 'desc' },
    });

    const checkpointId = lastRecord?.checkpoint?.id;

    // 3. Save to database
    // Note: 'photo' is a base64 string here. In production, upload to OSS and save URL.
    let cpId = checkpointId;
    if (!cpId || cpId === 'default_unknown_id') {
      const firstCp = await db.checkpoint.findFirst();
      if (firstCp) cpId = firstCp.id;
      else cpId = undefined;
    }

    const repair = await db.repairReport.create({
      data: {
        description,
        userId,
        checkpointId: cpId || undefined,
        imageUrls: photo ? SYSTEM_CONSTANTS.PLACEHOLDER_IMAGE_URL : '',
        status: SYSTEM_CONSTANTS.REPAIR_STATUS_PENDING,
      },
    });

    return NextResponse.json({ success: true, repairId: repair.id });
  } catch (error: unknown) {
    console.error('Repair API Error:', error);
    return createErrorResponse(error, 'Internal Server Error');
  }
}
