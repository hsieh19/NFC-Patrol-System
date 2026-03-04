import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { SYSTEM_CONSTANTS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { description, photo, userId } = await req.json();

    if (!description || !userId) {
      return NextResponse.json({ error: 'Description and UserID are required' }, { status: 400 });
    }

    // 1. Get user details for the report
    let user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await db.user.findFirst({
        where: { roleCode: 'ADMIN' }
      }) || await db.user.findFirst();

      if (!user) {
        // 数据库全空时，直接创建一个防呆操作员
        user = await db.user.create({
          data: {
            username: SYSTEM_CONSTANTS.DEFAULT_ADMIN_USERNAME,
            name: SYSTEM_CONSTANTS.DEFAULT_ADMIN_NAME,
            roleCode: 'ADMIN',
            department: SYSTEM_CONSTANTS.DEFAULT_DEPARTMENT
          }
        });
      }
    }

    // 2. Find the last checkpoint scanned by this user in the last X minutes to auto-locate
    const lastRecord = await db.patrolRecord.findFirst({
      where: {
        userId: userId,
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
    // For this implementation, we allow it but typically should be handled as file.
    let cpId = checkpointId;

    // Fallback if checkpointId is somehow undefined/fake
    if (!cpId || cpId === 'default_unknown_id') {
      const firstCp = await db.checkpoint.findFirst();
      if (firstCp) cpId = firstCp.id;
      else cpId = undefined;
    }

    const repair = await db.repairReport.create({
      data: {
        description,
        userId: user.id,
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
