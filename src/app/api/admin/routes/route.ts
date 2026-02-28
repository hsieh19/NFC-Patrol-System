import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function GET() {
  try {
    const routes = await db.route.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        group: true,
        checkpoints: {
          include: {
            checkpoint: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });
    return NextResponse.json(routes);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch routes');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, groupId, checkpoints } = body;

    if (!name) {
      return NextResponse.json({ error: 'Route name is required' }, { status: 400 });
    }

    const route = await db.route.create({
      data: {
        name,
        description,
        groupId: groupId || null,
        checkpoints: checkpoints ? {
          create: checkpoints.map((cp: any, index: number) => ({
            checkpointId: cp.checkpointId,
            order: index
          }))
        } : undefined
      },
      include: {
        group: true,
        checkpoints: {
          include: {
            checkpoint: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(route);
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to create route');
  }
}
