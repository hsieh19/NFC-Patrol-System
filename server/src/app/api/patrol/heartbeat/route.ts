import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * 巡更棒心跳与授时接口
 */
export async function POST(req: NextRequest) {
  try {
    const { wandUuid, ipAddress } = await req.json();

    if (!wandUuid) {
      return NextResponse.json({ error: 'Missing wandUuid' }, { status: 400 });
    }

    // 校验 UUID 授权
    const wand = await db.patrolWand.findUnique({
      where: { uuid: wandUuid.trim() },
    });

    if (!wand) {
      return NextResponse.json({ error: 'Unauthorized: Wand UUID not registered' }, { status: 401 });
    }

    // 获取北京时间的当前小时与分钟数
    const beijingDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const curHour = beijingDate.getHours();
    const curMin = beijingDate.getMinutes();
    const currentMin = curHour * 60 + curMin;

    let patrolDurationSec = 0;

    // 如果设备绑定了用户，我们去查询该用户的巡检计划
    if (wand.userId) {
      const user = await db.user.findUnique({
        where: { id: wand.userId },
      });

      if (user) {
        // 查询该用户所属部门和角色的排班计划，且是未归档的计划
        // 允许 assignedTo 匹配当前用户，或者 assignedTo 为 null / 未指定
        const plans = await db.plan.findMany({
          where: {
            isArchived: false,
            groupId: user.groupId || undefined,
            roleCode: user.roleCode || undefined,
            OR: [
              { assignedTo: null },
              { assignedTo: user.id }
            ]
          },
        });

        // 遍历所有巡检排班，比对时间
        for (const plan of plans) {
          if (!plan.startTime || !plan.endTime) continue;

          // 解析开始与结束时间 (格式为 "HH:mm")
          const [startHour, startMin] = plan.startTime.split(':').map(Number);
          const [endHour, endMin] = plan.endTime.split(':').map(Number);
          
          if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) continue;

          const startMinute = startHour * 60 + startMin;
          let endMinute = endHour * 60 + endMin;

          // 巡检区间的总时长 (分钟)
          const planDurationMin = startMinute <= endMinute 
            ? (endMinute - startMinute)
            : ((1440 - startMinute) + endMinute);

          // 距离巡检计划开始还有多少分钟
          const diffMin = (startMinute - currentMin + 1440) % 1440;

          // 是否属于 16 分钟内即将开始的“前一次心跳”
          const isAboutToStart = diffMin <= 16 && diffMin > 0;

          // 是否正处于巡检时间段内
          let isInside = false;
          let minutesLeft = 0;

          if (startMinute <= endMinute) {
            isInside = currentMin >= startMinute && currentMin < endMinute;
            if (isInside) {
              minutesLeft = endMinute - currentMin;
            }
          } else {
            // 跨天情况 (如 23:00 - 01:00)
            isInside = currentMin >= startMinute || currentMin < endMinute;
            if (isInside) {
              if (currentMin >= startMinute) {
                minutesLeft = (1440 - currentMin) + endMinute;
              } else {
                minutesLeft = endMinute - currentMin;
              }
            }
          }

          // 决定唤醒时长
          let tempDurationSec = 0;
          if (isAboutToStart) {
            // 唤醒时长 = 提前准备等待时间 + 巡检计划工作时间
            tempDurationSec = (diffMin + planDurationMin) * 60;
          } else if (isInside) {
            // 唤醒时长 = 剩余工作时间
            tempDurationSec = minutesLeft * 60;
          }

          // 如果该计划需要唤醒，且时长比已有的长，则更新
          if (tempDurationSec > patrolDurationSec) {
            patrolDurationSec = tempDurationSec;
          }
        }
      }
    }

    // 更新设备最新 IP 和在线时间，若需要唤醒则同时重置该标志
    const dataToUpdate: {
      ipAddress: string | null;
      lastSeen: Date;
      shouldWakeServer?: boolean;
    } = {
      ipAddress: ipAddress || null,
      lastSeen: new Date(),
    };
    if (wand.shouldWakeServer) {
      dataToUpdate.shouldWakeServer = false;
    }

    await db.patrolWand.update({
      where: { id: wand.id },
      data: dataToUpdate,
    });

    // 返回成功对时信息、设备名称、读卡工作模式和唤醒指令
    return NextResponse.json({
      success: true,
      serverTime: Date.now(),
      wandName: wand.name,
      cardType: wand.cardType,
      shouldWakeServer: wand.shouldWakeServer,
      patrolDuration: patrolDurationSec,
      sleepInterval: 900,
    });
  } catch (error: unknown) {
    console.error('Heartbeat API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
