import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { SYSTEM_CONSTANTS } from '@/lib/constants';

export async function GET() {
    try {
        let roles = await db.role.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        // Auto-seed system roles if not present
        if (roles.length === 0) {
            await db.role.createMany({
                data: SYSTEM_CONSTANTS.INITIAL_ROLES.map(role => ({
                    code: role.code,
                    name: role.name,
                    description: role.description,
                    isSystem: role.isSystem,
                    permissions: JSON.stringify(role.permissions)
                }))
            });
            roles = await db.role.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { users: true } }
                }
            });
        }

        return NextResponse.json(roles);
    } catch (error: unknown) {
        return createErrorResponse(error, 'Failed to fetch roles');
    }
}

export async function POST(req: NextRequest) {
    try {
        const { code, name, description, permissions } = await req.json();

        if (!code || !name) {
            return NextResponse.json({ error: 'Code and Name are required' }, { status: 400 });
        }

        // code must be uppercase English letters and underscores
        const safeCode = code.toUpperCase().replace(/[^A-Z0-9_]/g, '');

        const role = await db.role.create({
            data: {
                code: safeCode,
                name,
                description: description || '',
                permissions: permissions ? JSON.stringify(permissions) : "[]",
                isSystem: false,
            },
        });

        return NextResponse.json(role);
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: '角色编码已存在' }, { status: 400 });
        }
        return createErrorResponse(error, 'Internal Server Error');
    }
}
