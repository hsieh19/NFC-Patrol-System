import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hasAdminPerm = await checkPermission(req, 'ADMIN_CHECKPOINT');
    const hasScanPerm = await checkPermission(req, 'APP_SCAN');

    if (!hasAdminPerm && !hasScanPerm) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const p = await params;
    const route = await db.route.findUnique({
      where: { id: p.id },
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

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const user = await getAuthUser(req);
    // 强制组级隔离 (如果用户不是超级管理员，且该路线有分配组，且组并不匹配用户的组)
    if (user?.roleCode !== 'SUPER_ADMIN' && route.groupId && route.groupId !== user?.groupId) {
      return NextResponse.json({ error: '无权访问跨组路线数据' }, { status: 403 });
    }

    return NextResponse.json(route);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch route');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkPermission(req, 'ADMIN_CHECKPOINT'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const p = await params;
    const { name, description, groupId, roleCode, checkpoints } = await req.json();

    if (!name || !groupId || !roleCode) {
      return NextResponse.json({ error: 'Route name, Group ID and Role Code are required' }, { status: 400 });
    }

    const xss = (await import('xss')).default;
    // Update route
    const route = await db.route.update({
      where: { id: p.id },
      data: {
        name: xss(name),
        description: description ? xss(description) : null,
        groupId,
        roleCode
      }
    });

    // Update checkpoints
    if (checkpoints && Array.isArray(checkpoints)) {
      // Delete existing checkpoints
      await db.routeCheckpoint.deleteMany({
        where: { routeId: p.id }
      });

      // Create new checkpoints
      await db.routeCheckpoint.createMany({
        data: checkpoints.map((cp: any, index: number) => ({
          routeId: p.id,
          checkpointId: cp.checkpointId,
          order: index
        }))
      });
    }

    // Fetch updated route with checkpoints
    const updatedRoute = await db.route.findUnique({
      where: { id: p.id },
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

    return NextResponse.json(updatedRoute);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to update route');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkPermission(req, 'ADMIN_CHECKPOINT'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const p = await params;

    // Delete associated route checkpoints
    await db.routeCheckpoint.deleteMany({
      where: { routeId: p.id }
    });

    // Delete associated plans
    await db.plan.deleteMany({
      where: { routeId: p.id }
    });

    // Delete the route
    await db.route.delete({
      where: { id: p.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to delete route');
  }
}
