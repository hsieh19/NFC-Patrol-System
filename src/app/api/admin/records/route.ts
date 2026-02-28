import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function GET() {
  try {
    const records = await db.patrolRecord.findMany({
      include: {
        user: true,
        checkpoint: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
    return NextResponse.json(records);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch records');
  }
}
