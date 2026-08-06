import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    if (!(await checkPermission(req, 'ADMIN_CHECKPOINT'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const user = await getAuthUser(req);
    let whereClause = {};
    if (user?.roleCode === 'ADMIN') {
      whereClause = { groupId: user.groupId };
    }

    const routes = await db.route.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        group: true,
        role: true,
        checkpoints: {
          include: {
            checkpoint: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });
    return NextResponse.json(routes);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch routes');
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await checkPermission(req, 'ADMIN_CHECKPOINT'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const body = await req.json();
    const { name, description, groupId, roleCode, checkpoints } = body;

    if (!name || !groupId || !roleCode) {
      return NextResponse.json({ error: 'Route name, Group ID and Role Code are required' }, { status: 400 });
    }

    const xss = (await import('xss')).default;

    const route = await db.route.create({
      data: {
        name: xss(name),
        description: description ? xss(description) : null,
        groupId,
        roleCode,
        checkpoints: checkpoints ? {
          create: checkpoints.map((cp: any, index: number) => ({
            checkpointId: cp.checkpointId,
            order: index
          }))
        } : undefined
      },
      include: {
        group: true,
        role: true,
        checkpoints: {
          include: {
            checkpoint: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(route);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to create route');
  }
}
