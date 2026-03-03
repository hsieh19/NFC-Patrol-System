import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function GET() {
  try {
    const checkpoints = await db.checkpoint.findMany({
      orderBy: { createdAt: 'desc' },
      include: { group: true, role: true }
    });
    return NextResponse.json(checkpoints);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch checkpoints');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, nfcTagId, location, groupId, roleCode, creatorId } = body;

    if (!name || !nfcTagId || !groupId || !roleCode) {
      return NextResponse.json({ error: 'Name, NFC Tag ID, Group ID and Role Code are required' }, { status: 400 });
    }

    let targetGroupId = groupId;

    if (creatorId) {
      const creator = await db.user.findUnique({
        where: { id: creatorId }
      });

      if (creator && creator.roleCode === 'ADMIN') {
        // Admins can only create in their own group
        targetGroupId = creator.groupId || groupId;
      }
    }

    const checkpoint = await db.checkpoint.create({
      data: {
        name,
        nfcTagId,
        location,
        groupId: targetGroupId,
        roleCode,
      },
    });

    return NextResponse.json(checkpoint);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'NFC Tag ID already exists' }, { status: 400 });
    }
    return createErrorResponse(error, 'Failed to create checkpoint');
  }
}
