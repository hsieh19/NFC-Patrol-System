import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const hasAdminPerm = await checkPermission(req, 'ADMIN_SCHEDULE');
    const hasScanPerm = await checkPermission(req, 'APP_SCAN');

    if (!hasAdminPerm && !hasScanPerm) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const showArchived = searchParams.get('archived') === 'true';

    const user = await getAuthUser(req);
    let whereClause: any = { isArchived: showArchived };
    if (user?.roleCode !== 'SUPER_ADMIN') {
      const gid = user?.groupId || null;
      // 允许读取没有分配分组的系统级通用计划 (如果系统有这类计划)
      whereClause = {
        isArchived: showArchived,
        OR: [
          { groupId: gid },
          { groupId: null }
        ]
      };
    }

    const schedules = await db.plan.findMany({
      where: whereClause,
      include: { route: true, group: true, role: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(schedules);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch schedules');
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await checkPermission(req, 'ADMIN_SCHEDULE'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const body = await req.json();
    const { name, routeId, startTime, endTime, planType, groupId, roleCode, frequency } = body;

    if (!name || !routeId || !startTime || !endTime || !groupId || !roleCode) {
      return NextResponse.json({ error: 'Name, Route ID, Start Time, End Time, Group ID and Role Code are required' }, { status: 400 });
    }

    const xss = (await import('xss')).default;

    const schedule = await db.plan.create({
      data: {
        name: xss(name),
        routeId,
        startTime,
        endTime,
        planType: planType || 'ORDERED',
        frequency: frequency || 'DAILY',
        groupId,
        roleCode
      },
      include: {
        route: true,
        group: true,
        role: true
      }
    });

    return NextResponse.json(schedule);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to create schedule');
  }
}
