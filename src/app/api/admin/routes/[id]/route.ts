import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    const { name, description, groupId, checkpoints } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Route name is required' }, { status: 400 });
    }

    // Update route
    const route = await db.route.update({
      where: { id: p.id },
      data: {
        name,
        description,
        groupId: groupId || null
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
