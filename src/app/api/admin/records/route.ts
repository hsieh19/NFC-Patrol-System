import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 一次 DB 查询获取用户，同时用于权限检查和数据过滤
    const currentUser = await getAuthUser(req);
    if (!currentUser || !currentUser.role) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const permissions = JSON.parse(currentUser.role.permissions || '[]') as string[];
    const hasMonitorPerm = permissions.includes('ALL') || permissions.includes('ADMIN_MONITOR');
    const hasScanPerm = permissions.includes('ALL') || permissions.includes('APP_SCAN');

    if (!hasMonitorPerm && !hasScanPerm) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    type WhereClause = {
      user?: { OR: Array<{ groupId: string | null }> };
    };
    let whereClause: WhereClause = {};
    if (currentUser.roleCode !== 'SUPER_ADMIN') {
      const gid = currentUser.groupId || null;
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
