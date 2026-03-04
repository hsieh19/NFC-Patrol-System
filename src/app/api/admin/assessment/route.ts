import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';
import { addDays, parse, format, differenceInCalendarDays, eachDayOfInterval } from 'date-fns';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const dateParam = searchParams.get('date');
        const startDateStr = searchParams.get('startDate') || dateParam || format(new Date(), 'yyyy-MM-dd');
        const endDateStr = searchParams.get('endDate') || dateParam || format(new Date(), 'yyyy-MM-dd');

        const startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
        const endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());

        if (differenceInCalendarDays(endDate, startDate) > 31 || endDate < startDate) {
            return NextResponse.json({ error: '日期范围不合法，最长支持31天' }, { status: 400 });
        }

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        // 获取所有计划（含已归档，确保历史考核数据不丢失）
        const plans = await db.plan.findMany({
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

        // 批量拉取范围内所有相关巡检记录（整个范围一次性查询）
        const allCheckpointIds = [...new Set(plans.flatMap(p => p.route.checkpoints.map(cp => cp.checkpointId)))];
        const rangeWindowStart = new Date(startDate);
        rangeWindowStart.setHours(0, 0, 0, 0);
        const rangeWindowEnd = new Date(endDate);
        rangeWindowEnd.setHours(23, 59, 59, 999);

        const allRecords = await db.patrolRecord.findMany({
            where: {
                createdAt: { gte: rangeWindowStart, lte: rangeWindowEnd },
                checkpointId: { in: allCheckpointIds }
            },
            orderBy: { createdAt: 'asc' }
        });

        // 优化：按 checkpointId 预先分组记录，将原先 O(N*P*D) 的过滤复杂度降至 O(N + P*D*C)
        const recordsByCheckpoint: Record<string, typeof allRecords> = {};
        for (const r of allRecords) {
            if (!r.checkpointId) continue;
            if (!recordsByCheckpoint[r.checkpointId]) {
                recordsByCheckpoint[r.checkpointId] = [];
            }
            recordsByCheckpoint[r.checkpointId].push(r);
        }

        const now = new Date();

        // 每个计划 × 每一天 = 一条考核记录
        const assessmentResults = [];

        for (const plan of plans) {
            const [startH, startM] = plan.startTime.split(':').map(Number);
            const [endH, endM] = plan.endTime.split(':').map(Number);
            const planCheckpointIds = plan.route.checkpoints.map(cp => cp.checkpointId);

            for (const day of days) {
                const planStart = new Date(day);
                planStart.setHours(startH, startM, 0, 0);

                let planEnd = new Date(day);
                planEnd.setHours(endH, endM, 0, 0);
                if (planEnd < planStart) {
                    planEnd = addDays(planEnd, 1);
                }

                const checkpointCount = planCheckpointIds.length;
                let visitedCount = 0;

                // 巡检点明细
                const checkpoints = plan.route.checkpoints.map(rcp => {
                    const cpRecords = recordsByCheckpoint[rcp.checkpointId] || [];
                    // 获取在该时间段内的所有记录打卡
                    const validRecords = cpRecords.filter(r => r.createdAt >= planStart && r.createdAt <= planEnd);
                    const record = validRecords[0]; // 默认取第一条作为状态展示

                    if (record) {
                        visitedCount++;
                    }

                    return {
                        checkpointId: rcp.checkpointId,
                        name: rcp.checkpoint.name,
                        order: rcp.order,
                        isvisited: !!record,
                        visitCount: validRecords.length,
                        visitedAt: record ? record.createdAt : null,
                        status: record ? 'NORMAL' : 'MISSING'
                    };
                });

                const progress = checkpointCount > 0 ? Math.round((visitedCount / checkpointCount) * 100) : 0;

                // 状态判定
                let status: string;
                if (visitedCount >= checkpointCount) {
                    status = 'COMPLETED';
                } else if (now > planEnd) {
                    status = 'FAILED';
                } else if (visitedCount > 0) {
                    status = 'IN_PROGRESS';
                } else if (now >= planStart && now <= planEnd) {
                    status = 'PENDING';
                } else {
                    status = 'NOT_STARTED';
                }

                assessmentResults.push({
                    id: `${plan.id}_${format(day, 'yyyy-MM-dd')}`,
                    planId: plan.id,
                    planName: plan.name,
                    date: format(day, 'yyyy-MM-dd'),
                    routeId: plan.route.id,
                    routeName: plan.route.name,
                    groupName: plan.group.name,
                    roleName: plan.role.name,
                    startTime: plan.startTime,
                    endTime: plan.endTime,
                    planType: plan.planType,
                    stats: {
                        total: checkpointCount,
                        visited: visitedCount,
                        progress
                    },
                    status,
                    checkpoints
                });
            }
        }

        return NextResponse.json(assessmentResults);
    } catch (error: unknown) {
        console.error('Assessment API Error:', error);
        return createErrorResponse(error, 'Failed to fetch assessment data');
    }
}
