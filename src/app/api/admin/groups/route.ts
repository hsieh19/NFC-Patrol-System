import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function GET() {
    try {
        const groups = await db.userGroup.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(groups);
    } catch (error: unknown) {
        return createErrorResponse(error, 'Failed to fetch groups');
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, description } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const group = await db.userGroup.create({
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
