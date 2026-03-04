import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const hasMonitorPerm = await checkPermission(req, 'ADMIN_MONITOR');
    const hasScanPerm = await checkPermission(req, 'APP_SCAN');

    if (!hasMonitorPerm && !hasScanPerm) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const currentUser = await getAuthUser(req);
    let whereClause: any = {};
    if (currentUser?.roleCode !== 'SUPER_ADMIN') {
      const gid = currentUser?.groupId || null;
      whereClause = {
        user: {
          OR: [
            { groupId: gid },
            { groupId: null }
          ]
        }
      };
    }

    const records = await db.patrolRecord.findMany({
      where: whereClause,
      include: {
        user: true,
        checkpoint: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
    return NextResponse.json(records);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch records');
  }
}
