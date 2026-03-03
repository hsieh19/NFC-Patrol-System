import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

/**
 * GET /api/admin/checkpoints/export?groupId=xxx&roleCode=xxx
 * 导出指定分组+角色的巡检点为 CSV
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const groupId = searchParams.get('groupId');
        const roleCode = searchParams.get('roleCode');

        if (!groupId || !roleCode) {
            return NextResponse.json({ error: '必须指定 groupId 和 roleCode' }, { status: 400 });
        }

        const checkpoints = await db.checkpoint.findMany({
            where: { groupId, roleCode },
            orderBy: { createdAt: 'asc' },
            include: { group: true, role: true }
        });

        // 生成 CSV
        const header = 'NFC标签ID,点位名称,物理位置';
        const rows = checkpoints.map(cp =>
            [
                cp.nfcTagId,
                cp.name,
                cp.location ?? ''
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
        );
        const csv = '\uFEFF' + [header, ...rows].join('\r\n');

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="checkpoints_export.csv"`
            }
        });
    } catch (error: unknown) {
        return createErrorResponse(error, 'Failed to export checkpoints');
    }
}

/**
 * POST /api/admin/checkpoints/export
 * 清空导入：先删除该分组+角色的所有点位，再批量写入 CSV 数据
 * Body: { groupId, roleCode, rows: [{nfcTagId, name, location}] }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { groupId, roleCode, rows } = body;

        if (!groupId || !roleCode || !Array.isArray(rows)) {
            return NextResponse.json({ error: '参数不完整' }, { status: 400 });
        }

        // 验证必填字段
        for (const row of rows) {
            if (!row.nfcTagId || !row.name) {
                return NextResponse.json({ error: `每行必须包含 NFC标签ID 和 点位名称` }, { status: 400 });
            }
        }

        // 事务：先删除，再批量创建
        await db.$transaction(async (tx) => {
            // 1. 删除该分组+角色的所有点位（级联安全：只影响所选分组+角色）
            await tx.checkpoint.deleteMany({ where: { groupId, roleCode } });

            // 2. 批量创建新点位
            if (rows.length > 0) {
                await tx.checkpoint.createMany({
                    data: rows.map((row: { nfcTagId: string; name: string; location?: string }) => ({
                        nfcTagId: row.nfcTagId,
                        name: row.name,
                        location: row.location || null,
                        groupId,
                        roleCode
                    }))
                });
            }
        });

        return NextResponse.json({ success: true, imported: rows.length });
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: '导入的数据中存在重复的 NFC 标签 ID，请检查后重试' }, { status: 400 });
        }
        return createErrorResponse(error, 'Failed to import checkpoints');
    }
}
