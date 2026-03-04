import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  try {
    const { id, nfcTagId, timestamp, userId, status, notes } = await req.json();

    if (!nfcTagId || !userId) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // 1. Find the checkpoint associated with this NFC Tag
    let checkpoint = await db.checkpoint.findUnique({
      where: { nfcTagId },
    });

    if (!checkpoint) {
      return NextResponse.json({ error: `NFC Tag ${nfcTagId} is not a registered checkpoint` }, { status: 404 });
    }

    // 2. Ensure User exists (MUST exist for valid records)
    const userExists = await db.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const actualUserId = userId;

    // 3. Create OR Upsert the record
    let record;
    if (id) {
      // If we have an offline ID, use upsert for idempotency
      record = await db.patrolRecord.upsert({
        where: { offlineId: id.toString() },
        update: {},
        create: {
          checkpointId: checkpoint.id,
          checkpointName: checkpoint.name,
          checkpointLocation: checkpoint.location,
          userId: actualUserId,
          status: status || 'NORMAL',
          notes: notes || '',
          offlineId: id.toString(),
          createdAt: new Date(timestamp),
        },
      });
    } else {
      // Real-time upload without offline ID
      record = await db.patrolRecord.create({
        data: {
          checkpointId: checkpoint.id,
          checkpointName: checkpoint.name,
          checkpointLocation: checkpoint.location,
          userId: actualUserId,
          status: status || 'NORMAL',
          notes: notes || '',
          // offlineId remains null (means real-time)
          createdAt: new Date(timestamp),
        },
      });
    }

    return NextResponse.json({ success: true, recordId: record.id });
  } catch (error: unknown) {
    console.error('Upload API Error:', error);
    return createErrorResponse(error, 'Internal Server Error');
  }
}
