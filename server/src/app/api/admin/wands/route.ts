import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/auth';
import crypto from 'crypto';

/**
 * 获取所有已注册的巡更棒列表
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const wands = await db.patrolWand.findMany({
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(wands);
  } catch (error: unknown) {
    console.error('Fetch wands error:', error);
    return NextResponse.json({ error: 'Failed to fetch wands' }, { status: 500 });
  }
}

/**
 * 注册一个新的巡更棒
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { uuid, name, cardType, userId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: '设备名称必填' }, { status: 400 });
    }

    const actualUuid = uuid ? uuid.trim() : crypto.randomUUID();
    const actualCardType = cardType === 'ID' ? 'ID' : 'IC';
    const targetUserId = userId || null;

    // 校验 UUID 唯一性
    const existingWand = await db.patrolWand.findUnique({
      where: { uuid: actualUuid },
    });
    if (existingWand) {
      return NextResponse.json({ error: '该 UUID 已经被占用' }, { status: 400 });
    }

    // 若指派了人员，保证一对一唯一性（将该人员原先绑定的巡更棒解绑）
    if (targetUserId) {
      await db.patrolWand.updateMany({
        where: { userId: targetUserId },
        data: { userId: null },
      });
    }

    const wand = await db.patrolWand.create({
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

    return NextResponse.json(wand);
  } catch (error: unknown) {
    console.error('Create wand error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
