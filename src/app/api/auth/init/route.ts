import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';
import { SYSTEM_CONSTANTS } from '@/lib/constants';

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

    // 2. Seed system roles (using shared configuration)
    for (const role of SYSTEM_CONSTANTS.INITIAL_ROLES) {
      try {
        await db.role.upsert({
          where: { code: role.code },
          update: {
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            permissions: JSON.stringify(role.permissions)
          },
          create: {
            code: role.code,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            permissions: JSON.stringify(role.permissions)
          }
        });
      } catch (error) {
        console.error(`Error creating role ${role.code}:`, error);
      }
    }

    // Verify roles exist
    const existingRoles = await db.role.findMany();
    console.log('Existing roles:', existingRoles.map(r => r.code));

    // Check if SUPER_ADMIN role exists
    const superAdminRole = await db.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
    console.log('SUPER_ADMIN role exists:', !!superAdminRole);

    // 3. Transcations: Create admin and Mark as initialised
    await db.$transaction([
      db.user.create({
        data: {
          username,
          password: hashedPassword,
          name: '系统超级管理员',
          roleCode: 'SUPER_ADMIN',
          department: '技术中心'
        }
      }),
      db.systemConfig.upsert({
        where: { id: 1 },
        update: { isInitialised: true },
        create: { id: 1, isInitialised: true }
      })
    ]);

    return NextResponse.json({ success: true, message: 'System initialised successfully' });
  } catch (error: unknown) {
    console.error('Init API Error:', error);
    return createErrorResponse(error, 'Internal Server Error');
  }
}
