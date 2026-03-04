import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { parse, format, addDays, eachDayOfInterval, differenceInCalendarDays } from 'date-fns';
import { checkPermission } from '@/lib/auth';

/**
 * GET /api/admin/assessment/export
 * 导出考核结果为 CSV
 * 参数：startDate, endDate, groupId, roleCode
 */
export async function GET(req: NextRequest) {
    try {
        if (!(await checkPermission(req, 'ADMIN_SCHEDULE'))) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
        const { searchParams } = new URL(req.url);
        const startDateStr = searchParams.get('startDate') || format(new Date(), 'yyyy-MM-dd');
        const endDateStr = searchParams.get('endDate') || startDateStr;
        const groupId = searchParams.get('groupId') || '';
        const roleCode = searchParams.get('roleCode') || '';

        const startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
        const endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());

        if (differenceInCalendarDays(endDate, startDate) > 31 || endDate < startDate) {
            return NextResponse.json({ error: '日期范围不合法，最长支持31天' }, { status: 400 });
        }

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        // 查询计划（按分组+角色过滤）
        const planWhere: Record<string, string> = {};
        if (groupId) planWhere.groupId = groupId;
        if (roleCode) planWhere.roleCode = roleCode;

        const plans = await db.plan.findMany({
            where: planWhere,
            include: {
                group: true,
                role: true,
                route: {
                    include: {
                        checkpoints: {
                            include: { checkpoint: true },
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });

        if (plans.length === 0) {
            return NextResponse.json({ error: '所选范围内没有巡检计划' }, { status: 404 });
        }

        // 批量拉取范围内所有打卡记录
        const rangeStart = new Date(startDate);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);

        const allCheckpointIds = [...new Set(plans.flatMap(p => p.route.checkpoints.map(cp => cp.checkpointId)))];
        const allRecords = await db.patrolRecord.findMany({
            where: {
                createdAt: { gte: rangeStart, lte: rangeEnd },
                checkpointId: { in: allCheckpointIds }
            },
            include: { user: true },
            orderBy: { createdAt: 'asc' }
        });

        // 优化缓存：防止 O(N*P*D)
        const recordsByCheckpoint: Record<string, typeof allRecords> = {};
        for (const r of allRecords) {
            if (!r.checkpointId) continue;
            if (!recordsByCheckpoint[r.checkpointId]) {
                recordsByCheckpoint[r.checkpointId] = [];
            }
            recordsByCheckpoint[r.checkpointId].push(r);
        }

        // CSV 构建
        const escapeCSV = (v: string | null | undefined) =>
            `"${String(v ?? '').replace(/"/g, '""')}"`;

        const csvRows: string[] = [];

        // 标题
        const planTypes = [...new Set(plans.map(p => p.planType === 'ORDERED' ? '有序计划' : '无序计划'))].join('+');
        csvRows.push(`\uFEFF${escapeCSV(planTypes + '考核报告')}`);
        csvRows.push('');
        csvRows.push(`,,,,,,${escapeCSV('导出时间：' + format(new Date(), 'yyyy-MM-dd HH:mm:ss'))}`);
        csvRows.push('');

        // 表头
        csvRows.push(['开始时间', '结束时间', '路线名称', '巡检点', '巡检时间', '巡检人', '考核结果']
            .map(escapeCSV).join(','));

        // 数据行：按天 × 计划 × 巡检点
        for (const day of days) {
            for (const plan of plans) {
                const [startH, startM] = plan.startTime.split(':').map(Number);
                const [endH, endM] = plan.endTime.split(':').map(Number);

                const planStart = new Date(day);
                planStart.setHours(startH, startM, 0, 0);

                let planEnd = new Date(day);
                planEnd.setHours(endH, endM, 0, 0);
                if (planEnd <= planStart) planEnd = addDays(planEnd, 1);

                const planStartStr = format(planStart, 'yyyy-MM-dd HH:mm:ss');
                const planEndStr = format(planEnd, 'yyyy-MM-dd HH:mm:ss');

                const planCheckpointIds = plan.route.checkpoints.map(cp => cp.checkpointId);

                // 每个巡检点一行
                for (const rcp of plan.route.checkpoints) {
                    const cpRecords = recordsByCheckpoint[rcp.checkpointId] || [];
                    const record = cpRecords.find(r => r.createdAt >= planStart && r.createdAt <= planEnd);

                    const visitedAtStr = record ? format(record.createdAt, 'yyyy-MM-dd HH:mm:ss') : '';
                    const patrollerName = record?.user?.name ?? '';

                    let result = '未到';
                    if (record) {
                        const diffMin = (record.createdAt.getTime() - planStart.getTime()) / 60000;
                        result = diffMin <= (differenceInCalendarDays(planEnd, planStart) * 24 * 60) ? '准时' : '迟到';
                    }

                    csvRows.push([
                        planStartStr,
                        planEndStr,
                        plan.route.name,
                        rcp.checkpoint.name,
                        visitedAtStr,
                        patrollerName,
                        result
                    ].map(escapeCSV).join(','));
                }
            }
        }

        const csv = csvRows.join('\r\n');
        const groupName = plans[0]?.group?.name || groupId;
        const roleName = plans[0]?.role?.name || roleCode;
        const filename = `考核结果_${groupName}_${roleName}_${startDateStr}${startDateStr !== endDateStr ? '至' + endDateStr : ''}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
            }
        });
    } catch (error: unknown) {
        console.error('Assessment export error:', error);
        return createErrorResponse(error, 'Failed to export assessment');
    }
}
