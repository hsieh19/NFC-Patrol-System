import { db } from './db';
import { subMonths } from 'date-fns';

// 内存锁，防止并发和频繁触发
let isArchiving = false;
let lastArchiveTime = 0;

export async function runAutoArchive() {
    const now = Date.now();
    // 每天最多执行1次检查 (24小时冷却)，或者服务器重启时执行1次
    if (isArchiving || (now - lastArchiveTime < 24 * 60 * 60 * 1000 && lastArchiveTime !== 0)) {
        return;
    }

    try {
        isArchiving = true;
        // 定义归档阈值：6个月以前
        const archiveThreshold = subMonths(new Date(), 6);
        let totalArchived = 0;

        while (true) {
            // 每次最多处理 1000 条，防止在海量数据下锁表或导致内存溢出
            const oldRecords = await db.patrolRecord.findMany({
                where: { createdAt: { lt: archiveThreshold } },
                take: 1000,
                orderBy: { createdAt: 'asc' }
            });

            if (oldRecords.length === 0) {
                break; // 没有需要归档的数据了，退出循环
            }

            // 使用事务保证迁移的原子性（强一致性）
            await db.$transaction(async (tx) => {
                // 1. 将数据完整复制进历史归档表
                await tx.patrolRecordArchive.createMany({
                    data: oldRecords.map(r => ({
                        id: r.id,
                        checkpointId: r.checkpointId,
                        checkpointName: r.checkpointName,
                        checkpointLocation: r.checkpointLocation,
                        userId: r.userId,
                        status: r.status,
                        notes: r.notes,
                        offlineId: r.offlineId,
                        createdAt: r.createdAt
                    })),
                    skipDuplicates: true // 增加容错，防止意外重复插入抛错
                });

                // 2. 从原主表中将这批数据删除
                const recordIds = oldRecords.map(r => r.id);
                await tx.patrolRecord.deleteMany({
                    where: { id: { in: recordIds } }
                });
            });

            totalArchived += oldRecords.length;

            // 为了防止大批量迁移时占满 CPU 或数据库连接池，人为引入 200ms 的休眠缓冲
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (totalArchived > 0) {
            console.log(`[AutoArchive] Successfully archived ${totalArchived} old patrol records.`);
        }

        lastArchiveTime = Date.now(); // 记录本次完成时间
    } catch (error) {
        console.error('[AutoArchive] Failed to archive data:', error);
    } finally {
        isArchiving = false;
    }
}
