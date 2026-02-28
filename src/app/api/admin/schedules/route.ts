import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function GET() {
  try {
    const schedules = await db.schedule.findMany({
      include: { checkpoint: true },
      orderBy: { startTime: 'asc' },
    });
    return NextResponse.json(schedules);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch schedules');
  }
}
