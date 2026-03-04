import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    const body = await req.json();

    // 还原归档计划
    if (body.restore === true) {
      const schedule = await db.plan.update({
        where: { id: p.id },
        data: { isArchived: false, archivedAt: null },
        include: { route: true, group: true, role: true }
      });
      return NextResponse.json(schedule);
    }

    // 正常编辑
    const { name, routeId, startTime, endTime, planType, groupId, roleCode, frequency } = body;
    if (!name || !routeId || !startTime || !endTime || !groupId || !roleCode) {
      return NextResponse.json({ error: 'Name, Route ID, Start Time, End Time, Group ID and Role Code are required' }, { status: 400 });
    }

    const schedule = await db.plan.update({
      where: { id: p.id },
      data: {
        name, routeId, startTime, endTime,
        planType: planType || 'ORDERED',
        frequency: frequency || 'DAILY',
        groupId, roleCode
      },
      include: { route: true, group: true, role: true }
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
    const { searchParams } = new URL(req.url);
    const isPermanent = searchParams.get('permanent') === 'true';

    if (isPermanent) {
      // 永久物理删除（仅归档管理中可触发）
      await db.plan.delete({ where: { id: p.id } });
      return NextResponse.json({ success: true, message: '已永久删除' });
    }

    // 软删除：归档，保留历史数据
    await db.plan.update({
      where: { id: p.id },
      data: { isArchived: true, archivedAt: new Date() }
    });
    return NextResponse.json({ success: true, message: '已归档' });
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to delete schedule');
  }
}