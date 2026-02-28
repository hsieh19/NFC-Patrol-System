import { NextResponse } from 'next/server';

export function createErrorResponse(error: unknown, fallbackMessage: string, status = 500) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status });
}

