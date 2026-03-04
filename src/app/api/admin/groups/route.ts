import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const hasManagePerm = await checkPermission(req, 'ADMIN_GROUP_MANAGE');
        const user = await getAuthUser(req);

        let whereClause = {};

        if (!hasManagePerm) {
            // 如果没有管理权限，但是是登录用户（比如普通 ADMIN）
            // 只允许他看到自己所属的分组
            if (user && user.groupId) {
                whereClause = { id: user.groupId };
            } else {
                return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
            }
        }

        const groups = await db.userGroup.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(groups);
    } catch (error: unknown) {
        return createErrorResponse(error, 'Failed to fetch groups');
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!(await checkPermission(req, 'ADMIN_GROUP_MANAGE'))) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
        const { name, description } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const xss = (await import('xss')).default;
        const group = await db.userGroup.create({
            data: {
                name: xss(name),
                description: description ? xss(description) : '',
            },
        });

        return NextResponse.json(group);
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'Group name already exists' }, { status: 400 });
        }
        return createErrorResponse(error, 'Internal Server Error');
    }
}
