import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';
import { checkPermission, getAuthUser } from '@/lib/auth';

interface UserUpdatePayload {
    name: string;
    roleCode?: string;
    department?: string;
    groupId?: string | null;
    password?: string;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
        const { id } = await params;
        const { name, roleCode, department, groupId, password } = (await req.json()) as UserUpdatePayload;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const creator = await getAuthUser(req);

        // Fetch target user
        const targetUser = await db.user.findUnique({ where: { id } });
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Restrict based on creator's role
        let targetGroupId = groupId || null;
        if (creator?.roleCode === 'ADMIN') {
            if (targetUser.roleCode === 'SUPER_ADMIN' || (roleCode === 'SUPER_ADMIN')) {
                return NextResponse.json({ error: '管理员无权修改或赋予该最高角色' }, { status: 403 });
            }
            if (targetUser.groupId !== creator.groupId) {
                return NextResponse.json({ error: '无法跨组修改人员' }, { status: 403 });
            }
            // Force group id to be creator's group id
            targetGroupId = creator.groupId;
        }

        const xss = (await import('xss')).default;

        const data: Partial<UserUpdatePayload> & { name: string; roleCode: string; department: string; groupId: string | null } = {
            name: xss(name),
            roleCode: roleCode || 'OPERATOR',
            department: department ? xss(department) : '手动维护',
            groupId: targetGroupId,
        };

        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        const user = await db.user.update({
            where: { id },
            data,
        });

        const { password: _newPasswordHash, ...safeUser } = user;
        return NextResponse.json(safeUser);
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: '用户已存在' }, { status: 400 });
        }
        return createErrorResponse(error, 'Internal Server Error');
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await checkPermission(req, 'ADMIN_USER_MANAGE'))) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
        const { id } = await params;

        const creator = await getAuthUser(req);
        const targetUser = await db.user.findUnique({ where: { id } });

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (creator?.roleCode === 'ADMIN') {
            if (targetUser.roleCode === 'SUPER_ADMIN') {
                return NextResponse.json({ error: '无法删除超级管理员' }, { status: 403 });
            }
            if (targetUser.groupId !== creator.groupId) {
                return NextResponse.json({ error: '只能删除本组的人员' }, { status: 403 });
            }
        }

        await db.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: unknown) {
        return createErrorResponse(error, 'Failed to delete user');
    }
}
