import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';

/**
 * Get all users for admin dashboard
 */
export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { group: true, role: true }
    });
    const safeUsers = users.map(user => {
      const clone = { ...user };
      delete clone.password;
      return clone;
    });
    return NextResponse.json(safeUsers);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch users');
  }
}

/**
 * Manually create/invite a user (Local Management)
 */
export async function POST(req: NextRequest) {
  try {
    const { username, name, roleCode, department, groupId, creatorId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let targetGroupId = groupId || null;
    const targetRoleCode = roleCode || 'OPERATOR';

    // Role-based logic
    if (creatorId) {
      const creator = await db.user.findUnique({
        where: { id: creatorId },
        include: { role: true }
      });

      if (creator) {
        if (creator.roleCode === 'ADMIN') {
          const allowedRoles = ['ADMIN', 'OPERATOR', 'SECURITY'];
          if (!allowedRoles.includes(targetRoleCode)) {
            return NextResponse.json({ error: '管理员无权分配此角色' }, { status: 403 });
          }
          // Same group as creator
          targetGroupId = creator.groupId;
        } else if (creator.roleCode !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: '无权新建人员' }, { status: 403 });
        }
      }
    }

    const defaultPassword = await bcrypt.hash('123456', 10);

    const user = await db.user.create({
      data: {
        username: username || `user_${Date.now()}`,
        password: defaultPassword,
        name,
        roleCode: targetRoleCode,
        department: department || '手动维护',
        groupId: targetGroupId,
      },
    });

    const createdUser = { ...user };
    delete createdUser.password;
    return NextResponse.json(createdUser);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Internal Server Error');
  }
}
