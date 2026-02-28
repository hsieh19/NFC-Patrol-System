import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and Password are required' }, { status: 400 });
    }

    // 1. Check if already initialised
    const config = await db.systemConfig.findFirst();
    if (config?.isInitialised) {
      return NextResponse.json({ error: 'System already initialised' }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Seed system roles first (ignore if already exist)
    try {
      await db.role.createMany({
        data: [
          {
            code: 'SUPER_ADMIN',
            name: '超级管理员',
            description: '拥有所有权限的系统最高管理角色',
            isSystem: true,
            permissions: JSON.stringify(['ALL'])
          },
          {
            code: 'ADMIN',
            name: '管理员',
            description: '管理人员及巡检配置，但不具备系统级配置权限',
            isSystem: true,
            permissions: JSON.stringify(['ADMIN_DASHBOARD', 'ADMIN_USER_MANAGE', 'ADMIN_CHECKPOINT', 'ADMIN_SCHEDULE', 'ADMIN_MONITOR', 'APP_SCAN', 'APP_REPAIR'])
          },
          {
            code: 'OPERATOR',
            name: '运维人员',
            description: '负责设备维护与巡检执行',
            isSystem: true,
            permissions: JSON.stringify(['APP_SCAN', 'APP_REPAIR', 'ADMIN_MONITOR'])
          },
          {
            code: 'SECURITY',
            name: '保安人员',
            description: '负责常规巡逻打卡',
            isSystem: true,
            permissions: JSON.stringify(['APP_SCAN'])
          }
        ],
        skipDuplicates: true,
      });
    } catch {
    }

    // 3. Transcations: Create admin and Mark as initialised
    await db.$transaction([
      db.user.create({
        data: {
          username,
          password: hashedPassword,
          name: '系统超级管理员',
          roleCode: 'SUPER_ADMIN',
          department: '技术中心',
        },
      }),
      db.systemConfig.upsert({
        where: { id: 1 },
        update: { isInitialised: true },
        create: { id: 1, isInitialised: true },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'System initialised successfully' });
  } catch (error: unknown) {
    console.error('Init API Error:', error);
    return createErrorResponse(error, 'Internal Server Error');
  }
}
