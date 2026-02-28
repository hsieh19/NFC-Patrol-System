import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const { id } = await params;
        const { name, description } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const group = await db.userGroup.update({
            where: { id },
            data: {
                name,
                description: description || '',
            },
        });

        return NextResponse.json(group);
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: '分组名称已存在' }, { status: 400 });
        }
        return createErrorResponse(error, 'Internal Server Error');
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
        const { id } = await params;

        await db.userGroup.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'Group deleted successfully' });
    } catch (error: unknown) {
        return createErrorResponse(error, 'Failed to delete group');
    }
}
