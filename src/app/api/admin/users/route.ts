import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

/**
 * Get all users for admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const currentUser = await getAuthUser(req);
    let whereClause: any = {};

    if (currentUser?.roleCode === 'ADMIN') {
      whereClause = {
        groupId: currentUser.groupId,
        roleCode: { not: 'SUPER_ADMIN' }
      };
    } else if (currentUser?.roleCode !== 'SUPER_ADMIN') {
      whereClause = {
        id: currentUser?.id // fallback if somehow they get here
      };
    }

    const users = await db.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { group: true, role: true }
    });
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
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
    if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    const { username, name, roleCode, department, groupId, creatorId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let targetGroupId = groupId || null;
    const targetRoleCode = roleCode || 'OPERATOR';

    // Role-based restrictive logic
    const creator = await getAuthUser(req);

    if (creator) {
      if (creator.roleCode === 'ADMIN') {
        const allowedRoles = ['OPERATOR', 'SECURITY'];
        if (!allowedRoles.includes(targetRoleCode)) {
          return NextResponse.json({ error: '管理员无权分配此角色' }, { status: 403 });
        }
        // Same group as creator
        targetGroupId = creator.groupId;
      } else if (creator.roleCode !== 'SUPER_ADMIN') {
        // This case would likely be caught by checkPermission above, but keeping for safety.
        return NextResponse.json({ error: '无权新建人员' }, { status: 403 });
      }
    }

    const xss = (await import('xss')).default;
    const initialPassword = process.env.DEFAULT_PASSWORD || '123456';
    const defaultPassword = await bcrypt.hash(initialPassword, 10);

    const user = await db.user.create({
      data: {
        username: username ? xss(username) : `user_${Date.now()}`,
        password: defaultPassword,
        name: xss(name),
        roleCode: targetRoleCode,
        department: department ? xss(department) : '手动维护',
        groupId: targetGroupId,
      },
    });

    const { password, ...createdUser } = user;
    return NextResponse.json(createdUser);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Internal Server Error');
  }
}
