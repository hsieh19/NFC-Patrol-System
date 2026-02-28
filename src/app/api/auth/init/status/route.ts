import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function GET() {
  try {
    const config = await db.systemConfig.findFirst();
    return NextResponse.json({
      isInitialised: config?.isInitialised || false,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'Failed to fetch init status');
  }
}
