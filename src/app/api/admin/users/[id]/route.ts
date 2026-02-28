import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';

interface UserUpdatePayload {
    name: string;
    roleCode?: string;
    department?: string;
    groupId?: string | null;
    password?: string;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { name, roleCode, department, groupId, password } = (await req.json()) as UserUpdatePayload;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const data: Partial<UserUpdatePayload> & { name: string; roleCode: string; department: string; groupId: string | null } = {
            name,
            roleCode: roleCode || 'OPERATOR',
            department: department || '手动维护',
            groupId: groupId || null,
        };

        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        const user = await db.user.update({
            where: { id },
            data,
        });

        const { password, ...safeUser } = user;
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
        const { id } = await params;

        await db.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: unknown) {
        return createErrorResponse(error, 'Failed to delete user');
    }
}
