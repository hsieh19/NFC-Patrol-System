import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    const { name, routeId, startTime, endTime, planType, groupId, roleCode } = await req.json();

    if (!name || !routeId || !startTime || !endTime || !groupId || !roleCode) {
      return NextResponse.json({ error: 'Name, Route ID, Start Time, End Time, Group ID and Role Code are required' }, { status: 400 });
    }

    const schedule = await db.plan.update({
      where: { id: p.id },
      data: {
        name,
        routeId,
        startTime,
        endTime,
        planType: planType || 'ORDERED',
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
    return createErrorResponse(error, 'Failed to update schedule');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    await db.plan.delete({
      where: { id: p.id }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to delete schedule');
  }
}