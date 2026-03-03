import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function GET() {
  try {
    const schedules = await db.plan.findMany({
      include: {
        route: true,
        group: true,
        role: true
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(schedules);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch schedules');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, routeId, startTime, endTime, planType, groupId, roleCode } = body;

    if (!name || !routeId || !startTime || !endTime || !groupId || !roleCode) {
      return NextResponse.json({ error: 'Name, Route ID, Start Time, End Time, Group ID and Role Code are required' }, { status: 400 });
    }

    const schedule = await db.plan.create({
      data: {
        name,
        routeId,
        startTime,
        endTime,
        planType: planType || 'ORDERED',
        groupId,
        roleCode
      },
      include: {
        route: true,
        group: true,
        role: true
      }
    });

    return NextResponse.json(schedule);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to create schedule');
  }
}
