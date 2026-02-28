import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

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
                data: [
                    {
                        code: 'SUPER_ADMIN',
                        name: '超级管理员',
                        description: '拥有所有权限的系统最高管理角色',
                        isSystem: true,
                        permissions: JSON.stringify(['ALL'])
                    },
                    {
                        code: 'ADMIN',
                        name: '管理员',
                        description: '管理人员及巡检配置，但不具备系统级配置权限',
                        isSystem: true,
                        permissions: JSON.stringify(['ADMIN_DASHBOARD', 'ADMIN_USER_MANAGE', 'ADMIN_CHECKPOINT', 'ADMIN_SCHEDULE', 'ADMIN_MONITOR', 'APP_SCAN', 'APP_REPAIR'])
                    },
                    {
                        code: 'OPERATOR',
                        name: '运维人员',
                        description: '负责设备维护与巡检执行',
                        isSystem: true,
                        permissions: JSON.stringify(['APP_SCAN', 'APP_REPAIR', 'ADMIN_MONITOR'])
                    },
                    {
                        code: 'SECURITY',
                        name: '保安人员',
                        description: '负责常规巡逻打卡',
                        isSystem: true,
                        permissions: JSON.stringify(['APP_SCAN'])
                    }
                ]
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
