import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;
        const user = await getAuthUser(req);

        // Allow if user can manage roles OR if user is asking for their OWN role
        const hasManagePerm = await checkPermission(req, 'ADMIN_ROLE_MANAGE');
        const isSelfRole = user?.roleCode === code;

        if (!hasManagePerm && !isSelfRole) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
        const role = await db.role.findUnique({
            where: { code },
            include: { _count: { select: { users: true } } }
        });

        if (!role) {
            return NextResponse.json({ error: '角色不存在' }, { status: 404 });
        }

        return NextResponse.json({
            ...role,
            permissions: JSON.parse(role.permissions || '[]'),
            allPermissions: ALL_PERMISSIONS,
        });
    } catch (error: unknown) {
        return createErrorResponse(error, 'Internal Server Error');
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        if (!(await checkPermission(req, 'ADMIN_ROLE_MANAGE'))) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
        const { code } = await params;

        // Prevent modifying system roles
        const existingRole = await db.role.findUnique({ where: { code } });
        if (!existingRole) {
            return NextResponse.json({ error: '角色不存在' }, { status: 404 });
        }
        if (existingRole.isSystem) {
            return NextResponse.json({ error: '系统预置角色不可修改' }, { status: 403 });
        }

        const { name, description, permissions } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const role = await db.role.update({
            where: { code },
            data: {
                name,
                description: description || '',
                permissions: Array.isArray(permissions) ? JSON.stringify(permissions) : (permissions || '[]'),
            },
        });

        return NextResponse.json(role);
    } catch (error: unknown) {
        return createErrorResponse(error, 'Internal Server Error');
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        if (!(await checkPermission(req, 'ADMIN_ROLE_MANAGE'))) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
        const { code } = await params;

        // Prevent deleting system roles
        const role = await db.role.findUnique({ where: { code } });
        if (!role) {
            return NextResponse.json({ error: '角色不存在' }, { status: 404 });
        }
        if (role.isSystem) {
            return NextResponse.json({ error: '系统预置角色不可删除' }, { status: 403 });
        }

        // Check if any users are using this role
        const userCount = await db.user.count({ where: { roleCode: code } });
        if (userCount > 0) {
            return NextResponse.json({ error: `该角色下仍有 ${userCount} 位用户，请先迁移后再删除` }, { status: 400 });
        }

        await db.role.delete({ where: { code } });
        return NextResponse.json({ success: true, message: 'Role deleted successfully' });
    } catch (error: unknown) {
        return createErrorResponse(error, 'Failed to delete role');
    }
}
