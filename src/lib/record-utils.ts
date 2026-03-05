import { db } from './db';
import { subMonths } from 'date-fns';

export async function fetchPatrolRecordsByDateRange(
    startDate: Date,
    endDate: Date,
    checkpointIds: string[],
    includeUser: boolean = false
) {
    const archiveThreshold = subMonths(new Date(), 6);
    let records: any[] = [];

    // 如果查询范围的结束时间大于等于归档阈值，说明需要查询主表
    if (endDate >= archiveThreshold) {
        const mainRecords = await db.patrolRecord.findMany({
            where: {
                createdAt: {
                    gte: startDate > archiveThreshold ? startDate : archiveThreshold,
                    lte: endDate
                },
                checkpointId: { in: checkpointIds }
            },
            include: includeUser ? { user: true } : undefined,
            orderBy: { createdAt: 'asc' }
        });
        records = [...records, ...mainRecords];
    }

    // 如果查询范围的开始时间小于归档阈值，说明需要查询归档表
    if (startDate < archiveThreshold) {
        const archiveRecords = await db.patrolRecordArchive.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate < archiveThreshold ? endDate : archiveThreshold
                },
                checkpointId: { in: checkpointIds }
            },
            include: includeUser ? { user: true } : undefined,
            orderBy: { createdAt: 'asc' }
        });
        records = [...records, ...archiveRecords];
    }

    // 重新排序合并后的记录
    records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return records;
}
