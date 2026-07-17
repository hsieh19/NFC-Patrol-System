import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 一次 DB 查询获取用户，同时用于权限检查和数据过滤
    const user = await getAuthUser(req);
    if (!user || !user.role) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const permissions = JSON.parse(user.role.permissions || '[]') as string[];
    const hasAdminPerm = permissions.includes('ALL') || permissions.includes('ADMIN_SCHEDULE');
    const hasScanPerm = permissions.includes('ALL') || permissions.includes('APP_SCAN');

    if (!hasAdminPerm && !hasScanPerm) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const showArchived = searchParams.get('archived') === 'true';

    type WhereClause = {
      isArchived: boolean;
      groupId?: string;
    };
    const whereClause: WhereClause = { isArchived: showArchived };

    if (user.roleCode !== 'SUPER_ADMIN') {
      // Note: Plan.groupId is a required field, so we only filter by the user's group.
      // If the user has no group, they won't see any plans.
      whereClause.groupId = user.groupId || 'NON_EXISTENT';
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
