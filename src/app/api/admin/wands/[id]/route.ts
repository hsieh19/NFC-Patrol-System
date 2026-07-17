import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/auth';

/**
 * 更新巡更棒信息 (编辑/分配人员/解绑)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { id } = await params;
    const { uuid, name, cardType, userId } = await req.json();

    if (!uuid || !name) {
      return NextResponse.json({ error: 'UUID 和设备名称必填' }, { status: 400 });
    }

    const targetWand = await db.patrolWand.findUnique({
      where: { id },
    });
    if (!targetWand) {
      return NextResponse.json({ error: '设备未找到' }, { status: 404 });
    }

    const actualUuid = uuid.trim();
    const actualCardType = cardType === 'ID' ? 'ID' : 'IC';
    const targetUserId = userId || null;

    // 校验 UUID 是否被其它设备占用
    const duplicatedWand = await db.patrolWand.findFirst({
      where: {
        uuid: actualUuid,
        id: { not: id },
      },
    });
    if (duplicatedWand) {
      return NextResponse.json({ error: '该 UUID 已经被其它设备占用' }, { status: 400 });
    }

    // 若指派了人员，保证一对一唯一性（将该人员原先绑定的巡更棒解绑）
    if (targetUserId) {
      await db.patrolWand.updateMany({
        where: {
          userId: targetUserId,
          id: { not: id },
        },
        data: { userId: null },
      });
    }

    const updatedWand = await db.patrolWand.update({
      where: { id },
      data: {
        uuid: actualUuid,
        name,
        cardType: actualCardType,
        userId: targetUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(updatedWand);
  } catch (error: unknown) {
    console.error('Update wand error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * 注销并删除巡更棒
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { id } = await params;

    const targetWand = await db.patrolWand.findUnique({
      where: { id },
    });
    if (!targetWand) {
      return NextResponse.json({ error: '设备未找到' }, { status: 404 });
    }

    await db.patrolWand.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Wand deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete wand error:', error);
    return NextResponse.json({ error: 'Failed to delete wand' }, { status: 500 });
  }
}

/**
 * 局部更新巡更棒信息 (如标记远程唤醒)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const targetWand = await db.patrolWand.findUnique({
      where: { id },
    });
    if (!targetWand) {
      return NextResponse.json({ error: '设备未找到' }, { status: 404 });
    }

    const dataToUpdate: { shouldWakeServer?: boolean } = {};
    if (typeof body.shouldWakeServer === 'boolean') {
      dataToUpdate.shouldWakeServer = body.shouldWakeServer;
    }

    const updatedWand = await db.patrolWand.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedWand);
  } catch (error: unknown) {
    console.error('Patch wand error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
